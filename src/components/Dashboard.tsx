import { useState } from 'react';
import { Library, User as UserIcon, BookOpen } from 'lucide-react';
import type { Book } from '@/lib/types';
import LibraryScreen from '@/components/LibraryScreen';
import ReaderScreen from '@/components/ReaderScreen';
import ProfileScreen from '@/components/ProfileScreen';

interface DashboardProps {
  profile: {
    full_name: string;
    email: string;
    phone: string;
    face_token: string;
  };
  onProfileUpdated: (profile: DashboardProps['profile']) => void;
  onSignOut: () => void;
}

type Tab = 'library' | 'profile';
type View = 'tabs' | 'reader';

export default function Dashboard({ profile, onProfileUpdated, onSignOut }: DashboardProps) {
  const [tab, setTab] = useState<Tab>('library');
  const [view, setView] = useState<View>('tabs');
  const [readingBook, setReadingBook] = useState<Book | null>(null);

  function handleReadBook(book: Book) {
    setReadingBook(book);
    setView('reader');
  }

  function handleBackFromReader() {
    setReadingBook(null);
    setView('tabs');
  }

  return (
    <div className="space-y-5">
      {/* Tab navigation (hidden in reader view) */}
      {view === 'tabs' && (
        <div className="flex gap-1 rounded-xl border border-gold/30 bg-white/40 p-1">
          <button
            type="button"
            onClick={() => setTab('library')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 font-serif-display text-base tracking-wide transition-all ${
              tab === 'library'
                ? 'bg-bordo text-parchment shadow-md'
                : 'text-ink/50 hover:text-bordo hover:bg-white/50'
            }`}
          >
            <Library size={18} /> Library
          </button>
          <button
            type="button"
            onClick={() => setTab('profile')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 font-serif-display text-base tracking-wide transition-all ${
              tab === 'profile'
                ? 'bg-bordo text-parchment shadow-md'
                : 'text-ink/50 hover:text-bordo hover:bg-white/50'
            }`}
          >
            <UserIcon size={18} /> Profile
          </button>
        </div>
      )}

      {/* Content */}
      {view === 'reader' && readingBook ? (
        <ReaderScreen book={readingBook} onBack={handleBackFromReader} />
      ) : tab === 'library' ? (
        <LibraryScreen onReadBook={handleReadBook} />
      ) : (
        <ProfileScreen
          profile={profile}
          onProfileUpdated={onProfileUpdated}
          onSignOut={onSignOut}
        />
      )}
    </div>
  );
}
