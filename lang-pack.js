'use strict';
// More languages (2026-11-07): Spanish, Portuguese, German, French, Hindi. All the app's code keeps working with English
// (prefs.lang stays 'en' or 'nl'); this file translates the finished English text last, right before you see it: on the canvas,
// in the DOM of every window. The chosen language sits in localStorage (twocode:ui-lang), its words in lang/<code>.js, loaded only
// when you chose it, so English and Dutch cost nothing. A text that isn't in the pack stays English. Made with tools/i18n-*.cjs.
(function langPack() {
  const LANGS = { es: 'Español', pt: 'Português', de: 'Deutsch', fr: 'Français', hi: 'हिन्दी' };
  const LOCALE = { es: 'es', pt: 'pt-BR', de: 'de', fr: 'fr', hi: 'hi-IN' };
  const KEY = 'twocode:ui-lang', PET = 'twocode:pet-name', loaded = {};
  let code = '', map = null, lower = new Map(), patterns = [], cache = new Map(), stamp = 0, pet = '';
  const read = () => { try { const c = localStorage.getItem(KEY); return LANGS[c] ? c : ''; } catch { return ''; } };

  function use(words) {
    map = new Map(Object.entries(words)); lower = new Map([...map].map(([k, v]) => [k.toLowerCase(), v])); cache = new Map(); stamp++;
    // texts with a number or a name in them: "{} min ago" also catches "24 min ago"
    // (with few words of its own a pattern only takes numbers: "{} ago" may not eat a song line like "Long time ago")
    patterns = [...map.keys()].filter(k => k.includes('{}')).sort((a, b) => b.length - a.length).map(k => ({
      re: new RegExp('^' + k.split('{}').map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(.+?)') + '$'), to: map.get(k),
      free: k.replace(/\{\}/g, '').replace(/[^\p{L}]/gu, '').length >= 8 }));
    if (document.documentElement) document.documentElement.lang = LOCALE[code] || 'en';
    refresh();
  }
  function load(next) {
    code = next; stamp++;
    if (!next) { map = null; lower = new Map(); patterns = []; cache = new Map(); refresh(); return; }
    if (loaded[next]) { use(loaded[next]); return; }
    window.__twocodeLangData = words => { loaded[next] = words; if (code === next) use(words); };
    const s = document.createElement('script'); s.src = `./lang/${next}.js`;
    (document.head || document.documentElement).appendChild(s);
  }
  // the same word in other capitals: the tabs draw HOME and MUSIC, a sentence may say "ready" where the list has "Ready"
  function sameWord(t) {
    const v = lower.get(t.toLowerCase()); if (v == null) return null;
    if (t === t.toUpperCase() && /\p{L}/u.test(t)) return v.toLocaleUpperCase(LOCALE[code]);
    return t[0] === t[0].toLowerCase() && t[0] !== t[0].toUpperCase() ? v[0].toLocaleLowerCase(LOCALE[code]) + v.slice(1) : v;
  }
  function whole(t) {
    if (map.has(t)) return map.get(t);
    const same = sameWord(t); if (same != null) return same;
    for (const p of patterns) { const m = p.re.exec(t); if (m && (p.free || m.slice(1).every(x => /\d/.test(x)))) { let i = 1; return p.to.replace(/\{\}/g, () => { const part = m[i++] ?? ''; return (part === t ? null : lookup(part, 1)) ?? part; }); } } // ("Twenty-One is free for 3 more days": a pattern inside a pattern)
    return null;
  }
  // a whole text, or the same text with its sentences or parts looked up one by one
  function lookup(t, depth = 0) {
    const one = whole(t); if (one != null) return one;
    if (t.endsWith('.')) { const bare = whole(t.slice(0, -1)); if (bare != null) return bare + (code === 'hi' ? '।' : '.'); }
    if (depth > 2) return null;
    for (const sep of ['. ', ' · ', ': ', ', ']) {
      if (!t.includes(sep)) continue;
      const parts = t.split(sep), out = parts.map(p => whole(p) ?? (sep === '. ' ? whole(p + '.')?.replace(/[.।]$/, '') : null) ?? lookup(p, depth + 1));
      if (out.some(o => o != null)) { const joined = out.map((o, i) => o ?? parts[i]).join(sep); return code === 'hi' && sep === '. ' ? joined.replace(/\. /g, '। ') : joined; }
    }
    return null;
  }
  // Songs and lyrics are not ours to translate: a song called "Home" or "Focus" stays that (spotify-ui.js, lyrics-ui.js say which).
  const kept = new Set();
  // (beta 121) Whole lines in `kept` were not enough: lyrics are also drawn in pieces (word by word, a line wrapped over two
  // lines, a line cut with "…"), and a piece like "home" or "stop" was then translated (Andrey, app in Spanish). Whatever draws
  // a song's words does it inside raw(), and nothing drawn there is looked up.
  let raw = 0;
  // Robo is the name you gave him: wherever a text says Robo, in any language, it says yours
  const named = s => (pet ? s.replace(/\bRobo(?=s?\b)/g, () => pet).replace(/\bROBO\b/g, () => pet.toUpperCase()) : s);
  function t(s) {
    if ((!map && !pet) || typeof s !== 'string' || !/\p{L}/u.test(s) || kept.has(s.trim())) return s;
    const hit = cache.get(s); if (hit !== undefined) return hit;
    const core = s.trim(); let out = s;
    if (core && map) { const found = lookup(core); if (found != null) out = s.replace(core, () => found); }
    out = named(out);
    if (cache.size > 3000) cache.clear();
    cache.set(s, out);
    return out;
  }

  // ---- the canvas: everything drawn or measured, in every window ----
  const P = window.CanvasRenderingContext2D?.prototype;
  if (P) for (const fn of ['fillText', 'strokeText', 'measureText']) { const base = P[fn]; P[fn] = function (s, ...rest) { return base.call(this, (map || pet) && !raw ? t(s) : s, ...rest); }; }

  // ---- days and months in your language (the clock stays as you set it); the island's i18n-ui.js builds on this ----
  const baseDate = Date.prototype.toLocaleDateString;
  Date.prototype.toLocaleDateString = function (locale, options) { return baseDate.call(this, code ? LOCALE[code] : locale, options); };

  // ---- the DOM of a window that has no i18n-ui.js (Settings, the tour, the focus guard, the card) ----
  const SKIP = 'script,style,textarea,input,select.raw,[data-raw]', ATTRS = ['placeholder', 'title', 'aria-label'];
  const shown = new WeakMap(); let watching = false, busy = false;
  function fixNode(n) {
    if (n.nodeType === 3) {
      if (!n.parentElement || n.parentElement.closest(SKIP)) return;
      const v = n.nodeValue, was = shown.get(n), source = was && was.to === v ? was.from : v, to = t(source);
      if (to !== v) n.nodeValue = to;
      if (to !== source) shown.set(n, { from: source, to }); else shown.delete(n);
      return;
    }
    if (n.nodeType !== 1 || !n.hasAttribute) return;
    for (const a of ATTRS) {
      if (!n.hasAttribute(a)) continue;
      const key = 'data-en-' + a, v = n.getAttribute(a), source = n.hasAttribute(key) && n.getAttribute(key + '-shown') === v ? n.getAttribute(key) : v, to = t(source);
      if (to !== v) n.setAttribute(a, to);
      if (to !== source) { n.setAttribute(key, source); n.setAttribute(key + '-shown', to); } else { n.removeAttribute(key); n.removeAttribute(key + '-shown'); }
    }
  }
  function fixTree(root) { if (!root) return; fixNode(root); const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); let n; while ((n = w.nextNode())) fixNode(n); }
  function refresh() { if (watching && document.body) { busy = true; try { fixTree(document.body); fixTree(document.querySelector('title')); } finally { busy = false; observer?.takeRecords(); } } }
  let observer = null;
  function watch() {
    if (watching) return; watching = true;
    const go = () => {
      observer = new MutationObserver(list => { if (busy) return; busy = true; try { for (const m of list) { if (m.type === 'childList') m.addedNodes.forEach(fixTree); else fixNode(m.target); } } finally { busy = false; observer.takeRecords(); } });
      observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
      const title = document.querySelector('title'); if (title) observer.observe(title, { subtree: true, childList: true, characterData: true });
      refresh();
    };
    if (document.body) go(); else addEventListener('DOMContentLoaded', go, { once: true });
  }

  window.__twocodePack = Object.freeze({
    LANGS, t, watch,
    // (beta 121: also before the language's words have arrived, else a song loaded first was never kept)
    keep(...texts) { if (kept.size > 1500) kept.clear(); for (const x of texts) if (typeof x === 'string' && x.trim()) kept.add(x.trim()); },
    raw(draw) { raw++; try { return draw(); } finally { raw--; } },
    // (the default names change nothing: Twenty-One is what an empty name shows, Robo is Robo)
    pet(name) { const n = String(name || '').trim(), next = n && n !== 'Twenty-One' && n !== 'Robo' ? n : ''; try { localStorage.setItem(PET, next); } catch {} if (next !== pet) { pet = next; cache = new Map(); stamp++; refresh(); } },
    code: () => code,
    stamp: () => stamp,                                    // changes when another language or its words arrive
    locale: () => (code ? LOCALE[code] : ''),
    set(next) { next = LANGS[next] ? next : ''; try { localStorage.setItem(KEY, next); } catch {} if (next !== code) load(next); },
  });
  const readPet = () => { try { return localStorage.getItem(PET) || ''; } catch { return ''; } };
  addEventListener('storage', e => { // chosen in another window
    if (e.key === KEY) { const c = read(); if (c !== code) load(c); }
    if (e.key === PET) { pet = readPet(); cache = new Map(); stamp++; refresh(); }
  });
  pet = readPet();
  load(read());
})();
