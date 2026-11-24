# Campaign market targeting
- Keep the catalogue and alias comparison shared between the chooser, reconciliation and both send paths so selected countries cannot diverge from actual Brevo targets.
- Counts expose aggregates only; read-only readiness never substitutes for the live list preflight before every real send, because Brevo suppressions can change.
- Reconciliation defaults to read-only and never resets blacklist flags, touches client lists or calls campaign/email endpoints; provider imports require separate approval.
- The queue worker never re-implements slots or daily quota: the database claim is authoritative, and the worker must never re-queue a claimed entry (the slot guard forbids it).
- Every catalogue market maps to exactly one country list; a market is open for submission only when its list is recorded in the readiness snapshot with a sendable contact, and the send-extension switch stays as the single kill switch for non-historical markets.
- Audience imports only create missing contacts or add list membership for non-blacklisted ones; never update existing contacts, never touch onboarding-automation, blocklist, test or client-source lists.