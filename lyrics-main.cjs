// Song lyrics for the island (a user's idea): the line that is sung right now. They come from LRCLIB (lrclib.net: free
// and open, no account or key, lyrics with a time for every line). A song LRCLIB doesn't have is asked at NetEase Cloud
// Music (music.163.com, also free and without an account; a user saw lyrics in Spotify that Twenty-One didn't have). Only
// the song's title, artist, album and length go there, nothing about you. Every song is asked once: the answer (also
// "none") is kept in userData/lyrics, so playing it again costs nothing. The island asks (lyrics-ui.js); Settings →
// Algemeen → Songteksten turns it off.
const { app, ipcMain, net } = require('electron');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');

const API = 'https://lrclib.net/api', NETEASE = 'https://music.163.com/api';
const SOURCES = 2;            // bump when a source is added: songs that had none before are asked again
const NONE_DAYS = 7;          // no lyrics found: ask again after a week (someone may have added them)
const folder = () => path.join(app.getPath('userData'), 'lyrics');
const memory = new Map();     // key → answer, for this run
const asking = new Map();     // key → the request that is running (a song is asked only once at a time)

const clean = (s, max = 200) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, max);
const keyOf = q => crypto.createHash('sha1').update([q.title, q.artist, Math.round(q.duration || 0)].join('|').toLowerCase()).digest('hex').slice(0, 24);

/** "[01:02.50] words" (also several times on one line) → [{ t: ms, text }], sorted. */
function parse(lrc) {
  const lines = [];
  for (const raw of String(lrc || '').split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g)];
    if (!stamps.length) continue;
    const text = raw.replace(/\[[^\]]*\]/g, '').trim();
    for (const m of stamps) lines.push({ t: Math.round((Number(m[1]) * 60 + Number(m[2].replace(':', '.'))) * 1000), text });
  }
  return lines.sort((a, b) => a.t - b.t);
}

async function get(url) {
  const r = await net.fetch(url, { headers: { 'User-Agent': `Twenty-One ${app.getVersion()} (https://twocode.nl)` }, signal: AbortSignal.timeout(10000) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(new URL(url).host + ' ' + r.status);
  return r.json();
}

// The same song under another name: "Song - Remastered 2011", "Song (feat. X)", "Song - Live" → "song"; "A, B & C" → [a, b, c]
const simple = s => String(s || '').toLowerCase()
  .replace(/\s*[([][^)\]]*\b(feat|ft|with|remaster(ed)?|live|version|edit|mix|mono|stereo|deluxe|bonus|from)\b[^)\]]*[)\]]/g, '')
  .replace(/\s+[-–—]\s+.*\b(remaster(ed)?|live|version|edit|mix|mono|stereo|single|from)\b.*$/g, '')
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const artists = s => String(s || '').toLowerCase().split(/\s*(?:,|&|\/|;|\bx\b|\bfeat\.?|\bft\.?|\bwith\b)\s*/)
  .map(a => a.replace(/[^\p{L}\p{N}]+/gu, ' ').trim()).filter(Boolean);
const sameArtist = (a, b) => artists(a).some(x => artists(b).some(y => x === y || (Math.min(x.length, y.length) > 3 && (x.includes(y) || y.includes(x)))));
const sameLength = (q, sec) => !q.duration || !sec || Math.abs(sec - q.duration) <= 3;

/** LRCLIB: the exact song first, else a search (same length within 3 seconds when we know it), then under its simple
 *  name ("Song - Remastered" → "Song", only the first artist). */
async function fromLrclib(q) {
  const params = new URLSearchParams({ track_name: q.title, artist_name: q.artist });
  if (q.album) params.set('album_name', q.album);
  if (q.duration) params.set('duration', String(Math.round(q.duration)));
  let hit = await get(`${API}/get?${params}`).catch(() => null);
  const names = [[q.title, q.artist]], plain = [simple(q.title), artists(q.artist)[0] || q.artist];
  if (plain[0] && (plain[0] !== q.title.toLowerCase() || plain[1] !== q.artist.toLowerCase())) names.push(plain);
  for (const [title, artist] of names) {
    if (hit?.syncedLyrics || hit?.instrumental) break;
    const found = await get(`${API}/search?${new URLSearchParams({ track_name: title, artist_name: artist })}`);
    const synced = (Array.isArray(found) ? found : []).filter(x => x.syncedLyrics && sameArtist(x.artistName, q.artist));
    hit = synced.find(x => q.duration && sameLength(q, x.duration)) || (q.duration ? null : synced[0]) || hit;
  }
  if (hit?.instrumental) return { lines: [], instrumental: true };
  const lines = parse(hit?.syncedLyrics);
  return { lines: lines.some(l => l.text) ? lines : [] };
}

