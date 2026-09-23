import { ShieldCheck, BookOpen, Library, User, Mail, Phone, Fingerprint, LogOut } from 'lucide-react';

interface WelcomeScreenProps {
  profile: {
    full_name: string;
    email: string;
    phone: string;
    face_token: string;
  };
  onSignOut: () => void;
}

export default function WelcomeScreen({ profile, onSignOut }: WelcomeScreenProps) {
  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="space-y-7 animate-fade-up">
      {/* Welcome banner */}
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-bordo text-parchment font-serif-display text-2xl shadow-lg">
            {initials || <User size={36} />}
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-gold text-bordo-deep border-2 border-parchment">
            <ShieldCheck size={16} strokeWidth={2.5} />
          </div>
        </div>
        <div>
          <h2 className="font-serif-display text-3xl text-bordo">
            Welcome, {profile.full_name.split(' ')[0] || 'Reader'}
          </h2>
          <p className="ornament-line max-w-xs mx-auto mt-1">
            <span className="font-serif-display text-lg">❦</span>
          </p>
          <p className="font-body text-base text-ink/60 mt-1">
            You are now signed in to the Classical English Literature Library
          </p>
        </div>
      </div>

      {/* Profile card */}
      <div className="rounded-xl border border-gold/30 bg-white/50 overflow-hidden">
        <div className="bg-bordo/5 px-5 py-3 border-b border-gold/20">
          <p className="font-serif-display text-lg text-bordo flex items-center gap-2">
            <Library size={18} /> Your Reader Profile
          </p>
        </div>
        <div className="p-5 space-y-3">
          <ProfileRow icon={<User size={18} />} label="Name" value={profile.full_name || '—'} />
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
