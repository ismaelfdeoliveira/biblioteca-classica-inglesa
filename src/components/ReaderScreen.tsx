import { useState } from 'react';
import type { Book } from '@/lib/types';
import { ArrowLeft, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';

interface ReaderScreenProps {
  book: Book;
  onBack: () => void;
}

export default function ReaderScreen({ book, onBack }: ReaderScreenProps) {
  const [page, setPage] = useState(0);
  const totalPages = book.pages.length;

  if (totalPages === 0) {
    return (
      <div className="space-y-5 text-center animate-fade-up">
        <p className="font-body text-base text-ink/60 py-10">
          No sample text available for this book.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 font-body text-sm text-bordo/70 hover:text-bordo underline underline-offset-4 decoration-gold/40 hover:decoration-gold transition-all"
        >
          <ArrowLeft size={15} /> Back to library
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-bordo/60 hover:text-bordo transition-colors font-body"
        >
          <ArrowLeft size={16} /> Back to library
        </button>
        <div className="text-center">
          <p className="font-serif-display text-base text-bordo leading-tight">{book.title}</p>
          <p className="font-body text-xs text-ink/40">{book.author}</p>
        </div>
        <div className="flex items-center gap-1 text-bordo/40">
          <BookOpen size={16} />
        </div>
      </div>

      {/* Book page */}
      <div
        className="relative rounded-xl border-2 border-gold/30 bg-parchment shadow-2xl overflow-hidden"
        style={{
          backgroundImage:
            'radial-gradient(at 30% 20%, rgba(201,169,97,0.06) 0px, transparent 50%), radial-gradient(at 70% 80%, rgba(91,26,26,0.04) 0px, transparent 50%)',
        }}
      >
        {/* Page content */}
        <div className="px-6 sm:px-12 py-10 sm:py-14 min-h-[320px] flex items-center">
          <p className="font-body text-lg sm:text-xl text-ink/85 leading-relaxed first-letter:font-serif-display first-letter:text-4xl first-letter:text-bordo first-letter:mr-1 first-letter:float-left first-letter:leading-none">
            {book.pages[page]}
          </p>
        </div>

        {/* Page number */}
        <div className="border-t border-gold/15 px-6 py-3 text-center">
          <span className="font-serif-display text-sm text-ink/40">
            Page {page + 1} of {totalPages}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2.5 font-serif-display text-sm transition-all ${
            page > 0
              ? 'border border-gold/40 text-bordo hover:bg-gold/10 hover:shadow-md cursor-pointer'
              : 'border border-ink/10 text-ink/25 cursor-not-allowed'
          }`}
        >
          <ChevronLeft size={18} /> Previous
        </button>

        <div className="flex gap-1.5">
          {book.pages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === page ? 'w-6 bg-gold' : 'w-2 bg-ink/15 hover:bg-ink/30'
              }`}
              aria-label={`Go to page ${i + 1}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={page === totalPages - 1}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2.5 font-serif-display text-sm transition-all ${
            page < totalPages - 1
              ? 'border border-gold/40 text-bordo hover:bg-gold/10 hover:shadow-md cursor-pointer'
              : 'border border-ink/10 text-ink/25 cursor-not-allowed'
          }`}
        >
          Next <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
