// Short read-aloud stories for La Porte Kids: one per world, read line by line, then two questions.
// Sample content for the La Porte teaching team to review.
import type { KidQuestion, KidWord } from './kids';
import type { Localized } from './types';

const L = (en: string, fr: string): Localized => ({ en, fr });
const w = (fr: string, word: string, en: string, emoji: string): KidWord => ({ fr, word, en, emoji });

/** Four more worlds (they open in order after the first six). */
export const MORE_KID_UNITS = [
  { id: 'ku-corps', title: L('My body', 'Mon corps'), emoji: '🧍', colour: '#E8E1F5', words: [w('la tête', 'tete', 'the head', '🙂'), w('les yeux', 'yeux', 'the eyes', '👀'), w('le nez', 'nez', 'the nose', '👃'), w('la bouche', 'bouche', 'the mouth', '👄'), w('la main', 'main', 'the hand', '✋'), w('le pied', 'pied', 'the foot', '🦶'), w('les oreilles', 'oreilles', 'the ears', '👂'), w('les cheveux', 'cheveux', 'the hair', '💇')] },
  { id: 'ku-vetements', title: L('Clothes', 'Les vêtements'), emoji: '👕', colour: '#DDEFF0', words: [w('le t-shirt', 'tshirt', 'the T-shirt', '👕'), w('la robe', 'robe', 'the dress', '👗'), w('le pantalon', 'pantalon', 'the trousers', '👖'), w('les chaussures', 'chaussures', 'the shoes', '👟'), w('le chapeau', 'chapeau', 'the hat', '👒'), w('les chaussettes', 'chaussettes', 'the socks', '🧦'), w('la veste', 'veste', 'the jacket', '🧥'), w('le sac', 'sac', 'the bag', '🎒')] },
  { id: 'ku-maison', title: L('At home', 'À la maison'), emoji: '🏠', colour: '#F6E6D8', words: [w('la maison', 'maison', 'the house', '🏠'), w('la porte', 'porte', 'the door', '🚪'), w('le lit', 'lit', 'the bed', '🛏️'), w('la table', 'table', 'the table', '🍽️'), w('la chaise', 'chaise', 'the chair', '🪑'), w('la fenêtre', 'fenetre', 'the window', '🪟'), w('la cuisine', 'cuisine', 'the kitchen', '🍳'), w('le jardin', 'jardin', 'the garden', '🌻')] },
  { id: 'ku-ecole', title: L('At school', 'À l’école'), emoji: '🏫', colour: '#E4ECF7', words: [w('l’école', 'ecole', 'the school', '🏫'), w('le livre', 'livre', 'the book', '📘'), w('le crayon', 'crayon', 'the pencil', '✏️'), w('la maîtresse', 'maitresse', 'the teacher', '👩‍🏫'), w('le cahier', 'cahier', 'the exercise book', '📒'), w('la règle', 'regle', 'the ruler', '📏'), w('la gomme', 'gomme', 'the rubber', '🧽'), w('le tableau', 'tableau', 'the board', '🧑‍🏫')] },
];

export interface KidStory {
  unitId: string;
  title: string; // French
  lines: { fr: string; en: string; emoji: string }[];
  questions: KidQuestion[];
}

const q = (id: string, prompt: string, options: { label: string; emoji?: string }[], answer: number, en: string, fr: string): KidQuestion => ({ id, prompt, options, answer, explain: L(en, fr) });

