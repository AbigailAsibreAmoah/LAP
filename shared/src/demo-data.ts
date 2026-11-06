// Deterministic demo seed. Every name, figure and profile here is fictional
// sample content for the prototype — not client-approved data.
import { SEED_SHIFT_DAYS, shiftDatesInPlace, weekdayIso } from './clock';
import type {
  AppNotification,
  Booking,
  Course,
  CourseArea,
  Learner,
  LessonContent,
  MembershipPlan,
  MessageThread,
  Milestone,
  Pathway,
  Payment,
  SpeakingScenario,
  Tutor,
  VocabEntry,
} from './types';

/** Every lesson opens with a video of about 5 minutes (4–6 min allowed). */
export const OPENING_VIDEO_TARGET_SECONDS = 300;
export const OPENING_VIDEO_MIN_SECONDS = 240;
export const OPENING_VIDEO_MAX_SECONDS = 360;

export { DEMO_TODAY } from './clock';
export const DEMO_LEARNER_ID = 'lrn-ama';
export const DEMO_TUTOR_ID = 'tut-sophie';

const skin = {
  deep: '#4E2F1F',
  rich: '#6B3F26',
  warm: '#8A5634',
  golden: '#B47A4E',
  fair: '#E3BC98',
};

export const COURSE_AREAS: CourseArea[] = [
  { id: 'conversational', name: { en: 'Conversational French', fr: 'Français conversationnel' }, blurb: { en: 'Speak naturally in everyday and social situations.', fr: 'Parler naturellement au quotidien et en société.' } },
  { id: 'business', name: { en: 'Business & Executive French', fr: 'Français des affaires' }, blurb: { en: 'Meetings, negotiation and leadership communication.', fr: 'Réunions, négociation et communication de direction.' } },
  { id: 'diplomacy', name: { en: 'Diplomacy & International Relations', fr: 'Diplomatie et relations internationales' }, blurb: { en: 'Protocol, briefings and multilateral dialogue.', fr: 'Protocole, notes de synthèse et dialogue multilatéral.' } },
  { id: 'policy', name: { en: 'Public Policy & Development', fr: 'Politiques publiques et développement' }, blurb: { en: 'Programme language for development practitioners.', fr: 'Le langage des programmes pour les acteurs du développement.' } },
  { id: 'entrepreneurship', name: { en: 'Entrepreneurship & Trade', fr: 'Entrepreneuriat et commerce' }, blurb: { en: 'Pitch, partner and trade across Francophone markets.', fr: 'Présenter, s’associer et commercer dans l’espace francophone.' } },
  { id: 'everyday', name: { en: 'Everyday French', fr: 'Français du quotidien' }, blurb: { en: 'Travel, shopping, directions and daily life.', fr: 'Voyages, achats, orientation et vie quotidienne.' } },
  { id: 'academic', name: { en: 'Academic & Career Development', fr: 'Études et carrière' }, blurb: { en: 'Applications, interviews and study abroad.', fr: 'Candidatures, entretiens et études à l’étranger.' } },
  { id: 'exams', name: { en: 'DELF / TCF / TEF Preparation', fr: 'Préparation DELF / TCF / TEF' }, blurb: { en: 'Structured practice for recognised French exams.', fr: 'Entraînement structuré aux examens reconnus.' } },
];

export const TUTORS: Tutor[] = [
  {
    id: 'tut-sophie',
    name: 'Sophie Laurent',
    title: { en: 'Conversation & Business French tutor', fr: 'Tutrice — conversation et français des affaires' },
    languages: ['Français', 'English'],
    specialities: ['Conversation', 'Business French', 'Pronunciation'],
    levels: 'A2–B2',
    bio: {
      en: 'Helps professionals build confidence in French through real-life conversation, meeting practice and patient pronunciation coaching.',
      fr: 'Aide les professionnels à gagner en assurance grâce à des conversations réelles, des mises en situation et un travail patient sur la prononciation.',
    },
    rating: 4.9,
    reviews: 134,
    portrait: { skin: skin.rich, hair: 'curls', hairColor: '#1C1310', outfit: '#6E1630', accent: '#C49A5A', bg: '#EADBC8', earrings: true },
    availability: { 1: ['08:00', '10:00', '14:00'], 2: ['08:00', '10:00', '12:00', '14:00', '16:00'], 3: ['10:00', '12:00'], 4: ['08:00', '10:00', '16:00', '18:00'], 5: ['10:00', '14:00'] },
  },
  {
    id: 'tut-jeanmarc',
    name: 'Jean-Marc Diallo',
    title: { en: 'Diplomacy & public policy tutor', fr: 'Tuteur — diplomatie et politiques publiques' },
    languages: ['Français', 'English', 'Wolof'],
    specialities: ['Diplomacy', 'Public policy', 'Formal writing'],
    levels: 'B1–C2',
    bio: {
      en: 'Works with public servants and development practitioners on briefings, formal correspondence and multilateral meetings.',
      fr: 'Accompagne fonctionnaires et praticiens du développement : notes de synthèse, correspondance formelle et réunions multilatérales.',
    },
    rating: 4.8,
    reviews: 87,
    portrait: { skin: skin.deep, hair: 'short', hairColor: '#120C09', outfit: '#141B34', accent: '#F1E6D2', bg: '#DCE3EE', glasses: true, beard: true },
    availability: { 1: ['16:00', '18:00'], 2: ['18:00'], 3: ['14:00', '16:00', '18:00'], 4: ['18:00'], 6: ['10:00', '12:00'] },
  },
  {
    id: 'tut-aicha',
    name: 'Aïcha Koné',
    title: { en: 'Exam preparation tutor (DELF / TCF / TEF)', fr: 'Tutrice — préparation DELF / TCF / TEF' },
    languages: ['Français', 'English', 'Dioula'],
    specialities: ['DELF', 'TCF', 'TEF', 'Written expression'],
    levels: 'A1–C2',
    bio: {
      en: 'Structured, encouraging exam coaching with timed practice, marking guides and clear feedback on written and oral tasks.',
      fr: 'Un coaching d’examen structuré et bienveillant : épreuves chronométrées, grilles de correction et retours clairs.',
    },
    rating: 4.9,
    reviews: 112,
    portrait: { skin: skin.warm, hair: 'headwrap', hairColor: '#1C1310', outfit: '#1F6B4F', accent: '#C49A5A', bg: '#E4E9DC', earrings: true },
    availability: { 1: ['10:00', '12:00'], 2: ['10:00', '14:00'], 3: ['08:00', '10:00', '12:00'], 5: ['08:00', '10:00', '12:00', '14:00'] },
  },
  {
    id: 'tut-thomas',
    name: 'Thomas Bernard',
    title: { en: 'Entrepreneurship & trade tutor', fr: 'Tuteur — entrepreneuriat et commerce' },
    languages: ['Français', 'English'],
    specialities: ['Entrepreneurship', 'Negotiation', 'Pitching'],
    levels: 'A2–B2',
    bio: {
      en: 'Former trade adviser who coaches founders to pitch, negotiate and build partnerships in Francophone markets.',
      fr: 'Ancien conseiller commercial, il prépare les entrepreneurs à présenter, négocier et nouer des partenariats.',
    },
    rating: 4.7,
    reviews: 64,
    portrait: { skin: skin.fair, hair: 'waves', hairColor: '#4A3324', outfit: '#2B3558', accent: '#E8DCC6', bg: '#EEE3D3', beard: true },
    availability: { 2: ['12:00', '16:00'], 3: ['16:00', '18:00'], 4: ['12:00', '14:00'], 5: ['16:00'] },
  },
];

const L = (en: string, fr: string) => ({ en, fr });

/**
 * The catalogue. Every course belongs to exactly ONE CEFR level: no course spans levels.
 * Each level is a short sequence of courses (PATHWAYS), and the last lesson of a level's last
 * course is that level's end-of-level assessment (kind 'assessment').
 */
