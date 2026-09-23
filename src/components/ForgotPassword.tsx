import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  Check,
  Loader2,
  AlertCircle,
  Lightbulb,
  Mail,
  ArrowLeft,
  MailCheck,
} from 'lucide-react';

interface ForgotPasswordProps {
  onBack: () => void;
}

export default function ForgotPassword({ onBack }: ForgotPasswordProps) {
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
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/password-reset-face`;
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

      if (json.recognized) {
        setStatus('success');
        setMessage(json.message ?? 'A password reset link has been sent to your email.');
      } else {
        setStatus('error');
        setMessage(
          json.message ?? 'We could not confirm your identity. Please try again.'
        );
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    }
  }

  const inputBase =
    'input-classic w-full rounded-lg border border-ink/15 bg-white/70 py-3 pl-11 pr-4 text-ink placeholder:text-ink/35 font-body text-lg transition-all duration-200 focus:bg-white';

  if (status === 'success') {
    return (
      <div className="space-y-5 text-center">
        <div className="flex flex-col items-center gap-4 animate-fade-up">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gold text-bordo-deep animate-scale-in shadow-xl">
            <MailCheck size={42} strokeWidth={2} />
          </div>
          <h3 className="font-serif-display text-2xl text-bordo">Check Your Email</h3>
          <p className="ornament-line max-w-xs mx-auto">
            <span className="font-serif-display text-base">❦</span>
          </p>
          <p className="font-body text-base text-ink/70 leading-relaxed max-w-sm">
            We've sent a password reset link to{' '}
            <span className="font-medium text-bordo">{email}</span>. The link is valid for a
            limited time. Open it to set a new password.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-3 inline-flex items-center gap-2 font-serif-display text-base text-bordo-deep btn-gold-shimmer rounded-xl px-6 py-3.5 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            <ArrowLeft size={18} /> Back to login
          </button>
        </div>
      </div>
    );
  }

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
            Enter your email, then capture a clear photo of your face. We'll verify your identity
            before sending a password reset link.
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-center gap-3">
        {!capturedImage && status !== 'verifying' && (
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
              <Check size={20} /> Verify & Send Link
            </button>
          </>
        )}

        {status === 'verifying' && (
          <div className="flex items-center gap-2 text-ink/70 font-body text-base">
            <Loader2 size={20} className="animate-spin text-gold-aged" /> Verifying your identity...
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
    </div>
  );
}
