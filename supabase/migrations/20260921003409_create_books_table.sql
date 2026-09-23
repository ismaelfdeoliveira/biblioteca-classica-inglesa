/*
# Create books table and seed 6 English classics

1. Purpose
   Stores the library catalog of classic English literature. Each book has
   a title, author, publication year, synopsis, cover image URL, and a
   multi-page sample text for the simulated reader.

2. New Tables
   - `books`
     - `id` (uuid, primary key)
     - `title` (text, not null)
     - `author` (text, not null)
     - `year` (integer, publication year)
     - `synopsis` (text, brief description)
     - `cover_url` (text, nullable — link to a cover image)
     - `pages` (jsonb, array of page text strings for the simulated reader)
     - `created_at` (timestamptz, default now())

3. Security (RLS)
   - RLS enabled on `books`.
   - All authenticated users can SELECT (the catalog is shared content).
   - No INSERT/UPDATE/DELETE policies for users — books are managed
     server-side via migrations only.

4. Seed Data
   - 6 classic English novels are inserted with multi-page sample text.
*/

CREATE TABLE IF NOT EXISTS public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text NOT NULL,
  year integer,
  synopsis text,
  cover_url text,
  pages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "books_select_authenticated" ON public.books;
CREATE POLICY "books_select_authenticated"
  ON public.books FOR SELECT
  TO authenticated
  USING (true);

