/*
# Create profiles table for the Classical English Literature Library

1. Purpose
   This app uses Supabase email/password auth. `auth.users` already stores the
   email and password. This new `profiles` table extends each auth user with the
   extra fields requested for the library platform: full name, phone, and a
   `face_token` (text, initially empty) reserved for future face-recognition use.

2. New Tables
   - `profiles`
     - `id` (uuid, primary key, references auth.users.id ON DELETE CASCADE)
     - `full_name` (text, not null)
     - `phone` (text, nullable)
     - `face_token` (text, nullable, initially null/empty — populated later by
       the verify-face edge function after a successful Face++ Detect call)
     - `created_at` (timestamptz, default now())
     - `updated_at` (timestamptz, default now())

3. Automation
   - A trigger function `handle_new_user_profile()` inserts a profile row
     automatically whenever a new row is added to `auth.users` (i.e. on signup).
     It copies the email into the profile for convenience and leaves face_token
     empty. The frontend will UPDATE the profile with full_name and phone right
     after signup (those values are collected in the registration form but are
     not part of the auth signup payload).
   - An `updated_at` trigger keeps the `updated_at` column fresh on every update.

4. Security (RLS)
   - RLS enabled on `profiles`.
   - Each authenticated user can SELECT / UPDATE only their own profile row
     (auth.uid() = id). INSERT is handled server-side by the trigger (the
     frontend never inserts into profiles directly), so no INSERT policy is
     granted to the anon/authenticated roles — the trigger runs as definer.
   - DELETE is not granted to users (profiles are removed via CASCADE when the
     auth user is deleted).

5. Notes
   - The trigger function is SECURITY DEFINER so it can insert into profiles
     even though the calling role (anon, during signup) has no INSERT policy.
   - face_token starts empty and is only filled by the verify-face edge function
     using the service role key, never from the anon-key frontend.
*/

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text,
  face_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger: auto-create a profile row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, face_token)
  VALUES (NEW.id, '', NULL, NULL)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Trigger: keep updated_at fresh
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
