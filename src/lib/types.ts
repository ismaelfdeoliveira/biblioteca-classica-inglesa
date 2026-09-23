export interface Book {
  id: string;
  title: string;
  author: string;
  year: number;
  synopsis: string;
  cover_url: string | null;
  pages: string[];
}