-- Seed 6 English classics
INSERT INTO public.books (title, author, year, synopsis, cover_url, pages) VALUES
(
  'Pride and Prejudice',
  'Jane Austen',
  1813,
  'A spirited young woman navigates love, class, and family expectations in Regency England, discovering that first impressions are not always to be trusted.',
  'https://images.pexels.com/photos/268415/pexels-photo-268415.jpeg?auto=compress&cs=tinysrgb&w=400',
  jsonb_build_array(
    'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.',
    '"My dear Mr. Bennet," said his lady to him one day, "have you heard that Netherfield Park is let at last?" Mr. Bennet replied that he had not. "But it is," returned she; "for Mrs. Long has just been here, and she told me all about it." Mr. Bennet made no answer. "Do you not want to know who has taken it?" cried his wife impatiently.',
    '"You want to tell me, and I have no objection to hearing it." This was invitation enough; she began at last. "Why, my dear, you must know, Mrs. Long says that Netherfield is taken by a young man of large fortune from the north of England; that he came down on Monday in a chaise and four to see the place, and was so much delighted with it that he agreed with Mr. Morris immediately."'
  )
),
(
  'Jane Eyre',
  'Charlotte Brontë',
  1847,
  'An orphaned governess overcomes hardship and discovers love, independence, and a dark secret hidden within the walls of Thornfield Hall.',
  'https://images.pexels.com/photos/3057364/pexels-photo-3057364.jpeg?auto=compress&cs=tinysrgb&w=400',
  jsonb_build_array(
    'There was no possibility of taking a walk that day. The cold winter wind had brought with it clouds so sombre, and a rain so penetrating, that further outdoor exercise was now out of the question. I was glad of it: I never liked long walks, especially on chilly afternoons: dreadful to me was the coming home in the raw twilight, with nipped fingers and toes, and a heart saddened by the chidings of Bessie, my nurse, and humbled by the consciousness of my physical inferiority to Eliza, John, and Georgiana Reed.',
    'The said Eliza, John, and Georgiana were now clustered round their mama in the drawing-room: she lay reclined on a sofa by the fireside, and with her darlings about her looked perfectly happy, me she had dispensed from joining the group. A small breakfast-room adjoined the drawing-room, I slipped in there. It contained a bookcase: I soon possessed myself of a volume, taking care that it should be one stored with pictures.',
    'Each picture told a story; mysterious often to my undeveloped understanding and imperfect feelings, yet ever profoundly interesting: as interesting as the tales Bessie sometimes narrated on winter evenings, when she chanced to be in a good humour, feeding our attentive ears with accounts of love and adventure taken from old ballads or later ballads.'
  )
),
(
  'Wuthering Heights',
  'Emily Brontë',
  1847,
  'A passionate and destructive love between Catherine Earnshaw and the foundling Heathcliff plays out across the wild Yorkshire moors in a tale of revenge and obsession.',
  'https://images.pexels.com/photos/3057371/pexels-photo-3057371.jpeg?auto=compress&cs=tinysrgb&w=400',
  jsonb_build_array(
    '1801. — I have just returned from a visit to my landlord — the solitary neighbour that I shall be troubled with. This is certainly a beautiful country! In all England, I do not believe that I could have fixed on a situation so completely removed from the stir of society. A perfect misanthropist''s Heaven: and Mr. Heathcliff and I are such a suitable pair to divide the desolation between us.',
    'A capital fellow! He little imagined how my heart warmed towards him when I beheld his black eyes withdraw so suspiciously under their brows, as I rode up, and when his fingers sheltered themselves, with a jealous resolution, still further in his waistcoat, as I announced my name.',
    '"Mr. Heathcliff?" I said. A nod was the answer. "Mr. Lockwood, your new tenant, sir." I presented myself, hoping to receive an invitation to enter. He did not, but leant against the door, smoking a pipe, and seeming to regard me with a look of cool indifference.'
  )
),
(
  'Great Expectations',
  'Charles Dickens',
  1861,
  'A young orphan named Pip rises from humble beginnings through a mysterious benefactor, learning hard lessons about love, loyalty, and the true nature of a gentleman.',
  'https://images.pexels.com/photos/3057370/pexels-photo-3057370.jpeg?auto=compress&cs=tinysrgb&w=400',
  jsonb_build_array(
    'My father''s family name being Pirrip, and my Christian name Philip, my infant tongue could make of both names nothing longer or more explicit than Pip. So, I called myself Pip, and came to be called Pip. I give Pirrip as my father''s family name, on the authority of his tombstone and my sister — Mrs. Joe Gargery, who married the blacksmith.',
    'As I never saw my father or my mother, and never saw any likeness of either of them (for their days were long before the days of photographs), my first fancies regarding what they were like were unreasonably derived from their tombstones. The shape of the letters on my father''s, gave me an odd idea that he was a square, stout, dark man, with curly black hair.',
    'Ours was the marsh country, down by the river, within, as the river wound, twenty miles of the sea. My first most vivid and broad impression of the identity of things seems to me to have been gained on a memorable raw afternoon towards evening. At such a time I found out that the dark flat wilderness beyond the churchyard was the marshes; and that the low leaden line beyond was the river.'
  )
),
(
  'Middlemarch',
  'George Eliot',
  1872,
  'In a provincial English town, idealistic souls collide with social realities as Dorothea Brooke and others seek purpose, love, and reform in a world resistant to change.',
  'https://images.pexels.com/photos/3057366/pexels-photo-3057366.jpeg?auto=compress&cs=tinysrgb&w=400',
  jsonb_build_array(
    'Miss Brooke had that kind of beauty which seems to be thrown into relief by poor dress. Her hand and wrist were so finely formed that she could wear sleeves not a bit too large, and her neck was like a flower-stem for slenderness, giving a distinction to her figure that no dress could take away or add to.',
    'A young lady of some birth and fortune, who had been educated chiefly for the adornment of her sex, could hardly be expected to interest herself in the dry details of political economy, or the mysterious constructions of ancient law. Yet Dorothea''s mind was perpetually haunted by the belief that there was a higher purpose to life than mere adornment.',
    'Mr. Casaubon, she thought, had a depth of learning which would make her life rich with intellectual companionship. She had been used to feel that the advantage of being Mr. Casaubon''s wife would be that she would be his assistant, and help him in the great work which he was preparing for the world.'
  )
),
(
  'Frankenstein',
  'Mary Shelley',
  1818,
  'A young scientist''s obsession with creating life leads to tragedy when his creation, rejected and alone, turns against its maker in a tale of ambition, responsibility, and horror.',
  'https://images.pexels.com/photos/3057368/pexels-photo-3057368.jpeg?auto=compress&cs=tinysrgb&w=400',
  jsonb_build_array(
    'You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings. I arrived here yesterday, and my first task is to assure my dear sister of my welfare and increasing confidence in the success of my undertaking. I am already far north of London, and as I walk in the streets of Petersburgh, I feel a cold northern breeze play upon my cheeks.',
    'It braced my nerves, and filled me with delight. Do you understand this feeling? This breeze, which has travelled from the regions towards which I am advancing, gives me a foretaste of those icy climes. Inspirited by this wind of promise, my daydreams become more fervent and vivid. I try in vain to be persuaded that the pole is the seat of frost and desolation.',
    'It is the season of the perpetual light! There, Margaret, the sun is forever visible, its broad disk just skirting the horizon and diffusing a perpetual splendour. There — for with your leave, my sister, I will put some trust in preceding navigators — there snow and frost are banished, and, sailing over a calm sea, we may be wafted to a land surpassing in wonders and in beauty every region hitherto discovered.'
  )
)
ON CONFLICT DO NOTHING;
