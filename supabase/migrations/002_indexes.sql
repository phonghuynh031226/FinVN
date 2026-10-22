-- Migration 002: Indexes & Atomic balance update trigger/function

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions (user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON public.transactions (account_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_source_ref ON public.transactions (source, source_reference);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_active ON public.bank_accounts (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_webhook_events_status_time ON public.webhook_events (status, received_at DESC);

-- Function để cập nhật current_balance tài khoản khi có giao dịch mới (atomic)
CREATE OR REPLACE FUNCTION public.apply_transaction_to_balance()
RETURNS trigger AS $$
BEGIN
  IF NEW.type = 'INCOME' THEN
    UPDATE public.bank_accounts
    SET current_balance = current_balance + NEW.amount,
        updated_at = now()
    WHERE id = NEW.account_id;
  ELSIF NEW.type = 'EXPENSE' THEN
    UPDATE public.bank_accounts
    SET current_balance = current_balance - NEW.amount,
        updated_at = now()
    WHERE id = NEW.account_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_transaction_inserted
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.apply_transaction_to_balance();
