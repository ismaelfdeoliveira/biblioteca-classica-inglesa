import { useState, useRef, type KeyboardEvent, type ClipboardEvent } from 'react';
import { auth } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { Loader2, AlertCircle, RefreshCw, ShieldCheck, ArrowLeft } from 'lucide-react';
import type { ConfirmationResult } from 'firebase/auth';

interface CodeConfirmProps {
  confirmationResult: ConfirmationResult;
  maskedPhone: string;
  phone: string;
  onVerified: (profile: { full_name: string; email: string; phone: string; face_token: string }) => void;
  onResend: (newConfirmation: ConfirmationResult) => void;
  onBack: () => void;
}

export default function CodeConfirm({
  confirmationResult,
  maskedPhone,
  phone,
  onVerified,
  onResend,
  onBack,
}: CodeConfirmProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join('');
  const codeComplete = code.length === 6 && !digits.includes('');

  function setDigit(index: number, value: string) {
    const clean = value.replace(/\D/g, '');
    if (clean.length > 1) {
      handlePasteCode(clean);
      return;
    }
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    setError('');
    if (clean && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handlePasteCode(text: string) {
    const clean = text.replace(/\D/g, '').slice(0, 6).padEnd(6, '');
    const next = clean.split('').slice(0, 6);
    setDigits(next);
    if (clean.length >= 6) {
      inputsRef.current[5]?.focus();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    handlePasteCode(e.clipboardData.getData('text'));
  }

  async function handleSubmit() {
    if (!codeComplete || submitting) return;
    setError('');
    setSubmitting(true);

    try {
      const result = await confirmationResult.confirm(code);
      if (result.user) {
        setSuccess(true);
        // Fetch profile from Supabase for the welcome screen
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user.id;
        if (userId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone, face_token')
            .eq('id', userId)
            .maybeSingle();

          onVerified({
            full_name: profile?.full_name ?? '',
            email: sessionData.session?.user.email ?? '',
            phone: profile?.phone ?? '',
            face_token: profile?.face_token ?? '',
          });
        } else {
          onVerified({ full_name: '', email: '', phone: '', face_token: '' });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Incorrect code. Please try again.';
      // Firebase error: auth/invalid-verification-code
      setError(msg.includes('invalid-verification-code')
        ? 'Incorrect code. Please try again.'
        : msg);
      setDigits(Array(6).fill(''));
      inputsRef.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || resending) return;
    setError('');
    setResending(true);

    try {
      if (!auth) {
        setError('Firebase is not configured.');
        return;
      }

      const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth');

      // Clear old reCAPTCHA container and create a fresh one
      const container = document.getElementById('recaptcha-container');
      if (container) container.innerHTML = '';

      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {},
        'expired-callback': () => {
          setError('reCAPTCHA expired. Please try again.');
        },
      });

      const newConfirmation = await signInWithPhoneNumber(auth, phone, recaptchaVerifier);
      onResend(newConfirmation);

      setResendCooldown(60);
      startCooldown();
      setDigits(Array(6).fill(''));
      setSuccess(false);
      inputsRef.current[0]?.focus();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not resend code.';
      setError(msg);
    } finally {
      setResending(false);
    }
  }

  function startCooldown() {
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  if (success) {
    return (
      <div className="flex flex-col items-center text-center space-y-5 animate-fade-up">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gold text-bordo-deep animate-scale-in shadow-2xl">
          <ShieldCheck size={50} strokeWidth={2} />
        </div>
        <p className="font-serif-display text-3xl text-bordo">Verified!</p>
        <p className="ornament-line max-w-xs mx-auto">
          <span className="font-serif-display text-lg">❦</span>
        </p>
        <p className="font-body text-lg text-ink/70">Taking you to the library...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hidden container for reCAPTCHA on resend */}
      <div id="recaptcha-container" />

      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-bordo/60 hover:text-bordo transition-colors font-body"
      >
        <ArrowLeft size={16} /> Back to login
      </button>

      <div className="text-center space-y-1">
        <p className="font-body text-base text-ink/70 leading-relaxed">
          A 6-digit verification code was sent via SMS to{' '}
          <span className="font-medium text-bordo">{maskedPhone}</span>.
        </p>
      </div>

      {/* 6-digit input */}
      <div className="flex justify-center gap-2 sm:gap-3">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputsRef.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            disabled={submitting}
            className={`h-16 w-12 sm:h-18 sm:w-16 rounded-xl border-2 bg-white/80 text-center font-serif-display text-2xl sm:text-3xl text-ink transition-all duration-200 input-classic ${
              d ? 'border-gold bg-white shadow-md' : 'border-ink/20'
            } ${error && !d ? 'border-bordo/50' : ''}`}
          />
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border-2 border-bordo/40 bg-bordo/12 p-3.5 text-sm text-bordo font-body animate-fade-in">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {/* Verify button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!codeComplete || submitting}
        className={`group relative w-full overflow-hidden rounded-lg py-3.5 font-serif-display text-lg tracking-wide transition-all duration-300 ${
          codeComplete && !submitting
            ? 'btn-gold-shimmer text-bordo-deep shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer'
            : 'bg-ink/10 text-ink/40 cursor-not-allowed'
        }`}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {submitting ? (
            <>
              <Loader2 size={20} className="animate-spin" /> Verifying...
            </>
          ) : (
            <>
              <ShieldCheck size={20} /> Verify Code
            </>
          )}
        </span>
      </button>

      {/* Resend */}
      <div className="text-center pt-1">
        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0 || resending}
          className={`inline-flex items-center gap-2 font-serif-display text-base px-5 py-2.5 rounded-lg transition-all ${
            resendCooldown > 0 || resending
              ? 'text-ink/35 cursor-not-allowed bg-ink/5'
              : 'text-bordo border-2 border-gold/40 hover:border-gold hover:bg-gold/8 hover:shadow-md'
          }`}
        >
          {resending ? (
            <>
              <Loader2 size={17} className="animate-spin" /> Sending...
            </>
          ) : resendCooldown > 0 ? (
            `Resend available in ${resendCooldown}s`
          ) : (
            <>
              <RefreshCw size={17} /> Resend code
            </>
          )}
        </button>
      </div>
    </div>
  );
}
