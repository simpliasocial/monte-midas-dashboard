create or replace function cw.prune_dashboard_settings_labels(target_account_id bigint default 0)
returns jsonb
language plpgsql
security definer
set search_path = cw, pg_catalog
as $$
declare
    current_settings jsonb;
    pruned_settings jsonb;
    label_list text[];
    key_name text;
    label_array_keys text[] := array[
        'sqlTags',
        'appointmentTags',
        'saleTags',
        'unqualifiedTags',
        'scoreHighTags',
        'scoreMediumTags',
        'scoreLowTags',
        'humanFollowupQueueTags',
        'humanSalesQueueTags',
        'scoreAppointmentLabels'
    ];
    auto_label_array_keys text[] := array[
        'sqlTags',
        'appointmentTags',
        'saleTags',
        'unqualifiedTags',
        'humanFollowupQueueTags'
    ];
begin
    select settings
    into current_settings
    from cw.dashboard_tag_settings
    where account_id = target_account_id;

    select coalesce(array_agg(title order by title), array[]::text[])
    into label_list
    from cw.label_catalog
    where account_id = target_account_id;

    pruned_settings := coalesce(current_settings, '{}'::jsonb)
        || jsonb_build_object(
            'availableLabels', to_jsonb(label_list),
            'discoveredLabels', to_jsonb(label_list)
        );

    foreach key_name in array label_array_keys loop
        pruned_settings := jsonb_set(
            pruned_settings,
            array[key_name],
            (
                select coalesce(jsonb_agg(item_label order by item_label), '[]'::jsonb)
                from (
                    select distinct item_label
                    from jsonb_array_elements_text(
                        case
                            when jsonb_typeof(pruned_settings -> key_name) = 'array'
                                then pruned_settings -> key_name
                            else '[]'::jsonb
                        end
                    ) as labels(item_label)
                    where item_label = any(label_list)
                ) kept
            ),
            true
        );
    end loop;

    if not (coalesce(pruned_settings ->> 'humanAppointmentTargetLabel', '') = any(label_list)) then
        pruned_settings := jsonb_set(pruned_settings, '{humanAppointmentTargetLabel}', to_jsonb(''::text), true);
    end if;

    if not (coalesce(pruned_settings ->> 'humanSaleTargetLabel', '') = any(label_list)) then
        pruned_settings := jsonb_set(pruned_settings, '{humanSaleTargetLabel}', to_jsonb(''::text), true);
    end if;

    if jsonb_typeof(pruned_settings -> 'autoTagGroups') = 'object' then
        foreach key_name in array auto_label_array_keys loop
            pruned_settings := jsonb_set(
                pruned_settings,
                array['autoTagGroups', key_name],
                (
                    select coalesce(jsonb_agg(item_label order by item_label), '[]'::jsonb)
                    from (
                        select distinct item_label
                        from jsonb_array_elements_text(
                            case
                                when jsonb_typeof(pruned_settings #> array['autoTagGroups', key_name]) = 'array'
                                    then pruned_settings #> array['autoTagGroups', key_name]
                                else '[]'::jsonb
                            end
                        ) as labels(item_label)
                        where item_label = any(label_list)
                    ) kept
                ),
                true
            );
        end loop;
    end if;

    insert into cw.dashboard_tag_settings (account_id, settings, updated_at)
    values (target_account_id, pruned_settings, now())
    on conflict (account_id)
    do update set settings = excluded.settings, updated_at = now();

    return jsonb_build_object(
        'account_id', target_account_id,
        'labels', label_list,
        'settings', pruned_settings,
        'updated_at', now()
    );
end;
$$;

revoke all on function cw.prune_dashboard_settings_labels(bigint) from anon, authenticated;
grant execute on function cw.prune_dashboard_settings_labels(bigint) to service_role;

select cw.prune_dashboard_settings_labels(0);

create or replace function cw.prune_deleted_label_references(target_account_id bigint default 0)
returns jsonb
language plpgsql
security definer
set search_path = cw, pg_catalog
as $$
declare
    active_labels text[];
    conversations_updated integer := 0;
    events_updated integer := 0;
    events_deleted integer := 0;
begin
    select coalesce(array_agg(title order by title), array[]::text[])
    into active_labels
    from cw.label_catalog
    where account_id = target_account_id;

    with pruned as (
        select
            c.chatwoot_conversation_id,
            coalesce((
                select array_agg(label order by label)
                from (
                    select distinct label
                    from unnest(coalesce(c.labels, array[]::text[])) as labels(label)
                    where label = any(active_labels)
                ) kept
            ), array[]::text[]) as labels
        from cw.conversations_current c
        where exists (
            select 1
            from unnest(coalesce(c.labels, array[]::text[])) as labels(label)
            where not (label = any(active_labels))
        )
    )
    update cw.conversations_current c
    set labels = pruned.labels,
        updated_at = now()
    from pruned
    where c.chatwoot_conversation_id = pruned.chatwoot_conversation_id;

    get diagnostics conversations_updated = row_count;

    with pruned as (
        select
            e.id,
            coalesce((
                select array_agg(label order by label)
                from (
                    select distinct label
                    from unnest(coalesce(e.previous_labels, array[]::text[])) as labels(label)
                    where label = any(active_labels)
                ) kept
            ), array[]::text[]) as previous_labels,
            coalesce((
                select array_agg(label order by label)
                from (
                    select distinct label
                    from unnest(coalesce(e.next_labels, array[]::text[])) as labels(label)
                    where label = any(active_labels)
                ) kept
            ), array[]::text[]) as next_labels,
            coalesce((
                select array_agg(label order by label)
                from (
                    select distinct label
                    from unnest(coalesce(e.added_labels, array[]::text[])) as labels(label)
                    where label = any(active_labels)
                ) kept
            ), array[]::text[]) as added_labels,
            coalesce((
                select array_agg(label order by label)
                from (
                    select distinct label
                    from unnest(coalesce(e.removed_labels, array[]::text[])) as labels(label)
                    where label = any(active_labels)
                ) kept
            ), array[]::text[]) as removed_labels
        from cw.conversation_label_events e
        where exists (
            select 1
            from unnest(
                coalesce(e.previous_labels, array[]::text[]) ||
                coalesce(e.next_labels, array[]::text[]) ||
                coalesce(e.added_labels, array[]::text[]) ||
                coalesce(e.removed_labels, array[]::text[])
            ) as labels(label)
            where not (label = any(active_labels))
        )
    )
    update cw.conversation_label_events e
    set previous_labels = pruned.previous_labels,
        next_labels = pruned.next_labels,
        added_labels = pruned.added_labels,
        removed_labels = pruned.removed_labels
    from pruned
    where e.id = pruned.id;

    get diagnostics events_updated = row_count;

    delete from cw.conversation_label_events
    where coalesce(array_length(previous_labels, 1), 0) = 0
      and coalesce(array_length(next_labels, 1), 0) = 0
      and coalesce(array_length(added_labels, 1), 0) = 0
      and coalesce(array_length(removed_labels, 1), 0) = 0;

    get diagnostics events_deleted = row_count;

    return jsonb_build_object(
        'account_id', target_account_id,
        'active_labels', active_labels,
        'conversations_updated', conversations_updated,
        'events_updated', events_updated,
        'events_deleted', events_deleted
    );
end;
$$;

revoke all on function cw.prune_deleted_label_references(bigint) from anon, authenticated;
grant execute on function cw.prune_deleted_label_references(bigint) to service_role;

select cw.prune_deleted_label_references(0);

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

    select coalesce(array_agg(label order by lower(label)), '{}'::text[])
    into label_list
    from (
        select distinct btrim(title) as label
        from cw.label_catalog
        where account_id = target_account_id
          and btrim(coalesce(title, '')) <> ''
    ) labels;

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
select cw.prune_dashboard_settings_labels(0);
select cw.prune_deleted_label_references(0);
