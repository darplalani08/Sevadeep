-- Indexes to optimize dashboard version stamp calculations and event timelines.

create index if not exists application_events_created_idx
  on public.application_events (created_at desc);

create index if not exists volunteers_updated_idx
  on public.volunteers (updated_at desc);

