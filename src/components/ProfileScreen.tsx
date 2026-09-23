import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { auth, hasConfig } from '@/lib/firebase';
import {
  User as UserIcon,
  Mail,
  Phone,
  Fingerprint,
  LogOut,
  Edit3,
  Check,
  X,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Camera,
  RefreshCw,
} from 'lucide-react';
import type { ConfirmationResult } from 'firebase/auth';

interface ProfileData {
  full_name: string;
  email: string;
  phone: string;
  face_token: string;
}

interface ProfileScreenProps {
  profile: ProfileData;
  onProfileUpdated: (profile: ProfileData) => void;
  onSignOut: () => void;
}

export default function ProfileScreen({ profile, onProfileUpdated, onSignOut }: ProfileScreenProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(profile.full_name);
  const [editPhone, setEditPhone] = useState(profile.phone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Phone reconfirmation state
  const [phoneChanged, setPhoneChanged] = useState(false);
  const [confirmStep, setConfirmStep] = useState<'none' | 'sending' | 'code' | 'face'>('none');
  const [verifying, setVerifying] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [smsCode, setSmsCode] = useState('');
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);
  const [streamRef, setStreamRef] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const phoneValid = editPhone.trim().length === 0 || /^[0-9()+\-\s]{8,}$/.test(editPhone.trim());
  const canSave = editName.trim().length >= 3 && phoneValid && !saving;

  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  function startEdit() {
    setEditName(profile.full_name);
    setEditPhone(profile.phone);
    setEditing(true);
    setError('');
    setSuccess('');
    setPhoneChanged(false);
    setConfirmStep('none');
  }

  function cancelEdit() {
    setEditing(false);
    setError('');
    setSuccess('');
    setPhoneChanged(false);
    setConfirmStep('none');
    stopCamera();
  }

  const stopCamera = useCallback(() => {
    if (streamRef) {
      streamRef.getTracks().forEach((t) => t.stop());
      setStreamRef(null);
    }
    setCameraReady(false);
  }, [streamRef]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      setStreamRef(stream);
      if (videoRef) {
        videoRef.srcObject = stream;
        await videoRef.play();
      }
      setCameraReady(true);
    } catch {
      setError('Could not access the camera. Please allow camera permissions.');
    }
  }

  function captureFace() {
    const video = videoRef;
    if (!video) return;
    const canvas = document.createElement('canvas');
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    setFaceImage(canvas.toDataURL('image/jpeg', 0.85));
    stopCamera();
  }

  async function verifyFace() {
    if (!faceImage) return;
    setVerifying(true);
    setError('');

    try {
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/login-face`;
      const res = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email: profile.email, image_base64: faceImage }),
      });

      const json = await res.json();

      if (json.recognized) {
        await doSave();
      } else {
        setError('Face not recognized. Please try again or use SMS verification.');
        setVerifying(false);
      }
    } catch {
      setError('Verification failed. Please try again.');
      setVerifying(false);
    }
  }

  async function sendSmsCode() {
    if (!hasConfig || !auth) {
      setError('Firebase is not configured for SMS verification.');
      return;
    }
    setConfirmStep('sending');
    setError('');

    try {
      const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth');
      const container = document.getElementById('profile-recaptcha');
      if (container) container.innerHTML = '';

      const recaptchaVerifier = new RecaptchaVerifier(auth, 'profile-recaptcha', {
        size: 'invisible',
        callback: () => {},
      });

      const result = await signInWithPhoneNumber(auth, editPhone.trim(), recaptchaVerifier);
      setConfirmationResult(result);
      setConfirmStep('code');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not send SMS code.';
      setError(msg);
      setConfirmStep('none');
    }
  }

  async function verifySmsCode() {
    if (!confirmationResult || smsCode.length === 0) return;
    setVerifying(true);
    setError('');

    try {
      await confirmationResult.confirm(smsCode);
      await doSave();
    } catch {
      setError('Incorrect code. Please try again.');
      setVerifying(false);
    }
  }

  async function doSave() {
    setSaving(true);
    setError('');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) {
        setError('No active session. Please sign in again.');
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: editName.trim(), phone: editPhone.trim() || null })
        .eq('id', userId);

      if (updateError) {
        setError('Could not save changes. Please try again.');
        setConfirmStep('none');
        return;
      }

      onProfileUpdated({
        ...profile,
        full_name: editName.trim(),
        phone: editPhone.trim(),
      });
      setEditing(false);
      setPhoneChanged(false);
      setConfirmStep('none');
      setSuccess('Profile updated successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Something went wrong. Please try again.');
      setConfirmStep('none');
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!canSave) return;

    const phoneActuallyChanged = editPhone.trim() !== profile.phone;

    if (!phoneActuallyChanged) {
      // No phone change — save directly
      await doSave();
    } else {
      // Phone changed — need reconfirmation
      setPhoneChanged(true);
      // User picks method via UI buttons
    }
  }

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const inputBase =
    'input-classic w-full rounded-lg border border-ink/15 bg-white/70 py-3 pl-11 pr-4 text-ink placeholder:text-ink/35 font-body text-lg transition-all duration-200 focus:bg-white';

  return (
    <div className="space-y-6 animate-fade-up">
      <div id="profile-recaptcha" />

      {/* Profile header */}
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-bordo text-parchment font-serif-display text-2xl shadow-lg">
            {initials || <UserIcon size={36} />}
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-gold text-bordo-deep border-2 border-parchment">
            <ShieldCheck size={16} strokeWidth={2.5} />
          </div>
        </div>
        <div>
          <h3 className="font-serif-display text-2xl text-bordo">
            {profile.full_name || 'Reader'}
          </h3>
          <p className="ornament-line max-w-xs mx-auto mt-1">
            <span className="font-serif-display text-base">❦</span>
          </p>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-forest/30 bg-forest/10 p-3 text-sm text-forest font-body animate-fade-in">
          <Check size={18} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-bordo/30 bg-bordo/10 p-3 text-sm text-bordo font-body animate-fade-in">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Profile data / edit form */}
      {!editing ? (
        <div className="rounded-xl border border-gold/30 bg-white/50 overflow-hidden">
          <div className="bg-bordo/5 px-5 py-3 border-b border-gold/20 flex items-center justify-between">
            <p className="font-serif-display text-lg text-bordo flex items-center gap-2">
              <UserIcon size={18} /> Your Details
            </p>
            <button
              type="button"
              onClick={startEdit}
              className="flex items-center gap-1.5 text-sm text-bordo/60 hover:text-bordo transition-colors font-body"
            >
              <Edit3 size={15} /> Edit
            </button>
          </div>
          <div className="p-5 space-y-3">
            <ProfileRow icon={<UserIcon size={18} />} label="Name" value={profile.full_name || '—'} />
            <ProfileRow icon={<Mail size={18} />} label="Email" value={profile.email || '—'} />
            <ProfileRow icon={<Phone size={18} />} label="Phone" value={profile.phone || '—'} />
            <ProfileRow
              icon={<Fingerprint size={18} />}
              label="Face verification"
              value={profile.face_token ? 'Verified' : 'Not verified'}
              badge={profile.face_token ? 'success' : 'pending'}
            />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gold/30 bg-white/50 overflow-hidden">
          <div className="bg-bordo/5 px-5 py-3 border-b border-gold/20">
            <p className="font-serif-display text-lg text-bordo">Edit Profile</p>
          </div>
          <div className="p-5 space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium tracking-wide text-ink/80 font-body">
                Full name
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bordo/60">
                  <UserIcon size={18} />
                </span>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={inputBase}
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium tracking-wide text-ink/80 font-body">
                Telephone
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bordo/60">
                  <Phone size={18} />
                </span>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className={inputBase}
                />
              </div>
            </div>

            {/* Phone reconfirmation */}
            {phoneChanged && confirmStep === 'none' && (
              <div className="rounded-lg border border-gold/40 bg-gold/5 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <ShieldCheck size={18} className="shrink-0 mt-0.5 text-bordo" />
                  <div>
                    <p className="font-body text-sm text-bordo font-medium">
                      Phone number changed
                    </p>
                    <p className="font-body text-xs text-ink/60 mt-0.5">
                      For your security, please verify your identity to confirm this change.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={sendSmsCode}
                    className="flex items-center justify-center gap-2 rounded-lg border border-gold/40 px-4 py-2.5 font-serif-display text-sm text-bordo hover:bg-gold/10 transition-all"
                  >
                    <Phone size={16} /> Verify via SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmStep('face');
                      setFaceImage(null);
                      setTimeout(startCamera, 100);
                    }}
                    className="flex items-center justify-center gap-2 rounded-lg border border-gold/40 px-4 py-2.5 font-serif-display text-sm text-bordo hover:bg-gold/10 transition-all"
                  >
                    <Camera size={16} /> Verify via Face
                  </button>
                </div>
              </div>
            )}

            {/* SMS code input */}
            {confirmStep === 'code' && (
              <div className="rounded-lg border border-gold/40 bg-gold/5 p-4 space-y-3">
                <p className="font-body text-sm text-bordo">
                  A code was sent to {editPhone}. Enter it below:
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit code"
                  className="input-classic w-full rounded-lg border border-ink/15 bg-white/70 py-3 px-4 text-ink font-body text-lg text-center tracking-widest"
                />
                <button
                  type="button"
                  onClick={verifySmsCode}
                  disabled={smsCode.length !== 6 || verifying}
                  className={`w-full rounded-lg py-3 font-serif-display text-base transition-all ${
                    smsCode.length === 6
                      ? 'btn-gold-shimmer text-bordo-deep shadow-lg hover:shadow-xl'
                      : 'bg-ink/10 text-ink/40 cursor-not-allowed'
                  }`}
                >
                  {verifying ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={18} className="animate-spin" /> Verifying...
                    </span>
                  ) : (
                    'Confirm Code'
                  )}
                </button>
              </div>
            )}

            {/* Face capture */}
            {confirmStep === 'face' && (
              <div className="rounded-lg border border-gold/40 bg-gold/5 p-4 space-y-3">
                <p className="font-body text-sm text-bordo">
                  Look into the camera to verify your identity:
                </p>
                <div className="relative mx-auto aspect-[4/3] w-full max-w-xs overflow-hidden rounded-lg border-2 border-gold/30 bg-forest-deep">
                  {!faceImage ? (
                    <>
                      <video
                        ref={setVideoRef}
                        playsInline
                        muted
                        className="h-full w-full object-cover scale-x-[-1]"
                      />
                      {cameraReady && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="h-3/4 w-1/2 rounded-full border-2 border-gold/50 border-dashed" />
                        </div>
                      )}
                    </>
                  ) : (
                    <img src={faceImage} alt="Captured" className="h-full w-full object-cover" />
                  )}
                </div>
                {!faceImage ? (
                  <button
                    type="button"
                    onClick={captureFace}
                    disabled={!cameraReady}
                    className={`w-full rounded-lg py-3 font-serif-display text-base transition-all ${
                      cameraReady
                        ? 'btn-gold-shimmer text-bordo-deep shadow-lg'
                        : 'bg-ink/10 text-ink/40 cursor-not-allowed'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Camera size={18} /> Capture
                    </span>
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFaceImage(null);
                        setTimeout(startCamera, 100);
                      }}
                      className="flex-1 rounded-lg border border-ink/20 bg-white/60 py-2.5 font-serif-display text-sm text-ink hover:bg-white transition-all"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw size={16} /> Retake
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={verifyFace}
                      disabled={verifying}
                      className="flex-1 rounded-lg btn-gold-shimmer py-2.5 font-serif-display text-sm text-bordo-deep shadow-lg hover:shadow-xl transition-all"
                    >
                      {verifying ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 size={16} className="animate-spin" /> Verifying...
                        </span>
                      ) : (
                        'Verify'
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Sending state */}
            {confirmStep === 'sending' && (
              <div className="flex items-center justify-center gap-2 text-ink/60 font-body text-sm py-2">
                <Loader2 size={18} className="animate-spin text-gold-aged" /> Sending SMS code...
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-ink/20 bg-white/60 py-3 font-serif-display text-base text-ink hover:bg-white transition-all"
              >
                <X size={18} /> Cancel
              </button>
              {confirmStep === 'none' && !phoneChanged && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSave}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-3 font-serif-display text-base transition-all ${
                    canSave
                      ? 'btn-gold-shimmer text-bordo-deep shadow-lg hover:shadow-xl'
                      : 'bg-ink/10 text-ink/40 cursor-not-allowed'
                  }`}
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={18} className="animate-spin" /> Saving...
                    </span>
                  ) : (
                    <>
                      <Check size={18} /> Save
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quote */}
      <div className="rounded-xl border border-ink/10 bg-parchment-dark/40 p-5 text-center">
        <p className="font-body italic text-base text-ink/70 leading-relaxed">
          "A reader lives a thousand lives before he dies. The man who never reads lives only one."
        </p>
        <p className="font-body text-sm text-ink/40 mt-2">— George R.R. Martin</p>
      </div>

      {/* Sign out */}
      <button
        type="button"
        onClick={onSignOut}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-bordo/20 bg-white/50 py-3 font-serif-display text-base text-bordo transition-all hover:bg-bordo hover:text-parchment hover:shadow-lg"
      >
        <LogOut size={18} /> Sign Out
      </button>
    </div>
  );
}

function ProfileRow({
  icon,
  label,
  value,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  badge?: 'success' | 'pending';
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 text-ink/50">
        <span className="text-bordo/50">{icon}</span>
        <span className="font-body text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-body text-sm text-ink/80 text-right">{value}</span>
        {badge === 'success' && (
          <span className="flex items-center gap-1 rounded-full bg-forest/10 px-2 py-0.5 text-xs text-forest font-body">
            <ShieldCheck size={11} /> Verified
          </span>
        )}
        {badge === 'pending' && (
          <span className="rounded-full bg-gold-aged/15 px-2 py-0.5 text-xs text-gold-aged font-body">
            Pending
          </span>
        )}
      </div>
    </div>
  );
}
