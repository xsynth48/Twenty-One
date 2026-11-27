// Kleurglas (Settings → Island → Material): the island as a slab of real, clear glass. What is behind it shows through,
// live (the window itself is see-through: no picture of the screen), darkened like smoked glass so Robo and the text stay
// readable; the colour of what is going on (the song's cover, Claude orange, Focus purple, or a colour you pick) is light
// coming up through it from below; and its edge catches the light like thick glass.
// (beta 120) Beta 102-119 showed what was behind as a blurred PICTURE over a black island, taken by backdrop-main.cjs. The
// user, 11 Nov, ticked all four: too grey and dull, not really see-through, the colour and edge looked off, and it lagged
// or showed an old picture. Taking that picture also held up the main process just as the mouse came near the island, so
// the island let the first clicks fall through to the app below ("I click and nothing happens"). Windows cannot blur live
// behind our window (its acrylic is a grey plate, 8 Nov), so the glass is clear now: no blur, and never an old picture.
// (beta 104) Beta 100-103 washed the colour over the whole slab: with Claude busy all day that was a muddy brown. Since
// then: a glow from below, a light edge, and the black cards inside turn into glass too (html.tc-glass, --tc-card).
(() => {
  const on = () => (window.__twocodeViewPrefs?.() || window.__twocodePrefs?.() || {}).material === 'glass';
  window.__twocodeGlassOn = on;
  const QUIET = [96, 112, 150];
  let rgb = QUIET.slice(), glow = 0;
  const parse = c => { const m = /(\d+)\D+(\d+)\D+(\d+)/.exec(c || ''), n = /^#[0-9a-f]{6}$/i.test(c || '') ? parseInt(c.slice(1), 16) : null;
    return m ? [+m[1], +m[2], +m[3]] : n != null ? [n >> 16, (n >> 8) & 255, n & 255] : null; };
  // what is going on: a page's colour (spotify-ui.js __twocodeTintNow), else the playing song's cover, else Robo's status colour
  const playing = () => { try { return Boolean(spotifyState?.is_playing); } catch { return false; } };
  const view = () => window.__twocodeViewPrefs?.() || window.__twocodePrefs?.() || {};
  // Glass colour (beta 103, a founder's wish): Automatic follows what is going on; or one colour of your own
  const TINTS = { blauw: [59, 130, 246], paars: [139, 92, 246], roze: [236, 72, 153], groen: [34, 197, 94], oranje: [249, 115, 22], grijs: [120, 128, 140] };
  const want = () => TINTS[view().glassTint] || parse(window.__twocodeTintNow) || (playing() && parse(window.__twocodeAlbumColour)) || parse(window.__twocodeEyes?.()?.color) || QUIET;
  const rgba = (c, a) => `rgba(${c.map(v => Math.round(Math.max(0, Math.min(255, v)))).join(',')},${a.toFixed(3)})`;

  // ---- the cards inside: glass too, not black holes in the glass ----
  const style = document.createElement('style');
  style.textContent = `html.tc-glass{--tc-card:rgba(9,10,14,.42);--tc-line:rgba(255,255,255,.13)}
html.tc-glass #twocode-ai-monitor.cl-new .gl-card{background:var(--tc-card);border-color:var(--tc-line);box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
html.tc-glass #twocode-ai-monitor.cl-new .gl-card .am-option{background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.09)}
html.tc-glass #twocode-ai-monitor.cl-new .gl-card .am-option:hover{background:rgba(255,255,255,.14)}
html.tc-glass #twocode-ai-monitor.cl-new .gl-card .am-note,html.tc-glass #twocode-ai-monitor.cl-new .gl-note{background:rgba(0,0,0,.32);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
html.tc-glass #twocode-tools .ml-t,html.tc-glass #twocode-home .tile{background-color:var(--tc-card)!important;border-color:var(--tc-line)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}`;
  document.head.appendChild(style);
  let marked = null;
  const mark = g => { if (g !== marked) { marked = g; document.documentElement.classList.toggle('tc-glass', g); } };

  // ---- the smoke: how dark the glass is (mascot.html drawIsland fills the island with it; the rest of what is behind shows
  // through). Doorzichtig (See-through, 0-60) makes it clearer. The open island is thicker glass than the small one (Apple:
  // bigger surfaces read as thicker), so a page's text stays readable over a white window behind it. ----
  const SMOKE = [6, 8, 12];
  window.__twocodeGlassSmoke = (w, h) => {
    if (!on()) return null;
    const clear = Math.max(0, Math.min(60, Number(view().seeThrough) || 0)) / 60;
    const thin = 0.74 - 0.34 * clear, thick = Math.min(0.9, thin + 0.16); // (over a white window lighter smoke is a grey plate)
    let small = 36; try { small = UI.COMPACT_H; } catch {}
    const open = Math.max(0, Math.min(1, ((h || small) - small) / 160));
    return thin + (thick - thin) * open;
  };
  window.__twocodeGlassFill = a => `rgba(${SMOKE.join(',')},${a.toFixed(3)})`;

  // (beta 108) The colour glides by the clock, not per frame. At rest the island draws 15 to 30 times a second, so per frame
  // the open island's colour (a song cover's pink) glowed on in the small island's middle after the rest had faded, like a
  // smaller island inside it (a founder's video, 9 Nov: "like a burn in"). Now this glow follows the page's colour down
  // from the first moment and is gone just before it (beta 109: 108 also cut that fade short, and the same founder: "I
  // prefer the fading, it makes it look more alive"; spotify-ui.js fades it in about 1.2 s).
  let lastT = 0;
  window.__twocodeGlassOver = (x, w, h, r) => {
    const g = on(); mark(g);
    if (!g) return;
    const now = performance.now(), dt = Math.min(100, Math.max(0, now - (lastT || now))); lastT = now;
    const k = 1 - Math.pow(0.94, dt / 16.7); // (0.06 a frame at 60 a second, as before: about 0.8 s)
    const target = want(); rgb = rgb.map((v, i) => v + (target[i] - v) * k); // colours glide into each other
    glow += ((target === QUIET ? 0.4 : 1) - glow) * k; // nothing going on: only a hint of light
    const lit = rgb.map(v => v + (255 - v) * 0.55);
    ctx.save();
    islandPath(x, 0, w, h, r); ctx.clip();
    // the colour: light coming up through the glass from below, strongest in the middle, gone near the top
    const cx = x + w / 2, rad = Math.max(w * 0.58, h * 1.1), up = ctx.createRadialGradient(cx, h * 1.32, 0, cx, h * 1.32, rad);
    up.addColorStop(0, rgba(rgb, 0.5 * glow)); up.addColorStop(0.45, rgba(rgb, 0.18 * glow)); up.addColorStop(1, rgba(rgb, 0));
    ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = up; ctx.fillRect(x, 0, w, h);
    // the sheen: light falling on the curved slab from the top left
    const sheen = ctx.createLinearGradient(x, 0, x + w * 0.5, h);
    sheen.addColorStop(0, 'rgba(255,255,255,0.09)'); sheen.addColorStop(0.55, 'rgba(255,255,255,0.015)'); sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen; ctx.fillRect(x, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    // attached to the top of the screen: no edge along the top (there it flows into the screen's edge)
    if (!window.__twocodeFloating?.()) { ctx.beginPath(); ctx.rect(0, 3, innerWidth, innerHeight); ctx.clip(); }
    // the rim: thick glass bends the light at its edge, a lighter band just inside it, strongest where the light falls
    // (top left) and again at the bottom right, with a thin darker line inside it for the glass's thickness
    const band = ctx.createLinearGradient(x, 0, x + w, h);
    band.addColorStop(0, 'rgba(255,255,255,0.13)'); band.addColorStop(0.45, 'rgba(255,255,255,0.035)'); band.addColorStop(1, rgba(lit, 0.1));
    islandPath(x, 0, w, h, r); ctx.strokeStyle = band; ctx.lineWidth = 10; ctx.stroke(); // (half of it inside: a 5 px band)
    islandPath(x + 5.5, 5.5, w - 11, h - 11, Math.max(0, r - 5.5)); ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1.5; ctx.stroke();
    // the edge catches the light: bright at the top left, fading along; softer at the bottom right, in the glass's colour
    const reach = Math.min(w, 300);
    const spec = ctx.createLinearGradient(x, 0, x + reach, h);
    spec.addColorStop(0, 'rgba(255,255,255,0.8)'); spec.addColorStop(0.3, 'rgba(255,255,255,0.22)'); spec.addColorStop(1, 'rgba(255,255,255,0.05)');
    islandPath(x + 0.75, 0.75, w - 1.5, h - 1.5, Math.max(0, r - 0.75)); ctx.strokeStyle = spec; ctx.lineWidth = 1.5; ctx.stroke();
    const back = ctx.createLinearGradient(x + w, h, x + w - reach, 0);
    back.addColorStop(0, rgba(lit, 0.6)); back.addColorStop(0.35, rgba(lit, 0.1)); back.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = back; ctx.stroke();
    ctx.restore();
  };
})();
