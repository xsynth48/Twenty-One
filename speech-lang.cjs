// Which language is this answer in? (beta 125) Robo's voice used the island's language, so a Dutch answer with the island
// in English was read out by an English Windows voice and sounded like gibberish ("he only knows English", the user, 16 Nov).
// Now the words themselves decide: the most common little words of each of Twenty-One's languages, and Devanagari for Hindi.
// Too few clues: the language the caller already had.
const WORDS = {
  nl: 'de het een en is van ik je jij niet dat wat met voor op zijn maar ook kan dit er naar hoe wil heb moet nog wel geen hier deze die mijn jouw we wij zo dan als bij om heel even graag gaat doe',
  en: 'the and is you to of it that what with for on are this can not have i your how but my we they be was will just do here there an at so if or all',
  es: 'el la los las que y es en un una por para con no lo tu qué cómo pero más está estoy yo mi te se del al muy hay son',
  pt: 'o os as que e é um uma para com não você isso mais como mas está eu meu seu do da no na em se tem são muito',
  de: 'der die das und ist nicht ich du ein eine zu mit auf für es wie was aber auch kann sie wir dein mein den dem ist bin hast noch sehr',
  fr: 'le la les et est un une des je tu vous pas que pour avec ce dans sur mais il elle nous mon ton du au qui très c\'est',
};
const SETS = Object.fromEntries(Object.entries(WORDS).map(([k, v]) => [k, new Set(v.split(' '))]));

/** guessLang("Ik zet de muziek voor je aan", "en") → "nl". fallback when the text gives too few clues. */
function guessLang(text, fallback = 'en') {
  const s = String(text || '');
  const deva = (s.match(/[ऀ-ॿ]/g) || []).length, letters = (s.match(/\p{L}/gu) || []).length;
  if (letters && deva / letters > 0.3) return 'hi';
  const words = s.toLowerCase().match(/[\p{L}']+/gu) || [];
  const score = {};
  for (const w of words) for (const [lang, set] of Object.entries(SETS)) if (set.has(w)) score[lang] = (score[lang] || 0) + 1;
  const ranked = Object.entries(score).sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return fallback;
  const [best, n] = ranked[0], second = ranked[1]?.[1] || 0;
  // a clear winner: at least 2 clues, and more than the next language (a tie keeps what the caller had)
  if (n >= 2 && n > second) return best;
  return fallback;
}

module.exports = { guessLang };
