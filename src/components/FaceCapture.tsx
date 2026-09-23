import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Camera, RefreshCw, Check, Loader2, AlertCircle, ShieldCheck, Lightbulb } from 'lucide-react';

interface FaceCaptureProps {
  onComplete: () => void;
}

export default function FaceCapture({ onComplete }: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [cameraError, setCameraError] = useState('');

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
    // Mirror to match preview
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
    if (!capturedImage) return;
    setStatus('verifying');
    setMessage('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setStatus('error');
        setMessage('Your session has expired. Please register again.');
        return;
      }

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-face`;
      const res = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ image_base64: capturedImage }),
      });

      const json = await res.json();
      if (!res.ok) {
        setStatus('error');
        setMessage(json?.message ?? json?.error ?? 'Verification failed. Please try again.');
        return;
      }

      if (json.detected) {
        setStatus('success');
        setMessage(json.message ?? 'Face verified successfully.');
        setTimeout(onComplete, 1400);
      } else {
        setStatus('error');
        setMessage(
          json.message ??
            'No face detected. Please improve the lighting and center your face in the frame, then try again.'
        );
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    }
  }

  return (
    <div className="space-y-5">
      <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-xl border-2 border-gold/40 bg-forest-deep shadow-2xl">
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover scale-x-[-1]"
            />
            {/* Face guide overlay */}
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
            <p className="font-serif-display text-xl text-gold">Face verified</p>
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
          <span>For best results, face a window, remove sunglasses, and center your face in the oval guide.</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row justify-center gap-3">
        {!capturedImage && status !== 'success' && (
          <button
            type="button"
            onClick={capture}
            disabled={!cameraReady || !!cameraError}
            className={`flex items-center justify-center gap-2.5 rounded-xl px-6 py-4 font-serif-display text-lg tracking-wide transition-all duration-300 ${
              cameraReady && !cameraError
                ? 'btn-gold-shimmer text-bordo-deep shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                : 'bg-ink/10 text-ink/40 cursor-not-allowed'
            }`}
          >
            <Camera size={22} /> Capture
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
              className="flex items-center justify-center gap-2.5 rounded-xl border-2 border-bordo bg-bordo px-6 py-4 font-serif-display text-lg text-gold-bright shadow-lg transition-all hover:bg-bordo-deep hover:border-bordo-deep hover:shadow-xl hover:-translate-y-0.5"
            >
              <Check size={22} /> Confirm
            </button>
          </>
        )}

        {status === 'verifying' && (
          <div className="flex items-center justify-center gap-2.5 text-ink/70 font-body text-lg py-2">
            <Loader2 size={22} className="animate-spin text-gold-aged" /> Verifying your face...
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
