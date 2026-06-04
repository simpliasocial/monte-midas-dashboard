create schema if not exists cw;
create extension if not exists pgcrypto with schema extensions;

create table if not exists cw.meta_ads_configs (
    id uuid primary key default gen_random_uuid(),
    account_id bigint not null default 0,
    ad_account_id text not null,
    access_token text not null,
    token_last_four text not null default '',
    graph_api_version text not null default 'v20.0',
    enabled boolean not null default true,
    configured_by uuid,
    configured_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (account_id)
);

create index if not exists meta_ads_configs_account_enabled_idx
    on cw.meta_ads_configs (account_id, enabled);

alter table cw.meta_ads_configs enable row level security;

revoke all on cw.meta_ads_configs from anon, authenticated;

grant usage on schema cw to service_role;
grant select, insert, update, delete on cw.meta_ads_configs to service_role;
