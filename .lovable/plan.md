## Goal
After a prospect submits the public interest form, send them a branded confirmation email via Resend.

## Changes

### 1. New Edge Function: `send-interest-confirmation`
- Public (`verify_jwt = false`) in `supabase/config.toml`.
- Input: `{ email, full_name, producer_name, user_name }`.
- Validates input (email format, string lengths), CORS headers.
- Uses `RESEND_API_KEY` (already configured).
- Sends from `simon@exportvins.fr` — note: Resend requires the sending domain (`exportvins.fr`) to be verified in the Resend account. If not verified, sending will fail; will surface a clear error. Existing `notify-campaign-submission` currently sends via `notifications@resend.dev`, so this may need domain verification.
- Subject: `Your interest has been received — {Producer Name}`
- HTML email using WineExporters design system:
  - Dark background `#0a0a0a`
  - Burgundy accent `#59191F`
  - White text, sans-serif, centered, max-width 600px
  - "WineExporters" wordmark header
  - Body copy per spec
  - Footer: `Powered by WineExporters — wine-exporters.com`

### 2. Update `submit-campaign-interest` Edge Function
- After successful insert into `campaign_interested_contacts`, fetch the producer's display name (already have `producer_name` from `get_campaign_public_info`).
- Also fetch producer's contact name / display name (`user_name`) to personalize "[User Name] has received your message". Reuse the same RPC result — `producer_name` already resolves to domain/display/contact name.
- Invoke `send-interest-confirmation` (fire-and-forget; failure to send email must not fail the submission — log only).

### 3. No frontend changes
The form already awaits `submit-campaign-interest`; email is triggered server-side.

## Technical notes
- Email HTML built inline (no template file), consistent with existing `notify-campaign-submission` pattern.
- `[User Name]` in the spec = producer name (the recipient producer of the campaign), same value used as `[Producer Name]` in subject.
- Idempotency: no dedup key added (form submissions are already user-initiated one-offs).
- Domain verification for `simon@exportvins.fr` on Resend is a prerequisite; if unverified, will fall back to logging the error without breaking submission.