export const COURSES: Course[] = [
  /* ---------------- A1 ---------------- */
  {
    id: 'crs-everyday',
    area: 'everyday',
    title: L('Everyday French Essentials', 'L’essentiel du français au quotidien'),
    summary: L('Travel, shopping, directions and getting things done — the foundations, beautifully explained.', 'Voyager, faire ses courses, s’orienter : les bases, clairement expliquées.'),
    levels: 'A1',
    format: L('Fully self-paced', 'Entièrement en autonomie'),
    durationWeeks: 5,
    outcomes: [L('Handle common travel situations', 'Gérer les situations de voyage courantes'), L('Understand everyday announcements', 'Comprendre les annonces du quotidien')],
    tutorId: 'tut-aicha',
    accent: 'green',
    premium: false,
    modules: [
      { title: L('Getting around', 'Se déplacer'), lessons: [
        { id: 'les-e1', title: 'Demander son chemin', minutes: 15, kind: 'video', videoSec: 305 },
        { id: 'les-e2', title: 'À la gare', minutes: 15, kind: 'quiz', videoSec: 315 },
      ] },
      { title: L('Shopping & numbers', 'Les courses et les nombres'), lessons: [
        { id: 'les-e3', title: 'Au marché : les prix', minutes: 15, kind: 'video', videoSec: 290 },
        { id: 'les-e4', title: 'Commander au restaurant', minutes: 20, kind: 'speaking', videoSec: 300 },
      ] },
    ],
  },
  {
    id: 'crs-conversation',
    area: 'conversational',
    title: L('First Conversations', 'Premières conversations'),
    summary: L('Greetings, simple questions and your first opinions — French that sounds natural, not memorised.', 'Salutations, questions simples et premières opinions — un français naturel, pas récité.'),
    levels: 'A1',
    format: L('Guided practice + conversation clubs', 'Pratique guidée + clubs de conversation'),
    durationWeeks: 5,
    outcomes: [L('Introduce yourself and others', 'Se présenter et présenter quelqu’un'), L('Ask and answer simple questions', 'Poser des questions simples et y répondre'), L('Say what you like and why', 'Dire ce qu’on aime et pourquoi')],
    tutorId: 'tut-sophie',
    accent: 'navy',
    premium: false,
    modules: [
      { title: L('Breaking the ice', 'Briser la glace'), lessons: [
        { id: 'les-c1', title: 'Les salutations et les présentations', minutes: 15, kind: 'video', videoSec: 305 },
        { id: 'les-c2', title: 'Poser des questions simples', minutes: 20, kind: 'speaking', videoSec: 315 },
      ] },
      { title: L('Likes & opinions', 'Goûts et opinions'), lessons: [
        { id: 'les-c3', title: 'À mon avis…', minutes: 20, kind: 'video', videoSec: 285 },
        { id: 'les-c4', title: 'Quiz : exprimer une opinion', minutes: 10, kind: 'quiz', videoSec: 300 },
        { id: 'les-final-a1', title: 'Évaluation de fin de niveau A1', minutes: 45, kind: 'assessment', videoSec: 300 },
      ] },
    ],
  },

  /* ---------------- A2 ---------------- */
  {
    id: 'crs-business',
    area: 'business',
    title: L('Business French: First Steps at Work', 'Français des affaires : premiers pas au travail'),
    summary: L('Introduce yourself professionally, take part in meetings and present a simple idea to colleagues.', 'Se présenter professionnellement, participer aux réunions et présenter une idée simple.'),
    levels: 'A2',
    format: L('Self-paced lessons + weekly live practice', 'Leçons en autonomie + pratique en direct hebdomadaire'),
    durationWeeks: 6,
    outcomes: [L('Introduce yourself and your organisation', 'Présenter votre parcours et votre organisation'), L('Take part in a professional meeting', 'Participer à une réunion professionnelle'), L('Present a simple project', 'Présenter un projet simple')],
    tutorId: 'tut-sophie',
    accent: 'burgundy',
    premium: true,
    modules: [
      { title: L('Professional introductions', 'Se présenter professionnellement'), lessons: [
        { id: 'les-b1', title: 'Se présenter en réunion', minutes: 25, kind: 'video', videoSec: 285 },
        { id: 'les-b2', title: 'Parler de son parcours', minutes: 20, kind: 'reading', videoSec: 300 },
        { id: 'les-b3', title: 'Quiz : les présentations', minutes: 10, kind: 'quiz', videoSec: 320 },
      ] },
      { title: L('Meetings', 'Les réunions'), lessons: [
        { id: 'les-b4', title: 'Prendre la parole', minutes: 30, kind: 'video', videoSec: 275 },
        { id: 'les-b5', title: 'Exprimer son accord ou son désaccord', minutes: 25, kind: 'speaking', videoSec: 310 },
        { id: 'les-b6', title: 'Compte rendu de réunion', minutes: 45, kind: 'assignment', videoSec: 295 },
      ] },
      { title: L('Presenting ideas', 'Présenter une idée'), lessons: [
        { id: 'les-b7', title: 'Structurer une présentation', minutes: 30, kind: 'video', videoSec: 330 },
        { id: 'les-b8', title: 'Classe en direct : présenter un projet', minutes: 45, kind: 'live', videoSec: 290 },
      ] },
    ],
  },
  {
    id: 'crs-trade',
    area: 'entrepreneurship',
    title: L('Entrepreneurship & Trade: First Deals', 'Entreprendre en français : premières affaires'),
    summary: L('Present your business, ask for a quote and agree simple terms with partners across Francophone Africa.', 'Présenter votre entreprise, demander un devis et convenir de conditions simples avec vos partenaires.'),
    levels: 'A2',
    format: L('Self-paced + pitch practice sessions', 'Autonomie + séances d’entraînement au pitch'),
    durationWeeks: 6,
    outcomes: [L('Present a product in two minutes', 'Présenter un produit en deux minutes'), L('Ask for and compare quotes', 'Demander et comparer des devis')],
    tutorId: 'tut-thomas',
    accent: 'gold',
    premium: true,
    modules: [
      { title: L('The pitch', 'Le pitch'), lessons: [
        { id: 'les-t1', title: 'Présenter son entreprise', minutes: 20, kind: 'video', videoSec: 330 },
        { id: 'les-t2', title: 'Négocier un accord', minutes: 30, kind: 'speaking', videoSec: 290 },
        { id: 'les-final-a2', title: 'Évaluation de fin de niveau A2', minutes: 45, kind: 'assessment', videoSec: 300 },
      ] },
    ],
  },

  /* ---------------- B1 ---------------- */
  {
    id: 'crs-career',
    area: 'academic',
    title: L('Academic & Career French', 'Le français pour les études et la carrière'),
    summary: L('Applications, interviews and study-abroad preparation in confident, well-structured French.', 'Candidatures, entretiens et préparation aux études à l’étranger.'),
    levels: 'B1',
    format: L('Self-paced + mock interviews', 'Autonomie + simulations d’entretien'),
    durationWeeks: 5,
    outcomes: [L('Write a motivation letter', 'Rédiger une lettre de motivation'), L('Answer interview questions with confidence', 'Répondre avec assurance en entretien')],
    tutorId: 'tut-aicha',
    accent: 'burgundy',
    premium: false,
    modules: [
      { title: L('Applications', 'Les candidatures'), lessons: [
        { id: 'les-a1', title: 'La lettre de motivation', minutes: 30, kind: 'assignment', videoSec: 285 },
        { id: 'les-a2', title: 'L’entretien d’embauche', minutes: 25, kind: 'speaking', videoSec: 300 },
      ] },
    ],
  },
  {
    id: 'crs-business-b1',
    area: 'business',
    title: L('Business French: Meetings & Negotiation', 'Français des affaires : réunions et négociation'),
    summary: L('Run a short meeting, explain a problem and negotiate a simple agreement.', 'Animer une courte réunion, expliquer un problème et négocier un accord simple.'),
    levels: 'B1',
    format: L('Self-paced lessons + weekly live practice', 'Leçons en autonomie + pratique en direct hebdomadaire'),
    durationWeeks: 5,
    outcomes: [L('Lead a short meeting', 'Animer une courte réunion'), L('Negotiate deadlines and prices', 'Négocier des délais et des prix')],
    tutorId: 'tut-sophie',
    accent: 'navy',
    premium: true,
    modules: [
      { title: L('Leading meetings', 'Animer une réunion'), lessons: [
        { id: 'les-bb1', title: 'Ouvrir et clore une réunion', minutes: 25, kind: 'video', videoSec: 300 },
        { id: 'les-bb2', title: 'Négocier un accord', minutes: 30, kind: 'speaking', videoSec: 290 },
      ] },
    ],
  },
  {
    id: 'crs-policy',
    area: 'policy',
    title: L('Public Policy & Development French', 'Français des politiques publiques'),
    summary: L('Programme design, stakeholder meetings and reporting language for development practitioners.', 'Conception de programmes, réunions avec les partenaires et rédaction de rapports.'),
    levels: 'B1',
    format: L('Self-paced + monthly case clinics', 'Autonomie + ateliers mensuels d’études de cas'),
    durationWeeks: 4,
    outcomes: [L('Describe a programme and its impact', 'Décrire un programme et son impact'), L('Write a short briefing note', 'Rédiger une courte note de synthèse')],
    tutorId: 'tut-jeanmarc',
    accent: 'green',
    premium: true,
    modules: [
      { title: L('Programme language', 'Le langage des programmes'), lessons: [
        { id: 'les-p1', title: 'Objectifs, résultats et indicateurs', minutes: 25, kind: 'video', videoSec: 310 },
        { id: 'les-p2', title: 'Rédiger une note de synthèse', minutes: 40, kind: 'assignment', videoSec: 295 },
        { id: 'les-final-b1', title: 'Évaluation de fin de niveau B1', minutes: 50, kind: 'assessment', videoSec: 300 },
      ] },
    ],
  },

  /* ---------------- B2 ---------------- */
  {
    id: 'crs-business-b2',
    area: 'business',
    title: L('Business French: Persuade & Present', 'Français des affaires : convaincre et présenter'),
    summary: L('Present complex projects, defend a budget and write reports that colleagues act on.', 'Présenter des projets complexes, défendre un budget et rédiger des rapports suivis d’effet.'),
    levels: 'B2',
    format: L('Self-paced lessons + weekly live practice', 'Leçons en autonomie + pratique en direct hebdomadaire'),
    durationWeeks: 5,
    outcomes: [L('Defend a proposal in a meeting', 'Défendre une proposition en réunion'), L('Write a structured report', 'Rédiger un rapport structuré')],
    tutorId: 'tut-sophie',
    accent: 'burgundy',
    premium: true,
    modules: [
      { title: L('Persuading', 'Convaincre'), lessons: [
        { id: 'les-bc1', title: 'Défendre un budget', minutes: 30, kind: 'video', videoSec: 305 },
        { id: 'les-bc2', title: 'Rédiger un rapport d’activité', minutes: 45, kind: 'assignment', videoSec: 295 },
      ] },
    ],
  },
  {
    id: 'crs-diplomacy',
    area: 'diplomacy',
    title: L('French for Diplomacy', 'Le français de la diplomatie'),
    summary: L('Protocol, formal registers and multilateral meeting language for international careers.', 'Protocole, registre soutenu et langage des réunions multilatérales.'),
    levels: 'B2',
    format: L('Cohort programme with live seminars', 'Programme en cohorte avec séminaires en direct'),
    durationWeeks: 6,
    outcomes: [L('Use formal registers appropriately', 'Employer le registre soutenu à bon escient'), L('Summarise a position in a briefing', 'Résumer une position dans une note'), L('Follow and contribute to a plenary session', 'Suivre une séance plénière et y intervenir')],
    tutorId: 'tut-jeanmarc',
    accent: 'navy',
    premium: true,
    modules: [
      { title: L('Protocol & register', 'Protocole et registre'), lessons: [
        { id: 'les-d1', title: 'Les formules de politesse officielles', minutes: 25, kind: 'reading', videoSec: 320 },
        { id: 'les-d2', title: 'Intervenir en séance', minutes: 30, kind: 'speaking', videoSec: 275 },
      ] },
    ],
  },
  {
    id: 'crs-exams',
    area: 'exams',
    title: L('DELF B2 & TCF Preparation', 'Préparation DELF B2 et TCF'),
    summary: L('Timed practice, marking guides and targeted feedback for each paper of the DELF B2 and the TCF.', 'Épreuves chronométrées, grilles d’évaluation et retours ciblés pour chaque épreuve du DELF B2 et du TCF.'),
    levels: 'B2',
    format: L('Structured exam track + mock tests', 'Parcours structuré + examens blancs'),
    durationWeeks: 5,
    outcomes: [L('Understand each paper’s format', 'Maîtriser le format de chaque épreuve'), L('Manage time under exam conditions', 'Gérer son temps en conditions d’examen')],
    tutorId: 'tut-aicha',
    accent: 'gold',
    premium: true,
    modules: [
      { title: L('Exam formats', 'Les formats d’examen'), lessons: [
        { id: 'les-x1', title: 'Compréhension orale : stratégies', minutes: 25, kind: 'video', videoSec: 320 },
        { id: 'les-x2', title: 'Examen blanc — production écrite', minutes: 60, kind: 'assignment', videoSec: 275 },
        { id: 'les-final-b2', title: 'Évaluation de fin de niveau B2', minutes: 50, kind: 'assessment', videoSec: 300 },
      ] },
    ],
  },

  /* ---------------- C1 ---------------- */
  {
    id: 'crs-advanced',
    area: 'conversational',
    title: L('Advanced French: Debate & Expression', 'Français avancé : débat et expression'),
    summary: L('Argue, persuade and write with nuance: debates, editorials and specialist topics.', 'Argumenter, convaincre et écrire avec nuance : débats, tribunes et sujets spécialisés.'),
    levels: 'C1',
    format: L('Live debate seminars + guided writing', 'Séminaires de débat en direct + écriture guidée'),
    durationWeeks: 7,
    outcomes: [L('Defend a position and rebut objections', 'Défendre une position et réfuter les objections'), L('Write a structured editorial', 'Rédiger une tribune structurée')],
    tutorId: 'tut-jeanmarc',
    accent: 'navy',
    premium: true,
    modules: [
      { title: L('Argue with nuance', 'Argumenter avec nuance'), lessons: [
        { id: 'les-adv1', title: 'Nuancer et concéder', minutes: 30, kind: 'video', videoSec: 300 },
        { id: 'les-adv2', title: 'Rédiger une tribune', minutes: 45, kind: 'assignment', videoSec: 290 },
      ] },
    ],
  },
  {
    id: 'crs-diplomacy-c1',
    area: 'diplomacy',
    title: L('Diplomatic Drafting & Negotiation', 'Rédaction et négociation diplomatiques'),
    summary: L('Draft communiqués, negotiate wording and chair working sessions in formal French.', 'Rédiger des communiqués, négocier une formulation et présider des séances de travail.'),
    levels: 'C1',
    format: L('Cohort programme with live seminars', 'Programme en cohorte avec séminaires en direct'),
    durationWeeks: 7,
    outcomes: [L('Draft a joint communiqué', 'Rédiger un communiqué conjoint'), L('Chair a working session', 'Présider une séance de travail')],
    tutorId: 'tut-jeanmarc',
    accent: 'green',
    premium: true,
    modules: [
      { title: L('Drafting', 'La rédaction'), lessons: [
        { id: 'les-dc1', title: 'Le communiqué conjoint', minutes: 35, kind: 'reading', videoSec: 310 },
        { id: 'les-dc2', title: 'Négocier une formulation', minutes: 35, kind: 'speaking', videoSec: 290 },
      ] },
    ],
  },
  {
    id: 'crs-exams-c1',
    area: 'exams',
    title: L('DALF C1 Preparation', 'Préparation DALF C1'),
    summary: L('Synthesis, argued essays and the oral defence of the DALF C1, under real exam timing.', 'Synthèse, essai argumenté et soutenance orale du DALF C1, en conditions réelles.'),
    levels: 'C1',
    format: L('Structured exam track + mock tests', 'Parcours structuré + examens blancs'),
    durationWeeks: 6,
    outcomes: [L('Write a synthesis from several documents', 'Rédiger une synthèse de documents'), L('Defend a point of view orally', 'Défendre un point de vue à l’oral')],
    tutorId: 'tut-aicha',
    accent: 'gold',
    premium: true,
    modules: [
      { title: L('The DALF C1 papers', 'Les épreuves du DALF C1'), lessons: [
        { id: 'les-xc1', title: 'La synthèse de documents', minutes: 40, kind: 'video', videoSec: 315 },
        { id: 'les-xc2', title: 'Examen blanc — soutenance orale', minutes: 45, kind: 'speaking', videoSec: 285 },
        { id: 'les-final-c1', title: 'Évaluation de fin de niveau C1', minutes: 60, kind: 'assessment', videoSec: 300 },
      ] },
    ],
  },

  /* ---------------- C2 ---------------- */
  {
    id: 'crs-mastery',
    area: 'conversational',
    title: L('Mastery: Style & Nuance', 'Maîtrise : style et nuances'),
    summary: L('Idiom, irony, literary registers and precise rewording, for near-native expression on any topic.', 'Expressions idiomatiques, ironie, registres littéraires et reformulation précise, pour s’exprimer comme un natif.'),
    levels: 'C2',
    format: L('Live seminars + guided writing', 'Séminaires en direct + écriture guidée'),
    durationWeeks: 8,
    outcomes: [L('Shift register precisely, from formal to familiar', 'Changer de registre avec précision, du soutenu au familier'), L('Rephrase with exact nuance', 'Reformuler avec la nuance exacte')],
    tutorId: 'tut-jeanmarc',
    accent: 'navy',
    premium: true,
    modules: [
      { title: L('Style', 'Le style'), lessons: [
        { id: 'les-m1', title: 'Jouer avec les registres', minutes: 35, kind: 'video', videoSec: 305 },
        { id: 'les-m2', title: 'L’ironie et le sous-entendu', minutes: 35, kind: 'reading', videoSec: 295 },
      ] },
    ],
  },
  {
    id: 'crs-exams-c2',
    area: 'exams',
    title: L('DALF C2 Preparation', 'Préparation DALF C2'),
    summary: L('The integrated DALF C2 papers: listen, read, then speak and write a structured response.', 'Les épreuves intégrées du DALF C2 : écouter, lire, puis produire une réponse structurée à l’oral et à l’écrit.'),
    levels: 'C2',
    format: L('Structured exam track + mock tests', 'Parcours structuré + examens blancs'),
    durationWeeks: 8,
    outcomes: [L('Master the integrated C2 format', 'Maîtriser le format intégré du C2'), L('Write a structured article from a dossier', 'Rédiger un article structuré à partir d’un dossier')],
    tutorId: 'tut-aicha',
    accent: 'gold',
    premium: true,
    modules: [
      { title: L('The DALF C2 papers', 'Les épreuves du DALF C2'), lessons: [
        { id: 'les-xm1', title: 'Compréhension et production orales', minutes: 45, kind: 'video', videoSec: 320 },
        { id: 'les-xm2', title: 'Examen blanc — production écrite', minutes: 60, kind: 'assignment', videoSec: 290 },
        { id: 'les-final-c2', title: 'Évaluation de fin de niveau C2', minutes: 60, kind: 'assessment', videoSec: 300 },
      ] },
    ],
  },
];

