// Domain types shared by the frontend and backend.
// Keep this file free of runtime logic so either side can depend on it safely.

export type Lang = 'en' | 'fr';
export type Localized = { en: string; fr: string };
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type Role = 'learner' | 'instructor' | 'admin';
export type Accent = 'navy' | 'burgundy' | 'gold' | 'green';

export type HairStyle = 'headwrap' | 'short' | 'curls' | 'puff' | 'bob' | 'bald' | 'locs' | 'waves';

export interface PortraitSpec {
  skin: string;
  hair: HairStyle;
  hairColor: string;
  outfit: string;
  accent: string;
  bg: string;
  glasses?: boolean;
  earrings?: boolean;
  beard?: boolean;
}

export type CourseAreaId =
  | 'conversational'
  | 'business'
  | 'diplomacy'
  | 'policy'
  | 'entrepreneurship'
  | 'everyday'
  | 'academic'
  | 'exams';

export interface CourseArea {
  id: CourseAreaId;
  name: Localized;
  blurb: Localized;
}

/** 'assessment' is the end-of-level assessment: the last lesson of each level's last course. */
export type LessonKind = 'video' | 'reading' | 'quiz' | 'speaking' | 'assignment' | 'live' | 'assessment';

export interface LessonRef {
  id: string;
  title: string; // lesson titles stay in French — they are learning material
  /** Total study time for the lesson (video + notes + practice). */
  minutes: number;
  kind: LessonKind;
  /** Length of the lesson's opening video, in seconds (about 5 minutes: OPENING_VIDEO_MIN/MAX_SECONDS). */
  videoSec?: number;
}

export interface CourseModule {
  title: Localized;
  lessons: LessonRef[];
}

export interface Course {
  id: string;
  area: CourseAreaId;
  title: Localized;
  summary: Localized;
  /** The ONE CEFR level this course belongs to: courses never span levels. */
  levels: CefrLevel;
  format: Localized;
  durationWeeks: number;
  outcomes: Localized[];
  tutorId: string;
  accent: Accent;
  premium: boolean;
  modules: CourseModule[];
}

export interface Pathway {
  level: CefrLevel;
  name: Localized;
  canDo: Localized;
  weeks: number;
  courseIds: string[];
}

export interface Tutor {
  id: string;
  name: string;
  title: Localized;
  languages: string[];
  specialities: string[];
  levels: string;
  bio: Localized;
  rating: number;
  reviews: number;
  portrait: PortraitSpec;
  /** Weekday (1 = Monday … 5 = Friday, 6 = Saturday) → 24h start times. */
  availability: Record<number, string[]>;
}

export interface Learner {
  id: string;
  name: string;
  firstName: string;
  /** Sign-in email (demo learners use example.com addresses). */
  email?: string;
  city: string;
  level: CefrLevel;
  /** Highest level bought beyond the placement level (see access.ts). */
  unlockedLevel?: CefrLevel;
  /** Levels whose courses have been paid for (the starting level, from "Start my B1 courses", and any bought later). A1 is free. */
  paidLevels?: CefrLevel[];
  progressToNext: number; // 0–100
  goal: Localized;
  areaId: CourseAreaId;
  portrait: PortraitSpec;
  joined: string; // ISO date
  lastActive: string; // ISO date
  planId: string;
  credits: number;
  streakDays: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  /** Email a receipt after each payment (on unless the learner turns it off). */
  receiptEmails?: boolean;
}

export type BookingStatus = 'confirmed' | 'cancelled' | 'completed';

export interface MeetingInfo {
  provider: 'google-meet';
  /** 'simulated' until the Google Calendar / Meet integration is configured. */
  status: 'simulated' | 'created';
  joinUrl: string | null;
}

