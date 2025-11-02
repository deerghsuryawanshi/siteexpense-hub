-- Create fund_transfers table
CREATE TABLE public.fund_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  to_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT different_accounts CHECK (from_account_id != to_account_id)
);

-- Enable RLS
ALTER TABLE public.fund_transfers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "All authenticated users can view fund transfers"
ON public.fund_transfers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Site managers and admins can insert fund transfers"
ON public.fund_transfers FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid() AND
  check_user_has_role(ARRAY['admin'::user_role, 'site_manager'::user_role])
);

CREATE POLICY "Admins can delete fund transfers"
ON public.fund_transfers FOR DELETE
TO authenticated
USING (check_user_role('admin'::user_role));

-- Trigger to update bank balances on transfer
CREATE OR REPLACE FUNCTION public.update_bank_balance_on_transfer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Deduct from source account
    UPDATE public.bank_accounts 
    SET balance = balance - NEW.amount
    WHERE id = NEW.from_account_id;
    
    -- Add to destination account
    UPDATE public.bank_accounts 
    SET balance = balance + NEW.amount
    WHERE id = NEW.to_account_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Revert: Add back to source account
    UPDATE public.bank_accounts 
    SET balance = balance + OLD.amount
    WHERE id = OLD.from_account_id;
    
    -- Revert: Deduct from destination account
    UPDATE public.bank_accounts 
    SET balance = balance - OLD.amount
    WHERE id = OLD.to_account_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER transfer_bank_balance_trigger
AFTER INSERT OR DELETE ON public.fund_transfers
FOR EACH ROW
EXECUTE FUNCTION public.update_bank_balance_on_transfer();

-- Updated at trigger
CREATE TRIGGER update_fund_transfers_updated_at
BEFORE UPDATE ON public.fund_transfers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();