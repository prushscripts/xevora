-- Add gps_accuracy column to shifts table
-- This column stores the GPS accuracy in meters for each clock-in event

ALTER TABLE public.shifts 
ADD COLUMN IF NOT EXISTS gps_accuracy float8 NULL;

COMMENT ON COLUMN public.shifts.gps_accuracy IS 'GPS accuracy in meters at time of clock-in';
