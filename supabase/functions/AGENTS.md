# AGENTS
- Activation/recovery use native Supabase email codes typed on inert /set-password and /reset-password (code only in memory); no consumable links, resends never touch roles/plans, redirects allowlisted in `_shared/auth-code.ts` — mail scanners consumed one-time links.
