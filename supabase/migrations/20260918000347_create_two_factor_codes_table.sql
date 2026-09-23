/*
# Create two_factor_codes table for login 2FA

1. Purpose
   Stores temporary 6-digit verification codes for the login two-factor
   authentication flow. A code is generated after a user successfully logs in
   with email/password, sent via Twilio (SMS, WhatsApp, or voice call), and must
   be verified before the user reaches the logged-in area.

2. New Tables
   - `two_factor_codes`
     - `id` (uuid, primary key)
     - `user_id` (uuid, references auth.users.id ON DELETE CASCADE)
     - `code_hash` (text, not null) — SHA-256 hash of the 6-digit code; the
       plaintext code is NEVER stored
     - `channel` (text, not null) — 'sms' | 'whatsapp' | 'call'
     - `phone` (text, not null) — the destination phone number (E.164)
     - `attempts` (int, default 0) — number of failed verification attempts
     - `locked_until` (timestamptz, nullable) — when set, verification is
       temporarily blocked until this timestamp (5-minute lockout after 3 fails)
     - `expires_at` (timestamptz, not null) — code expiry (5 minutes from creation)
     - `consumed_at` (timestamptz, nullable) — set when the code is successfully
       used, so it can't be replayed
     - `created_at` (timestamptz, default now())

3. Security (RLS)
   - RLS enabled.
   - No SELECT/INSERT/UPDATE/DELETE policies for anon or authenticated roles.
     The frontend NEVER reads or writes this table directly. All access is
     through the send-2fa-code and verify-2fa-code edge functions, which use
     the service role key (bypasses RLS).

4. Notes
   - Only the most recent unconsumed, unexpired code per user is valid.
   - The send-2fa-code function deletes old codes before inserting a new one.
   - After 3 failed attempts, locked_until is set 5 minutes in the future.
   - resend is rate-limited to 60 seconds via the created_at timestamp.
*/

CREATE TABLE IF NOT EXISTS public.two_factor_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'call')),
  phone text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.two_factor_codes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_two_factor_codes_user_id
  ON public.two_factor_codes (user_id);

CREATE INDEX IF NOT EXISTS idx_two_factor_codes_expires_at
  ON public.two_factor_codes (expires_at);