// NetEase puts who wrote and made the song in the first lines ("作词 : …", "Composer: …"): that is not sung
const CREDIT = /^\s*[\p{Script=Han}A-Za-z .&/-]{1,24}\s*[:：]\s*\S/u;
/** NetEase Cloud Music: a search, the same song (name, artist, length), its timed lyrics. null: not there. */
async function fromNetease(q) {
  const s = `${simple(q.title)} ${artists(q.artist)[0] || ''}`.trim();
  const found = await get(`${NETEASE}/cloudsearch/pc?${new URLSearchParams({ s, type: '1', limit: '10' })}`);
  const songs = Array.isArray(found?.result?.songs) ? found.result.songs : [], want = simple(q.title);
  const hit = songs.find(x => simple(x.name) === want && (x.ar || []).some(a => sameArtist(a.name, q.artist)) && sameLength(q, (x.dt || 0) / 1000));
  if (!hit) return null;
  const lyric = String((await get(`${NETEASE}/song/lyric?${new URLSearchParams({ id: String(hit.id), lv: '1' })}`))?.lrc?.lyric || '');
  if (/纯音乐/.test(lyric)) return { lines: [], instrumental: true }; // "pure music, enjoy"
  const lines = parse(lyric).filter(l => !(l.t < 40000 && CREDIT.test(l.text)));
  return lines.some(l => l.text) ? { lines } : null;
}

/** LRCLIB first, NetEase when LRCLIB has nothing. (beta 83) Also when LRCLIB is slow: it could take up to 30 s before NetEase was
 *  even asked, and the song ran on without lyrics (a customer: they come late). Then whichever has lyrics first counts.
 *  No lyrics while a source could not be reached (LRCLIB is sometimes busy: 503) throws, so that "none" is not kept and the
 *  next play asks again. */
const LRCLIB_WAIT = 1500;
async function lookup(q) {
  const good = a => Boolean(a?.lines?.length || a?.instrumental);
  let failed = 0, answer = null;
  const lrclib = fromLrclib(q).catch(() => { failed++; return null; });
  let timer; const waited = await Promise.race([lrclib.then(a => ({ a })), new Promise(ok => { timer = setTimeout(() => ok(null), LRCLIB_WAIT); })]); clearTimeout(timer);
  if (waited && good(waited.a)) return waited.a;
  const netease = fromNetease(q).catch(() => { failed++; return null; });
  await new Promise(done => {
    let open = 2;
    for (const job of [lrclib, netease]) job.then(a => { if (good(a) && !good(answer)) { answer = a; done(); } else if (a && !answer) answer = a; if (--open === 0) done(); });
  });
  if (failed && !good(answer)) throw new Error('a lyrics source could not be reached');
  return answer || { lines: [] };
}

async function find(raw) {
  const q = { title: clean(raw?.title), artist: clean(raw?.artist), album: clean(raw?.album), duration: Math.max(0, Math.min(7200, Number(raw?.duration) || 0)) };
  if (!q.title || !q.artist) return { lines: [] };
  const key = keyOf(q), file = path.join(folder(), key + '.json');
  if (memory.has(key)) return memory.get(key);
  try {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (saved.lines?.length || saved.instrumental || (saved.sources >= SOURCES && Date.now() - (saved.at || 0) < NONE_DAYS * 864e5)) { memory.set(key, saved); return saved; }
  } catch {}
  if (asking.has(key)) return asking.get(key);
  const job = lookup(q).then(answer => {
    const saved = { ...answer, at: Date.now(), sources: SOURCES };
    memory.set(key, saved);
    try { fs.mkdirSync(folder(), { recursive: true }); fs.writeFileSync(file, JSON.stringify(saved)); } catch {}
    return saved;
  }, () => ({ lines: [], failed: true })) // no internet or LRCLIB is down: not kept, the next song tries again
    .finally(() => asking.delete(key));
  asking.set(key, job);
  return job;
}

const fromIsland = e => /mascot\.html/.test(e.senderFrame?.url || '');
// recordings for videos (REC_OUT): a made-up song with its own made-up lyrics (global.__recLyrics), never real ones
ipcMain.handle('lyrics:get', (e, q) => !fromIsland(e) ? null : process.env.REC_OUT && global.__recLyrics ? global.__recLyrics : find(q));

module.exports = { parse, find, lookup, fromLrclib, fromNetease, simple, artists };
