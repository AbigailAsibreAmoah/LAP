// La Porte Kids storybooks: four original stories set in West Africa, one per age band, each deeper
// than the last. Sample texts for the La Porte teaching team to review before launch.
import type { PortraitSpec } from '@laporte/shared';
import type { Face, Pose } from './Figure';
import { MORE_BOOKS } from './moreStories';

export type SceneKind = 'bedroom' | 'compound' | 'market' | 'savanna' | 'coast' | 'classroom' | 'street' | 'pitch' | 'garden' | 'hill' | 'workshop' | 'mangrove' | 'kitchen' | 'festival';
export type TimeOfDay = 'day' | 'dusk' | 'night';
export type PropName =
  | 'sun' | 'moon' | 'stars' | 'clouds' | 'rain' | 'birds'
  | 'baobab' | 'baobabDry' | 'acacia' | 'house' | 'mortar' | 'goat' | 'well'
  | 'stall' | 'fabric' | 'mangoes' | 'umbrella'
  | 'pirogue' | 'pirogueFar' | 'bridge' | 'nets'
  | 'bed' | 'lamp' | 'teddy' | 'window' | 'chalkboard' | 'desk' | 'books';

export interface CastMember {
  who: keyof typeof CAST;
  x: number; // % of scene width (centre of the character)
  y: number; // % of scene height (top of the head)
  size: number; // % of scene width
  expression?: Face;
  flip?: boolean;
  /** What the character is doing; chosen from the expression when left out. */
  pose?: Pose;
}

export interface Page {
  scene: SceneKind;
  time: TimeOfDay;
  props: PropName[];
  cast: CastMember[];
  fr: string;
  en: string;
}

export interface Question {
  q: string;
  options: string[];
  answer: number;
  why: string;
}

export interface Book {
  id: string;
  title: string;
  titleEn: string;
  ages: string;
  minAge: number;
  maxAge: number;
  level: string;
  blurb: { en: string; fr: string };
  /** Cover and spine colours (cloth-bound look). */
  cloth: string;
  ink: string;
  cover: Omit<Page, 'fr' | 'en'>;
  pages: Page[];
  questions?: Question[];
  /** For older readers: words worth remembering. */
  glossary?: { fr: string; en: string }[];
  reflect?: { en: string; fr: string };
  /** The La Porte Kids world whose stars this book earns. */
  world?: string;
}

/** The characters (drawn with La Porte's portrait style). */
export const CAST: Record<string, PortraitSpec> = {
  kofi: { skin: '#6B3F26', hair: 'short', hairColor: '#1A120D', outfit: '#2E6FB0', accent: '#DCE9F7', bg: '#E3EEF8' },
  maman: { skin: '#6B3F26', hair: 'headwrap', hairColor: '#C49A5A', outfit: '#6E1630', accent: '#F6E7C8', bg: '#F3E1E5' },
  afi: { skin: '#8A5634', hair: 'puff', hairColor: '#2A1A10', outfit: '#C49A5A', accent: '#F6E7C8', bg: '#F8E3D6' },
  mamie: { skin: '#4E2F1F', hair: 'headwrap', hairColor: '#1F6B4F', outfit: '#1F6B4F', accent: '#DDEFE5', bg: '#E2F0E7', glasses: true },
  awa: { skin: '#4E2F1F', hair: 'curls', hairColor: '#120B07', outfit: '#C0392B', accent: '#F4D9DF', bg: '#F3E1E5' },
  grandpere: { skin: '#4E2F1F', hair: 'bald', hairColor: '#ffffff', outfit: '#141B34', accent: '#E7C78F', bg: '#F1E6D2' },
  fatou: { skin: '#6B3F26', hair: 'locs', hairColor: '#120B07', outfit: '#1F6B4F', accent: '#DDEFE5', bg: '#E2F0E7' },
  papa: { skin: '#4E2F1F', hair: 'short', hairColor: '#120B07', outfit: '#8A5A12', accent: '#F1E6D2', bg: '#FFF3D6' },
  prof: { skin: '#8A5634', hair: 'bob', hairColor: '#2A1A10', outfit: '#6E1630', accent: '#F4D9DF', bg: '#F3E1E5', glasses: true },
  yao: { skin: '#8A5634', hair: 'waves', hairColor: '#1A120D', outfit: '#C0392B', accent: '#F6E7C8', bg: '#F8E3D6' },
  kwesi: { skin: '#4E2F1F', hair: 'short', hairColor: '#120B07', outfit: '#1F6B4F', accent: '#F1E6D2', bg: '#E2F0E7' },
  sena: { skin: '#8A5634', hair: 'puff', hairColor: '#1A120D', outfit: '#B5475F', accent: '#F4D9DF', bg: '#F8E3D6' },
  ibrahim: { skin: '#6B3F26', hair: 'waves', hairColor: '#120B07', outfit: '#5B3A8C', accent: '#E9E0F5', bg: '#ECE6F5' },
  aminata: { skin: '#6B3F26', hair: 'headwrap', hairColor: '#2E6FB0', outfit: '#2E6FB0', accent: '#DCE9F7', bg: '#E3EEF8' },
};

