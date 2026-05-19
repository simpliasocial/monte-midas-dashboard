-- Centralize dashboard settings in cw and keep Chatwoot discovery read-only.
-- Discovery updates catalogs and suggestion metadata only; it does not decide
-- which labels count as SQL/cita/venta/no calificado for the dashboard.

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
    suggested_score_key text := '';
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
    into suggested_score_key
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
            'scoreAttributeKey', to_jsonb(coalesce(suggested_score_key, ''))
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

drop table if exists public.dashboard_tag_settings;