export const PATHWAYS: Pathway[] = [
  { level: 'A1', name: L('Foundations', 'Les fondations'), canDo: L('Introduce yourself and handle simple, familiar exchanges.', 'Se présenter et gérer des échanges simples et familiers.'), weeks: 10, courseIds: ['crs-everyday', 'crs-conversation'] },
  { level: 'A2', name: L('Everyday confidence', 'L’aisance au quotidien'), canDo: L('Discuss routine matters, work and immediate needs.', 'Parler de la routine, du travail et des besoins immédiats.'), weeks: 12, courseIds: ['crs-business', 'crs-trade'] },
  { level: 'B1', name: L('Independent communication', 'Communication autonome'), canDo: L('Handle most work and travel situations; explain ideas and plans.', 'Gérer la plupart des situations professionnelles ; expliquer idées et projets.'), weeks: 14, courseIds: ['crs-career', 'crs-business-b1', 'crs-policy'] },
  { level: 'B2', name: L('Professional fluency', 'Aisance professionnelle'), canDo: L('Argue a position, negotiate and present complex topics clearly.', 'Défendre une position, négocier et présenter des sujets complexes.'), weeks: 16, courseIds: ['crs-business-b2', 'crs-diplomacy', 'crs-exams'] },
  { level: 'C1', name: L('Advanced', 'Niveau avancé'), canDo: L('Persuade, write detailed reports and follow fast, natural speech with ease.', 'Convaincre, rédiger des rapports détaillés et suivre un débit naturel rapide sans effort.'), weeks: 20, courseIds: ['crs-advanced', 'crs-diplomacy-c1', 'crs-exams-c1'] },
  { level: 'C2', name: L('Mastery', 'Maîtrise'), canDo: L('Express yourself with near-native precision and nuance, on any topic.', 'S’exprimer avec une précision et des nuances proches d’un locuteur natif, sur tout sujet.'), weeks: 24, courseIds: ['crs-mastery', 'crs-exams-c2'] },
];

