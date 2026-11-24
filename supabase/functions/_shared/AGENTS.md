# Campaign market targeting
- Keep the catalogue and alias comparison shared between the chooser, reconciliation and both send paths so selected countries cannot diverge from actual Brevo targets.
- Counts expose aggregates only; read-only readiness never substitutes for the live list preflight before every real send, because Brevo suppressions can change.
- Reconciliation defaults to read-only and never resets blacklist flags, touches client lists or calls campaign/email endpoints; provider imports require separate approval.
- Mapping changes must never redeploy the stale local queue worker; preserve the deployed scheduling implementation.
- Keep the market extension rollout off until provider setup and matching send deployments are explicitly approved; before rollout the original 44 choices stay unchanged.