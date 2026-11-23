-- Applied after init: auto-confirm emails (no confirmation mail needed) and Google profile data.
create or replace function public.auto_confirm_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is null then new.email_confirmed_at := now(); end if;
  return new;
end $$;
revoke execute on function public.auto_confirm_email() from public, anon, authenticated;
drop trigger if exists auto_confirm_email on auth.users;
create trigger auto_confirm_email before insert on auth.users for each row execute function public.auto_confirm_email();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, team_role, avatar_url)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1), ''),
    coalesce(new.raw_user_meta_data ->> 'team_role', 'Member'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
drop function if exists public.shares_workspace(uuid);
