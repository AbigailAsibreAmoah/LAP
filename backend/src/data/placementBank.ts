import type { PlacementQuestion } from '@laporte/shared';

// SERVER ONLY: the placement questions with their answer key. Never import this from the frontend;
// learners receive the questions without answers, with options shuffled per attempt.
/** Three items per level, A1 → C2. Content is a starter set for the teaching team to refine. */
export const PLACEMENT_BANK: PlacementQuestion[] = [
  { id: 'p-a1-1', level: 'A1', skill: 'vocabulary', prompt: '« Bonjour, je m’appelle Kofi. Et vous ? » — Quelle est la meilleure réponse ?', options: ['Je m’appelle Ama, enchantée.', 'J’ai vingt ans.', 'Il fait beau.'], answer: 0 },
  { id: 'p-a1-2', level: 'A1', skill: 'grammar', prompt: 'Complétez : « Nous ___ ghanéens. »', options: ['sommes', 'êtes', 'sont'], answer: 0 },
  { id: 'p-a1-3', level: 'A1', skill: 'reading', prompt: 'Panneau : « Fermé le dimanche ». Quand le magasin est-il fermé ?', options: ['Le samedi', 'Le dimanche', 'Le lundi'], answer: 1 },
  { id: 'p-a2-1', level: 'A2', skill: 'grammar', prompt: 'Complétez : « Hier, nous ___ au marché de Makola. »', options: ['allons', 'sommes allés', 'irons'], answer: 1 },
  { id: 'p-a2-2', level: 'A2', skill: 'vocabulary', prompt: 'Au restaurant à Lomé : « L’addition, s’il vous plaît » signifie…', options: ['Le menu, s’il vous plaît', 'La note, s’il vous plaît', 'Une table, s’il vous plaît'], answer: 1 },
  { id: 'p-a2-3', level: 'A2', skill: 'reading', prompt: 'Courriel : « La réunion est reportée à jeudi, 15 h. » Que s’est-il passé ?', options: ['La réunion est annulée.', 'La réunion a changé de date.', 'La réunion commence plus tôt.'], answer: 1 },
  { id: 'p-b1-1', level: 'B1', skill: 'grammar', prompt: 'Complétez : « Si j’avais plus de temps, je ___ le français tous les jours. »', options: ['pratique', 'pratiquerais', 'pratiquerai'], answer: 1 },
  { id: 'p-b1-2', level: 'B1', skill: 'vocabulary', prompt: 'En réunion, pour exprimer poliment un désaccord, on dit :', options: ['C’est faux.', 'Je ne partage pas tout à fait votre avis.', 'Vous avez tort.'], answer: 1 },
  { id: 'p-b1-3', level: 'B1', skill: 'reading', prompt: '« Malgré la hausse des coûts, l’entreprise a maintenu ses prix. » Cela veut dire que…', options: ['les prix ont augmenté', 'les prix n’ont pas changé', 'les coûts ont baissé'], answer: 1 },
  { id: 'p-b2-1', level: 'B2', skill: 'grammar', prompt: 'Complétez : « Bien qu’il ___ en retard, la délégation l’a attendu. »', options: ['est', 'soit', 'était'], answer: 1 },
  { id: 'p-b2-2', level: 'B2', skill: 'vocabulary', prompt: '« Ce projet est à double tranchant » signifie qu’il…', options: ['a des avantages et des risques', 'coûte deux fois plus cher', 'est presque terminé'], answer: 0 },
  { id: 'p-b2-3', level: 'B2', skill: 'reading', prompt: '« Le ministère n’exclut pas de revoir sa position. » Le ministère…', options: ['refuse tout changement', 'pourrait changer d’avis', 'a déjà changé d’avis'], answer: 1 },
  { id: 'p-c1-1', level: 'C1', skill: 'grammar', prompt: 'Complétez : « Quelles que ___ les difficultés, le projet sera mené à terme. »', options: ['sont', 'soient', 'seront'], answer: 1 },
  { id: 'p-c1-2', level: 'C1', skill: 'vocabulary', prompt: '« Il n’en demeure pas moins que… » sert à…', options: ['maintenir un argument malgré une objection', 'conclure un accord', 'changer de sujet'], answer: 0 },
  { id: 'p-c1-3', level: 'C1', skill: 'reading', prompt: '« Loin de freiner la croissance, la réforme l’a stimulée. » Selon la phrase, la réforme…', options: ['a ralenti la croissance', 'a favorisé la croissance', 'n’a eu aucun effet'], answer: 1 },
  { id: 'p-c2-1', level: 'C2', skill: 'grammar', prompt: 'Quelle phrase est correcte en registre soutenu ?', options: ['Eussé-je su, je serais venu.', 'Si j’aurais su, je serais venu.', 'Si je savais, je serais venu hier.'], answer: 0 },
  { id: 'p-c2-2', level: 'C2', skill: 'vocabulary', prompt: '« Ménager la chèvre et le chou » signifie…', options: ['s’occuper d’une ferme', 'chercher à ne mécontenter aucune des deux parties', 'prendre une décision radicale'], answer: 1 },
  { id: 'p-c2-3', level: 'C2', skill: 'reading', prompt: '« Ce rapport, pour exhaustif qu’il soit, élude la question du financement. » Le rapport…', options: ['est complet et traite tout', 'est détaillé mais évite un point essentiel', 'est trop court'], answer: 1 },
];