const BASE_BOOKS: Book[] = [
  /* ---------- Ages 4–5: repetition, one short sentence, one new word per page ---------- */
  {
    id: 'bk-doudou', title: 'Le doudou de Kofi', titleEn: 'Kofi’s cuddly toy', ages: '4–5', minAge: 4, maxAge: 5, level: 'Éveil',
    blurb: { en: 'Kofi can’t sleep without Nounou the bear. Where is he?', fr: 'Kofi ne dort pas sans Nounou l’ourson. Où est-il ?' },
    cloth: '#2E6FB0', ink: '#FFF3D6',
    cover: { scene: 'bedroom', time: 'night', props: ['window', 'moon', 'stars', 'lamp', 'bed', 'teddy'], cast: [{ who: 'kofi', x: 46, y: 30, size: 24, expression: 'laugh' }] },
    pages: [
      { scene: 'bedroom', time: 'night', props: ['window', 'moon', 'stars', 'lamp', 'bed'], cast: [{ who: 'kofi', x: 46, y: 30, size: 24, expression: 'sleepy' }], fr: 'C’est la nuit. Kofi bâille : « Aaah ! »', en: 'It’s night. Kofi yawns: “Aaah!”' },
      { scene: 'bedroom', time: 'night', props: ['window', 'moon', 'lamp', 'bed'], cast: [{ who: 'kofi', x: 46, y: 30, size: 24, expression: 'surprise' }], fr: 'Oh là là ! Où est Nounou ?', en: 'Oh dear! Where is Nounou?' },
      { scene: 'compound', time: 'dusk', props: ['house', 'mortar', 'goat'], cast: [{ who: 'kofi', x: 30, y: 34, size: 22, expression: 'worried' }, { who: 'maman', x: 68, y: 26, size: 26, expression: 'smile' }], fr: 'Dans la cour ? Non ! Coucou, la chèvre !', en: 'In the yard? No! Hello, goat!' },
      { scene: 'compound', time: 'dusk', props: ['house', 'well'], cast: [{ who: 'kofi', x: 40, y: 34, size: 22, expression: 'sad' }], fr: 'Près du puits ? Non… Kofi est triste.', en: 'Near the well? No… Kofi is sad.' },
      { scene: 'bedroom', time: 'night', props: ['window', 'moon', 'stars', 'lamp', 'bed', 'teddy'], cast: [{ who: 'maman', x: 64, y: 22, size: 28, expression: 'joy' }, { who: 'kofi', x: 38, y: 32, size: 22, expression: 'laugh' }], fr: 'Sous le lit ? Oui ! Youpi ! Voilà Nounou !', en: 'Under the bed? Yes! Hooray! Here is Nounou!' },
      { scene: 'bedroom', time: 'night', props: ['window', 'moon', 'stars', 'bed', 'teddy'], cast: [{ who: 'kofi', x: 46, y: 34, size: 22, expression: 'sleepy' }], fr: 'Un bisou pour Nounou. Chut… Bonne nuit !', en: 'A kiss for Nounou. Shh… Good night!' },
    ],
  },

  /* ---------- Ages 6–7: a small problem and a solution, colours and numbers, simple dialogue ---------- */
  {
    id: 'bk-pagne', title: 'Afi et le pagne de Mamie', titleEn: 'Afi and Grandma’s cloth', ages: '6–7', minAge: 6, maxAge: 7, level: 'A1',
    blurb: { en: 'At the big market in Lomé, Afi must find the perfect cloth for Grandma’s birthday.', fr: 'Au grand marché de Lomé, Afi doit trouver le pagne parfait pour l’anniversaire de Mamie.' },
    cloth: '#C49A5A', ink: '#141B34',
    cover: { scene: 'market', time: 'day', props: ['sun', 'stall', 'fabric', 'mangoes'], cast: [{ who: 'afi', x: 40, y: 26, size: 24, expression: 'joy' }] },
    pages: [
      { scene: 'compound', time: 'day', props: ['sun', 'house', 'mortar'], cast: [{ who: 'afi', x: 34, y: 30, size: 24, expression: 'focus' }, { who: 'mamie', x: 68, y: 24, size: 26, expression: 'smile', flip: true }], fr: 'Demain, c’est l’anniversaire de Mamie. Afi a trois pièces dans sa poche.', en: 'Tomorrow is Grandma’s birthday. Afi has three coins in her pocket.' },
      { scene: 'street', time: 'day', props: ['sun', 'stall', 'mangoes', 'umbrella'], cast: [{ who: 'afi', x: 30, y: 28, size: 24, expression: 'joy' }, { who: 'maman', x: 64, y: 24, size: 26, expression: 'smile' }], fr: 'Avec Maman, elle va au grand marché de Lomé. Il y a du bruit et des couleurs partout !', en: 'With Mum, she goes to the big market in Lomé. There is noise and colour everywhere!' },
      { scene: 'market', time: 'day', props: ['stall', 'fabric'], cast: [{ who: 'afi', x: 36, y: 28, size: 24, expression: 'focus' }], fr: 'Un pagne rouge ? Trop cher. Un pagne vert ? Trop petit.', en: 'A red cloth? Too expensive. A green cloth? Too small.' },
      { scene: 'market', time: 'day', props: ['clouds', 'rain', 'stall', 'umbrella'], cast: [{ who: 'afi', x: 40, y: 30, size: 24, expression: 'calm' }], fr: 'Soudain, il pleut ! « Oh non, je n’ai rien trouvé », dit Afi, triste.', en: 'Suddenly it rains! “Oh no, I haven’t found anything,” Afi says sadly.' },
      { scene: 'market', time: 'day', props: ['stall', 'fabric', 'umbrella'], cast: [{ who: 'afi', x: 30, y: 28, size: 24, expression: 'focus' }, { who: 'prof', x: 66, y: 24, size: 26, expression: 'smile', flip: true }], fr: 'Sous son parasol, une vendeuse sourit : « J’ai un petit pagne jaune et bleu, pour trois pièces. »', en: 'Under her umbrella, a seller smiles: “I have a small yellow and blue cloth, for three coins.”' },
      { scene: 'compound', time: 'dusk', props: ['house'], cast: [{ who: 'mamie', x: 62, y: 22, size: 28, expression: 'joy' }, { who: 'afi', x: 34, y: 30, size: 24, expression: 'joy' }], fr: '« Joyeux anniversaire, Mamie ! » Mamie met le pagne sur sa tête. « C’est le plus beau ! »', en: '“Happy birthday, Grandma!” Grandma puts the cloth on her head. “It’s the most beautiful!”' },
    ],
    questions: [
      { q: 'Combien de pièces Afi a-t-elle ?', options: ['deux', 'trois', 'cinq'], answer: 1, why: 'Afi a trois pièces dans sa poche.' },
      { q: 'De quelle couleur est le pagne de Mamie ?', options: ['rouge', 'vert', 'jaune et bleu'], answer: 2, why: 'La vendeuse a un petit pagne jaune et bleu.' },
    ],
  },

  /* ---------- Ages 8–10: a village legend, feelings, past tense, cooperation ---------- */
  {
    id: 'bk-baobab', title: 'Le secret du vieux baobab', titleEn: 'The secret of the old baobab', ages: '8–10', minAge: 8, maxAge: 10, level: 'A2',
    blurb: { en: 'No rain has fallen for months. Awa remembers her grandfather’s story about the old baobab…', fr: 'Il n’a pas plu depuis des mois. Awa se souvient de l’histoire du vieux baobab…' },
    cloth: '#1F6B4F', ink: '#F6E7C8',
    cover: { scene: 'savanna', time: 'dusk', props: ['sun', 'baobab', 'birds', 'acacia'], cast: [{ who: 'awa', x: 30, y: 36, size: 20, expression: 'calm' }] },
    pages: [
      { scene: 'savanna', time: 'day', props: ['sun', 'baobabDry', 'acacia'], cast: [{ who: 'awa', x: 28, y: 36, size: 20, expression: 'focus' }], fr: 'Cette année-là, la pluie n’est pas venue. La terre du village était sèche et les puits presque vides.', en: 'That year, the rain did not come. The village earth was dry and the wells almost empty.' },
      { scene: 'compound', time: 'night', props: ['stars', 'moon', 'house'], cast: [{ who: 'grandpere', x: 64, y: 22, size: 26, expression: 'calm', flip: true }, { who: 'awa', x: 32, y: 32, size: 22, expression: 'focus' }], fr: 'Le soir, Grand-père a raconté une vieille histoire : « Le baobab garde l’eau dans son ventre. Il la donne à ceux qui prennent soin de lui. »', en: 'In the evening, Grandfather told an old story: “The baobab keeps water in its belly. It gives it to those who take care of it.”' },
      { scene: 'savanna', time: 'day', props: ['sun', 'baobabDry'], cast: [{ who: 'awa', x: 30, y: 36, size: 20, expression: 'calm' }], fr: 'Le lendemain, Awa a marché jusqu’au vieux baobab. Ses branches ressemblaient à des racines tournées vers le ciel.', en: 'The next day, Awa walked to the old baobab. Its branches looked like roots turned towards the sky.' },
      { scene: 'savanna', time: 'day', props: ['sun', 'baobabDry', 'well'], cast: [{ who: 'awa', x: 26, y: 36, size: 20, expression: 'focus' }, { who: 'kofi', x: 60, y: 38, size: 18, expression: 'smile', flip: true }], fr: 'Seule, elle n’y arrivait pas. Alors elle a appelé ses amis. Ensemble, ils ont porté de l’eau et nettoyé la terre autour de l’arbre.', en: 'Alone, she couldn’t do it. So she called her friends. Together, they carried water and cleaned the ground around the tree.' },
      { scene: 'savanna', time: 'dusk', props: ['clouds', 'baobab', 'birds'], cast: [{ who: 'awa', x: 32, y: 36, size: 20, expression: 'joy' }], fr: 'Chaque jour, ils sont revenus. Un matin, de petites feuilles vertes sont apparues. Et le soir même, les premiers nuages sont arrivés.', en: 'Every day, they came back. One morning, small green leaves appeared. And that very evening, the first clouds arrived.' },
      { scene: 'savanna', time: 'day', props: ['rain', 'clouds', 'baobab'], cast: [{ who: 'awa', x: 28, y: 34, size: 20, expression: 'joy' }, { who: 'grandpere', x: 64, y: 30, size: 22, expression: 'joy', flip: true }], fr: 'La pluie est tombée toute la nuit. « Alors, le baobab a donné son eau ? » a demandé Awa.', en: 'The rain fell all night. “So the baobab gave its water?” Awa asked.' },
      { scene: 'compound', time: 'dusk', props: ['house', 'well', 'birds'], cast: [{ who: 'grandpere', x: 62, y: 22, size: 26, expression: 'smile', flip: true }, { who: 'awa', x: 32, y: 30, size: 22, expression: 'calm' }], fr: 'Grand-père a souri : « Le vrai secret, ce n’est pas l’arbre. C’est que tout le village a travaillé ensemble. »', en: 'Grandfather smiled: “The real secret isn’t the tree. It’s that the whole village worked together.”' },
    ],
    questions: [
      { q: 'Pourquoi le village avait-il un problème ?', options: ['Il n’y avait pas de pluie.', 'Il y avait trop d’arbres.', 'Le marché était fermé.'], answer: 0, why: 'Cette année-là, la pluie n’est pas venue.' },
      { q: 'Qu’a fait Awa quand elle n’y arrivait pas seule ?', options: ['Elle est rentrée dormir.', 'Elle a appelé ses amis.', 'Elle a coupé le baobab.'], answer: 1, why: 'Alors elle a appelé ses amis.' },
      { q: 'Quel est le « vrai secret » selon Grand-père ?', options: ['Le baobab est magique.', 'Il faut parler aux nuages.', 'Le village a travaillé ensemble.'], answer: 2, why: '« C’est que tout le village a travaillé ensemble. »' },
    ],
  },

  /* ---------- Ages 11–15: inner conflict, a changing coast, nuance, two tenses ---------- */
  {
    id: 'bk-pirogue', title: 'La dernière pirogue de Saint-Louis', titleEn: 'The last canoe of Saint-Louis', ages: '11–15', minAge: 11, maxAge: 15, level: 'A2–B1',
    blurb: { en: 'Fatou loves the sea her family has fished for generations. But the sea is changing, and a letter from school changes everything.', fr: 'Fatou aime la mer que sa famille pêche depuis des générations. Mais la mer change, et une lettre de l’école change tout.' },
    cloth: '#141B34', ink: '#E7C78F',
    cover: { scene: 'coast', time: 'dusk', props: ['sun', 'bridge', 'pirogue', 'birds'], cast: [{ who: 'fatou', x: 44, y: 34, size: 18, expression: 'calm' }] },
    pages: [
      { scene: 'coast', time: 'dusk', props: ['sun', 'bridge', 'pirogueFar', 'nets'], cast: [{ who: 'fatou', x: 30, y: 34, size: 20, expression: 'calm' }], fr: 'À Saint-Louis, Fatou se réveillait avant le soleil. Elle aimait l’odeur du sel et les pirogues peintes qui partaient en chantant.', en: 'In Saint-Louis, Fatou used to wake up before the sun. She loved the smell of salt and the painted canoes that set off singing.' },
      { scene: 'coast', time: 'day', props: ['sun', 'pirogue', 'nets'], cast: [{ who: 'papa', x: 58, y: 26, size: 24, expression: 'focus', flip: true }, { who: 'fatou', x: 30, y: 32, size: 20, expression: 'focus' }], fr: 'Son père répétait souvent : « Mon grand-père pêchait ici, et son père avant lui. » Mais ces derniers temps, les filets revenaient presque vides.', en: 'Her father often said: “My grandfather fished here, and his father before him.” But lately, the nets were coming back almost empty.' },
      { scene: 'coast', time: 'dusk', props: ['clouds', 'pirogueFar'], cast: [{ who: 'fatou', x: 40, y: 34, size: 20, expression: 'calm' }], fr: 'Chaque année, la mer avançait un peu plus. Des maisons de la Langue de Barbarie avaient déjà disparu sous les vagues.', en: 'Every year, the sea came a little further. Houses on the Langue de Barbarie had already disappeared under the waves.' },
      { scene: 'classroom', time: 'day', props: ['chalkboard', 'desk', 'books'], cast: [{ who: 'prof', x: 64, y: 20, size: 24, expression: 'smile', flip: true }, { who: 'fatou', x: 30, y: 30, size: 22, expression: 'focus' }], fr: 'Un jour, sa professeure lui a tendu une lettre : une bourse pour étudier les sciences de la mer à Dakar. « Tu poses toujours les bonnes questions, Fatou. »', en: 'One day, her teacher handed her a letter: a scholarship to study marine science in Dakar. “You always ask the right questions, Fatou.”' },
      { scene: 'coast', time: 'night', props: ['moon', 'stars', 'pirogue'], cast: [{ who: 'fatou', x: 36, y: 34, size: 20, expression: 'calm' }], fr: 'Cette nuit-là, elle n’a pas dormi. Si elle partait, qui aiderait son père ? Et si elle restait, qui comprendrait pourquoi la mer changeait ?', en: 'That night, she didn’t sleep. If she left, who would help her father? And if she stayed, who would understand why the sea was changing?' },
      { scene: 'coast', time: 'dusk', props: ['sun', 'pirogue', 'bridge'], cast: [{ who: 'papa', x: 60, y: 24, size: 24, expression: 'calm', flip: true }, { who: 'fatou', x: 32, y: 30, size: 20, expression: 'focus' }], fr: 'Elle a enfin tout raconté à son père. Il a regardé l’horizon longtemps, puis il a dit : « La mer ne nous appartient pas. Mais tu peux apprendre à la protéger. »', en: 'At last she told her father everything. He looked at the horizon for a long time, then said: “The sea doesn’t belong to us. But you can learn to protect it.”' },
      { scene: 'coast', time: 'day', props: ['sun', 'pirogue', 'birds'], cast: [{ who: 'fatou', x: 34, y: 30, size: 22, expression: 'joy' }, { who: 'papa', x: 64, y: 26, size: 22, expression: 'smile', flip: true }], fr: 'Avant de partir, Fatou a peint un mot sur la pirogue familiale : « Demain ». Elle savait qu’elle reviendrait, avec des réponses.', en: 'Before leaving, Fatou painted one word on the family canoe: “Tomorrow”. She knew she would come back, with answers.' },
    ],
    questions: [
      { q: 'Pourquoi les filets revenaient-ils presque vides ?', options: ['Le père de Fatou ne savait plus pêcher.', 'La mer et le poisson changeaient.', 'Les pirogues étaient trop vieilles.'], answer: 1, why: 'L’histoire montre une mer qui change et des poissons qui manquent.' },
      { q: 'Quel est le dilemme de Fatou ?', options: ['Choisir entre deux écoles.', 'Rester aider son père ou partir étudier.', 'Vendre ou garder la pirogue.'], answer: 1, why: '« Si elle partait, qui aiderait son père ? Et si elle restait… »' },
      { q: 'Que veut dire le mot peint sur la pirogue ?', options: ['Elle abandonne la mer.', 'Elle reviendra avec des réponses.', 'Elle part en vacances.'], answer: 1, why: '« Elle savait qu’elle reviendrait, avec des réponses. »' },
    ],
    glossary: [
      { fr: 'une pirogue', en: 'a (fishing) canoe' },
      { fr: 'un filet', en: 'a net' },
      { fr: 'une bourse', en: 'a scholarship' },
      { fr: 'avancer (la mer avance)', en: 'to advance (the sea is rising)' },
      { fr: 'appartenir à', en: 'to belong to' },
      { fr: 'protéger', en: 'to protect' },
    ],
    reflect: { en: 'What would you choose in Fatou’s place, and why? Tell a grown-up, in French if you can.', fr: 'Qu’est-ce que tu choisirais à la place de Fatou, et pourquoi ? Raconte-le à un adulte, en français si tu peux.' },
  },

  /* ---------- Second book for each age group (so the weekly book can change) ---------- */

  {
    id: 'bk-chevre', title: 'Où va la chèvre ?', titleEn: 'Where is the goat going?', ages: '4–5', minAge: 4, maxAge: 5, level: 'Éveil',
    blurb: { en: 'Yao’s goat runs off through the village. Run, Yao, run!', fr: 'La chèvre de Yao s’échappe dans le village. Cours, Yao, cours !' },
    cloth: '#C0392B', ink: '#FFF3D6',
    cover: { scene: 'compound', time: 'day', props: ['sun', 'house', 'goat', 'birds'], cast: [{ who: 'yao', x: 34, y: 30, size: 24, expression: 'laugh' }] },
    pages: [
      { scene: 'compound', time: 'day', props: ['sun', 'house', 'goat'], cast: [{ who: 'yao', x: 32, y: 30, size: 24, expression: 'laugh' }], fr: 'Voici Yao. Voici Bêbê, sa chèvre. Bêêê !', en: 'This is Yao. This is Bêbê, his goat. Baa!' },
      { scene: 'street', time: 'day', props: ['sun', 'house', 'well'], cast: [{ who: 'yao', x: 34, y: 30, size: 24, expression: 'surprise' }], fr: 'Oh non ! Bêbê part. Vite, vite !', en: 'Oh no! Bêbê is leaving. Quick, quick!' },
      { scene: 'market', time: 'day', props: ['sun', 'stall', 'mangoes'], cast: [{ who: 'yao', x: 30, y: 28, size: 24, expression: 'cheeky' }], fr: 'Bêbê mange une mangue. Miam, miam !', en: 'Bêbê eats a mango. Yum, yum!' },
      { scene: 'savanna', time: 'day', props: ['sun', 'acacia', 'baobab'], cast: [{ who: 'yao', x: 30, y: 34, size: 22, expression: 'worried' }], fr: 'Bêbê court sous l’arbre. Attends, Bêbê !', en: 'Bêbê runs under the tree. Wait, Bêbê!' },
      { scene: 'compound', time: 'dusk', props: ['house', 'goat'], cast: [{ who: 'yao', x: 32, y: 30, size: 24, expression: 'proud' }, { who: 'maman', x: 66, y: 24, size: 26, expression: 'joy', flip: true }], fr: 'Bravo, Yao ! Bêbê est à la maison.', en: 'Well done, Yao! Bêbê is home.' },
    ],
  },
  {
    id: 'bk-pluie', title: 'Le jour où Kwesi a perdu la pluie', titleEn: 'The day Kwesi lost the rain', ages: '6–7', minAge: 6, maxAge: 7, level: 'A1',
    blurb: { en: 'Kwesi wants a sunny day for his football match. But his sister’s seeds need rain…', fr: 'Kwesi veut du soleil pour son match. Mais les graines de sa sœur ont besoin de pluie…' },
    cloth: '#2E6FB0', ink: '#FFF3D6',
    cover: { scene: 'savanna', time: 'day', props: ['clouds', 'rain', 'acacia'], cast: [{ who: 'kwesi', x: 34, y: 30, size: 24, expression: 'focus' }] },
    pages: [
      { scene: 'compound', time: 'day', props: ['clouds', 'house'], cast: [{ who: 'kwesi', x: 32, y: 30, size: 24, expression: 'focus' }, { who: 'afi', x: 66, y: 30, size: 22, expression: 'smile', flip: true }], fr: 'Samedi, Kwesi a un match de foot. Sa sœur Afi a planté six petites graines.', en: 'On Saturday, Kwesi has a football match. His sister Afi has planted six little seeds.' },
      { scene: 'compound', time: 'day', props: ['clouds', 'house'], cast: [{ who: 'kwesi', x: 34, y: 30, size: 24, expression: 'calm' }], fr: 'Kwesi regarde le ciel gris et dit : « Pluie, va-t’en ! Je veux jouer ! »', en: 'Kwesi looks at the grey sky and says: “Rain, go away! I want to play!”' },
      { scene: 'pitch', time: 'day', props: ['sun', 'acacia'], cast: [{ who: 'kwesi', x: 30, y: 34, size: 22, expression: 'joy' }], fr: 'Le samedi, il fait chaud et sec. Kwesi gagne deux à zéro. Hourra !', en: 'On Saturday, it is hot and dry. Kwesi wins two–nil. Hooray!' },
      { scene: 'garden', time: 'dusk', props: ['sun', 'house'], cast: [{ who: 'afi', x: 40, y: 32, size: 22, expression: 'calm' }], fr: 'Mais à la maison, Afi pleure. Ses graines sont jaunes et toutes petites.', en: 'But at home, Afi is crying. Her seeds are yellow and tiny.' },
      { scene: 'compound', time: 'dusk', props: ['house', 'well'], cast: [{ who: 'kwesi', x: 32, y: 30, size: 24, expression: 'focus' }, { who: 'afi', x: 66, y: 32, size: 22, expression: 'smile', flip: true }], fr: 'Kwesi prend un seau au puits. « Je suis désolé, Afi. Je vais t’aider. »', en: 'Kwesi takes a bucket from the well. “I’m sorry, Afi. I’ll help you.”' },
      { scene: 'garden', time: 'day', props: ['clouds', 'rain', 'acacia'], cast: [{ who: 'kwesi', x: 30, y: 32, size: 22, expression: 'joy' }, { who: 'afi', x: 62, y: 32, size: 22, expression: 'joy', flip: true }], fr: 'Le lundi, il pleut enfin. Kwesi danse sous la pluie avec Afi. « Merci, la pluie ! »', en: 'On Monday, it finally rains. Kwesi dances in the rain with Afi. “Thank you, rain!”' },
    ],
    questions: [
      { q: 'Pourquoi Kwesi ne veut-il pas de pluie ?', options: ['Il a un match de foot.', 'Il a peur du tonnerre.', 'Il veut aller au marché.'], answer: 0, why: 'Samedi, Kwesi a un match de foot.' },
      { q: 'Combien de graines Afi a-t-elle plantées ?', options: ['deux', 'quatre', 'six'], answer: 2, why: 'Sa sœur Afi a planté six petites graines.' },
    ],
  },
  {
    id: 'bk-tambour', title: 'Le tambour fêlé', titleEn: 'The cracked drum', ages: '8–10', minAge: 8, maxAge: 10, level: 'A2',
    blurb: { en: 'The night before the festival, Yao’s drum cracks. His grandmother has an unusual idea.', fr: 'La veille de la fête, le tambour de Yao se fend. Sa grand-mère a une drôle d’idée.' },
    cloth: '#8A5A12', ink: '#FFF3D6',
    cover: { scene: 'festival', time: 'night', props: ['moon', 'stars', 'house'], cast: [{ who: 'yao', x: 40, y: 30, size: 22, expression: 'focus' }] },
    pages: [
      { scene: 'festival', time: 'dusk', props: ['house', 'birds'], cast: [{ who: 'yao', x: 34, y: 30, size: 22, expression: 'joy' }], fr: 'Depuis des semaines, Yao répétait pour la fête du village. Pour la première fois, il allait jouer du tambour devant tout le monde.', en: 'For weeks, Yao had been practising for the village festival. For the first time, he was going to play the drum in front of everyone.' },
      { scene: 'compound', time: 'night', props: ['moon', 'stars', 'house'], cast: [{ who: 'yao', x: 38, y: 30, size: 22, expression: 'calm' }], fr: 'Mais la veille, en jouant trop fort, il a entendu un « crac ». La peau du tambour était fendue.', en: 'But the night before, playing too hard, he heard a “crack”. The drum skin was split.' },
      { scene: 'compound', time: 'night', props: ['moon', 'house'], cast: [{ who: 'mamie', x: 64, y: 22, size: 26, expression: 'calm', flip: true }, { who: 'yao', x: 32, y: 30, size: 22, expression: 'calm' }], fr: '« Je ne jouerai pas demain », a dit Yao, la gorge serrée. Mamie a pris le tambour dans ses mains et l’a écouté, comme un vieil ami.', en: '“I won’t play tomorrow,” Yao said, with a lump in his throat. Grandma took the drum in her hands and listened to it, like an old friend.' },
      { scene: 'market', time: 'day', props: ['sun', 'stall', 'fabric'], cast: [{ who: 'yao', x: 30, y: 28, size: 22, expression: 'focus' }, { who: 'mamie', x: 64, y: 24, size: 24, expression: 'smile', flip: true }], fr: 'À l’aube, ils sont allés au marché chercher une nouvelle peau et de la corde. Mamie a montré à Yao comment la tendre, nœud après nœud.', en: 'At dawn, they went to the market for a new skin and some rope. Grandma showed Yao how to stretch it, knot after knot.' },
      { scene: 'compound', time: 'day', props: ['sun', 'house', 'mortar'], cast: [{ who: 'yao', x: 34, y: 30, size: 22, expression: 'focus' }], fr: 'C’était long. Ses doigts lui faisaient mal. Mais à chaque nœud, le son devenait un peu plus clair.', en: 'It took a long time. His fingers hurt. But with every knot, the sound became a little clearer.' },
      { scene: 'festival', time: 'dusk', props: ['house', 'stars'], cast: [{ who: 'yao', x: 32, y: 30, size: 22, expression: 'joy' }, { who: 'mamie', x: 64, y: 24, size: 24, expression: 'joy', flip: true }], fr: 'Le soir, Yao a joué devant tout le village. Le tambour sonnait plus fort qu’avant. « Il a ta voix maintenant », a murmuré Mamie.', en: 'In the evening, Yao played in front of the whole village. The drum sounded louder than before. “It has your voice now,” Grandma whispered.' },
    ],
    questions: [
      { q: 'Qu’est-il arrivé au tambour la veille de la fête ?', options: ['Il a été volé.', 'Sa peau s’est fendue.', 'Il est tombé dans le puits.'], answer: 1, why: 'La peau du tambour était fendue.' },
      { q: 'Comment Yao a-t-il réparé le tambour ?', options: ['Il en a acheté un neuf.', 'Avec Mamie, une nouvelle peau et de la corde.', 'Avec de la colle.'], answer: 1, why: 'Mamie a montré à Yao comment tendre une nouvelle peau, nœud après nœud.' },
      { q: 'Que veut dire « Il a ta voix maintenant » ?', options: ['Le tambour parle.', 'Yao l’a réparé lui-même, il est un peu à lui.', 'Yao doit chanter.'], answer: 1, why: 'En le réparant, Yao a mis un peu de lui-même dans le tambour.' },
    ],
  },
  {
    id: 'bk-aminata', title: 'Les mots d’Aminata', titleEn: 'Aminata’s words', ages: '11–15', minAge: 11, maxAge: 15, level: 'A2–B1',
    blurb: { en: 'Aminata speaks three languages and is ashamed of her accent. Until the day her words are needed.', fr: 'Aminata parle trois langues et a honte de son accent. Jusqu’au jour où l’on a besoin de ses mots.' },
    cloth: '#6E1630', ink: '#F6E7C8',
    cover: { scene: 'market', time: 'day', props: ['sun', 'stall', 'fabric', 'umbrella'], cast: [{ who: 'aminata', x: 40, y: 26, size: 22, expression: 'calm' }] },
    pages: [
      { scene: 'classroom', time: 'day', props: ['chalkboard', 'desk', 'books'], cast: [{ who: 'aminata', x: 32, y: 30, size: 22, expression: 'calm' }], fr: 'À Accra, Aminata parlait wolof avec sa mère, anglais à l’école et français avec sa tante de Dakar. Pourtant, en classe de français, elle ne levait jamais la main.', en: 'In Accra, Aminata spoke Wolof with her mother, English at school and French with her aunt from Dakar. Yet in French class, she never raised her hand.' },
      { scene: 'classroom', time: 'day', props: ['chalkboard', 'desk'], cast: [{ who: 'aminata', x: 34, y: 30, size: 22, expression: 'focus' }], fr: 'Un jour, un camarade avait ri de son accent. Depuis, elle gardait ses phrases pour elle, bien rangées, comme des vêtements trop beaux pour être portés.', en: 'One day, a classmate had laughed at her accent. Since then, she kept her sentences to herself, neatly folded, like clothes too nice to wear.' },
      { scene: 'market', time: 'day', props: ['sun', 'stall', 'fabric', 'umbrella'], cast: [{ who: 'aminata', x: 30, y: 28, size: 22, expression: 'calm' }, { who: 'maman', x: 64, y: 24, size: 24, expression: 'focus', flip: true }], fr: 'Le samedi, elle aidait sa mère au stand de tissus de Makola. Ce jour-là, une cliente togolaise est arrivée, pressée, perdue, ne parlant que français.', en: 'On Saturdays, she helped her mother at the fabric stall in Makola. That day, a Togolese customer arrived, in a hurry, lost, speaking only French.' },
      { scene: 'market', time: 'day', props: ['stall', 'fabric'], cast: [{ who: 'aminata', x: 34, y: 28, size: 22, expression: 'focus' }, { who: 'prof', x: 66, y: 24, size: 24, expression: 'calm', flip: true }], fr: 'Sa mère s’est tournée vers elle. Aminata a hésité, le cœur battant, puis les mots sont venus tout seuls : les prix, les couleurs, et même une petite blague.', en: 'Her mother turned to her. Aminata hesitated, her heart pounding, then the words came on their own: the prices, the colours, and even a little joke.' },
      { scene: 'market', time: 'dusk', props: ['stall', 'umbrella', 'birds'], cast: [{ who: 'aminata', x: 32, y: 28, size: 22, expression: 'joy' }, { who: 'prof', x: 64, y: 24, size: 24, expression: 'joy', flip: true }], fr: 'La cliente a ri, puis elle a dit : « Ton accent ? C’est celui de quelqu’un qui a voyagé dans trois langues. Garde-le. »', en: 'The customer laughed, then said: “Your accent? It’s the accent of someone who has travelled through three languages. Keep it.”' },
      { scene: 'classroom', time: 'day', props: ['chalkboard', 'desk', 'books'], cast: [{ who: 'aminata', x: 32, y: 28, size: 22, expression: 'joy' }, { who: 'prof', x: 66, y: 20, size: 24, expression: 'smile', flip: true }], fr: 'Le lundi suivant, Aminata a levé la main. Sa voix tremblait un peu. Mais cette fois, elle n’a pas rangé ses mots : elle les a portés.', en: 'The following Monday, Aminata raised her hand. Her voice trembled a little. But this time she didn’t fold her words away: she wore them.' },
    ],
    questions: [
      { q: 'Pourquoi Aminata ne parlait-elle pas en classe de français ?', options: ['Elle ne comprenait pas.', 'Un camarade avait ri de son accent.', 'Elle préférait l’anglais.'], answer: 1, why: 'Un jour, un camarade avait ri de son accent.' },
      { q: 'Qu’est-ce qui a changé au marché ?', options: ['Elle a aidé une cliente en français.', 'Elle a vendu tous les tissus.', 'Elle a appris le wolof.'], answer: 0, why: 'Les mots sont venus tout seuls pour aider la cliente.' },
      { q: 'Que signifie « elle les a portés » à la fin ?', options: ['Elle a acheté des vêtements.', 'Elle a osé utiliser ses mots, avec fierté.', 'Elle a écrit une lettre.'], answer: 1, why: 'Au début, elle « rangeait » ses mots ; à la fin, elle ose les montrer.' },
    ],
    glossary: [
      { fr: 'avoir honte de', en: 'to be ashamed of' },
      { fr: 'lever la main', en: 'to raise your hand' },
      { fr: 'hésiter', en: 'to hesitate' },
      { fr: 'le cœur battant', en: 'heart pounding' },
      { fr: 'oser', en: 'to dare' },
    ],
    reflect: { en: 'Is there something you hide because you’re afraid of others’ reactions? What would help you “wear” it?', fr: 'Y a-t-il quelque chose que tu caches par peur de la réaction des autres ? Qu’est-ce qui t’aiderait à le « porter » ?' },
  },
];