export const LEARNERS: Learner[] = [
  { id: 'lrn-ama', name: 'Ama Owusu', firstName: 'Ama', email: 'ama@laporte.demo', city: 'Accra', level: 'A2', progressToNext: 68, goal: L('Lead meetings with French-speaking partners', 'Animer des réunions avec des partenaires francophones'), areaId: 'business', portrait: { skin: skin.rich, hair: 'headwrap', hairColor: '#1C1310', outfit: '#6E1630', accent: '#C49A5A', bg: '#F0E2CF', earrings: true }, joined: '2026-06-02', lastActive: '2026-10-26', planId: 'plan-guided', credits: 3, streakDays: 5, lessonsCompleted: 12, lessonsTotal: 18 },
  { id: 'lrn-kofi', name: 'Kofi Boateng', firstName: 'Kofi', city: 'Kumasi', level: 'B1', progressToNext: 45, goal: L('Brief delegations at regional summits', 'Informer des délégations lors de sommets régionaux'), areaId: 'diplomacy', portrait: { skin: skin.deep, hair: 'short', hairColor: '#120C09', outfit: '#141B34', accent: '#E8DCC6', bg: '#DCE3EE', glasses: true }, joined: '2026-04-14', lastActive: '2026-10-25', planId: 'plan-executive', credits: 6, streakDays: 12, lessonsCompleted: 31, lessonsTotal: 40 },
  { id: 'lrn-efua', name: 'Efua Mensah', firstName: 'Efua', city: 'Takoradi', level: 'A1', progressToNext: 32, goal: L('Travel through Senegal and Côte d’Ivoire', 'Voyager au Sénégal et en Côte d’Ivoire'), areaId: 'everyday', portrait: { skin: skin.warm, hair: 'puff', hairColor: '#1C1310', outfit: '#C49A5A', accent: '#6E1630', bg: '#F3E6D3', earrings: true }, joined: '2026-09-01', lastActive: '2026-10-24', planId: 'plan-essentials', credits: 0, streakDays: 3, lessonsCompleted: 6, lessonsTotal: 20 },
  { id: 'lrn-yaw', name: 'Yaw Asante', firstName: 'Yaw', city: 'Accra', level: 'B2', progressToNext: 22, goal: L('Pass the TCF for further study', 'Réussir le TCF pour poursuivre ses études'), areaId: 'exams', portrait: { skin: skin.rich, hair: 'locs', hairColor: '#1A120D', outfit: '#1F6B4F', accent: '#F1E6D2', bg: '#E4E9DC' }, joined: '2026-02-10', lastActive: '2026-10-26', planId: 'plan-conversation', credits: 4, streakDays: 21, lessonsCompleted: 44, lessonsTotal: 52 },
  { id: 'lrn-adwoa', name: 'Adwoa Darko', firstName: 'Adwoa', city: 'Tema', level: 'A2', progressToNext: 54, goal: L('Negotiate with suppliers in Lomé', 'Négocier avec des fournisseurs à Lomé'), areaId: 'entrepreneurship', portrait: { skin: skin.golden, hair: 'bob', hairColor: '#2A1A12', outfit: '#2B3558', accent: '#C49A5A', bg: '#EEE3D3', earrings: true }, joined: '2026-07-20', lastActive: '2026-10-22', planId: 'plan-guided', credits: 1, streakDays: 0, lessonsCompleted: 9, lessonsTotal: 18 },
  { id: 'lrn-chinedu', name: 'Chinedu Okafor', firstName: 'Chinedu', city: 'Lagos', level: 'B1', progressToNext: 61, goal: L('Expand his logistics firm into Benin', 'Développer son entreprise de logistique au Bénin'), areaId: 'entrepreneurship', portrait: { skin: skin.deep, hair: 'waves', hairColor: '#120C09', outfit: '#6E1630', accent: '#E8DCC6', bg: '#F0E2CF', beard: true }, joined: '2026-05-05', lastActive: '2026-10-26', planId: 'plan-conversation', credits: 5, streakDays: 8, lessonsCompleted: 27, lessonsTotal: 36 },
  { id: 'lrn-grace', name: 'Grace Wanjiru', firstName: 'Grace', city: 'Nairobi', level: 'A2', progressToNext: 40, goal: L('Work on Francophone development programmes', 'Travailler sur des programmes de développement francophones'), areaId: 'policy', portrait: { skin: skin.warm, hair: 'curls', hairColor: '#1C1310', outfit: '#1F6B4F', accent: '#C49A5A', bg: '#E4E9DC', glasses: true }, joined: '2026-08-11', lastActive: '2026-10-23', planId: 'plan-guided', credits: 2, streakDays: 2, lessonsCompleted: 10, lessonsTotal: 18 },
  { id: 'lrn-samuel', name: 'Samuel Tetteh', firstName: 'Samuel', city: 'Cape Coast', level: 'A1', progressToNext: 15, goal: L('Prepare for a university exchange', 'Préparer un échange universitaire'), areaId: 'academic', portrait: { skin: skin.rich, hair: 'bald', hairColor: '#120C09', outfit: '#141B34', accent: '#C49A5A', bg: '#DCE3EE', beard: true }, joined: '2026-10-05', lastActive: '2026-10-19', planId: 'plan-essentials', credits: 0, streakDays: 0, lessonsCompleted: 2, lessonsTotal: 20 },
  { id: 'lrn-nana', name: 'Nana Akosua Frimpong', firstName: 'Nana', city: 'Accra', level: 'C1', progressToNext: 30, goal: L('Chair ECOWAS working groups in French', 'Présider des groupes de travail de la CEDEAO en français'), areaId: 'diplomacy', portrait: { skin: skin.rich, hair: 'headwrap', hairColor: '#1A120D', outfit: '#1F6B4F', accent: '#F1E6D2', bg: '#E4E9DC' }, joined: '2026-02-10', lastActive: '2026-10-26', planId: 'plan-conversation', credits: 4, streakDays: 21, lessonsCompleted: 44, lessonsTotal: 52 },
];

