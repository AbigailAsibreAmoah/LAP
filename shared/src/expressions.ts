// Expression du jour: one expression a day, shown a different way every two hours (08:00–20:00).
// Starter set for the La Porte teaching team to review and extend.
import type { CefrLevel, Localized } from './types';

const L = (en: string, fr: string): Localized => ({ en, fr });

export interface DailyExpression {
  fr: string;
  en: string;
  level: CefrLevel;
  /** How it sounds, in simple English spelling. */
  sounds: string;
  meaning: Localized;
  everyday: { fr: string; en: string };
  work: { fr: string; en: string };
  watchOut: Localized;
  quiz: { sentence: string; options: string[]; answer: number; why: Localized };
  yourTurn: Localized;
}

export const DAILY_EXPRESSIONS: DailyExpression[] = [
  {
    fr: 'Je vous tiens au courant.', en: 'I’ll keep you posted.', level: 'A2', sounds: 'zhuh voo tyan oh koo-RAHN',
    meaning: L('A polite way to promise news later: ideal at the end of an email or a call.', 'Une façon polie de promettre des nouvelles : parfaite à la fin d’un courriel ou d’un appel.'),
    everyday: { fr: 'Je visite l’appartement samedi, je te tiens au courant !', en: 'I’m seeing the flat on Saturday, I’ll keep you posted!' },
    work: { fr: 'Le client n’a pas encore répondu, je vous tiens au courant.', en: 'The client hasn’t replied yet, I’ll keep you posted.' },
    watchOut: L('With friends, say “je te tiens au courant” (tu). “Être au courant” means “to know about it”: “Tu es au courant ?” = “Have you heard?”', 'Entre amis : « je te tiens au courant ». « Être au courant » veut dire « savoir » : « Tu es au courant ? »'),
    quiz: { sentence: 'Le rapport n’est pas prêt, je vous ___ au courant.', options: ['tiens', 'tient', 'tenez'], answer: 0, why: L('With “je”, the verb is “tiens”.', 'Avec « je », on écrit « tiens ».') },
    yourTurn: L('Write the last line of an email telling a colleague you’ll keep them posted about the contract.', 'Écrivez la dernière ligne d’un courriel : vous tiendrez un collègue au courant pour le contrat.'),
  },
  {
    fr: 'On fait le point demain ?', en: 'Shall we catch up tomorrow?', level: 'A2', sounds: 'on fay luh PWAN duh-MAN',
    meaning: L('“Faire le point” = to take stock, to review where things are.', '« Faire le point » = faire un bilan, voir où on en est.'),
    everyday: { fr: 'On fait le point sur les vacances ce soir ?', en: 'Shall we go over the holiday plans tonight?' },
    work: { fr: 'On fait le point demain à 10 h sur le budget ?', en: 'Shall we review the budget tomorrow at 10?' },
    watchOut: L('It does not mean “to make a point”. To make a point = “souligner” or “faire valoir”.', 'Ce n’est pas « avoir raison » : pour insister sur une idée, on dit « souligner ».'),
    quiz: { sentence: 'Avant la réunion, ___ le point ensemble.', options: ['faisons', 'fait', 'faire'], answer: 0, why: L('“Faisons” = let’s do (imperative with nous).', '« Faisons » : impératif avec « nous ».') },
    yourTurn: L('Suggest to a colleague that you catch up on Friday about a project.', 'Proposez à un collègue de faire le point vendredi sur un projet.'),
  },
  {
    fr: 'Ça marche pour moi.', en: 'That works for me.', level: 'A1', sounds: 'sa MARSH poor MWA',
    meaning: L('A friendly way to say yes to a plan or a time.', 'Une façon simple de dire oui à un projet ou à un horaire.'),
    everyday: { fr: 'Cinéma à 19 h ? — Ça marche !', en: 'Cinema at 7? — Deal!' },
    work: { fr: 'Jeudi 14 h, ça marche pour moi.', en: 'Thursday at 2 pm works for me.' },
    watchOut: L('Friendly, not formal. In a formal email, write “Cela me convient”.', 'Familier-neutre. Dans un courriel formel : « Cela me convient ».'),
    quiz: { sentence: '— On se retrouve à midi ? — Oui, ça ___ !', options: ['marche', 'marché', 'marcher'], answer: 0, why: L('Present tense: “ça marche”.', 'Au présent : « ça marche ».') },
    yourTurn: L('Accept a meeting time twice: once casually, once formally.', 'Acceptez un rendez-vous deux fois : en familier, puis en formel.'),
  },
  {
    fr: 'Pourriez-vous répéter, s’il vous plaît ?', en: 'Could you repeat that, please?', level: 'A1', sounds: 'poo-ree-AY voo ray-pay-TAY',
    meaning: L('The polite way to ask someone to say it again.', 'La façon polie de demander de redire quelque chose.'),
    everyday: { fr: 'Pardon, tu peux répéter ?', en: 'Sorry, can you say that again?' },
    work: { fr: 'Excusez-moi, pourriez-vous répéter le dernier chiffre ?', en: 'Sorry, could you repeat the last figure?' },
    watchOut: L('“Pourriez-vous” (would you be able) is softer than “Pouvez-vous”. “Répétez !” alone sounds like an order.', '« Pourriez-vous » est plus poli que « Pouvez-vous ». « Répétez ! » seul sonne comme un ordre.'),
    quiz: { sentence: '___-vous parler plus lentement, s’il vous plaît ?', options: ['Pourriez', 'Pourrais', 'Pourrait'], answer: 0, why: L('With “vous”: “pourriez”.', 'Avec « vous » : « pourriez ».') },
    yourTurn: L('On the phone, ask someone to repeat and to speak more slowly.', 'Au téléphone, demandez de répéter et de parler plus lentement.'),
  },
  {
    fr: 'Je reviens vers vous dès que possible.', en: 'I’ll get back to you as soon as possible.', level: 'B1', sounds: 'zhuh ruh-VYAN vair voo day kuh po-SEEBL',
    meaning: L('A professional way to buy time and promise an answer.', 'Une façon professionnelle de gagner du temps en promettant une réponse.'),
    everyday: { fr: 'Je regarde mon agenda et je reviens vers toi.', en: 'I’ll check my diary and get back to you.' },
    work: { fr: 'Je vérifie avec la direction et je reviens vers vous dès que possible.', en: 'I’ll check with management and get back to you as soon as possible.' },
    watchOut: L('Avoid “asap” in formal French writing: prefer “dans les meilleurs délais”.', 'Évitez « asap » à l’écrit formel : préférez « dans les meilleurs délais ».'),
    quiz: { sentence: 'Je vérifie et je ___ vers vous demain.', options: ['reviens', 'revient', 'revenir'], answer: 0, why: L('With “je”: “reviens”.', 'Avec « je » : « reviens ».') },
    yourTurn: L('Reply to a client who asks for a price you don’t know yet.', 'Répondez à un client qui demande un prix que vous ne connaissez pas encore.'),
  },
  {
    fr: 'C’est noté.', en: 'Noted.', level: 'A2', sounds: 'say no-TAY',
    meaning: L('Shows you have understood and will remember.', 'Montre que vous avez compris et que vous retenez.'),
    everyday: { fr: 'Le dîner est à 20 h ? C’est noté !', en: 'Dinner’s at 8? Got it!' },
    work: { fr: 'La réunion est déplacée à lundi ? C’est noté, merci.', en: 'The meeting has moved to Monday? Noted, thank you.' },
    watchOut: L('On its own it can sound dry in writing: add “merci”. Spelling: “noté” (not “noter”).', 'Seul, cela peut sembler sec à l’écrit : ajoutez « merci ». Orthographe : « noté ».'),
    quiz: { sentence: '— La livraison arrive vendredi. — C’est ___, merci !', options: ['noté', 'noter', 'notez'], answer: 0, why: L('Past participle: “noté”.', 'Participe passé : « noté ».') },
    yourTurn: L('Confirm a new deadline your manager has just given you.', 'Confirmez la nouvelle échéance que votre responsable vient de vous donner.'),
  },
  {
    fr: 'Il me semble que…', en: 'It seems to me that…', level: 'B1', sounds: 'eel muh SAHMBL kuh',
    meaning: L('Softens an opinion so it sounds less direct.', 'Adoucit un avis pour qu’il paraisse moins direct.'),
    everyday: { fr: 'Il me semble que le magasin ferme à 18 h.', en: 'I think the shop closes at 6.' },
    work: { fr: 'Il me semble que ce chiffre est un peu élevé.', en: 'It seems to me that this figure is a little high.' },
    watchOut: L('“Il me semble que” takes the indicative (… que c’est). But “Il semble que” (without “me”) often takes the subjunctive (… que ce soit).', '« Il me semble que » + indicatif (… que c’est). Mais « Il semble que » + souvent subjonctif (… que ce soit).'),
    quiz: { sentence: 'Il me semble que la réunion ___ demain.', options: ['est', 'soit', 'être'], answer: 0, why: L('Indicative after “il me semble que”.', 'Indicatif après « il me semble que ».') },
    yourTurn: L('Disagree gently with a plan in a meeting, using “il me semble que”.', 'Exprimez un léger désaccord en réunion avec « il me semble que ».'),
  },
  {
    fr: 'Bonne continuation !', en: 'All the best going forward!', level: 'A2', sounds: 'bon kon-tee-nwa-SYON',
    meaning: L('A warm goodbye wish, very common in West Africa.', 'Un au revoir chaleureux, très courant en Afrique de l’Ouest.'),
    everyday: { fr: 'Merci pour la soirée, bonne continuation !', en: 'Thanks for the evening, all the best!' },
    work: { fr: 'Ce fut un plaisir de travailler avec vous. Bonne continuation !', en: 'It was a pleasure working with you. All the best!' },
    watchOut: L('It wishes success in what someone is doing; it doesn’t mean “to be continued” (that’s “à suivre”). Reply: “Merci, à vous aussi !”', 'C’est un vœu de réussite, pas « à suivre ». Réponse : « Merci, à vous aussi ! »'),
    quiz: { sentence: '— Bonne continuation ! — Merci, à vous ___ !', options: ['aussi', 'encore', 'non'], answer: 0, why: L('“À vous aussi” = same to you.', '« À vous aussi » : la même chose pour vous.') },
    yourTurn: L('Say goodbye to a colleague who is changing jobs.', 'Dites au revoir à un collègue qui change de poste.'),
  },
  {
    fr: 'Ça va aller.', en: 'It’ll be fine.', level: 'A1', sounds: 'sa va a-LAY',
    meaning: L('Reassures someone that things will work out.', 'Rassure quelqu’un : tout va s’arranger.'),
    everyday: { fr: 'Ne t’inquiète pas, ça va aller.', en: 'Don’t worry, it’ll be fine.' },
    work: { fr: 'Le délai est court, mais ça va aller : on s’organise.', en: 'The deadline is tight, but we’ll manage: let’s get organised.' },
    watchOut: L('“Ça va aller” (it will be OK) is not “Ça va” (I’m fine). You’ll often hear it in Abidjan and Dakar as “we’ll manage”.', '« Ça va aller » (ça va s’arranger) n’est pas « Ça va » (je vais bien).'),
    quiz: { sentence: 'Tu es stressé·e ? Ne t’inquiète pas, ça va ___.', options: ['aller', 'allé', 'va'], answer: 0, why: L('“Aller” stays in the infinitive after “va”.', 'Après « va », « aller » reste à l’infinitif.') },
    yourTurn: L('Reassure a classmate before their presentation.', 'Rassurez un camarade avant sa présentation.'),
  },
  {
    fr: 'On se dit à demain.', en: 'Let’s talk tomorrow.', level: 'A2', sounds: 'on suh DEE a duh-MAN',
    meaning: L('Ends a conversation and confirms you’ll speak again tomorrow.', 'Termine une conversation et confirme qu’on se reparle demain.'),
    everyday: { fr: 'Bon, on se dit à demain au marché !', en: 'Right, see you at the market tomorrow!' },
    work: { fr: 'Merci pour l’appel, on se dit à demain pour la suite.', en: 'Thanks for the call, let’s talk tomorrow about next steps.' },
    watchOut: L('Very West African. “On se dit !” on its own means “Let’s keep in touch”.', 'Très ouest-africain. « On se dit ! » seul veut dire « On reste en contact ».'),
    quiz: { sentence: 'On se ___ à demain, alors ?', options: ['dit', 'dis', 'dire'], answer: 0, why: L('With “on”: “dit”.', 'Avec « on » : « dit ».') },
    yourTurn: L('End a phone call with a supplier and agree to talk tomorrow.', 'Terminez un appel avec un fournisseur et convenez de vous reparler demain.'),
  },
  {
    fr: 'Quel est l’ordre du jour ?', en: 'What’s on the agenda?', level: 'B1', sounds: 'kel ay LOR-druh dyoo ZHOOR',
    meaning: L('“L’ordre du jour” is the list of topics for a meeting.', '« L’ordre du jour » est la liste des sujets d’une réunion.'),
    everyday: { fr: 'Alors, quel est l’ordre du jour pour ce week-end ?', en: 'So, what’s the plan for this weekend?' },
    work: { fr: 'Avant de commencer, quel est l’ordre du jour ?', en: 'Before we start, what’s on the agenda?' },
    watchOut: L('False friend: your diary is “l’agenda”, but a meeting’s agenda is “l’ordre du jour”.', 'Faux ami : le carnet, c’est « l’agenda » ; les sujets d’une réunion, c’est « l’ordre du jour ».'),
    quiz: { sentence: 'Le premier point de l’___ du jour est le budget.', options: ['ordre', 'agenda', 'heure'], answer: 0, why: L('“L’ordre du jour” = the meeting agenda.', '« L’ordre du jour » : les sujets de la réunion.') },
    yourTurn: L('Open a meeting and announce its three topics.', 'Ouvrez une réunion et annoncez ses trois sujets.'),
  },
  {
    fr: 'Je reste à votre disposition.', en: 'I remain at your disposal.', level: 'B1', sounds: 'zhuh REST a vot dees-po-zee-SYON',
    meaning: L('The classic last line of a formal email.', 'La phrase classique pour terminer un courriel formel.'),
    everyday: { fr: 'Si tu as besoin d’aide pour déménager, je suis à ta disposition.', en: 'If you need help moving, I’m here for you.' },
    work: { fr: 'Je reste à votre disposition pour toute question.', en: 'Please don’t hesitate to contact me with any questions.' },
    watchOut: L('With “tu”: “à ta disposition”. Don’t translate “Don’t hesitate to…” word for word: this line does the job.', 'Avec « tu » : « à ta disposition ».'),
    quiz: { sentence: 'Je reste à votre ___ pour toute information.', options: ['disposition', 'disposé', 'dispose'], answer: 0, why: L('The noun: “disposition”.', 'Le nom : « disposition ».') },
    yourTurn: L('Finish a formal email to a new partner organisation.', 'Terminez un courriel formel à une nouvelle organisation partenaire.'),
  },
  {
    fr: 'Ça fait longtemps !', en: 'Long time no see!', level: 'A1', sounds: 'sa fay lon-TAHN',
    meaning: L('A happy greeting when you haven’t seen someone for a while.', 'Une salutation joyeuse quand on ne s’est pas vus depuis un moment.'),
    everyday: { fr: 'Kofi ! Ça fait longtemps ! Tu vas bien ?', en: 'Kofi! Long time no see! Are you well?' },
    work: { fr: 'Madame Diallo, ça fait longtemps ! Comment s’est passé votre voyage ?', en: 'Mrs Diallo, it’s been a while! How was your trip?' },
    watchOut: L('“Ça fait longtemps que…” + present tense = “have been … for a long time”: “Ça fait deux ans que j’habite ici.”', '« Ça fait … que » + présent : « Ça fait deux ans que j’habite ici. »'),
    quiz: { sentence: 'Ça fait deux ans que j’___ à Accra.', options: ['habite', 'ai habité', 'habiterai'], answer: 0, why: L('Present tense after “ça fait … que”.', 'Présent après « ça fait … que ».') },
    yourTurn: L('Greet a former colleague you meet at a conference.', 'Saluez un ancien collègue croisé à une conférence.'),
  },
  {
    fr: 'Vous avez tout à fait raison.', en: 'You’re absolutely right.', level: 'A2', sounds: 'voo za-VAY too ta FAY ray-ZON',
    meaning: L('Agrees strongly and politely.', 'Exprime un accord fort et poli.'),
    everyday: { fr: 'Tu as tout à fait raison, prenons un taxi.', en: 'You’re absolutely right, let’s take a taxi.' },
    work: { fr: 'Vous avez tout à fait raison : il faut revoir le calendrier.', en: 'You’re quite right: we need to review the timeline.' },
    watchOut: L('“Avoir raison” uses AVOIR (never “être raison”). The opposite is “avoir tort”.', '« Avoir raison » se construit avec AVOIR. Le contraire : « avoir tort ».'),
    quiz: { sentence: 'Je ne suis pas d’accord : vous ___ tort.', options: ['avez', 'êtes', 'faites'], answer: 0, why: L('“Avoir tort” = to be wrong.', '« Avoir tort » : se tromper.') },
    yourTurn: L('Agree with a colleague’s idea, then add one suggestion.', 'Approuvez l’idée d’un collègue, puis ajoutez une suggestion.'),
  },
];

