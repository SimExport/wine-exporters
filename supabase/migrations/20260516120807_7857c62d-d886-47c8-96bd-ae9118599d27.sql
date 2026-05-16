
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.handle_new_user_resend_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://dmgafmigqfycyaopdviw.supabase.co/functions/v1/sync-user-to-resend',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZ2FmbWlncWZ5Y3lhb3Bkdml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzOTcwMjIsImV4cCI6MjA2OTk3MzAyMn0.345FkofdJmMeSonXdS7lfnplD408okZQdGF7iZJVqrI'
    ),
    body := jsonb_build_object('user_id', NEW.id, 'email', NEW.email)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block signup if the sync call fails
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_resend_sync ON auth.users;
CREATE TRIGGER on_auth_user_created_resend_sync
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_resend_sync();
