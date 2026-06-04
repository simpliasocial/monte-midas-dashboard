-- Allows Supabase/PostgREST upserts with onConflict=event_key.
-- The older partial unique index is useful for lookups, but it is not a valid
-- conflict target for PostgREST because it has a WHERE predicate.
create unique index if not exists conversation_attribute_history_event_key_full_key
    on cw.conversation_attribute_history (event_key);
