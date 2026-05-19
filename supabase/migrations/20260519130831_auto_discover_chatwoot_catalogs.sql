-- Discover Chatwoot labels and custom attributes automatically.
-- Chatwoot remains the source of truth; dashboard_tag_settings keeps the
-- operational grouping used by metrics and reports.

create or replace function cw.catalog_text_key(value text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
    select trim(both '_' from regexp_replace(
        lower(translate(
            coalesce(value, ''),
            'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
            'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'
        )),
        '[^a-z0-9]+',
        '_',
        'g'
    ));
$$;

create or replace function cw.jsonb_text_array(value jsonb)
returns text[]
language sql
immutable
set search_path = pg_catalog
as $$
    with items as (
        select distinct btrim(item) as item
        from jsonb_array_elements_text(
            case
                when jsonb_typeof(coalesce(value, '[]'::jsonb)) = 'array'
                    then coalesce(value, '[]'::jsonb)
                else '[]'::jsonb
            end
        ) as item
        where btrim(item) <> ''
    )
    select coalesce(array_agg(item order by lower(item)), '{}'::text[])
    from items;
$$;

create or replace function cw.merge_text_arrays(left_values text[], right_values text[])
returns text[]
language sql
immutable
set search_path = pg_catalog
as $$
    with items as (
        select distinct btrim(item) as item
        from unnest(coalesce(left_values, '{}'::text[]) || coalesce(right_values, '{}'::text[])) as item
        where btrim(item) <> ''
    )
    select coalesce(array_agg(item order by lower(item)), '{}'::text[])
    from items;
$$;

create table if not exists cw.label_catalog (
    id bigserial primary key,
    account_id bigint not null default 0,
    chatwoot_account_id bigint,
    chatwoot_label_id bigint,
    title text not null,
    normalized_title text generated always as (cw.catalog_text_key(title)) stored,
    color text,
    description text,
    show_on_sidebar boolean,
    raw_payload jsonb not null default '{}'::jsonb,
    first_seen_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint label_catalog_title_not_blank check (btrim(title) <> '')
);

create unique index if not exists label_catalog_account_normalized_title_key
    on cw.label_catalog (account_id, normalized_title);

create index if not exists idx_label_catalog_account_last_seen
    on cw.label_catalog (account_id, last_seen_at desc);

create table if not exists cw.attribute_key_catalog (
    id bigserial primary key,
    account_id bigint not null default 0,
    attribute_scope text not null default 'unknown'
        check (attribute_scope in ('contact', 'conversation', 'resolved', 'unknown')),
    attribute_key text not null,
    normalized_key text generated always as (cw.catalog_text_key(attribute_key)) stored,
    source_names text[] not null default '{}'::text[],
    rows_seen bigint not null default 0,
    first_seen_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now(),
    raw_payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint attribute_key_catalog_key_not_blank check (btrim(attribute_key) <> '')
);

create unique index if not exists attribute_key_catalog_account_scope_key_key
    on cw.attribute_key_catalog (account_id, attribute_scope, normalized_key);

create index if not exists idx_attribute_key_catalog_account_last_seen
    on cw.attribute_key_catalog (account_id, last_seen_at desc);

alter table cw.label_catalog enable row level security;
alter table cw.attribute_key_catalog enable row level security;

drop policy if exists authenticated_read_label_catalog on cw.label_catalog;
create policy authenticated_read_label_catalog
on cw.label_catalog
for select
to authenticated
using (true);

drop policy if exists authenticated_read_attribute_key_catalog on cw.attribute_key_catalog;
create policy authenticated_read_attribute_key_catalog
on cw.attribute_key_catalog
for select
to authenticated
using (true);

grant select on cw.label_catalog to authenticated;
grant select on cw.attribute_key_catalog to authenticated;
grant all on cw.label_catalog to service_role;
grant all on cw.attribute_key_catalog to service_role;
grant usage, select on sequence cw.label_catalog_id_seq to service_role;
grant usage, select on sequence cw.attribute_key_catalog_id_seq to service_role;

create or replace function cw.refresh_dashboard_discovery(target_account_id bigint default 0)
returns jsonb
language plpgsql
set search_path = cw, pg_catalog, public
as $$
declare
    current_settings jsonb := '{}'::jsonb;
    refreshed_settings jsonb := '{}'::jsonb;
    label_list text[] := '{}'::text[];
    all_attribute_keys text[] := '{}'::text[];
    contact_attribute_keys text[] := '{}'::text[];
    conversation_attribute_keys text[] := '{}'::text[];
    resolved_attribute_keys text[] := '{}'::text[];
    auto_sql_tags text[] := '{}'::text[];
    auto_appointment_tags text[] := '{}'::text[];
    auto_sale_tags text[] := '{}'::text[];
    auto_unqualified_tags text[] := '{}'::text[];
    auto_followup_tags text[] := '{}'::text[];
    auto_appointment_field_keys text[] := '{}'::text[];
    auto_sale_field_keys text[] := '{}'::text[];
    score_key text := '';
    appointment_target text := '';
    preferred_appointment_target text := '';
    sale_target text := '';
begin
    select coalesce(settings, '{}'::jsonb)
    into current_settings
    from cw.dashboard_tag_settings
    where account_id = target_account_id;

    current_settings := coalesce(current_settings, '{}'::jsonb);

    with label_source as (
        select title as label
        from cw.label_catalog
        where account_id = target_account_id
        union all
        select unnest(coalesce(labels, '{}'::text[])) as label
        from cw.conversations_current
        union all
        select unnest(
            coalesce(previous_labels, '{}'::text[]) ||
            coalesce(next_labels, '{}'::text[]) ||
            coalesce(added_labels, '{}'::text[]) ||
            coalesce(removed_labels, '{}'::text[])
        ) as label
        from cw.conversation_label_events
    ),
    cleaned as (
        select distinct btrim(label) as label
        from label_source
        where btrim(coalesce(label, '')) <> ''
    )
    select coalesce(array_agg(label order by lower(label)), '{}'::text[])
    into label_list
    from cleaned;

    with keys(attribute_scope, attribute_key, source_name) as (
        select attribute_scope, attribute_key, 'attribute_definitions'
        from cw.attribute_definitions
        where btrim(coalesce(attribute_key, '')) <> ''
        union all
        select 'contact', jsonb_object_keys(custom_attributes), 'contacts_current.custom_attributes'
        from cw.contacts_current
        where jsonb_typeof(custom_attributes) = 'object'
        union all
        select 'contact', jsonb_object_keys(contact_custom_attributes), 'conversations_current.contact_custom_attributes'
        from cw.conversations_current
        where jsonb_typeof(contact_custom_attributes) = 'object'
        union all
        select 'conversation', jsonb_object_keys(conversation_custom_attributes), 'conversations_current.conversation_custom_attributes'
        from cw.conversations_current
        where jsonb_typeof(conversation_custom_attributes) = 'object'
        union all
        select 'resolved', jsonb_object_keys(custom_attributes), 'conversations_current.custom_attributes'
        from cw.conversations_current
        where jsonb_typeof(custom_attributes) = 'object'
    ),
    cleaned as (
        select
            case
                when attribute_scope in ('contact', 'conversation', 'resolved') then attribute_scope
                else 'unknown'
            end as attribute_scope,
            btrim(attribute_key) as attribute_key,
            source_name
        from keys
        where btrim(coalesce(attribute_key, '')) <> ''
    ),
    grouped as (
        select
            attribute_scope,
            attribute_key,
            array_agg(distinct source_name order by source_name) as source_names,
            count(*)::bigint as rows_seen
        from cleaned
        group by attribute_scope, attribute_key
    )
    insert into cw.attribute_key_catalog (
        account_id,
        attribute_scope,
        attribute_key,
        source_names,
        rows_seen,
        last_seen_at,
        updated_at
    )
    select
        target_account_id,
        attribute_scope,
        attribute_key,
        source_names,
        rows_seen,
        now(),
        now()
    from grouped
    on conflict (account_id, attribute_scope, normalized_key)
    do update set
        attribute_key = excluded.attribute_key,
        source_names = cw.merge_text_arrays(cw.attribute_key_catalog.source_names, excluded.source_names),
        rows_seen = excluded.rows_seen,
        last_seen_at = now(),
        updated_at = now();

    select coalesce(array_agg(attribute_key order by lower(attribute_key)), '{}'::text[])
    into contact_attribute_keys
    from (
        select distinct attribute_key
        from cw.attribute_key_catalog
        where account_id = target_account_id
          and attribute_scope = 'contact'
    ) keys;

    select coalesce(array_agg(attribute_key order by lower(attribute_key)), '{}'::text[])
    into conversation_attribute_keys
    from (
        select distinct attribute_key
        from cw.attribute_key_catalog
        where account_id = target_account_id
          and attribute_scope = 'conversation'
    ) keys;

    select coalesce(array_agg(attribute_key order by lower(attribute_key)), '{}'::text[])
    into resolved_attribute_keys
    from (
        select distinct attribute_key
        from cw.attribute_key_catalog
        where account_id = target_account_id
          and attribute_scope = 'resolved'
    ) keys;

    all_attribute_keys := cw.merge_text_arrays(
        cw.merge_text_arrays(contact_attribute_keys, conversation_attribute_keys),
        resolved_attribute_keys
    );

    with labels as (
        select label, cw.catalog_text_key(label) as key
        from unnest(label_list) as label
    )
    select
        coalesce(array_agg(label order by lower(label)) filter (
            where key ~ '(^|_)(interesado|interes|lead_calificado|calificado|qualified|sql|solicita|informacion|cotizacion|cotiza|prospecto|bienvenida)(_|$)'
        ), '{}'::text[]),
        coalesce(array_agg(label order by lower(label)) filter (
            where key ~ '(^|_)(cita|agendada|agendado|agenda|appointment|booking|reserva|reservado|visita|demo|reunion)(_|$)'
        ), '{}'::text[]),
        coalesce(array_agg(label order by lower(label)) filter (
            where key ~ '(^|_)(venta|vendido|vendida|sale|sold|won|ganada|ganado|cerrado|compra|comprado|pagado|facturado)(_|$)'
              and key !~ '(^|_)(no_venta|sin_venta|perdida|lost)(_|$)'
        ), '{}'::text[]),
        coalesce(array_agg(label order by lower(label)) filter (
            where key ~ '(^|_)(desinteresado|descartado|no_calificado|no_aplica|unqualified|rechazo|rechazado|perdido|perdida|lost|spam|invalido|invalid)(_|$)'
        ), '{}'::text[]),
        coalesce(array_agg(label order by lower(label)) filter (
            where key ~ '(^|_)(seguimiento|followup|follow_up|follow|pendiente)(_|$)'
        ), '{}'::text[])
    into
        auto_sql_tags,
        auto_appointment_tags,
        auto_sale_tags,
        auto_unqualified_tags,
        auto_followup_tags
    from labels;

    with attrs as (
        select attribute_key, cw.catalog_text_key(attribute_key) as key
        from unnest(all_attribute_keys) as attribute_key
    )
    select
        coalesce(array_agg(attribute_key order by lower(attribute_key)) filter (
            where key ~ '(^|_)(fecha_visita|hora_visita|fecha_cita|hora_cita|cita|visita|appointment|responsable|asesor|agente)(_|$)'
        ), '{}'::text[]),
        coalesce(array_agg(attribute_key order by lower(attribute_key)) filter (
            where key ~ '(^|_)(monto|monto_operacion|fecha_monto|venta|operacion|producto|servicio|responsable|asesor|agente)(_|$)'
        ), '{}'::text[])
    into auto_appointment_field_keys, auto_sale_field_keys
    from attrs;

    select attribute_key
    into score_key
    from unnest(all_attribute_keys) as attribute_key
    where cw.catalog_text_key(attribute_key) in ('score_interes', 'score', 'lead_score', 'puntaje')
    order by case cw.catalog_text_key(attribute_key)
        when 'score_interes' then 1
        when 'lead_score' then 2
        when 'score' then 3
        when 'puntaje' then 4
        else 5
    end
    limit 1;

    score_key := case
        when nullif(current_settings->>'scoreAttributeKey', '') is null then coalesce(score_key, '')
        when array_length(all_attribute_keys, 1) is not null
          and not ((current_settings->>'scoreAttributeKey') = any(all_attribute_keys))
          and nullif(score_key, '') is not null then score_key
        else current_settings->>'scoreAttributeKey'
    end;

    select label
    into preferred_appointment_target
    from unnest(auto_appointment_tags) as label
    where cw.catalog_text_key(label) ~ '(^|_)(humano|human|manual)(_|$)'
    order by lower(label)
    limit 1;

    appointment_target := case
        when nullif(current_settings->>'humanAppointmentTargetLabel', '') is null then coalesce(auto_appointment_tags[1], '')
        when array_length(label_list, 1) is not null
          and not ((current_settings->>'humanAppointmentTargetLabel') = any(label_list))
          and array_length(auto_appointment_tags, 1) is not null then coalesce(preferred_appointment_target, auto_appointment_tags[1])
        when nullif(preferred_appointment_target, '') is not null
          and cw.catalog_text_key(current_settings->>'humanAppointmentTargetLabel') !~ '(^|_)(humano|human|manual)(_|$)'
          then preferred_appointment_target
        else current_settings->>'humanAppointmentTargetLabel'
    end;

    sale_target := case
        when nullif(current_settings->>'humanSaleTargetLabel', '') is null then coalesce(auto_sale_tags[1], '')
        when array_length(label_list, 1) is not null
          and not ((current_settings->>'humanSaleTargetLabel') = any(label_list))
          and array_length(auto_sale_tags, 1) is not null then auto_sale_tags[1]
        else current_settings->>'humanSaleTargetLabel'
    end;

    refreshed_settings := current_settings || jsonb_build_object(
        'autoDiscoveryEnabled', true,
        'lastAutoDiscoveryAt', to_jsonb(now()),
        'availableLabels', to_jsonb(label_list),
        'discoveredLabels', to_jsonb(label_list),
        'availableAttributeKeys', to_jsonb(all_attribute_keys),
        'discoveredAttributeKeys', to_jsonb(all_attribute_keys),
        'contactAttributeKeys', to_jsonb(contact_attribute_keys),
        'conversationAttributeKeys', to_jsonb(conversation_attribute_keys),
        'resolvedAttributeKeys', to_jsonb(resolved_attribute_keys),
        'autoTagGroups', jsonb_build_object(
            'sqlTags', to_jsonb(auto_sql_tags),
            'appointmentTags', to_jsonb(auto_appointment_tags),
            'saleTags', to_jsonb(auto_sale_tags),
            'unqualifiedTags', to_jsonb(auto_unqualified_tags),
            'humanFollowupQueueTags', to_jsonb(auto_followup_tags),
            'humanAppointmentFieldKeys', to_jsonb(auto_appointment_field_keys),
            'humanSaleFieldKeys', to_jsonb(auto_sale_field_keys),
            'scoreAttributeKey', to_jsonb(score_key)
        ),
        'discoveryNotes', jsonb_build_object(
            'catalogsAreAutomatic', true,
            'stageMappingIsDashboardConfiguration', true
        )
    );

    insert into cw.dashboard_tag_settings (account_id, settings, updated_at)
    values (target_account_id, refreshed_settings, now())
    on conflict (account_id)
    do update set settings = excluded.settings, updated_at = now();

    return jsonb_build_object(
        'account_id', target_account_id,
        'labels', label_list,
        'attribute_keys', all_attribute_keys,
        'autoTagGroups', refreshed_settings->'autoTagGroups',
        'updated_at', now()
    );
end;
$$;

revoke all on function cw.refresh_dashboard_discovery(bigint) from anon, authenticated;
grant execute on function cw.refresh_dashboard_discovery(bigint) to service_role;

select cw.refresh_dashboard_discovery(0);
