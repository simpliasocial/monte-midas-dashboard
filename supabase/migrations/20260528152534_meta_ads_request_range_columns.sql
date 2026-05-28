alter table cw.meta_adset_insights_cache
    add column if not exists request_date_start date,
    add column if not exists request_date_stop date;

update cw.meta_adset_insights_cache
set
    request_date_start = coalesce(request_date_start, date_start),
    request_date_stop = coalesce(request_date_stop, date_stop)
where request_date_start is null
   or request_date_stop is null;

alter table cw.meta_adset_insights_cache
    alter column request_date_start set not null,
    alter column request_date_stop set not null;

drop index if exists cw.meta_adset_insights_cache_account_range_idx;

create index if not exists meta_adset_insights_cache_account_range_idx
    on cw.meta_adset_insights_cache (ad_account_id, request_date_start, request_date_stop);

create index if not exists meta_adset_insights_cache_reported_range_idx
    on cw.meta_adset_insights_cache (ad_account_id, date_start, date_stop);
