-- Fix RLS policy for expenses insert to allow users with admin or site_manager role
-- First drop the existing policy
DROP POLICY IF EXISTS "Site managers and admins can insert expenses" ON public.expenses;

-- Create new policy that properly checks role from profiles table
CREATE POLICY "Site managers and admins can insert expenses" 
ON public.expenses 
FOR INSERT 
WITH CHECK (
  created_by = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'site_manager')
  )
);