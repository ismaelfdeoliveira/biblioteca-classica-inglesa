import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { auth, hasConfig } from '@/lib/firebase';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, BookOpen, ScanFace, KeyRound } from 'lucide-react';
import type { ConfirmationResult } from 'firebase/auth';

interface LoginFormProps {
  onCodeSent: (confirmationResult: ConfirmationResult, maskedPhone: string, fullPhone: string) => void;
  onSwitchToRegister: () => void;
  onSwitchToFaceLogin: () => void;
  onSwitchToForgotPassword: () => void;
  sessionExpired?: boolean;
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return '••••';
  return phone.slice(0, 3) + ' ••••• ' + phone.slice(-2);
}

export default function LoginForm({ onCodeSent, onSwitchToRegister, onSwitchToFaceLogin, onSwitchToForgotPassword, sessionExpired }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit = emailValid && password.length > 0 && !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');

    if (!hasConfig || !auth) {
      setError('Firebase is not configured. Please add your Firebase credentials to the .env file.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Authenticate with Supabase email/password
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }
      if (!signInData.user) {
        setError('Login failed. Please try again.');
        return;
      }

      // 2. Fetch the user's phone from their profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', signInData.user.id)
        .maybeSingle();

      if (profileError || !profile?.phone) {
        setError('No phone number found on your profile. Please register first.');
        await supabase.auth.signOut();
        return;
      }

      const phone = profile.phone;

      // 3. Set up invisible reCAPTCHA and send SMS via Firebase
      const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth');

      // Create a fresh invisible reCAPTCHA verifier
      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => { /* resolved automatically */ },
        'expired-callback': () => {
          setError('reCAPTCHA expired. Please try again.');
        },
      });

      const confirmationResult = await signInWithPhoneNumber(auth, phone, recaptchaVerifier);

      onCodeSent(confirmationResult, maskPhone(phone), phone);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      // Firebase errors often contain a code prefix like "auth/invalid-phone-number"
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const inputBase =
    'input-classic w-full rounded-lg border border-ink/15 bg-white/70 py-3 pl-11 pr-11 text-ink placeholder:text-ink/35 font-body text-lg transition-all duration-200 focus:bg-white';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Hidden container for invisible reCAPTCHA */}
      <div id="recaptcha-container" />

      {sessionExpired && (
        <div className="flex items-start gap-2 rounded-lg border border-gold/40 bg-gold/10 p-3 text-sm text-bordo font-body animate-fade-in">
          <AlertCircle size={18} className="shrink-0 mt-0.5 text-gold-aged" />
          <span>Your session expired due to inactivity. Please sign in again.</span>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-sm font-medium tracking-wide text-ink/80 font-body">Email</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bordo/60">
            <Mail size={18} />
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane.austen@library.uk"
            autoComplete="email"
            className={inputBase}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium tracking-wide text-ink/80 font-body">Password</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bordo/60">
            <Lock size={18} />
          </span>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            autoComplete="current-password"
            className={inputBase}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-bordo/60 hover:text-bordo transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-bordo/30 bg-bordo/10 p-3 text-sm text-bordo font-body animate-fade-in">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className={`group relative w-full overflow-hidden rounded-lg py-3.5 font-serif-display text-lg tracking-wide transition-all duration-300 ${
          canSubmit
            ? 'btn-gold-shimmer text-bordo-deep shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer'
            : 'bg-ink/10 text-ink/40 cursor-not-allowed'
        }`}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {submitting ? (
            <>
              <Loader2 size={20} className="animate-spin" /> Sending code...
            </>
          ) : (
            <>
              <BookOpen size={20} /> Sign In & Send Code
            </>
          )}
        </span>
      </button>

      <div className="text-center pt-2 space-y-2">
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="font-body text-sm text-bordo/70 hover:text-bordo underline underline-offset-4 decoration-gold/40 hover:decoration-gold transition-all"
        >
          Don't have an account? Register here
        </button>
        <br />
        <button
          type="button"
          onClick={onSwitchToForgotPassword}
          className="inline-flex items-center gap-1.5 font-body text-sm text-bordo/60 hover:text-bordo underline underline-offset-4 decoration-gold/40 hover:decoration-gold transition-all"
        >
          <KeyRound size={14} /> Forgot my password
        </button>
      </div>

      {/* Face login alternative */}
      <div className="border-t-2 border-gold/25 pt-6 mt-2">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-gold/20" />
          <p className="font-serif-display text-sm tracking-widest text-bordo/70 uppercase">or</p>
          <div className="h-px flex-1 bg-gold/20" />
        </div>
        <button
          type="button"
          onClick={onSwitchToFaceLogin}
          className="w-full flex items-center justify-center gap-3 font-serif-display text-lg text-bordo-deep border-2 border-bordo/30 rounded-xl px-6 py-4 bg-white/60 transition-all duration-300 hover:border-bordo hover:bg-white hover:shadow-xl hover:-translate-y-0.5"
        >
          <ScanFace size={26} className="text-bordo" /> Sign in with Face Recognition
        </button>
        <p className="font-body text-sm text-ink/50 mt-2.5 text-center leading-relaxed">
          Skip the password — use your face to sign in instantly
        </p>
      </div>
    </form>
  );
}
