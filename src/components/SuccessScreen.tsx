import { ShieldCheck, BookOpen, Library } from 'lucide-react';

interface SuccessScreenProps {
  onDone: () => void;
}

export default function SuccessScreen({ onDone }: SuccessScreenProps) {
  return (
    <div className="flex flex-col items-center text-center space-y-7 animate-fade-up">
      <div className="relative">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gold text-bordo-deep animate-scale-in shadow-xl">
          <ShieldCheck size={52} strokeWidth={2} />
        </div>
        <div className="absolute -inset-2 rounded-full border border-gold/30 animate-pulse-ring" />
      </div>

      <div className="space-y-2">
        <h2 className="font-serif-display text-3xl text-bordo">Welcome to the Library</h2>
        <p className="ornament-line max-w-xs mx-auto">
          <span className="font-serif-display text-lg">❦</span>
        </p>
        <p className="font-body text-lg text-ink/70 max-w-md">
          Your registration is complete and your face has been verified. You now hold a place among the readers of the Classical English Literature Library.
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-gold/30 bg-gold/5 px-5 py-3 text-sm text-ink/60 font-body">
        <Library size={18} className="text-gold-aged" />
        <span>A face token has been securely stored on your profile for future verification.</span>
      </div>

      <button
        type="button"
        onClick={onDone}
        className="flex items-center gap-2 rounded-lg btn-gold-shimmer px-7 py-3.5 font-serif-display text-lg text-bordo-deep shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
      >
        <BookOpen size={20} /> Enter the Library
      </button>
    </div>
  );
}
