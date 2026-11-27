// Robo's voice commands (an idea of selim and andradkk.g): what you say to Robo (Ctrl+Alt+Space, or the microphone in his
// chat) is first checked for a short command: the music (pause, play, next, previous), the volume (louder, softer, mute),
// opening a site or one of your own apps, a focus timer, or a page of the island. Anything else goes to the AI as before.
// Only short sentences count ("can you explain how I pause a video" is a question, not a command). In the 7 languages of
// the island. parse(text) → { do: 'music', action } | { do: 'volume', step } | { do: 'mute', on } | { do: 'open', name }
// | { do: 'timer', min } | { do: 'timer', stop: true } | { do: 'page', view } | null
(function (root) {
  const clean = s => String(s || '').toLowerCase().normalize('NFC').replace(/[.,!?¡¿;:"“”„«»]/g, ' ').replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim();
  // what may come before or after a command: a name, a greeting, "please", "can you"
  const LEAD = /^(?:(?:hey|hi|ok|okay|oké|hoi|hé|hola|olá|ola|hallo|salut|yo|robo|twocode|please|alsjeblieft|graag|por favor|bitte|can you|could you|will you|kun je|kan je|wil je|puedes|podes|pode|kannst du|peux-tu|tu peux|zet|doe)\s+)+/;
  const TRAIL = /(?:\s+(?:please|alsjeblieft|graag|por favor|bitte|s'il te plaît|robo|now|nu|ahora|agora|jetzt|maintenant))+$/;
  const MUSIC = [
    ['pause', /^(?:pause|pause (?:it|the music|the song)|stop(?: the| de)? (?:music|muziek|song)|stop playing|pauze|pauzeer|pauzeren|muziek (?:uit|stil|op pauze)|(?:de )?muziek uit|pausa|pausar|pausa la m[uú]sica|para(?:r)? (?:la |a )?m[uú]sica|pausieren|pausiere|musik (?:aus|stoppen|anhalten)|mets en pause|arr[eê]te la musique|रोको|पॉज़(?: करो)?|गाना रोको)$/],
    ['next', /^(?:next|next (?:song|track|one)|skip|skip (?:this|it|this song|song)|volgende|volgend(?:e)? (?:nummer|liedje)|overslaan|sla (?:over|dit over)|siguiente|siguiente canci[oó]n|pr[oó]xima|pr[oó]xima (?:m[uú]sica|faixa)|seguinte|pular|n[aä]chste[rsn]?|n[aä]chstes lied|[uü]berspringen|suivant|suivante|chanson suivante|अगला|अगला गाना)$/],
    ['previous', /^(?:previous|previous (?:song|track|one)|go back|back|last song|vorige|vorig(?:e)? (?:nummer|liedje)|anterior|canci[oó]n anterior|m[uú]sica anterior|faixa anterior|voltar|vorherige[rsn]?|zur[uü]ck|pr[eé]c[eé]dent(?:e)?|chanson pr[eé]c[eé]dente|पिछला|पिछला गाना)$/],
    ['play', /^(?:play|play (?:music|the music|it|again)|resume|continue|unpause|speel|speel af|speel verder|afspelen|speel (?:de )?muziek|muziek aan|(?:de )?muziek weer aan|ga door|verder|reproducir|reanudar|pon (?:la )?m[uú]sica|tocar|continuar|toca (?:a )?m[uú]sica|abspielen|weiter|fortsetzen|musik an|musik abspielen|lecture|reprendre|joue|joue la musique|mets la musique|चलाओ|प्ले(?: करो)?|गाना चलाओ)$/],
  ];
  const UP = /^(?:louder|volume up|turn it up|turn (?:the )?(?:volume|music|sound) up|turn up the (?:volume|music|sound)|harder|luider|volume (?:omhoog|hoger|harder)|(?:het )?(?:geluid |volume )?harder|m[aá]s alto|sube (?:el )?volumen|subir (?:el )?volumen|mais alto|aumenta(?:r)? (?:o )?volume|lauter|mach lauter|plus fort|monte le son|augmente le son|आवाज़ बढ़ाओ|आवाज़ तेज़ करो)$/;
  const DOWN = /^(?:quieter|softer|volume down|turn it down|turn (?:the )?(?:volume|music|sound) down|turn down the (?:volume|music|sound)|zachter|stiller|volume (?:omlaag|lager|zachter)|(?:het )?(?:geluid |volume )?zachter|m[aá]s bajo|baja (?:el )?volumen|bajar (?:el )?volumen|mais baixo|diminu(?:i|ir) (?:o )?volume|abaixa(?:r)? (?:o )?volume|leiser|mach leiser|moins fort|baisse le son|आवाज़ कम करो|आवाज़ धीमी करो)$/;
  const MUTE = /^(?:mute|mute it|silence|dempen|demp|geluid uit|(?:het )?geluid uit|silencio|silenciar|mudo|stumm|stummschalten|ton aus|muet|coupe le son|म्यूट(?: करो)?)$/;
  const UNMUTE = /^(?:unmute|sound on|geluid aan|(?:het )?geluid weer aan|activa el sonido|ligar (?:o )?som|ton an|ton wieder an|remets le son|अनम्यूट(?: करो)?)$/;
  const OPEN = /^(?:open|open up|launch|start|go to|show me|open de|naar|ga naar|abre|abrir|ir a|ve a|abra|ir para|vai para|[öo]ffne|[öo]ffnen|starte|geh zu|gehe zu|ouvre|ouvrir|lance|va sur)\s+(.{2,40})$/;
  const OPEN_HI = /^(.{2,40}?)\s+(?:खोलो|खोलें)$/;
  // pages of the island
  const PAGES = [
    ['agenda', /^(?:(?:my |mijn |mi |minha |meine |mon |ma )?(?:agenda|calendar|kalender|calendario|calend[aá]rio|calendrier|day|dag|d[ií]a|tag|journ[eé]e)|what'?s (?:on )?(?:my|today)(?: day| agenda)?|wat (?:staat er|heb ik) vandaag|एजेंडा|कैलेंडर)$/],
    ['spotify', /^(?:(?:the |de |la |a |die |la )?(?:music|muziek|m[uú]sica|musik|musique|song|nummer|canci[oó]n)(?: page| pagina)?|what'?s playing|wat speelt er|संगीत)$/],
    ['home', /^(?:home|thuis|inicio|in[ií]cio|start ?seite|accueil|होम)$/],
    ['mail', /^(?:(?:my |mijn |mi |meu |meine |mes )?(?:mail|e-?mail|emails|mails|inbox|correo|correos|caixa de entrada|posteingang|courriel)|मेल)$/],
    ['chat', /^(?:chat|talk|praten|charlar|conversar|reden|parler)$/],
  ];
  const SHOW = /^(?:show(?: me)?|open|go to|toon|laat (?:me )?zien|ga naar|naar|muestra|mu[eé]strame|abre|mostrar|mostra|zeig(?:e)?(?: mir)?|[öo]ffne|montre(?:-moi)?|ouvre|दिखाओ)\s+(.+)$/;
  // a focus timer: "timer", "start a timer for 10 minutes", "focus 25", "zet een timer van 5 minuten"
  const TIMER_WORD = /\b(?:timer|focus|focustimer|temporizador|cron[oó]metro|minuteur|minuterie|टाइमर)\b/;
  const NUM_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, ten: 10, fifteen: 15, twenty: 20, 'twenty five': 25, thirty: 30, forty: 40, 'forty five': 45, sixty: 60, hour: 60, 'an hour': 60, 'half an hour': 30,
    een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, tien: 10, vijftien: 15, twintig: 20, vijfentwintig: 25, dertig: 30, veertig: 40, vijfenveertig: 45, zestig: 60, 'een uur': 60, 'half uur': 30, 'een half uur': 30, 'kwartier': 15, 'een kwartier': 15,
    cinco: 5, diez: 10, quince: 15, veinte: 20, treinta: 30, dez: 10, quinze: 15, vinte: 20, trinta: 30, 'fünf': 5, zehn: 10, 'fünfzehn': 15, zwanzig: 20, 'dreißig': 30, cinq: 5, dix: 10, vingt: 20, trente: 30 };
  const timerMinutes = s => {
    const d = s.match(/(\d{1,3})\s*(h|hour|hours|uur|hora|horas|stunde|stunden|heure|heures|घंटा)?\b/);
    if (d) { const n = +d[1] * (d[2] ? 60 : 1); return n > 0 && n <= 240 ? n : null; }
    for (const [w, n] of Object.entries(NUM_WORDS).sort((a, b) => b[0].length - a[0].length)) if (new RegExp(`(?:^|\\s)${w}(?:\\s|$)`).test(s)) return n;
    return 0; // no number: the timer you set
  };
  // how a well-known site is written (for what Robo says back)
  const NAMES = { youtube: 'YouTube', netflix: 'Netflix', chatgpt: 'ChatGPT', claude: 'Claude', gmail: 'Gmail', google: 'Google', instagram: 'Instagram', tiktok: 'TikTok',
    whatsapp: 'WhatsApp', discord: 'Discord', twitch: 'Twitch', reddit: 'Reddit', x: 'X', twitter: 'X', github: 'GitHub', outlook: 'Outlook', maps: 'Google Maps', googlemaps: 'Google Maps',
    drive: 'Google Drive', googledrive: 'Google Drive', linkedin: 'LinkedIn', wikipedia: 'Wikipedia', pinterest: 'Pinterest', facebook: 'Facebook', primevideo: 'Prime Video',
    disneyplus: 'Disney+', soundcloud: 'SoundCloud', duolingo: 'Duolingo', canva: 'Canva', notion: 'Notion', gemini: 'Gemini', translate: 'Google Translate', googletranslate: 'Google Translate', spotify: 'Spotify' };
  // a site's name as you say it → one word ("you tube", "youtube.com", "chat gpt" → "youtube", "chatgpt")
  const siteKey = s => clean(s).replace(/^(?:the|de|het|la|el|o|a|die|das|le|les)\s+/, '').replace(/\s+(?:app|website|site|please|for me|voor me|alsjeblieft)$/, '').replace(/(?:\.|\s)(?:com|nl|org|net|io|ai)$/, '').replace(/[\s.'-]+/g, '');

  function parse(text) {
    let s = clean(text).replace(LEAD, '').replace(TRAIL, '').trim();
    if (!s || s.split(' ').length > 7) return null;
    for (const [action, re] of MUSIC) if (re.test(s)) return { do: 'music', action };
    if (UP.test(s)) return { do: 'volume', step: 1 };
    if (DOWN.test(s)) return { do: 'volume', step: -1 };
    if (UNMUTE.test(s)) return { do: 'mute', on: false };
    if (MUTE.test(s)) return { do: 'mute', on: true };
    if (TIMER_WORD.test(s)) {
      if (/(?:^|\s)(?:stop|cancel|end|stopp?en|stopp|annuleer|para|parar|cancela|cancelar|beenden|arr[eê]te|annule)(?:\s|$)/.test(s)) return { do: 'timer', stop: true };
      const min = timerMinutes(s); if (min !== null) return { do: 'timer', min };
    }
    const page = w => { for (const [view, re] of PAGES) if (re.test(w)) return view; return null; };
    let v = page(s); if (v) return { do: 'page', view: v };
    const shown = SHOW.exec(s); if (shown && (v = page(shown[1].trim()))) return { do: 'page', view: v };
    const open = OPEN.exec(s) || OPEN_HI.exec(s);
    // (known: a site of the list; anything else, like "open google and then yt", is only a command when it is exactly the
    // name of one of your own apps, chat-ui.js checks that; otherwise your AI works it out)
    if (open) { const name = siteKey(open[1]); if (name && name.length <= 24) return { do: 'open', name, known: Object.hasOwn(NAMES, name), said: NAMES[name] || open[1].trim().replace(/^\p{Ll}/u, c => c.toUpperCase()) }; }
    return null;
  }

  const api = { parse, siteKey };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.__twocodeVoice = api;
})(typeof window !== 'undefined' ? window : null);