/** What the note shows at each time of day. */
export type NoteSlot = 'meaning' | 'everyday' | 'work' | 'watchOut' | 'quiz' | 'yourTurn' | 'recap';
export const NOTE_SLOTS: { slot: NoteSlot; hour: number; title: Localized }[] = [
  { slot: 'meaning', hour: 8, title: L('Today’s expression', 'L’expression du jour') },
  { slot: 'everyday', hour: 10, title: L('In everyday life', 'Au quotidien') },
  { slot: 'work', hour: 12, title: L('At work', 'Au travail') },
  { slot: 'watchOut', hour: 14, title: L('Watch out', 'Attention') },
  { slot: 'quiz', hour: 16, title: L('Quick check', 'Petit test') },
  { slot: 'yourTurn', hour: 18, title: L('Your turn', 'À vous') },
  { slot: 'recap', hour: 20, title: L('Recap', 'Récapitulatif') },
];

const LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/** Today's expression, chosen from those suited to the learner's level (at or below it). */
export function expressionOfDay(isoDate: string, level: CefrLevel = 'B1'): DailyExpression {
  const day = Math.floor(Date.UTC(+isoDate.slice(0, 4), +isoDate.slice(5, 7) - 1, +isoDate.slice(8, 10)) / 86_400_000);
  const max = LEVELS.indexOf(level);
  const pool = DAILY_EXPRESSIONS.filter((e) => LEVELS.indexOf(e.level) <= Math.max(max, 1));
  const list = pool.length ? pool : DAILY_EXPRESSIONS;
  return list[day % list.length];
}

/** Which part of the expression to show at a given hour (before 8:00 shows the expression itself). */
export function slotAt(hour: number): NoteSlot {
  let current: NoteSlot = 'meaning';
  for (const s of NOTE_SLOTS) if (hour >= s.hour) current = s.slot;
  return current;
}

/** Milliseconds until the note should change next (the next even hour between 8:00 and 20:00, else midnight). */
export function msUntilNextSlot(now: Date): number {
  const next = NOTE_SLOTS.find((s) => s.hour > now.getHours());
  const target = new Date(now);
  if (next) target.setHours(next.hour, 0, 5, 0);
  else { target.setDate(target.getDate() + 1); target.setHours(0, 0, 5, 0); }
  return Math.max(1000, target.getTime() - now.getTime());
}