const teams = { provider: 'google-meet' as const, status: 'simulated' as const, joinUrl: null };

export const BOOKINGS: Booking[] = [
  { id: 'bk-1001', learnerId: 'lrn-ama', tutorId: 'tut-sophie', start: '2026-10-27T10:00:00Z', durationMin: 45, kind: 'private', topic: 'Business French — A2 · Leçon 6', status: 'confirmed', creditCost: 1, meeting: teams },
  { id: 'bk-1002', learnerId: 'lrn-ama', tutorId: 'tut-jeanmarc', start: '2026-10-29T18:00:00Z', durationMin: 60, kind: 'group', topic: 'Classe en direct — Prendre la parole en réunion', status: 'confirmed', creditCost: 0, meeting: teams },
  { id: 'bk-0998', learnerId: 'lrn-ama', tutorId: 'tut-sophie', start: '2026-10-20T10:00:00Z', durationMin: 45, kind: 'private', topic: 'Se présenter en réunion', status: 'completed', creditCost: 1, meeting: teams },
  { id: 'bk-0991', learnerId: 'lrn-ama', tutorId: 'tut-aicha', start: '2026-10-14T12:00:00Z', durationMin: 45, kind: 'private', topic: 'Compréhension orale', status: 'completed', creditCost: 1, meeting: teams },
  { id: 'bk-1003', learnerId: 'lrn-kofi', tutorId: 'tut-jeanmarc', start: '2026-10-26T16:00:00Z', durationMin: 60, kind: 'private', topic: 'Note de synthèse — sommet régional', status: 'confirmed', creditCost: 1, meeting: teams },
  { id: 'bk-1004', learnerId: 'lrn-yaw', tutorId: 'tut-aicha', start: '2026-10-28T10:00:00Z', durationMin: 60, kind: 'private', topic: 'TCF — production orale', status: 'confirmed', creditCost: 1, meeting: teams },
  { id: 'bk-1005', learnerId: 'lrn-chinedu', tutorId: 'tut-thomas', start: '2026-10-27T16:00:00Z', durationMin: 45, kind: 'private', topic: 'Négocier un contrat de transport', status: 'confirmed', creditCost: 1, meeting: teams },
  { id: 'bk-1006', learnerId: 'lrn-grace', tutorId: 'tut-sophie', start: '2026-10-27T14:00:00Z', durationMin: 45, kind: 'private', topic: 'Présenter un programme', status: 'confirmed', creditCost: 1, meeting: teams },
  { id: 'bk-1007', learnerId: 'lrn-adwoa', tutorId: 'tut-sophie', start: '2026-10-29T08:00:00Z', durationMin: 45, kind: 'private', topic: 'Négocier avec un fournisseur', status: 'confirmed', creditCost: 1, meeting: teams },
  { id: 'bk-0995', learnerId: 'lrn-adwoa', tutorId: 'tut-thomas', start: '2026-10-21T12:00:00Z', durationMin: 45, kind: 'private', topic: 'Le pitch en deux minutes', status: 'cancelled', creditCost: 1, meeting: teams },
];

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  { id: 'plan-essentials', name: L('French Essentials', 'French Essentials'), tagline: L('Self-paced foundations with structured A1–C2 pathways.', 'Des bases en autonomie avec des parcours A1–C2 structurés.'), features: [L('Full self-paced course library', 'Bibliothèque complète en autonomie'), L('Quizzes and written assignments', 'Quiz et devoirs écrits'), L('Personal vocabulary bank', 'Banque de vocabulaire personnelle')], demoPriceGhs: 350, cadence: 'month', credits: 0 },
  { id: 'plan-guided', name: L('French Guided', 'French Guided'), tagline: L('Self-paced learning plus live group classes and tutor feedback.', 'Autonomie, classes en direct et retours de tuteurs.'), features: [L('Everything in Essentials', 'Tout French Essentials'), L('Weekly live group classes', 'Classes en direct hebdomadaires'), L('2 private session credits / month', '2 crédits de séance privée / mois'), L('Tutor feedback on assignments', 'Correction des devoirs par un tuteur')], demoPriceGhs: 750, cadence: 'month', credits: 2, highlight: true },
  { id: 'plan-conversation', name: L('French Conversation Plus', 'French Conversation Plus'), tagline: L('Frequent private conversation practice for faster speaking confidence.', 'Des conversations privées régulières pour parler plus vite avec assurance.'), features: [L('Everything in Guided', 'Tout French Guided'), L('6 private session credits / month', '6 crédits de séance privée / mois'), L('Speaking Studio practice plans', 'Plans d’entraînement Speaking Studio')], demoPriceGhs: 1200, cadence: 'month', credits: 6 },
  { id: 'plan-executive', name: L('French Executive & Professional', 'French Executive & Professional'), tagline: L('A tailored programme for leaders, diplomats and senior practitioners.', 'Un programme sur mesure pour dirigeants, diplomates et cadres.'), features: [L('Personalised learning plan', 'Plan d’apprentissage personnalisé'), L('Dedicated tutor and flexible scheduling', 'Tuteur dédié et horaires flexibles'), L('Sector-specific materials', 'Supports adaptés à votre secteur')], demoPriceGhs: null, cadence: 'quote', credits: 8 },
];

