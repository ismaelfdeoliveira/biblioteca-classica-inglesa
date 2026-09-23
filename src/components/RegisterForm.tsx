import { useState, useMemo, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { validatePassword } from '@/lib/passwordValidation';
import { BookOpen, Check, X, Loader2, Lock, Mail, Phone, User, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface RegisterFormProps {
  onRegistered: (userId: string) => void;
}

interface FieldProps {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  error?: string;
}

function Field({ label, icon, children, error }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium tracking-wide text-ink/80 font-body">{label}</label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bordo/60">{icon}</span>
        {children}
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-bordo font-body pt-0.5 animate-fade-in">
          <AlertCircle size={13} /> {error}
        </p>
      )}
    </div>
  );
}

const inputBase =
  'input-classic w-full rounded-lg border border-ink/15 bg-white/70 py-3 pl-11 pr-4 text-ink placeholder:text-ink/35 font-body text-lg transition-all duration-200 focus:bg-white';

export default function RegisterForm({ onRegistered }: RegisterFormProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [touched, setTouched] = useState({ password: false, confirm: false });

  const validation = useMemo(() => validatePassword(password, fullName), [password, fullName]);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const nameValid = fullName.trim().length >= 3;
  const phoneValid = phone.trim().length === 0 || /^[0-9()+\-\s]{8,}$/.test(phone.trim());

  const canSubmit =
    nameValid && emailValid && phoneValid && validation.allValid && passwordsMatch && !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setFormError('');
    setSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        setFormError(error.message);
        return;
      }
      if (!data.user) {
        setFormError('Registration failed. Please try again.');
        return;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), phone: phone.trim() || null })
        .eq('id', data.user.id);

      if (profileError) {
        setFormError('Account created, but we could not save your profile details. Please continue.');
      }

      onRegistered(data.user.id);
    } catch {
      setFormError('Something went wrong. Please try again.');
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

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Full name" icon={<User size={18} />}>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jane Austen"
          autoComplete="name"
          className={inputBase}
        />
      </Field>

      <Field label="Email" icon={<Mail size={18} />}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane.austen@library.uk"
          autoComplete="email"
          className={inputBase}
        />
      </Field>

      <Field label="Telephone" icon={<Phone size={18} />}>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+44 20 7946 0000"
          autoComplete="tel"
          className={inputBase}
        />
      </Field>

      <Field label="Password" icon={<Lock size={18} />}>
        <input
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          placeholder="At least 12 characters"
          autoComplete="new-password"
          className={`${inputBase} pr-11`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((s) => !s)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-bordo/60 hover:text-bordo transition-colors"
          tabIndex={-1}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </Field>

      {password.length > 0 && (
        <div className="rounded-lg border border-gold/30 bg-gold/5 p-4 space-y-2 animate-fade-in">
          <p className="text-xs font-medium text-bordo tracking-wide uppercase mb-1">Password requirements</p>
          {ruleRow(validation.rules.minLength, 'At least 12 characters')}
          {ruleRow(validation.rules.noName, 'Does not contain your name')}
          {ruleRow(validation.rules.hasNumber, 'Contains at least one number')}
        </div>
      )}

      <Field
        label="Confirm password"
        icon={<Lock size={18} />}
        error={touched.confirm && confirmPassword.length > 0 && !passwordsMatch ? 'Passwords do not match' : undefined}
      >
        <input
          type={showConfirm ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          className={`${inputBase} pr-11`}
        />
        <button
          type="button"
          onClick={() => setShowConfirm((s) => !s)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-bordo/60 hover:text-bordo transition-colors"
          tabIndex={-1}
        >
          {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </Field>

      {formError && (
        <div className="flex items-start gap-2 rounded-lg border border-bordo/30 bg-bordo/10 p-3 text-sm text-bordo font-body animate-fade-in">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{formError}</span>
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
              <Loader2 size={20} className="animate-spin" /> Registering...
            </>
          ) : (
            <>
              <BookOpen size={20} /> Enroll in the Library
            </>
          )}
        </span>
      </button>
    </form>
  );
}
