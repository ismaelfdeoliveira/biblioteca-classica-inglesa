import { Clock, AlertTriangle } from 'lucide-react';

interface SessionWarningModalProps {
  secondsRemaining: number;
  onStayConnected: () => void;
}

export default function SessionWarningModal({
  secondsRemaining,
  onStayConnected,
}: SessionWarningModalProps) {
  if (secondsRemaining <= 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest-deep/70 backdrop-blur-sm animate-fade-in p-4">
      <div className="relative w-full max-w-sm rounded-2xl border border-gold/40 bg-parchment shadow-2xl overflow-hidden animate-scale-in">
        {/* Top accent */}
        <div className="h-1.5 bg-gold" />

        <div className="p-7 text-center space-y-5">
          {/* Icon */}
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-gold/30 animate-pulse-ring" />
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-bordo/10 text-bordo">
              <Clock size={38} />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h3 className="font-serif-display text-2xl text-bordo">
              Session Expiring Soon
            </h3>
            <p className="ornament-line max-w-xs mx-auto">
              <span className="font-serif-display text-base">❦</span>
            </p>
          </div>

          {/* Message */}
          <p className="font-body text-base text-ink/70 leading-relaxed">
            Your session will expire in{' '}
            <span className="font-serif-display text-xl text-bordo font-semibold">
              {secondsRemaining}
            </span>{' '}
            second{secondsRemaining === 1 ? '' : 's'} due to inactivity.
          </p>

          {/* Warning note */}
          <div className="flex items-start gap-2 rounded-lg border border-gold/30 bg-gold/5 p-3 text-left">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-gold-aged" />
            <span className="font-body text-xs text-ink/60">
              You will be signed out automatically and redirected to the login screen.
            </span>
          </div>

          {/* Stay connected button */}
          <button
            type="button"
            onClick={onStayConnected}
            className="w-full rounded-lg btn-gold-shimmer py-3.5 font-serif-display text-lg text-bordo-deep shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            Continue Connected
          </button>
        </div>
      </div>
    </div>
  );
}
