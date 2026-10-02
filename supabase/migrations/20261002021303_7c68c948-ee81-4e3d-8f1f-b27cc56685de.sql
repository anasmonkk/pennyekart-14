CREATE TABLE IF NOT EXISTS public.push_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  image_url text,
  link_url text,
  target_audience text NOT NULL DEFAULT 'all',
  target_local_body_ids uuid[],
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  invalid_tokens_cleared integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sending',
  created_by uuid,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.push_campaigns TO authenticated;
GRANT ALL ON public.push_campaigns TO service_role;
ALTER TABLE public.push_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read push campaigns" ON public.push_campaigns FOR SELECT TO authenticated
  USING (public.is_super_admin() OR public.has_permission('read_settings'));
CREATE POLICY "Admins create push campaigns" ON public.push_campaigns FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR public.has_permission('read_settings'));
CREATE TRIGGER update_push_campaigns_updated_at BEFORE UPDATE ON public.push_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();