export const ADDITIONAL_PACKAGES = [
  { id: 'pkg-exam', name: L('Exam preparation', 'Préparation aux examens'), blurb: L('DELF / TCF / TEF tracks with mock tests.', 'Parcours DELF / TCF / TEF avec examens blancs.') },
  { id: 'pkg-immersion', name: L('Private immersion', 'Immersion privée'), blurb: L('Intensive one-to-one programmes.', 'Programmes intensifs en tête-à-tête.') },
  { id: 'pkg-corporate', name: L('Corporate training', 'Formation en entreprise'), blurb: L('Team programmes with progress reporting.', 'Programmes d’équipe avec suivi de progression.') },
];

export const PAYMENTS: Payment[] = [
  { id: 'pay-301', reference: 'LP-DEMO-260602-01', learnerId: 'lrn-ama', planId: 'plan-guided', amountGhs: 750, method: 'mobile-money', provider: 'MTN MoMo', status: 'success', createdAt: '2026-08-01T09:12:00Z', simulated: true },
  { id: 'pay-302', reference: 'LP-DEMO-260901-07', learnerId: 'lrn-ama', planId: 'plan-guided', amountGhs: 750, method: 'mobile-money', provider: 'MTN MoMo', status: 'success', createdAt: '2026-09-01T08:40:00Z', simulated: true },
  { id: 'pay-303', reference: 'LP-DEMO-261001-04', learnerId: 'lrn-ama', planId: 'plan-guided', amountGhs: 750, method: 'card', provider: 'Visa •••• 4242', status: 'success', createdAt: '2026-10-01T10:05:00Z', simulated: true },
  { id: 'pay-304', reference: 'LP-DEMO-261003-11', learnerId: 'lrn-kofi', planId: 'plan-executive', amountGhs: 2800, method: 'card', provider: 'Mastercard •••• 1881', status: 'success', createdAt: '2026-10-03T14:22:00Z', simulated: true },
  { id: 'pay-305', reference: 'LP-DEMO-261005-02', learnerId: 'lrn-samuel', planId: 'plan-essentials', amountGhs: 350, method: 'mobile-money', provider: 'Telecel Cash', status: 'success', createdAt: '2026-10-05T11:00:00Z', simulated: true },
  { id: 'pay-306', reference: 'LP-DEMO-261012-09', learnerId: 'lrn-chinedu', planId: 'plan-conversation', amountGhs: 1200, method: 'card', provider: 'Visa •••• 0094', status: 'success', createdAt: '2026-10-12T16:47:00Z', simulated: true },
  { id: 'pay-307', reference: 'LP-DEMO-261019-05', learnerId: 'lrn-adwoa', planId: 'plan-guided', amountGhs: 750, method: 'mobile-money', provider: 'AT Money', status: 'failed', createdAt: '2026-10-19T09:30:00Z', simulated: true },
  { id: 'pay-308', reference: 'LP-DEMO-261020-03', learnerId: 'lrn-yaw', planId: 'plan-conversation', amountGhs: 1200, method: 'mobile-money', provider: 'MTN MoMo', status: 'success', createdAt: '2026-10-20T07:58:00Z', simulated: true },
];

export const NOTIFICATIONS: AppNotification[] = [
  { id: 'ntf-1', channel: 'whatsapp', title: L('Lesson reminder', 'Rappel de séance'), body: L('Your Business French session with Sophie Laurent is tomorrow at 10:00.', 'Votre séance de français des affaires avec Sophie Laurent a lieu demain à 10 h 00.'), createdAt: '2026-10-26T08:00:00Z', read: false, simulated: true },
  { id: 'ntf-2', channel: 'in-app', title: L('New tutor feedback', 'Nouveau retour de votre tutrice'), body: L('Sophie left feedback on “Se présenter en réunion”.', 'Sophie a commenté « Se présenter en réunion ».'), createdAt: '2026-10-25T17:20:00Z', read: false, simulated: false },
  { id: 'ntf-3', channel: 'email', title: L('Payment receipt', 'Reçu de paiement'), body: L('Receipt LP-DEMO-261001-04 for French Guided (demo).', 'Reçu LP-DEMO-261001-04 pour French Guided (démo).'), createdAt: '2026-10-01T10:06:00Z', read: true, simulated: true },
];

export const MESSAGE_THREADS: MessageThread[] = [
  { id: 'thr-1', participantIds: ['lrn-ama', 'tut-sophie'], subject: 'Préparation — réunion avec Lomé', messages: [
    { id: 'm1', from: 'lrn-ama', body: 'Bonjour Sophie ! Next week I have a call with partners in Lomé. Could we practise introductions on Tuesday?', at: '2026-10-24T09:14:00Z' },
    { id: 'm2', from: 'tut-sophie', body: 'Bonjour Ama ! Bien sûr. Préparez trois phrases sur votre parcours et une question pour vos partenaires. On les travaillera ensemble.', at: '2026-10-24T11:02:00Z' },
    { id: 'm3', from: 'lrn-ama', body: 'Parfait, merci beaucoup !', at: '2026-10-24T11:20:00Z' },
  ] },
  { id: 'thr-2', participantIds: ['lrn-ama', 'adm-support'], subject: 'Lesson credits question', messages: [
    { id: 'm4', from: 'lrn-ama', body: 'Do unused credits roll over to next month?', at: '2026-10-18T15:40:00Z' },
    { id: 'm5', from: 'adm-support', body: 'Thanks for asking, Ama. The credit roll-over policy is still being finalised — we will confirm it before your next renewal.', at: '2026-10-19T09:00:00Z' },
  ] },
  { id: 'thr-3', participantIds: ['lrn-kofi', 'tut-jeanmarc'], subject: 'Note de synthèse', messages: [
    { id: 'm6', from: 'lrn-kofi', body: 'J’ai envoyé mon brouillon. Merci pour vos commentaires.', at: '2026-10-25T19:00:00Z' },
  ] },
];

