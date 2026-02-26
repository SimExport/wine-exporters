SELECT cron.schedule(
  'daily-reminders-8h',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dmgafmigqfycyaopdviw.supabase.co/functions/v1/send-daily-reminders',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZ2FmbWlncWZ5Y3lhb3Bkdml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzOTcwMjIsImV4cCI6MjA2OTk3MzAyMn0.345FkofdJmMeSonXdS7lfnplD408okZQdGF7iZJVqrI"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);