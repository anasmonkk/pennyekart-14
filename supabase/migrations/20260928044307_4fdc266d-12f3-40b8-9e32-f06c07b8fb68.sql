CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _customer_role_id uuid;
  _referred_by_id uuid;
  _referral_code text;
  _user_type text := COALESCE(NEW.raw_user_meta_data->>'user_type', 'customer');
  _seller_type text := NULL;
BEGIN
  SELECT id INTO _customer_role_id FROM public.roles WHERE name = 'customer';
  _referral_code := NULLIF(TRIM(NEW.raw_user_meta_data->>'referral_code'), '');
  IF _referral_code IS NOT NULL THEN
    SELECT id INTO _referred_by_id FROM public.profiles WHERE referral_code = _referral_code LIMIT 1;
  ELSE
    _referred_by_id := NULLIF(NEW.raw_user_meta_data->>'referred_by', '')::uuid;
  END IF;
  IF _user_type = 'selling_partner' THEN
    _seller_type := CASE WHEN NEW.raw_user_meta_data->>'seller_type' = 'utility' THEN 'utility' ELSE 'normal' END;
  END IF;
  INSERT INTO public.profiles (user_id, email, full_name, mobile_number, date_of_birth, user_type, local_body_id, ward_number, is_approved, role_id, referred_by, seller_type)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'mobile_number',
    (NEW.raw_user_meta_data->>'date_of_birth')::date,
    _user_type,
    NULLIF(NEW.raw_user_meta_data->>'local_body_id', '')::uuid,
    NULLIF(NEW.raw_user_meta_data->>'ward_number', '')::integer,
    _user_type = 'customer',
    CASE WHEN _user_type = 'customer' THEN _customer_role_id ELSE NULL END,
    _referred_by_id,
    _seller_type
  );
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;