/** Every book: the originals first, then the six extra per age group. */
export const BOOKS: Book[] = [...BASE_BOOKS, ...MORE_BOOKS];

/** How many new books a child gets each week. */
export const BOOKS_PER_WEEK = 4;

/** The age groups books are written for (a child's age, set on their profile, picks one). */
export const AGE_BANDS = [
  { id: '4-5', label: '4–5', min: 0, max: 5 },
  { id: '6-7', label: '6–7', min: 6, max: 7 },
  { id: '8-10', label: '8–10', min: 8, max: 10 },
  { id: '11-15', label: '11–15', min: 11, max: 99 },
] as const;
export const bandFor = (age: number) => AGE_BANDS.find((b) => age >= b.min && age <= b.max) ?? AGE_BANDS[0];
/** Only the books written for this child's age group. */
export const booksForAge = (age: number) => {
  const band = bandFor(age);
  return BOOKS.filter((b) => b.ages === band.label);
};

/** ISO week number, so the "book of the week" changes every Monday. */
const weekNumber = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
};
export const weekKey = (iso: string) => `${iso.slice(0, 4)}-W${weekNumber(iso)}`;

export interface BookPick { week: string; bookIds?: string[]; /** older single-book pick */ bookId?: string }

/** This week's books (four of them): the parent's picks for this week if they made any, otherwise the next in turn.
 *  The rotation moves four books along every Monday, so a band with 8 books alternates two fresh sets. */