export const MILESTONES: Milestone[] = [
  { id: 'ms-intro', title: L('Introduce yourself', 'Se présenter'), canDo: L('I can introduce myself, my role and my organisation clearly.', 'Je peux présenter clairement mon parcours, mon poste et mon organisation.'), level: 'A1', status: 'completed', completedOn: '2026-07-14', progress: 100, skills: [L('Greetings and courtesy', 'Salutations et politesse'), L('Describing your work', 'Décrire son travail')], exercises: [ { title: 'Se présenter en réunion', kind: 'video', done: true }, { title: 'Quiz : les présentations', kind: 'quiz', done: true } ], evidence: [ { label: L('Speaking task reviewed by tutor', 'Tâche orale évaluée par la tutrice'), date: '2026-07-14', by: 'Sophie Laurent' } ] },
  { id: 'ms-everyday', title: L('Everyday conversation', 'Conversation courante'), canDo: L('I can hold a simple conversation about routine topics.', 'Je peux tenir une conversation simple sur des sujets familiers.'), level: 'A2', status: 'completed', completedOn: '2026-09-22', progress: 100, skills: [L('Asking and answering questions', 'Poser des questions et y répondre'), L('Talking about plans', 'Parler de ses projets')], exercises: [ { title: 'Poser des questions simples', kind: 'speaking', done: true }, { title: 'À mon avis…', kind: 'video', done: true } ], evidence: [ { label: L('Conversation club participation (3 sessions)', 'Participation au club de conversation (3 séances)'), date: '2026-09-22', by: 'Sophie Laurent' } ] },
  { id: 'ms-meeting', title: L('Professional meeting', 'Réunion professionnelle'), canDo: L('I can take part in a meeting: give updates, agree and disagree politely.', 'Je peux participer à une réunion : faire un point, exprimer mon accord ou mon désaccord.'), level: 'A2', status: 'in-progress', progress: 60, skills: [L('Taking the floor', 'Prendre la parole'), L('Polite disagreement', 'Exprimer un désaccord poliment')], exercises: [ { title: 'Prendre la parole', kind: 'video', done: true }, { title: 'Exprimer son accord ou son désaccord', kind: 'speaking', done: true }, { title: 'Compte rendu de réunion', kind: 'assignment', done: false } ], evidence: [ { label: L('Speaking Studio scenario: Professional meeting', 'Scénario Speaking Studio : réunion professionnelle'), date: '2026-10-22', by: 'Speaking Studio (sample feedback)' } ] },
  { id: 'ms-explain', title: L('Explain an idea', 'Expliquer une idée'), canDo: L('I can explain an idea and give reasons for it.', 'Je peux expliquer une idée et la justifier.'), level: 'B1', status: 'upcoming', progress: 0, skills: [L('Structuring an argument', 'Structurer un argument'), L('Connectors: donc, cependant, en effet', 'Connecteurs : donc, cependant, en effet')], exercises: [ { title: 'Structurer une présentation', kind: 'video', done: false } ], evidence: [] },
  { id: 'ms-present', title: L('Present a proposal', 'Présenter une proposition'), canDo: L('I can present a short proposal and answer questions about it.', 'Je peux présenter une courte proposition et répondre aux questions.'), level: 'B1', status: 'locked', progress: 0, skills: [L('Presentation structure', 'Structure d’une présentation'), L('Handling questions', 'Gérer les questions')], exercises: [ { title: 'Classe en direct : présenter un projet', kind: 'live', done: false } ], evidence: [] },
  { id: 'ms-b1', title: L('CEFR B1 milestone', 'Jalon CECRL B1'), canDo: L('I can deal with most situations at work and while travelling.', 'Je peux faire face à la plupart des situations au travail et en voyage.'), level: 'B1', status: 'locked', progress: 0, skills: [L('Integrated B1 skills review', 'Bilan intégré des compétences B1')], exercises: [ { title: 'Bilan B1', kind: 'quiz', done: false } ], evidence: [] },
];

export const SPEAKING_SCENARIOS: SpeakingScenario[] = [
  {
    id: 'sc-intro', title: L('Introduce yourself professionally', 'Se présenter professionnellement'), level: 'A2',
    context: L('You are meeting new partners at the start of a video call.', 'Vous rencontrez de nouveaux partenaires au début d’une visioconférence.'),
    prompt: 'Pouvez-vous vous présenter et parler de votre parcours ?',
    promptTranslation: 'Could you introduce yourself and talk about your background?',
    usefulPhrases: [ { fr: 'Je m’appelle…', en: 'My name is…' }, { fr: 'Je travaille dans…', en: 'I work in…' }, { fr: 'J’ai cinq ans d’expérience en…', en: 'I have five years of experience in…' }, { fr: 'Je suis ravie de vous rencontrer.', en: 'I am delighted to meet you.' } ],
    sampleResponse: 'Je m’appelle Ama. Je suis une professionnelle du marketing et je travaille depuis cinq ans à Accra. Je suis ravie de vous rencontrer et de travailler avec votre équipe.',
    highlights: ['Je m’appelle', 'je travaille depuis', 'Je suis ravie de vous rencontrer'],
    feedback: { pronunciation: 8, fluency: 8, vocabulary: 7, simulated: true, notes: [ L('Clear, confident opening. “ravie” was well pronounced.', 'Ouverture claire et assurée. « ravie » était bien prononcé.'), L('Try linking “je suis une” more smoothly: [ʒə sɥi zyn].', 'Essayez de mieux enchaîner « je suis une » : [ʒə sɥi zyn].') ] },
  },
  {
    id: 'sc-meeting', title: L('Take part in a meeting', 'Participer à une réunion'), level: 'A2',
    context: L('Your manager asks for a short update on your project.', 'Votre responsable vous demande un bref point sur votre projet.'),
    prompt: 'Où en est votre projet ? Pouvez-vous nous faire un point rapide ?',
    promptTranslation: 'Where is your project at? Can you give us a quick update?',
    usefulPhrases: [ { fr: 'Nous avons terminé…', en: 'We have finished…' }, { fr: 'La prochaine étape, c’est…', en: 'The next step is…' }, { fr: 'Je propose que…', en: 'I suggest that…' }, { fr: 'Si vous êtes d’accord…', en: 'If you agree…' } ],
    sampleResponse: 'Nous avons terminé la première phase la semaine dernière. La prochaine étape, c’est de rencontrer nos partenaires à Lomé. Je propose que nous fixions une date avant vendredi, si vous êtes d’accord.',
    highlights: ['Nous avons terminé', 'La prochaine étape, c’est', 'Je propose que', 'si vous êtes d’accord'],
    feedback: { pronunciation: 8, fluency: 7, vocabulary: 8, simulated: true, notes: [ L('Excellent structure: past, next step, proposal.', 'Excellente structure : passé, prochaine étape, proposition.'), L('“fixions” is subjunctive — well done. Slow down slightly on “partenaires”.', '« fixions » est au subjonctif — bravo. Ralentissez un peu sur « partenaires ».') ] },
  },
  {
    id: 'sc-explain', title: L('Explain an idea', 'Expliquer une idée'), level: 'B1',
    context: L('You want to convince your team to try a new approach.', 'Vous voulez convaincre votre équipe d’essayer une nouvelle approche.'),
    prompt: 'Pourquoi pensez-vous que cette approche est la bonne ?',
    promptTranslation: 'Why do you think this approach is the right one?',
    usefulPhrases: [ { fr: 'À mon avis…', en: 'In my opinion…' }, { fr: 'D’abord… ensuite… enfin…', en: 'First… then… finally…' }, { fr: 'C’est pourquoi…', en: 'That is why…' }, { fr: 'Par exemple…', en: 'For example…' } ],
    sampleResponse: 'À mon avis, cette approche est plus simple pour nos clients. D’abord, elle réduit les délais. Ensuite, elle coûte moins cher. C’est pourquoi je pense qu’il faut l’essayer.',
    highlights: ['À mon avis', 'D’abord', 'Ensuite', 'C’est pourquoi'],
    feedback: { pronunciation: 7, fluency: 8, vocabulary: 8, simulated: true, notes: [ L('Strong use of connectors to organise your reasons.', 'Très bon usage des connecteurs pour organiser vos arguments.'), L('Add one concrete example with “par exemple” to persuade further.', 'Ajoutez un exemple concret avec « par exemple » pour convaincre davantage.') ] },
  },
  {
    id: 'sc-negotiate', title: L('Negotiate an arrangement', 'Négocier un accord'), level: 'B1',
    context: L('A supplier proposes a delivery date that is too late.', 'Un fournisseur propose une date de livraison trop tardive.'),
    prompt: 'Nous pouvons livrer le 30 novembre. Cela vous convient-il ?',
    promptTranslation: 'We can deliver on 30 November. Does that suit you?',
    usefulPhrases: [ { fr: 'Ce serait possible de…?', en: 'Would it be possible to…?' }, { fr: 'Nous aurions besoin de…', en: 'We would need…' }, { fr: 'En contrepartie…', en: 'In return…' }, { fr: 'Trouvons un compromis.', en: 'Let’s find a compromise.' } ],
    sampleResponse: 'Merci pour votre proposition. Nous aurions besoin de la livraison avant le 15 novembre. En contrepartie, nous pouvons payer un acompte dès cette semaine. Trouvons un compromis.',
    highlights: ['Nous aurions besoin de', 'En contrepartie', 'Trouvons un compromis'],
    feedback: { pronunciation: 7, fluency: 7, vocabulary: 9, simulated: true, notes: [ L('Polite conditional (“aurions”) sets exactly the right tone.', 'Le conditionnel de politesse (« aurions ») donne exactement le bon ton.'), L('Practise the nasal vowel in “contrepartie” [kɔ̃tʁəpaʁti].', 'Travaillez la voyelle nasale de « contrepartie » [kɔ̃tʁəpaʁti].') ] },
  },
];

