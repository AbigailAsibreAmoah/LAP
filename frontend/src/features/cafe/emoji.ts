// A small built-in emoji set (no library): common emoji with English and French search words.
// Phones and computers draw the emoji themselves, so this stays tiny.

export const FAVOURITES = ['🇫🇷', '🇬🇭', '📚', '✍️', '🎧', '🗣️', '🎉', '💡', '👏', '🙏'];

const RAW = `
😀 smile grin sourire|😃 happy content|😄 laugh rire|😁 grin|😆 lol|😅 phew sweat ouf|😂 joy tears mdr|🤣 rofl|🙂 slight smile|😉 wink clin|😊 blush|😍 love adore|🥰 love|😘 kiss bisou|😋 yum miam|😎 cool|🤓 nerd study|🤔 think hmm réfléchir|🤨 doubt|😐 neutral|😴 sleep dodo|😌 relieved|😮 wow|😯 surprised|😲 astonished|🥺 please|😢 sad triste|😭 cry pleurer|😤 frustrated|😡 angry fâché|🤯 mind blown|😳 flushed|🥳 party fête|🤩 star struck|😇 innocent|🤗 hug câlin|🤫 shh|🙄 eyeroll|😬 grimace|🫣 peek|🫠 melting|
👍 thumbs up oui ok|👎 thumbs down non|👌 ok parfait|✌️ peace|🤞 fingers crossed chance|👏 clap bravo|🙌 hooray|🙏 thanks pray merci|💪 strong courage|👋 wave bonjour salut|🤝 handshake deal|✍️ writing écrire|👀 eyes look|🧠 brain|🗣️ speak parler|👂 listen écouter|
❤️ heart love coeur|🧡 orange heart|💛 yellow heart|💚 green heart|💙 blue heart|💜 purple heart|🖤 black heart|🤍 white heart|💯 hundred perfect|✨ sparkles|⭐ star étoile|🌟 glowing star|🔥 fire top|💥 boom|🎉 tada party fête|🎊 confetti|🏆 trophy|🥇 gold medal|🎯 target goal objectif|✅ check done|❌ cross wrong faux|❓ question|❗ exclamation|💡 idea idée|📌 pin|
📚 books livres|📖 book livre|📝 note|✏️ pencil crayon|🖊️ pen stylo|📅 calendar|⏰ alarm|⌛ time|💻 laptop|📱 phone|🎧 headphones|🎤 mic|📻 radio|🎬 film|🎵 music musique|🎶 notes|🎸 guitar|🥁 drum|
☕ coffee café|🍵 tea thé|🥐 croissant|🥖 baguette pain|🧀 cheese fromage|🍷 wine vin|🍫 chocolate|🍰 cake gâteau|🍌 banana banane|🥭 mango mangue|🍍 pineapple ananas|🌶️ spicy piment|🍚 rice riz|🍗 chicken poulet|🐟 fish poisson|
🌍 africa europe world monde|🌎 americas|🗺️ map carte|✈️ plane avion voyage|🚗 car voiture|🚌 bus|🚆 train|🏖️ beach plage|🏙️ city ville|🗼 tower paris|🏛️ museum|🏠 home maison|🏫 school école|💼 work travail business|
☀️ sun soleil|🌧️ rain pluie|⛈️ storm|🌈 rainbow|🌙 moon lune|❄️ snow neige|🌸 flower fleur|🌻 sunflower|🌳 tree arbre|🌱 seedling|🦁 lion|🐘 elephant|🐒 monkey singe|🐢 tortoise tortue|🐱 cat chat|🐶 dog chien|🦋 butterfly|
🇫🇷 france french|🇬🇭 ghana|🇸🇳 senegal|🇨🇮 cote divoire|🇧🇯 benin|🇹🇬 togo|🇨🇲 cameroon|🇨🇩 congo|🇲🇦 morocco maroc|🇧🇪 belgium|🇨🇦 canada|🇨🇭 switzerland|🇳🇬 nigeria|🇰🇪 kenya
`;

export const EMOJI: { e: string; k: string }[] = RAW.split('|')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => {
    const [e, ...k] = s.split(' ');
    return { e, k: k.join(' ') };
  });

export function searchEmoji(q: string) {
  const t = q.trim().toLowerCase();
  return t ? EMOJI.filter((x) => x.k.includes(t) || x.e === t) : EMOJI;
}

/** Typing shortcuts, converted when followed by a space or at the end of a post. */
export const SHORTCODES: Record<string, string> = {
  ':)': '🙂', ':-)': '🙂', ':D': '😄', ';)': '😉', ':(': '🙁', ":'(": '😢', ':P': '😋', ':o': '😮', '<3': '❤️',
  ':smile:': '😄', ':laugh:': '😂', ':wink:': '😉', ':heart:': '❤️', ':fire:': '🔥', ':clap:': '👏', ':thumbsup:': '👍', ':+1:': '👍', ':ok:': '👌',
  ':pray:': '🙏', ':thanks:': '🙏', ':tada:': '🎉', ':party:': '🥳', ':idea:': '💡', ':star:': '⭐', ':100:': '💯', ':book:': '📚', ':coffee:': '☕',
  ':fr:': '🇫🇷', ':gh:': '🇬🇭', ':think:': '🤔', ':cool:': '😎', ':wave:': '👋', ':check:': '✅',
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CODES = Object.keys(SHORTCODES).sort((a, b) => b.length - a.length).map(escape).join('|');
const LIVE_RE = new RegExp(`(^|\\s)(${CODES})(?=\\s)`, 'g');
const END_RE = new RegExp(`(^|\\s)(${CODES})$`);

/** Converts shortcuts that have just been completed by a space (live, while typing). */
export const applyShortcodes = (text: string) => text.replace(LIVE_RE, (_, pre: string, code: string) => pre + SHORTCODES[code]);
/** Also converts a shortcut at the very end (when posting). */
export const finalizeShortcodes = (text: string) => applyShortcodes(text).replace(END_RE, (_, pre: string, code: string) => pre + SHORTCODES[code]);

const RECENT_KEY = 'laporte-recent-emoji';
export function recentEmoji(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}
export function rememberEmoji(e: string) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([e, ...recentEmoji().filter((x) => x !== e)].slice(0, 16)));
  } catch {
    /* storage unavailable */
  }
}

/** Names for screen readers on reactions. */
export const emojiName = (e: string) => EMOJI.find((x) => x.e === e)?.k.split(' ')[0] ?? 'emoji';