export interface Booking {
  id: string;
  learnerId: string;
  tutorId: string;
  start: string; // ISO datetime (Africa/Accra, UTC+0)
  durationMin: number;
  kind: 'private' | 'group';
  topic: string;
  status: BookingStatus;
  creditCost: number;
  meeting: MeetingInfo;
  rescheduledFrom?: string;
  cancellation?: CancellationRecord;
  /** What the learner wants from a private session. */
  purpose?: 'conversation' | 'course-help' | 'catch-up';
  /** The learner's free first one-on-one conversation. */
  freeIntro?: boolean;
  /** For catch-ups: the group session that was missed. */
  missedSessionId?: string;
}

/** Recorded on every cancellation so exceptions can be reviewed fairly (brief E6). */
export interface CancellationRecord {
  at: string;
  reason: string;
  /** Inside the 24-hour window. */
  late: boolean;
  creditRefunded: boolean;
  emergency?: boolean;
  review?: 'pending' | 'approved' | 'declined';
  reviewedBy?: string;
  reviewNote?: string;
}

export interface MembershipPlan {
  id: string;
  name: Localized;
  tagline: Localized;
  features: Localized[];
  /** Illustrative demo value only — not a client-approved price. */
  demoPriceGhs: number | null;
  cadence: 'month' | 'programme' | 'quote';
  credits: number;
  highlight?: boolean;
}

export type PaymentMethod = 'mobile-money' | 'card';
export type PaymentStatus = 'pending' | 'success' | 'failed';

export interface Payment {
  id: string;
  reference: string;
  learnerId: string;
  planId: string;
  amountGhs: number;
  method: PaymentMethod;
  provider: string; // e.g. "MTN MoMo", "Visa"
  status: PaymentStatus;
  createdAt: string;
  simulated: true;
  /** Reward discount applied to this payment. */
  discount?: { tokenId: string; percent: number; originalGhs: number };
}

export type NotificationChannel = 'in-app' | 'email' | 'whatsapp';

export interface AppNotification {
  id: string;
  /** Recipient learner; seed notifications without one belong to the demo learner. */
  learnerId?: string;
  channel: NotificationChannel;
  title: Localized;
  body: Localized;
  createdAt: string;
  read: boolean;
  simulated: boolean;
}

export interface Message {
  id: string;
  from: string; // learner/tutor/admin id
  body: string;
  at: string;
}

export interface MessageThread {
  id: string;
  participantIds: string[];
  subject: string;
  messages: Message[];
}

export type MilestoneStatus = 'completed' | 'in-progress' | 'upcoming' | 'locked';

export interface Milestone {
  id: string;
  title: Localized;
  canDo: Localized;
  level: CefrLevel;
  status: MilestoneStatus;
  completedOn?: string;
  progress: number; // 0–100
  skills: Localized[];
  exercises: { title: string; kind: LessonKind; done: boolean }[];
  evidence: { label: Localized; date: string; by: string }[];
}

export interface Phrase {
  fr: string;
  en: string;
}

export interface SpeakingScenario {
  id: string;
  title: Localized;
  level: CefrLevel;
  context: Localized;
  prompt: string; // French
  promptTranslation: string; // English
  usefulPhrases: Phrase[];
  sampleResponse: string; // French
  highlights: string[];
  feedback: SpeakingFeedback;
}

export interface SpeakingFeedback {
  pronunciation: number; // out of 10
  fluency: number;
  vocabulary: number;
  notes: Localized[];
  /** True when produced by sample data rather than real speech analysis. */
  simulated: boolean;
}

export interface VocabEntry {
  id: string;
  /** Owner; seed entries without one belong to the demo learner. */
  learnerId?: string;
  fr: string;
  en: string;
  example: string;
  source: string;
  addedOn: string;
  mastered: boolean;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: Localized;
}

export interface LessonContent {
  id: string;
  courseId: string;
  title: string;
  level: CefrLevel;
  objective: Localized;
  dialogue: { speaker: string; fr: string; en: string }[];
  keyPhrases: Phrase[];
  quiz: QuizQuestion[];
  assignment: Localized;
}

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}