export const KID_STORIES: KidStory[] = [
  {
    unitId: 'ku-bonjour', title: 'Le premier jour de Kofi',
    lines: [
      { fr: 'Kofi arrive à l’école.', en: 'Kofi arrives at school.', emoji: '🎒' },
      { fr: '« Bonjour ! » dit la maîtresse.', en: '“Hello!” says the teacher.', emoji: '👩‍🏫' },
      { fr: '« Bonjour, madame ! » répond Kofi.', en: '“Hello, miss!” answers Kofi.', emoji: '👋' },
      { fr: 'Le soir, il dit « Au revoir ! » et « Merci ! ».', en: 'In the evening he says “Goodbye!” and “Thank you!”.', emoji: '🌙' },
    ],
    questions: [
      q('s-b1', 'Où arrive Kofi ?', [{ label: 'À l’école', emoji: '🏫' }, { label: 'Au marché', emoji: '🛒' }, { label: 'À la plage', emoji: '🏖️' }], 0, 'Kofi arrives at school.', 'Kofi arrive à l’école.'),
      q('s-b2', 'Que dit Kofi le soir ?', [{ label: 'Bonjour !' }, { label: 'Au revoir !' }, { label: 'Pardon !' }], 1, 'In the evening he says goodbye.', 'Le soir, il dit « Au revoir ! ».'),
    ],
  },
  {
    unitId: 'ku-couleurs', title: 'Le marché de toutes les couleurs',
    lines: [
      { fr: 'Ama va au marché avec sa maman.', en: 'Ama goes to the market with her mum.', emoji: '🛒' },
      { fr: 'Elle voit des tomates rouges.', en: 'She sees red tomatoes.', emoji: '🍅' },
      { fr: 'Elle voit des bananes jaunes.', en: 'She sees yellow bananas.', emoji: '🍌' },
      { fr: 'Ama choisit un tissu bleu pour sa robe.', en: 'Ama chooses blue fabric for her dress.', emoji: '🧵' },
    ],
    questions: [
      q('s-c1', 'De quelle couleur sont les bananes ?', [{ label: 'rouges' }, { label: 'jaunes' }, { label: 'bleues' }], 1, 'The bananas are yellow.', 'Les bananes sont jaunes.'),
      q('s-c2', 'Quel tissu choisit Ama ?', [{ label: 'vert', emoji: '🟩' }, { label: 'rose', emoji: '🟪' }, { label: 'bleu', emoji: '🟦' }], 2, 'She chooses blue fabric.', 'Elle choisit un tissu bleu.'),
    ],
  },
  {
    unitId: 'ku-nombres', title: 'Les mangues de grand-père',
    lines: [
      { fr: 'Grand-père a un manguier.', en: 'Grandpa has a mango tree.', emoji: '🌳' },
      { fr: 'Un, deux, trois… il cueille cinq mangues.', en: 'One, two, three… he picks five mangoes.', emoji: '🥭' },
      { fr: 'Il donne deux mangues à Efua.', en: 'He gives two mangoes to Efua.', emoji: '👧' },
      { fr: 'Il reste trois mangues pour le dessert.', en: 'Three mangoes are left for dessert.', emoji: '🍽️' },
    ],
    questions: [
      q('s-n1', 'Combien de mangues cueille grand-père ?', [{ label: 'trois' }, { label: 'cinq' }, { label: 'huit' }], 1, 'He picks five mangoes.', 'Il cueille cinq mangues.'),
      q('s-n2', 'Combien de mangues reçoit Efua ?', [{ label: 'deux' }, { label: 'quatre' }, { label: 'six' }], 0, 'Efua gets two.', 'Efua reçoit deux mangues.'),
    ],
  },
  {
    unitId: 'ku-animaux', title: 'Le singe et la tortue',
    lines: [
      { fr: 'Dans la forêt, le singe saute très vite.', en: 'In the forest, the monkey jumps very fast.', emoji: '🐒' },
      { fr: 'La tortue marche lentement.', en: 'The tortoise walks slowly.', emoji: '🐢' },
      { fr: 'Le singe dit : « Je suis le plus rapide ! »', en: 'The monkey says: “I’m the fastest!”', emoji: '💨' },
      { fr: 'Mais la tortue arrive la première à la rivière !', en: 'But the tortoise gets to the river first!', emoji: '🏆' },
    ],
    questions: [
      q('s-a1', 'Qui marche lentement ?', [{ label: 'le singe', emoji: '🐒' }, { label: 'la tortue', emoji: '🐢' }, { label: 'le lion', emoji: '🦁' }], 1, 'The tortoise walks slowly.', 'La tortue marche lentement.'),
      q('s-a2', 'Qui arrive le premier ?', [{ label: 'la tortue', emoji: '🐢' }, { label: 'le singe', emoji: '🐒' }, { label: 'l’oiseau', emoji: '🐦' }], 0, 'The tortoise wins!', 'La tortue gagne !'),
    ],
  },
  {
    unitId: 'ku-famille', title: 'La photo de famille',
    lines: [
      { fr: 'Voici la famille de Yaw.', en: 'Here is Yaw’s family.', emoji: '📸' },
      { fr: 'Son père est grand et sa mère sourit.', en: 'His father is tall and his mother smiles.', emoji: '😊' },
      { fr: 'Sa petite sœur tient le bébé.', en: 'His little sister holds the baby.', emoji: '👶' },
      { fr: 'Grand-mère dit : « Cheese ! », et tout le monde rit.', en: 'Grandma says “Cheese!”, and everyone laughs.', emoji: '😂' },
    ],
    questions: [
      q('s-f1', 'Qui tient le bébé ?', [{ label: 'la sœur', emoji: '👧' }, { label: 'le père', emoji: '👨' }, { label: 'grand-mère', emoji: '👵' }], 0, 'His sister holds the baby.', 'Sa sœur tient le bébé.'),
      q('s-f2', 'Qui dit « Cheese ! » ?', [{ label: 'la mère' }, { label: 'grand-mère' }, { label: 'Yaw' }], 1, 'Grandma says it.', 'C’est grand-mère.'),
    ],
  },
  {
    unitId: 'ku-nourriture', title: 'Le pique-nique',
    lines: [
      { fr: 'Samedi, c’est le pique-nique !', en: 'Saturday is picnic day!', emoji: '🧺' },
      { fr: 'Il y a du riz, du poulet et du pain.', en: 'There is rice, chicken and bread.', emoji: '🍗' },
      { fr: 'Adwoa boit de l’eau, son frère boit du lait.', en: 'Adwoa drinks water, her brother drinks milk.', emoji: '🥛' },
      { fr: 'Pour finir, un gâteau au chocolat. Miam !', en: 'To finish, a chocolate cake. Yum!', emoji: '🍰' },
    ],
    questions: [
      q('s-o1', 'Que boit Adwoa ?', [{ label: 'du lait', emoji: '🥛' }, { label: 'de l’eau', emoji: '💧' }, { label: 'du jus', emoji: '🧃' }], 1, 'Adwoa drinks water.', 'Adwoa boit de l’eau.'),
      q('s-o2', 'Quel est le dessert ?', [{ label: 'une banane', emoji: '🍌' }, { label: 'du riz', emoji: '🍚' }, { label: 'un gâteau', emoji: '🍰' }], 2, 'A chocolate cake.', 'Un gâteau au chocolat.'),
    ],
  },
  {
    unitId: 'ku-corps', title: 'Jacques a dit',
    lines: [
      { fr: 'On joue à « Jacques a dit » !', en: 'We’re playing “Simon says”!', emoji: '🎲' },
      { fr: 'Jacques a dit : touche ta tête.', en: 'Simon says: touch your head.', emoji: '🙂' },
      { fr: 'Jacques a dit : lève la main.', en: 'Simon says: raise your hand.', emoji: '✋' },
      { fr: 'Touche ton nez !… Oh non, Jacques n’a pas dit !', en: 'Touch your nose!… Oh no, Simon didn’t say!', emoji: '👃' },
    ],
    questions: [
      q('s-k1', 'Que faut-il lever ?', [{ label: 'le pied', emoji: '🦶' }, { label: 'la main', emoji: '✋' }, { label: 'la tête', emoji: '🙂' }], 1, 'Raise your hand.', 'On lève la main.'),
      q('s-k2', 'Quel ordre est un piège ?', [{ label: 'Touche ta tête' }, { label: 'Lève la main' }, { label: 'Touche ton nez' }], 2, '“Touch your nose” — Simon didn’t say!', '« Touche ton nez » : Jacques n’a pas dit !'),
    ],
  },
  {
    unitId: 'ku-vetements', title: 'Il pleut !',
    lines: [
      { fr: 'Ce matin, il pleut.', en: 'This morning it is raining.', emoji: '🌧️' },
      { fr: 'Kwame met sa veste et ses chaussures.', en: 'Kwame puts on his jacket and his shoes.', emoji: '🧥' },
      { fr: 'Il prend son sac pour l’école.', en: 'He takes his bag for school.', emoji: '🎒' },
      { fr: 'Oh ! Il a oublié son chapeau !', en: 'Oh! He forgot his hat!', emoji: '👒' },
    ],
    questions: [
      q('s-v1', 'Quel temps fait-il ?', [{ label: 'Il pleut', emoji: '🌧️' }, { label: 'Il fait chaud', emoji: '☀️' }, { label: 'Il neige', emoji: '❄️' }], 0, 'It is raining.', 'Il pleut.'),
      q('s-v2', 'Qu’a oublié Kwame ?', [{ label: 'son sac', emoji: '🎒' }, { label: 'sa veste', emoji: '🧥' }, { label: 'son chapeau', emoji: '👒' }], 2, 'He forgot his hat.', 'Il a oublié son chapeau.'),
    ],
  },
  {
    unitId: 'ku-maison', title: 'Où est le chat ?',
    lines: [
      { fr: 'Le chat de Grace est caché.', en: 'Grace’s cat is hiding.', emoji: '🐱' },
      { fr: 'Il n’est pas sous la table.', en: 'It isn’t under the table.', emoji: '🍽️' },
      { fr: 'Il n’est pas dans la cuisine.', en: 'It isn’t in the kitchen.', emoji: '🍳' },
      { fr: 'Il dort sur le lit ! Chut !', en: 'It’s asleep on the bed! Shh!', emoji: '🛏️' },
    ],
    questions: [
      q('s-m1', 'Où dort le chat ?', [{ label: 'sur le lit', emoji: '🛏️' }, { label: 'sous la table', emoji: '🍽️' }, { label: 'dans le jardin', emoji: '🌻' }], 0, 'On the bed.', 'Sur le lit.'),
      q('s-m2', 'À qui est le chat ?', [{ label: 'à Grace' }, { label: 'à Kofi' }, { label: 'à la maîtresse' }], 0, 'It’s Grace’s cat.', 'C’est le chat de Grace.'),
    ],
  },
  {
    unitId: 'ku-ecole', title: 'Le crayon perdu',
    lines: [
      { fr: 'En classe, Efua cherche son crayon.', en: 'In class, Efua looks for her pencil.', emoji: '✏️' },
      { fr: 'Il n’est pas dans son cahier.', en: 'It isn’t in her exercise book.', emoji: '📒' },
      { fr: 'Samuel lui prête sa règle et sa gomme.', en: 'Samuel lends her his ruler and rubber.', emoji: '📏' },
      { fr: 'La maîtresse sourit : le crayon est sous le livre !', en: 'The teacher smiles: the pencil is under the book!', emoji: '📘' },
    ],
    questions: [
      q('s-e1', 'Que cherche Efua ?', [{ label: 'son livre', emoji: '📘' }, { label: 'son crayon', emoji: '✏️' }, { label: 'son sac', emoji: '🎒' }], 1, 'She looks for her pencil.', 'Elle cherche son crayon.'),
      q('s-e2', 'Où est le crayon ?', [{ label: 'sous le livre', emoji: '📘' }, { label: 'dans le cahier', emoji: '📒' }, { label: 'sur la chaise', emoji: '🪑' }], 0, 'Under the book.', 'Sous le livre.'),
    ],
  },
];

export const storyFor = (unitId: string) => KID_STORIES.find((s) => s.unitId === unitId);