export const VOCABULARY: VocabEntry[] = [
  { id: 'v1', fr: 'un ordre du jour', en: 'an agenda', example: 'Voici l’ordre du jour de la réunion.', source: 'Business French · Leçon 4', addedOn: '2026-10-12', mastered: true },
  { id: 'v2', fr: 'prendre la parole', en: 'to take the floor', example: 'Je voudrais prendre la parole.', source: 'Business French · Leçon 4', addedOn: '2026-10-12', mastered: true },
  { id: 'v3', fr: 'un compte rendu', en: 'minutes / a report', example: 'Pouvez-vous rédiger le compte rendu ?', source: 'Business French · Leçon 6', addedOn: '2026-10-20', mastered: false },
  { id: 'v4', fr: 'je suis ravie de vous rencontrer', en: 'I am delighted to meet you', example: 'Je suis ravie de vous rencontrer, Monsieur Diallo.', source: 'Speaking Studio', addedOn: '2026-10-22', mastered: false },
  { id: 'v5', fr: 'un délai', en: 'a deadline / lead time', example: 'Le délai de livraison est de deux semaines.', source: 'Entreprendre en français', addedOn: '2026-10-23', mastered: false },
];

export const LESSON_CONTENT: LessonContent[] = [
  {
    id: 'les-b5', courseId: 'crs-business', title: 'Exprimer son accord ou son désaccord', level: 'A2',
    objective: L('Agree and disagree politely during a meeting.', 'Exprimer poliment son accord ou son désaccord en réunion.'),
    dialogue: [
      { speaker: 'M. Diallo', fr: 'Je propose de reporter le lancement à janvier.', en: 'I suggest postponing the launch to January.' },
      { speaker: 'Ama', fr: 'Je comprends votre point de vue, mais je ne suis pas tout à fait d’accord.', en: 'I understand your point of view, but I don’t entirely agree.' },
      { speaker: 'M. Diallo', fr: 'Pourquoi ?', en: 'Why?' },
      { speaker: 'Ama', fr: 'Nos partenaires sont prêts. À mon avis, décembre est possible.', en: 'Our partners are ready. In my opinion, December is possible.' },
    ],
    keyPhrases: [ { fr: 'Je suis tout à fait d’accord.', en: 'I completely agree.' }, { fr: 'Je comprends votre point de vue, mais…', en: 'I understand your point of view, but…' }, { fr: 'Je ne suis pas tout à fait d’accord.', en: 'I don’t entirely agree.' } ],
    quiz: [
      { id: 'q1', prompt: 'Quelle phrase exprime un désaccord poli ?', options: ['C’est n’importe quoi.', 'Je ne suis pas tout à fait d’accord.', 'Oui, absolument.'], answer: 1, explanation: L('“Pas tout à fait” softens the disagreement.', '« Pas tout à fait » atténue le désaccord.') },
      { id: 'q2', prompt: 'Complétez : « Je comprends votre point de vue, ___ … »', options: ['donc', 'mais', 'parce que'], answer: 1, explanation: L('“Mais” introduces the contrast.', '« Mais » introduit l’opposition.') },
      { id: 'q3', prompt: '« À mon avis » signifie…', options: ['In my opinion', 'On my way', 'At my place'], answer: 0, explanation: L('“À mon avis” = in my opinion.', '« À mon avis » = selon moi.') },
    ],
    assignment: L('Write 4–6 sentences replying to a colleague who wants to postpone a project. Agree with one point and politely disagree with another.', 'Rédigez 4 à 6 phrases pour répondre à un collègue qui veut reporter un projet. Acceptez un point et exprimez poliment un désaccord sur un autre.'),
  },
];

/** Institute-wide demo figures for the admin workspace (illustrative). */
export const ADMIN_METRICS = {
  activeLearners: 248,
  newEnrolmentsThisMonth: 42,
  liveSessionsThisMonth: 186,
  completionRate: 71,
  avgSessionRating: 4.8,
  revenueThisMonthGhs: 168_400,
  weeklyActiveLearners: [
    { label: 'W36', value: 171 }, { label: 'W37', value: 184 }, { label: 'W38', value: 190 }, { label: 'W39', value: 202 },
    { label: 'W40', value: 211 }, { label: 'W41', value: 225 }, { label: 'W42', value: 236 }, { label: 'W43', value: 248 },
  ],
  enrolmentsByArea: [
    { id: 'business', value: 64 }, { id: 'conversational', value: 58 }, { id: 'everyday', value: 41 }, { id: 'exams', value: 33 },
    { id: 'diplomacy', value: 19 }, { id: 'entrepreneurship', value: 17 }, { id: 'policy', value: 10 }, { id: 'academic', value: 6 },
  ] as { id: string; value: number }[],
  revenueByMonthGhs: [
    { label: 'May', value: 96_200 }, { label: 'Jun', value: 112_800 }, { label: 'Jul', value: 121_500 },
    { label: 'Aug', value: 138_900 }, { label: 'Sep', value: 152_300 }, { label: 'Oct', value: 168_400 },
  ],
  levelDistribution: [ { label: 'A1', value: 82 }, { label: 'A2', value: 91 }, { label: 'B1', value: 52 }, { label: 'B2', value: 23 }, { label: 'C1', value: 9 }, { label: 'C2', value: 3 } ],
  supportTickets: [
    { id: 'TCK-214', subject: 'Credit roll-over question', from: 'Ama Owusu', status: 'awaiting policy', opened: '2026-10-18' },
    { id: 'TCK-219', subject: 'Mobile Money payment failed', from: 'Adwoa Darko', status: 'open', opened: '2026-10-19' },
    { id: 'TCK-221', subject: 'Request corporate invoice', from: 'Kofi Boateng', status: 'open', opened: '2026-10-24' },
    { id: 'TCK-203', subject: 'Reschedule group class', from: 'Grace Wanjiru', status: 'resolved', opened: '2026-10-09' },
  ],
};

/** Weekly activity for the learner dashboard (minutes studied). */
export const LEARNER_WEEKLY_MINUTES = [
  { label: 'Mon', value: 35 }, { label: 'Tue', value: 50 }, { label: 'Wed', value: 20 }, { label: 'Thu', value: 45 },
  { label: 'Fri', value: 30 }, { label: 'Sat', value: 60 }, { label: 'Sun', value: 15 },
];

// Move every seeded date so the story lines up with the real calendar (see clock.ts).
for (const seed of [LEARNERS, BOOKINGS, PAYMENTS, NOTIFICATIONS, MESSAGE_THREADS, MILESTONES, VOCABULARY, ADMIN_METRICS]) shiftDatesInPlace(seed);
// Lessons never land on a weekend after the move.
if (SEED_SHIFT_DAYS) for (const b of BOOKINGS) b.start = weekdayIso(b.start);
