create schema if not exists cw;
create extension if not exists pgcrypto with schema extensions;

create table if not exists cw.meta_campaigns_current (
    id uuid primary key default gen_random_uuid(),
    ad_account_id text not null,
    campaign_id text not null,
    name text,
    status text,
    effective_status text,
    objective text,
    created_time timestamptz,
    start_time timestamptz,
    stop_time timestamptz,
    raw_payload jsonb not null default '{}'::jsonb,
    fetched_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (ad_account_id, campaign_id)
);

create index if not exists meta_campaigns_current_account_status_idx
    on cw.meta_campaigns_current (ad_account_id, effective_status);

create index if not exists meta_campaigns_current_fetched_idx
    on cw.meta_campaigns_current (ad_account_id, fetched_at desc);

create table if not exists cw.meta_adset_insights_cache (
    id uuid primary key default gen_random_uuid(),
    cache_key text not null unique,
    ad_account_id text not null,
    campaign_id text not null,
    campaign_name text,
    adset_id text,
    adset_name text,
    objective text,
    request_date_start date not null,
    request_date_stop date not null,
    date_start date not null,
    date_stop date not null,
    spend numeric not null default 0,
    impressions bigint not null default 0,
    reach bigint not null default 0,
    frequency numeric not null default 0,
    clicks bigint not null default 0,
    unique_clicks bigint not null default 0,
    inline_link_clicks bigint not null default 0,
    outbound_clicks bigint not null default 0,
    cpc numeric not null default 0,
    cpm numeric not null default 0,
    ctr numeric not null default 0,
    actions jsonb not null default '[]'::jsonb,
    cost_per_action_type jsonb not null default '[]'::jsonb,
    action_values jsonb not null default '[]'::jsonb,
    purchase_roas jsonb not null default '[]'::jsonb,
    raw_payload jsonb not null default '{}'::jsonb,
    fetched_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists meta_adset_insights_cache_account_range_idx
    on cw.meta_adset_insights_cache (ad_account_id, request_date_start, request_date_stop);

create index if not exists meta_adset_insights_cache_reported_range_idx
    on cw.meta_adset_insights_cache (ad_account_id, date_start, date_stop);

create index if not exists meta_adset_insights_cache_campaign_idx
    on cw.meta_adset_insights_cache (ad_account_id, campaign_id);

create index if not exists meta_adset_insights_cache_fetched_idx
    on cw.meta_adset_insights_cache (ad_account_id, fetched_at desc);

create table if not exists cw.meta_ads_sync_runs (
    id uuid primary key default gen_random_uuid(),
    ad_account_id text not null,
    date_start date not null,
    date_stop date not null,
    status text not null default 'running'
        check (status in ('running', 'success', 'error', 'cache_hit')),
    started_at timestamptz not null default now(),
    finished_at timestamptz,
    cache_hit boolean not null default false,
    force_refresh boolean not null default false,
    campaign_rows integer not null default 0,
    insight_rows integer not null default 0,
    returned_rows integer not null default 0,
    error_message text,
    rate_limit_usage jsonb not null default '{}'::jsonb,
    metadata jsonb not null default '{}'::jsonb
);

create index if not exists meta_ads_sync_runs_account_range_started_idx
    on cw.meta_ads_sync_runs (ad_account_id, date_start, date_stop, started_at desc);

create index if not exists meta_ads_sync_runs_status_started_idx
    on cw.meta_ads_sync_runs (status, started_at desc);

alter table cw.meta_campaigns_current enable row level security;
alter table cw.meta_adset_insights_cache enable row level security;
alter table cw.meta_ads_sync_runs enable row level security;

revoke all on cw.meta_campaigns_current from anon, authenticated;
revoke all on cw.meta_adset_insights_cache from anon, authenticated;
revoke all on cw.meta_ads_sync_runs from anon, authenticated;

grant usage on schema cw to service_role;
grant select, insert, update, delete on cw.meta_campaigns_current to service_role;
grant select, insert, update, delete on cw.meta_adset_insights_cache to service_role;
grant select, insert, update, delete on cw.meta_ads_sync_runs to service_role;
