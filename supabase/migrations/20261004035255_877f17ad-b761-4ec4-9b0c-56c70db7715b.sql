create extension if not exists pg_net with schema extensions;

do $$ begin
  if not exists (select 1 from vault.secrets where name = 'delivery_push_internal_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'), 'delivery_push_internal_secret');
  end if;
end $$;

create or replace function public.get_delivery_push_secret()
returns text language sql stable security definer set search_path = public, vault as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'delivery_push_internal_secret' limit 1
$$;
revoke all on function public.get_delivery_push_secret() from public, anon, authenticated;
grant execute on function public.get_delivery_push_secret() to service_role;

create or replace function public.notify_delivery_on_seller_accept()
returns trigger language plpgsql security definer set search_path = public, vault, extensions as $$
declare s text;
begin
  if new.status = 'seller_accepted' and old.status is distinct from 'seller_accepted'
     and new.delivery_push_sent_at is null and new.assigned_delivery_staff_id is not null
     and coalesce(new.is_self_delivery,false) = false then
    select decrypted_secret into s from vault.decrypted_secrets where name = 'delivery_push_internal_secret' limit 1;
    perform net.http_post(
      url := 'https://xxlocaexuoowxdzupjcs.supabase.co/functions/v1/send-delivery-order-push',
      headers := jsonb_build_object('Content-Type','application/json','x-internal-secret', s),
      body := jsonb_build_object('order_id', new.id)
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_delivery_on_seller_accept on public.orders;
create trigger trg_notify_delivery_on_seller_accept after update of status on public.orders
for each row execute function public.notify_delivery_on_seller_accept();