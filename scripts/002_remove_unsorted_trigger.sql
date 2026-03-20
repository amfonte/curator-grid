-- Remove auto-created "Unsorted" board for new users.
-- Run this on existing deployments to stop creating Unsorted for new signups.
-- New users will have 0 boards and see the quote + "Create your first collection" empty state.
-- The app also hides any existing "Unsorted" board on the dashboard so it never appears as a collection.

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
