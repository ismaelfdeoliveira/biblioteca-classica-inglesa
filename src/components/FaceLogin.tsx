import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Camera,
  RefreshCw,
  Check,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Lightbulb,
  Mail,
  ScanFace,
  ArrowLeft,
} from 'lucide-react';

interface FaceLoginProps {
  onVerified: (profile: {
    full_name: string;
    email: string;
    phone: string;
    face_token: string;
  }) => void;
  onBack: () => void;
  onUseEmailLogin: () => void;
}

export default function FaceLogin({ onVerified, onBack, onUseEmailLogin }: FaceLoginProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [email, setEmail] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [cameraError, setCameraError] = useState('');

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canCapture = emailValid && !capturedImage && status !== 'verifying' && status !== 'success';
  const canConfirm = emailValid && !!capturedImage && status === 'idle';

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraReady(true);
      } catch {
        setCameraError(
          'We could not access your camera. Please allow camera permissions in your browser and reload the page.'
        );
      }
    }
    startCamera();
    return () => stopStream();
  }, [stopStream]);

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    stopStream();
  }

  function retake() {
    setCapturedImage(null);
    setStatus('idle');
    setMessage('');
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraReady(true);
      } catch {
        setCameraError('Could not restart the camera.');
      }
    })();
  }

  async function confirm() {
    if (!capturedImage || !emailValid) return;
    setStatus('verifying');
    setMessage('');

    try {
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/login-face`;
      const res = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email: email.trim(), image_base64: capturedImage }),
      });

      const json = await res.json();

      if (!res.ok) {
        setStatus('error');
        setMessage(json?.error ?? json?.message ?? 'Verification failed. Please try again.');
        return;
      }

      if (json.recognized && json.otp_token) {
        // Establish a Supabase session using the OTP token from the edge function.
        const { error: otpError } = await supabase.auth.verifyOtp({
          type: 'magiclink',
          email: json.email,
          token: json.otp_token,
        });

        if (otpError) {
          setStatus('error');
          setMessage('Could not establish a session. Please use email and password login.');
          return;
        }

        setStatus('success');
        setMessage('Face recognized! Welcome back.');
        setTimeout(() => {
          onVerified(json.profile);
        }, 1400);
      } else {
        setStatus('error');
        setMessage(
          json.message ?? 'Face not recognized. Please try again or use email and password login.'
        );
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    }
  }

  const inputBase =
    'input-classic w-full rounded-lg border border-ink/15 bg-white/70 py-3 pl-11 pr-4 text-ink placeholder:text-ink/35 font-body text-lg transition-all duration-200 focus:bg-white';

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-bordo/60 hover:text-bordo transition-colors font-body"
      >
        <ArrowLeft size={16} /> Back to login
      </button>

      {/* Email input */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium tracking-wide text-ink/80 font-body">
          Email associated with your account
        </label>
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

      {/* Camera / captured image */}
      <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-xl border-2 border-gold/40 bg-forest-deep shadow-2xl">
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover scale-x-[-1]"
            />
            {cameraReady && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-3/4 w-1/2 rounded-full border-2 border-gold/50 border-dashed animate-pulse-ring" />
              </div>
            )}
            {!cameraReady && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-parchment/70">
                <Loader2 size={32} className="animate-spin text-gold" />
                <p className="font-body text-sm">Starting camera...</p>
              </div>
            )}
          </>
        ) : (
          <img src={capturedImage} alt="Captured face" className="h-full w-full object-cover animate-fade-in" />
        )}

        {status === 'success' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-forest-deep/85 animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold text-bordo-deep animate-scale-in">
              <ShieldCheck size={36} strokeWidth={2.5} />
            </div>
            <p className="font-serif-display text-xl text-gold">Face recognized</p>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {cameraError && (
        <div className="flex items-start gap-2.5 rounded-lg border-2 border-bordo/40 bg-bordo/12 p-3.5 text-sm text-bordo font-body">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <span className="leading-relaxed">{cameraError}</span>
        </div>
      )}

      {status === 'error' && message && (
        <div className="flex items-start gap-2.5 rounded-lg border-2 border-bordo/40 bg-bordo/12 p-3.5 text-sm text-bordo font-body animate-fade-in">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <span className="leading-relaxed">{message}</span>
        </div>
      )}

      {status === 'idle' && cameraReady && !capturedImage && (
        <div className="flex items-start gap-2 rounded-lg border border-gold/30 bg-gold/5 p-3 text-sm text-ink/70 font-body">
          <Lightbulb size={18} className="shrink-0 mt-0.5 text-gold-aged" />
          <span>
            Enter your email, then capture a clear photo of your face. We'll compare it with the
            photo from your registration.
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-center gap-3">
        {!capturedImage && status !== 'success' && status !== 'verifying' && (
          <button
            type="button"
            onClick={capture}
            disabled={!canCapture || !!cameraError}
            className={`flex items-center gap-2 rounded-lg px-6 py-3 font-serif-display text-base tracking-wide transition-all duration-300 ${
              canCapture && !cameraError
                ? 'btn-gold-shimmer text-bordo-deep shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                : 'bg-ink/10 text-ink/40 cursor-not-allowed'
            }`}
          >
            <Camera size={20} /> Capture
          </button>
        )}

        {capturedImage && status === 'idle' && (
          <>
            <button
              type="button"
              onClick={retake}
              className="flex items-center justify-center gap-2.5 rounded-xl border-2 border-bordo bg-bordo px-6 py-4 font-serif-display text-lg text-parchment shadow-lg transition-all hover:bg-bordo-deep hover:border-bordo-deep hover:shadow-xl hover:-translate-y-0.5"
            >
              <RefreshCw size={20} /> Retake
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={!canConfirm}
              className={`flex items-center justify-center gap-2.5 rounded-xl border-2 px-6 py-4 font-serif-display text-lg transition-all ${
                canConfirm
                  ? 'border-bordo bg-bordo text-gold-bright shadow-lg hover:bg-bordo-deep hover:border-bordo-deep hover:shadow-xl hover:-translate-y-0.5'
                  : 'border-ink/20 bg-ink/10 text-ink/40 cursor-not-allowed'
              }`}
            >
              <Check size={20} /> Verify Face
            </button>
          </>
        )}

        {status === 'verifying' && (
          <div className="flex items-center gap-2 text-ink/70 font-body text-base">
            <Loader2 size={20} className="animate-spin text-gold-aged" /> Recognizing your face...
          </div>
        )}

        {status === 'error' && capturedImage && (
          <button
            type="button"
            onClick={retake}
            className="flex items-center justify-center gap-2.5 rounded-xl border-2 border-bordo bg-bordo px-6 py-4 font-serif-display text-lg text-parchment shadow-lg transition-all hover:bg-bordo-deep hover:border-bordo-deep hover:shadow-xl hover:-translate-y-0.5"
          >
            <RefreshCw size={20} /> Try Again
          </button>
        )}
      </div>

      {/* Fallback to email/password login */}
      {status !== 'success' && status !== 'verifying' && (
        <div className="border-t border-gold/15 pt-4 text-center">
          <p className="font-body text-sm text-ink/50 mb-2">Having trouble with face recognition?</p>
          <button
            type="button"
            onClick={onUseEmailLogin}
            className="inline-flex items-center gap-2 font-body text-sm text-bordo/70 hover:text-bordo underline underline-offset-4 decoration-gold/40 hover:decoration-gold transition-all"
          >
            <ScanFace size={15} /> Use email and password instead
          </button>
        </div>
      )}
    </div>
  );
}