export function booksOfTheWeek(age: number, today: string, pick?: BookPick, count = BOOKS_PER_WEEK) {
  const list = booksForAge(age);
  if (!list.length) return [];
  const n = Math.min(count, list.length);
  const chosenIds = pick && pick.week === weekKey(today) ? (pick.bookIds ?? (pick.bookId ? [pick.bookId] : [])) : [];
  const chosen = chosenIds.map((id) => list.find((b) => b.id === id)).filter((b): b is Book => !!b).slice(0, n);
  const start = (weekNumber(today) * n) % list.length;
  const rotation = Array.from({ length: list.length }, (_, i) => list[(start + i) % list.length]);
  // A parent's choice for this week is shown exactly as they left it.
  if (chosen.length) return chosen;
  const out: Book[] = [];
  for (const b of rotation) { if (out.length >= n) break; if (!out.includes(b)) out.push(b); }
  return out;
}
/** The automatic set for this week, ignoring any parent pick. */
export const autoBooksOfTheWeek = (age: number, today: string) => booksOfTheWeek(age, today);

/** The book that matches a child's age (falls back to the nearest band). */
export function bookForAge(age: number) {
  return BOOKS.find((b) => age >= b.minAge && age <= b.maxAge) ?? (age < 4 ? BOOKS[0] : BOOKS[BOOKS.length - 1]);
}
