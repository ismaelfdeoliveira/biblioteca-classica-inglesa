import { useState, useMemo, useEffect, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { validatePassword } from '@/lib/passwordValidation';
import {
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  AlertCircle,
  KeyRound,
  ArrowLeft,
} from 'lucide-react';

interface NewPasswordScreenProps {
  onBack: () => void;
}

export default function NewPasswordScreen({ onBack }: NewPasswordScreenProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [userName, setUserName] = useState('');
  const [recoveryReady, setRecoveryReady] = useState(false);

  // On mount, check if we arrived from a recovery link and establish the session.
  useEffect(() => {
    async function processRecovery() {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const type = hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (type === 'recovery' && accessToken && refreshToken) {
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError || !data.user) {
          setError('This password reset link is invalid or has expired. Please request a new one.');
          return;
        }

        setUserName(data.user.email ?? '');
        setRecoveryReady(true);
      } else {
        // Also listen for the auth event in case Supabase handles it via onAuthStateChange
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY' && session?.user) {
            setUserName(session.user.email ?? '');
            setRecoveryReady(true);
            listener.subscription.unsubscribe();
          }
        });

        // Check current session as fallback
        supabase.auth.getSession().then(({ data }) => {
          if (data.session?.user) {
            setUserName(data.session.user.email ?? '');
            setRecoveryReady(true);
          }
        });

        return () => listener.subscription.unsubscribe();
      }
    }
    processRecovery();
  }, []);

  const validation = useMemo(
    () => validatePassword(newPassword, userName),
    [newPassword, userName]
  );
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = recoveryReady && validation.allValid && passwordsMatch && !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setSubmitting(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function ruleRow(valid: boolean, label: string) {
    return (
      <div className="flex items-center gap-2 text-sm font-body transition-all duration-300">
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full transition-all duration-300 ${
            valid ? 'bg-forest text-parchment scale-100' : 'bg-ink/10 text-ink/40 scale-90'
          }`}
        >
          {valid ? <Check size={12} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
        </span>
        <span className={valid ? 'text-forest' : 'text-ink/50'}>{label}</span>
      </div>
    );
  }

  const inputBase =
    'input-classic w-full rounded-lg border border-ink/15 bg-white/70 py-3 pl-11 pr-11 text-ink placeholder:text-ink/35 font-body text-lg transition-all duration-200 focus:bg-white';

  if (success) {
    return (
      <div className="space-y-5 text-center">
        <div className="flex flex-col items-center gap-4 animate-fade-up">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gold text-bordo-deep animate-scale-in shadow-xl">
            <Check size={42} strokeWidth={2.5} />
          </div>
          <h3 className="font-serif-display text-2xl text-bordo">Password Updated</h3>
          <p className="ornament-line max-w-xs mx-auto">
            <span className="font-serif-display text-base">❦</span>
          </p>
          <p className="font-body text-base text-ink/70 leading-relaxed max-w-sm">
            Your password has been changed successfully. You can now sign in with your new
            password.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-2 inline-flex items-center gap-2 font-serif-display text-base text-bordo-deep btn-gold-shimmer rounded-lg px-6 py-3 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            <KeyRound size={18} /> Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-bordo/60 hover:text-bordo transition-colors font-body"
      >
        <ArrowLeft size={16} /> Back to login
      </button>

      {!recoveryReady && !error && (
        <div className="flex items-center justify-center gap-2 text-ink/60 font-body text-sm py-4">
          <Loader2 size={18} className="animate-spin text-gold-aged" /> Verifying reset link...
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-bordo/30 bg-bordo/10 p-3 text-sm text-bordo font-body animate-fade-in">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {recoveryReady && (
        <>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium tracking-wide text-ink/80 font-body">
              New password
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bordo/60">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 12 characters"
                autoComplete="new-password"
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

          {newPassword.length > 0 && (
            <div className="rounded-lg border border-gold/30 bg-gold/5 p-4 space-y-2 animate-fade-in">
              <p className="text-xs font-medium text-bordo tracking-wide uppercase mb-1">
                Password requirements
              </p>
              {ruleRow(validation.rules.minLength, 'At least 12 characters')}
              {ruleRow(validation.rules.noName, 'Does not contain your name')}
              {ruleRow(validation.rules.hasNumber, 'Contains at least one number')}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-sm font-medium tracking-wide text-ink/80 font-body">
              Confirm new password
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bordo/60">
                <Lock size={18} />
              </span>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                className={inputBase}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-bordo/60 hover:text-bordo transition-colors"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="flex items-center gap-1.5 text-xs text-bordo font-body pt-0.5 animate-fade-in">
                <AlertCircle size={13} /> Passwords do not match
              </p>
            )}
          </div>

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
                  <Loader2 size={20} className="animate-spin" /> Updating...
                </>
              ) : (
                <>
                  <KeyRound size={20} /> Set New Password
                </>
              )}
            </span>
          </button>
        </>
      )}
    </form>
  );
}
