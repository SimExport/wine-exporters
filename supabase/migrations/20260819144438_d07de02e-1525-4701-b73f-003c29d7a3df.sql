WITH d AS (
  SELECT id, campaign_id, origin, created_at,
         lower(split_part(email,'@',2)) AS dom
  FROM public.campaign_interested_contacts
  WHERE email IS NOT NULL AND email <> ''
    AND lower(split_part(email,'@',2)) NOT IN (
      'gmail.com','yahoo.com','yahoo.fr','hotmail.com','hotmail.fr','outlook.com',
      'live.com','icloud.com','aol.com','gmx.de','web.de','naver.com','seznam.cz',
      'orange.fr','free.fr','wanadoo.fr'
    )
),
dupes AS (
  -- clicker rows whose company already exists as a form respondent
  SELECT c.id
  FROM d c
  WHERE c.origin = 'click'
    AND EXISTS (
      SELECT 1 FROM d f
      WHERE f.origin = 'form' AND f.campaign_id = c.campaign_id AND f.dom = c.dom
    )
  UNION
  -- redundant clicker rows for the same company (keep the oldest)
  SELECT id FROM (
    SELECT id, row_number() OVER (PARTITION BY campaign_id, dom ORDER BY created_at) AS rn
    FROM d WHERE origin = 'click'
  ) r WHERE rn > 1
)
DELETE FROM public.campaign_interested_contacts
WHERE id IN (SELECT id FROM dupes);