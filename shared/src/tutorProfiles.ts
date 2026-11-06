// Tutor profiles: the professional details learners see when they look a tutor up.
// Sample content for La Porte to replace with each tutor's real CV. Contact details are never
// shown: learners reach tutors through bookings and La Porte messaging only.
import type { Localized } from './types';

const L = (en: string, fr: string): Localized => ({ en, fr });

export type Proficiency = 'native' | 'fluent' | 'professional' | 'conversational';
export interface TutorProfile {
  headline: Localized;
  location: string;
  /** Accent / region, shown so learners can choose who they'd like to hear. */
  accent: Localized;
  since: number; // year they joined La Porte
  yearsTeaching: number;
  learnersTaught: number;
  sessionsLed: number;
  about: Localized;
  approach: Localized[];
  experience: { role: Localized; org: string; place: string; from: number; to?: number; text: Localized }[];
  education: { title: Localized; org: string; year: number }[];
  certifications: { name: string; issuer: string; year: number }[];
  languages: { name: string; level: Proficiency }[];
  /** How many learners endorsed each skill. */
  endorsements: Record<string, number>;
  reviews: { by: string; level: string; date: string; rating: number; text: Localized }[];
}

export const TUTOR_PROFILES: Record<string, TutorProfile> = {
  'tut-sophie': {
    headline: L('Helping professionals in Ghana speak French with confidence at work', 'J’aide les professionnels au Ghana à parler français avec assurance au travail'),
    location: 'Accra, Ghana', accent: L('Standard French (Lyon)', 'Français standard (Lyon)'), since: 2022, yearsTeaching: 9, learnersTaught: 340, sessionsLed: 2150,
    about: L(
      'I spent five years training sales and customer teams in Lyon and Abidjan before moving to Accra. I focus on the French you actually need at work: meetings, calls, emails and small talk with partners. My sessions are calm, practical and full of real situations.',
      'J’ai formé pendant cinq ans des équipes commerciales et clients à Lyon et à Abidjan avant de m’installer à Accra. Je travaille le français dont vous avez vraiment besoin au travail : réunions, appels, courriels et échanges informels avec vos partenaires. Mes séances sont calmes, concrètes et pleines de situations réelles.',
    ),
    approach: [L('Real situations from your own job, not textbook dialogues', 'Des situations tirées de votre travail, pas des dialogues de manuel'), L('Gentle, immediate corrections of pronunciation', 'Des corrections de prononciation douces et immédiates'), L('A short written recap after every session', 'Un court récapitulatif écrit après chaque séance')],
    experience: [
      { role: L('Senior tutor, Conversation & Business French', 'Tutrice principale, conversation et français des affaires'), org: 'La Porte French Institute', place: 'Accra', from: 2022, text: L('Private sessions and the Business French courses at A2, B1 and B2.', 'Séances individuelles et cours de français des affaires des niveaux A2, B1 et B2.') },
      { role: L('Corporate language trainer', 'Formatrice linguistique en entreprise'), org: 'Alliance française d’Abidjan', place: 'Abidjan', from: 2019, to: 2022, text: L('French for banking and telecom teams.', 'Français pour des équipes de banque et de télécoms.') },
      { role: L('Sales team trainer', 'Formatrice d’équipes commerciales'), org: 'Groupe Rhône Distribution', place: 'Lyon', from: 2016, to: 2019, text: L('Communication and customer-service training.', 'Formation à la communication et au service client.') },
    ],
    education: [{ title: L('Master’s in Teaching French as a Foreign Language (FLE)', 'Master FLE (français langue étrangère)'), org: 'Université Lumière Lyon 2', year: 2016 }],
    certifications: [{ name: 'DELF/DALF examiner', issuer: 'France Éducation international', year: 2020 }],
    languages: [{ name: 'Français', level: 'native' }, { name: 'English', level: 'fluent' }, { name: 'Twi', level: 'conversational' }],
    endorsements: { Conversation: 41, 'Business French': 33, Pronunciation: 27 },
    reviews: [
      { by: 'Ama O.', level: 'A2', date: '2026-10-21', rating: 5, text: L('Sophie made me feel safe to make mistakes. After a month I led my first meeting in French.', 'Sophie m’a mise en confiance pour faire des erreurs. Au bout d’un mois, j’ai animé ma première réunion en français.') },
      { by: 'Kwabena A.', level: 'B1', date: '2026-09-30', rating: 5, text: L('Very practical: we prepared real emails for my clients in Lomé.', 'Très concret : nous avons préparé de vrais courriels pour mes clients de Lomé.') },
    ],
  },
  'tut-jeanmarc': {
    headline: L('Former diplomat · French for international relations and public policy', 'Ancien diplomate · le français des relations internationales et des politiques publiques'),
    location: 'Accra, Ghana', accent: L('Senegalese French (Dakar)', 'Français du Sénégal (Dakar)'), since: 2021, yearsTeaching: 12, learnersTaught: 210, sessionsLed: 1680,
    about: L(
      'I worked for fifteen years in regional institutions in Dakar and Abuja before teaching. I help diplomats, civil servants and NGO staff brief, negotiate and write in formal French, including the codes of ECOWAS and AU meetings.',
      'J’ai travaillé quinze ans dans des institutions régionales à Dakar et à Abuja avant d’enseigner. J’aide diplomates, fonctionnaires et personnels d’ONG à présenter, négocier et rédiger en français formel, y compris selon les codes des réunions de la CEDEAO et de l’UA.',
    ),
    approach: [L('Simulations of real briefings and negotiations', 'Simulations de vraies réunions d’information et de négociations'), L('Formal writing: notes, speeches, minutes', 'Écrit formel : notes, discours, comptes rendus'), L('Precise feedback on register and tone', 'Retours précis sur le registre et le ton')],
    experience: [
      { role: L('Tutor, Diplomacy & Public Policy', 'Tuteur, diplomatie et politiques publiques'), org: 'La Porte French Institute', place: 'Accra', from: 2021, text: L('Courses and private coaching at B1–C2.', 'Cours et coaching individuel du B1 au C2.') },
      { role: L('Policy and protocol officer', 'Chargé de politique et de protocole'), org: 'Regional economic institution', place: 'Abuja', from: 2010, to: 2021, text: L('Meeting preparation, interpretation support and formal correspondence.', 'Préparation de réunions, appui à l’interprétation et correspondance formelle.') },
      { role: L('Attaché', 'Attaché'), org: 'Ministère des Affaires étrangères', place: 'Dakar', from: 2006, to: 2010, text: L('Bilateral relations desk.', 'Bureau des relations bilatérales.') },
    ],
    education: [{ title: L('Master’s in International Relations', 'Master en relations internationales'), org: 'Université Cheikh Anta Diop, Dakar', year: 2005 }],
    certifications: [{ name: 'Teaching French for Specific Purposes (FOS)', issuer: 'CCI Paris Île-de-France', year: 2021 }],
    languages: [{ name: 'Français', level: 'native' }, { name: 'Wolof', level: 'native' }, { name: 'English', level: 'professional' }],
    endorsements: { Diplomacy: 29, 'Public policy': 22, 'Formal writing': 31 },
    reviews: [
      { by: 'Kofi B.', level: 'B1', date: '2026-10-12', rating: 5, text: L('He knows exactly how summit meetings work. My briefings are now far more confident.', 'Il sait exactement comment se déroulent les sommets. Mes réunions d’information sont bien plus assurées.') },
      { by: 'Efua M.', level: 'B2', date: '2026-08-28', rating: 4, text: L('Demanding but fair, with excellent corrections of my formal writing.', 'Exigeant mais juste, avec d’excellentes corrections de mes écrits formels.') },
    ],
  },
  'tut-aicha': {
    headline: L('DELF, TCF and TEF coach · Clear strategies, steady progress', 'Coach DELF, TCF et TEF · Des stratégies claires, des progrès réguliers'),
    location: 'Kumasi, Ghana', accent: L('Ivorian French (Abidjan)', 'Français de Côte d’Ivoire (Abidjan)'), since: 2022, yearsTeaching: 8, learnersTaught: 420, sessionsLed: 1900,
    about: L(
      'I prepare learners for DELF, DALF, TCF and TEF, for studies, work permits or immigration. We work on each part of the exam with timed practice, marking grids and simple strategies, so you walk in knowing exactly what to expect.',
      'Je prépare au DELF, au DALF, au TCF et au TEF, pour les études, le travail ou l’immigration. Nous travaillons chaque épreuve avec des entraînements chronométrés, les grilles d’évaluation et des stratégies simples, pour que vous sachiez exactement à quoi vous attendre.',
    ),
    approach: [L('Mock exams marked with the official grids', 'Examens blancs corrigés avec les grilles officielles'), L('A study plan to your exam date', 'Un plan de révision jusqu’à la date de l’examen'), L('Speaking practice in exam conditions', 'Entraînement à l’oral en conditions d’examen')],
    experience: [
      { role: L('Exam preparation tutor', 'Tutrice préparation aux examens'), org: 'La Porte French Institute', place: 'Kumasi', from: 2022, text: L('DELF A1–B2, DALF C1, TCF and TEF Canada.', 'DELF A1–B2, DALF C1, TCF et TEF Canada.') },
      { role: L('French teacher', 'Professeure de français'), org: 'Lycée international d’Abidjan', place: 'Abidjan', from: 2018, to: 2022, text: L('Secondary classes and DELF scolaire preparation.', 'Classes de lycée et préparation au DELF scolaire.') },
    ],
    education: [{ title: L('Bachelor’s in Modern Letters', 'Licence de lettres modernes'), org: 'Université Félix Houphouët-Boigny', year: 2017 }],
    certifications: [{ name: 'DELF/DALF examiner and marker', issuer: 'France Éducation international', year: 2019 }, { name: 'TEF examiner', issuer: 'CCI Paris Île-de-France', year: 2023 }],
    languages: [{ name: 'Français', level: 'native' }, { name: 'Dioula', level: 'native' }, { name: 'English', level: 'fluent' }],
    endorsements: { DELF: 38, TCF: 21, TEF: 19, 'Written expression': 26 },
    reviews: [
      { by: 'Yaw A.', level: 'B1', date: '2026-10-02', rating: 5, text: L('Passed my DELF B2 first time. Her mock exams were harder than the real one!', 'J’ai réussi mon DELF B2 du premier coup. Ses examens blancs étaient plus durs que le vrai !') },
      { by: 'Grace W.', level: 'A2', date: '2026-09-14', rating: 5, text: L('Clear plan, clear strategies. I finally understood how the writing section is marked.', 'Un plan clair, des stratégies claires. J’ai enfin compris comment l’écrit est noté.') },
    ],
  },
  'tut-thomas': {
    headline: L('Entrepreneur & trade tutor · French to pitch, sell and negotiate across West Africa', 'Entrepreneur et tuteur · Le français pour présenter, vendre et négocier en Afrique de l’Ouest'),
    location: 'Accra, Ghana', accent: L('Standard French (Paris)', 'Français standard (Paris)'), since: 2023, yearsTeaching: 6, learnersTaught: 150, sessionsLed: 820,
    about: L(
      'I ran a small import business between Accra, Lomé and Cotonou for eight years. Now I help founders and sales people pitch, negotiate prices and follow up with francophone clients, with the vocabulary of markets, contracts and logistics.',
      'J’ai dirigé une petite entreprise d’import entre Accra, Lomé et Cotonou pendant huit ans. J’aide maintenant les fondateurs et les commerciaux à présenter, négocier les prix et relancer leurs clients francophones, avec le vocabulaire des marchés, des contrats et de la logistique.',
    ),
    approach: [L('Role-plays of pitches and price negotiations', 'Jeux de rôle de présentations et de négociations de prix'), L('Vocabulary for contracts, invoices and logistics', 'Le vocabulaire des contrats, des factures et de la logistique'), L('Confidence first: we speak a lot', 'La confiance d’abord : on parle beaucoup')],
    experience: [
      { role: L('Tutor, Entrepreneurship & Trade', 'Tuteur, entrepreneuriat et commerce'), org: 'La Porte French Institute', place: 'Accra', from: 2023, text: L('Private sessions and the A2 Entrepreneurship & Trade course.', 'Séances individuelles et cours d’entrepreneuriat de niveau A2.') },
      { role: L('Founder', 'Fondateur'), org: 'Côte Commerce SARL', place: 'Lomé · Accra', from: 2015, to: 2023, text: L('Import and distribution of household goods.', 'Import et distribution de produits ménagers.') },
    ],
    education: [{ title: L('Business school degree (Master in Management)', 'Diplôme d’école de commerce (Master en management)'), org: 'NEOMA Business School', year: 2014 }],
    certifications: [{ name: 'Certificate in Teaching French as a Foreign Language', issuer: 'Alliance française Paris Île-de-France', year: 2023 }],
    languages: [{ name: 'Français', level: 'native' }, { name: 'English', level: 'fluent' }, { name: 'Ewe', level: 'conversational' }],
    endorsements: { Entrepreneurship: 17, Negotiation: 23, Pitching: 15 },
    reviews: [
      { by: 'Nana P.', level: 'A2', date: '2026-10-09', rating: 5, text: L('We practised my pitch until I could do it without notes. Closed my first deal with a client in Cotonou!', 'Nous avons répété ma présentation jusqu’à ce que je la fasse sans notes. J’ai signé mon premier contrat avec un client de Cotonou !') },
    ],
  },
};
