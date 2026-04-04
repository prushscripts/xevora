-- Allow flat_weekly (and keep salary for legacy rows) when workers.pay_type existed before workforce migrations.
ALTER TABLE public.workers DROP CONSTRAINT IF EXISTS workers_pay_type_check;
ALTER TABLE public.workers ADD CONSTRAINT workers_pay_type_check
  CHECK (pay_type IS NULL OR pay_type IN ('hourly', 'flat_weekly', 'salary'));
