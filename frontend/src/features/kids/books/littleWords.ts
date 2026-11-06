// "Mes petits mots": the little expressions each 4–5 book teaches, shown at the end of the book.
// Tapping one reads it aloud. Sample content for the La Porte teaching team to review.
export interface LittleWord { fr: string; en: string; icon: string }
export const LITTLE_WORDS: Record<string, LittleWord[]> = {
  'bk-doudou': [{ fr: 'Oh là là !', en: 'Oh dear!', icon: '😮' }, { fr: 'Coucou !', en: 'Hello there!', icon: '👋' }, { fr: 'Youpi !', en: 'Hooray!', icon: '🎉' }, { fr: 'Chut !', en: 'Shh!', icon: '🤫' }, { fr: 'Bonne nuit !', en: 'Good night!', icon: '🌙' }],
  'bk-chevre': [{ fr: 'Bêêê !', en: 'Baa!', icon: '🐐' }, { fr: 'Vite !', en: 'Quick!', icon: '💨' }, { fr: 'Miam !', en: 'Yum!', icon: '😋' }, { fr: 'Attends !', en: 'Wait!', icon: '✋' }, { fr: 'Bravo !', en: 'Well done!', icon: '👏' }],
  'bk-mangue': [{ fr: 'Regarde !', en: 'Look!', icon: '👀' }, { fr: 'Hop !', en: 'Hop!', icon: '🦘' }, { fr: 'Oups !', en: 'Oops!', icon: '🙊' }, { fr: 'Boum !', en: 'Boom!', icon: '💥' }, { fr: 'Merci !', en: 'Thank you!', icon: '🙏' }],
  'bk-bain': [{ fr: 'Beurk !', en: 'Yuck!', icon: '🤢' }, { fr: 'Non, non, non !', en: 'No, no, no!', icon: '🙅' }, { fr: 'Oh là là !', en: 'Oh dear!', icon: '😮' }, { fr: 'Plouf !', en: 'Splash!', icon: '💦' }, { fr: 'Ça sent bon !', en: 'Smells nice!', icon: '🌸' }],
  'bk-couleurs': [{ fr: 'Youpi !', en: 'Hooray!', icon: '🎉' }, { fr: 'rouge', en: 'red', icon: '🍅' }, { fr: 'jaune', en: 'yellow', icon: '🥭' }, { fr: 'bleu', en: 'blue', icon: '💙' }, { fr: 'vert', en: 'green', icon: '💚' }],
  'bk-lune': [{ fr: 'Bonne nuit !', en: 'Good night!', icon: '🌙' }, { fr: 'Un bisou !', en: 'A kiss!', icon: '😘' }, { fr: 'Une, deux, trois', en: 'One, two, three', icon: '⭐' }, { fr: 'Chut !', en: 'Shh!', icon: '🤫' }],
  'bk-plicploc': [{ fr: 'Plic, ploc !', en: 'Pitter, patter!', icon: '🌧️' }, { fr: 'Splash !', en: 'Splash!', icon: '💦' }, { fr: 'Youpi !', en: 'Hooray!', icon: '🎉' }, { fr: 'Coucou !', en: 'Hello there!', icon: '👋' }, { fr: 'Au revoir !', en: 'Goodbye!', icon: '👋' }],
  'bk-poissons': [{ fr: 'Regarde !', en: 'Look!', icon: '👀' }, { fr: 'On compte ?', en: 'Shall we count?', icon: '🔢' }, { fr: 'un, deux, trois', en: 'one, two, three', icon: '🐟' }, { fr: 'Oh !', en: 'Oh!', icon: '😮' }, { fr: 'À bientôt !', en: 'See you soon!', icon: '👋' }],
};
