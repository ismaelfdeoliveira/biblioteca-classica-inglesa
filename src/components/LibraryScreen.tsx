import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Book } from '@/lib/types';
import { Library, BookOpen, ArrowLeft, Calendar, User as UserIcon, Loader2, AlertCircle } from 'lucide-react';

interface LibraryScreenProps {
  onReadBook: (book: Book) => void;
}

export default function LibraryScreen({ onReadBook }: LibraryScreenProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  useEffect(() => {
    async function fetchBooks() {
      const { data, error: fetchError } = await supabase
        .from('books')
        .select('id, title, author, year, synopsis, cover_url, pages')
        .order('year', { ascending: true });

      if (fetchError) {
        setError('Could not load the library catalog. Please try again later.');
      } else {
        setBooks((data ?? []).map((b) => ({ ...b, pages: Array.isArray(b.pages) ? b.pages : [] })));
      }
      setLoading(false);
    }
    fetchBooks();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-gold-aged" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertCircle size={32} className="text-bordo" />
        <p className="font-body text-base text-bordo text-center">{error}</p>
      </div>
    );
  }

  // --- Detail view ---
  if (selectedBook) {
    return (
      <div className="space-y-6 animate-fade-up">
        <button
          type="button"
          onClick={() => setSelectedBook(null)}
          className="flex items-center gap-1.5 text-sm text-bordo/60 hover:text-bordo transition-colors font-body"
        >
          <ArrowLeft size={16} /> Back to library
        </button>

        <div className="flex flex-col sm:flex-row gap-6">
          {/* Cover */}
          <div className="shrink-0 mx-auto sm:mx-0">
            {selectedBook.cover_url ? (
              <img
                src={selectedBook.cover_url}
                alt={selectedBook.title}
                className="w-40 h-56 sm:w-48 sm:h-64 object-cover rounded-xl shadow-2xl border-2 border-gold/30"
              />
            ) : (
              <div className="w-40 h-56 sm:w-48 sm:h-64 rounded-xl shadow-2xl border-2 border-gold/30 bg-bordo flex items-center justify-center">
                <BookOpen size={48} className="text-gold" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-3">
            <h3 className="font-serif-display text-2xl sm:text-3xl text-bordo leading-tight">
              {selectedBook.title}
            </h3>
            <div className="flex flex-wrap gap-4 text-sm font-body text-ink/60">
              <span className="flex items-center gap-1.5">
                <UserIcon size={15} className="text-bordo/50" /> {selectedBook.author}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={15} className="text-bordo/50" /> {selectedBook.year}
              </span>
            </div>
            <p className="ornament-line max-w-xs">
              <span className="font-serif-display text-base">❦</span>
            </p>
            <p className="font-body text-base text-ink/70 leading-relaxed">
              {selectedBook.synopsis}
            </p>
            <button
              type="button"
              onClick={() => onReadBook(selectedBook)}
              className="inline-flex items-center gap-2 rounded-lg btn-gold-shimmer px-6 py-3 font-serif-display text-base text-bordo-deep shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              <BookOpen size={18} /> Read
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Grid view ---
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="text-center">
        <h3 className="font-serif-display text-2xl sm:text-3xl text-bordo mb-1">
          The Collection
        </h3>
        <p className="ornament-line max-w-xs mx-auto">
          <span className="font-serif-display text-base">❦</span>
        </p>
        <p className="font-body text-base text-ink/60 mt-1">
          Six classics of English literature await you
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
        {books.map((book) => (
          <button
            key={book.id}
            type="button"
            onClick={() => setSelectedBook(book)}
            className="group flex flex-col items-center text-center space-y-2.5 rounded-xl p-3 transition-all duration-300 hover:bg-white/40 hover:shadow-lg hover:-translate-y-1"
          >
            <div className="relative w-full aspect-[3/4] overflow-hidden rounded-lg shadow-md border border-gold/20 transition-all duration-300 group-hover:border-gold/50 group-hover:shadow-xl">
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="h-full w-full bg-bordo flex items-center justify-center">
                  <BookOpen size={36} className="text-gold" />
                </div>
              )}
            </div>
            <div className="space-y-0.5">
              <p className="font-serif-display text-sm sm:text-base text-bordo leading-tight line-clamp-2">
                {book.title}
              </p>
              <p className="font-body text-xs text-ink/50">{book.author}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
