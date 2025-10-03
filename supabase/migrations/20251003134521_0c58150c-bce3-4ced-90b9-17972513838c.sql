-- Fix RLS policies for bank_accounts to properly check authenticated user
DROP POLICY IF EXISTS "Admins and site managers can insert bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Admins and site managers can update bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Admins can delete bank accounts" ON public.bank_accounts;

CREATE POLICY "Admins and site managers can insert bank accounts"
ON public.bank_accounts
FOR INSERT
TO authenticated
WITH CHECK (check_user_has_role(ARRAY['admin'::user_role, 'site_manager'::user_role]));

CREATE POLICY "Admins and site managers can update bank accounts"
ON public.bank_accounts
FOR UPDATE
TO authenticated
USING (check_user_has_role(ARRAY['admin'::user_role, 'site_manager'::user_role]));

CREATE POLICY "Admins can delete bank accounts"
ON public.bank_accounts
FOR DELETE
TO authenticated
USING (check_user_role('admin'::user_role));

-- Fix RLS policies for sites
DROP POLICY IF EXISTS "Admins can delete sites" ON public.sites;
DROP POLICY IF EXISTS "Admins can insert sites" ON public.sites;
DROP POLICY IF EXISTS "Admins can update sites" ON public.sites;

CREATE POLICY "Admins can delete sites"
ON public.sites
FOR DELETE
TO authenticated
USING (check_user_role('admin'::user_role));

CREATE POLICY "Admins can insert sites"
ON public.sites
FOR INSERT
TO authenticated
WITH CHECK (check_user_role('admin'::user_role));

CREATE POLICY "Admins can update sites"
ON public.sites
FOR UPDATE
TO authenticated
USING (check_user_role('admin'::user_role));

-- Fix RLS policies for vendors
DROP POLICY IF EXISTS "Admins can delete vendors" ON public.vendors;
DROP POLICY IF EXISTS "Admins and site managers can insert vendors" ON public.vendors;
DROP POLICY IF EXISTS "Admins and site managers can update vendors" ON public.vendors;

CREATE POLICY "Admins can delete vendors"
ON public.vendors
FOR DELETE
TO authenticated
USING (check_user_role('admin'::user_role));

CREATE POLICY "Admins and site managers can insert vendors"
ON public.vendors
FOR INSERT
TO authenticated
WITH CHECK (check_user_has_role(ARRAY['admin'::user_role, 'site_manager'::user_role]));

CREATE POLICY "Admins and site managers can update vendors"
ON public.vendors
FOR UPDATE
TO authenticated
USING (check_user_has_role(ARRAY['admin'::user_role, 'site_manager'::user_role]));