'use strict';
// Spotify screen: album cover, song, progress bar (click to jump) and previous / play-pause / next.
// Replaces the old drawSpotify in mascot.html, which only showed the song title.
(function spotifyScreen() {
  const api = window.twocode;
  // Colour of the album cover (extras-ui.js), Spotify green as fallback.
  const accent = () => window.__twocodeAlbumColour || '#1ed760';
  const tr2 = t => window.__twocodeTr ? window.__twocodeTr(t) : t; // the island's language for text not drawn with text()
  // (beta 83) the music app refuses a jump in the song (a customer's Apple Music): say so, and show where the song really is
  api?.onSeekFailed?.(() => { window.__twocodeNotice('seekFail', { title: window.__twocodePrefs?.().lang === 'nl' ? 'Deze app laat niet spoelen' : "This app doesn't allow jumping", body: window.__twocodePrefs?.().lang === 'nl' ? 'Spoel in de app zelf.' : 'Try jumping in the app itself.' }); refreshSpotify?.().catch?.(() => {}); });
  const time = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const position = () => Math.min(spotifyState.duration_ms || 0,
    (spotifyState.progress_ms || 0) + (spotifyState.is_playing ? performance.now() - spotifySyncAt : 0));

  // Vector media icons (crisper than text glyphs).
  function mediaIcon(kind, x, y, s, colour) {
    ctx.save(); ctx.fillStyle = colour; ctx.beginPath();
    const tri = (x0, dir) => { ctx.moveTo(x0, y - s / 2); ctx.lineTo(x0 + dir * s * 0.75, y); ctx.lineTo(x0, y + s / 2); ctx.closePath(); };
    if (kind === 'play') tri(x - s * 0.3, 1);
    else if (kind === 'pause') { ctx.roundRect(x - s * 0.4, y - s / 2, s * 0.28, s, 2); ctx.roundRect(x + s * 0.12, y - s / 2, s * 0.28, s, 2); }
    else { const d = kind === 'next' ? 1 : -1; tri(x - d * s * 0.6, d); tri(x - d * s * 0.05, d); ctx.roundRect(x + d * s * 0.7 - (d > 0 ? 0 : s * 0.16), y - s / 2, s * 0.16, s, 1); }
    ctx.fill(); ctx.restore();
  }
  window.__twocodeMediaIcon = mediaIcon;
  // The music visualizer in the cover's colour: bars that follow the sound when Twenty-One can hear it, otherwise a made-up
  // dance. Every bar rises fast and falls slowly (like a real level meter), with a soft glow in the same colour.
  const vizState = {};
  window.__twocodeVisualizer = (key, x, cy, w, h, colour, n = 6) => {
    const levels = window.__twocodeAudioLevels?.(), t = performance.now() / 1000, playing = spotifyState.is_playing;
    const bars = vizState[key] && vizState[key].length === n ? vizState[key] : (vizState[key] = new Array(n).fill(0.15));
    const gap = Math.max(2, (w / n) * 0.4), bw = (w - gap * (n - 1)) / n;
    ctx.save(); ctx.shadowColor = colour; ctx.shadowBlur = h * 0.35;
    for (let i = 0; i < n; i++) {
      const raw = !playing ? 0.06 : levels ? levels[Math.min(levels.length - 1, Math.floor(i * levels.length / n))] || 0.06
        : 0.2 + 0.6 * Math.abs(Math.sin(t * (2.1 + i * 0.43) + i * 1.7)) * (0.65 + 0.35 * Math.sin(t * 1.3 + i * 0.9));
      const want = !playing ? 0.1 : Math.min(1, 0.12 + 1.15 * Math.pow(raw, 0.65)); // lift the quiet part, so the bars really dance; flat when paused
      bars[i] += (want - bars[i]) * (want > bars[i] ? 0.5 : 0.16);
      const bh = Math.max(bw, h * Math.min(1, bars[i]));
      box(x + i * (bw + gap), cy - bh / 2, bw, bh, bw / 2, colour);
    }
    ctx.restore();
  };
  // While music plays, the album's colour rises from the bottom of the island (black at the top, like a notch).
  let tintK = 0, tintColour = null, tintTall = 1.1, tintT = 0;
  const rgba = (c, a) => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c); if (m) return `rgba(${m[1]},${m[2]},${m[3]},${a})`; const n = parseInt(String(c).replace('#', '').slice(0, 6), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  // Folded (small or medium) and see-through, with Settings → Island → Music colour on: the cover's colour fills the
  // island while a song plays, so what is behind it and the music blend (a user's idea).
  const foldedTint = () => mode !== 'expanded' && window.__twocodePrefs?.().musicTint !== false && (window.__twocodeIslandAlpha?.() ?? 1) < 1
    && Boolean(spotifyState?.is_playing && spotifyState.track) && window.__twocodeAlbumColour;
  // V3: on the music page the cover fills the left of the island and fades into the black
  const COVER_W = 300;
  function coverBackdrop(x, w, h, r) {
    const art = albumImage?.complete && albumImage.naturalWidth;
    ctx.save(); islandPath(x, 0, w, h, r); ctx.clip(); ctx.globalAlpha *= Math.max(0, Math.min(1, (w - 200) / 300));
    if (art) { const s = Math.max(COVER_W, h); ctx.drawImage(albumImage, x, (h - s) / 2, s, s); }
    else { const g0 = ctx.createLinearGradient(x, 0, x + COVER_W, h); g0.addColorStop(0, window.__twocodeAlbumColour || '#3a3a3e'); g0.addColorStop(1, '#101012'); ctx.fillStyle = g0; ctx.fillRect(x, 0, COVER_W, h); }
    const g = ctx.createLinearGradient(x + 150, 0, x + COVER_W + 2, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.28, 'rgba(0,0,0,.18)'); g.addColorStop(0.62, 'rgba(0,0,0,.6)'); g.addColorStop(0.86, 'rgba(0,0,0,.9)'); g.addColorStop(1, '#000');
    ctx.fillStyle = g; ctx.fillRect(x + 150, 0, COVER_W - 148, h);
    ctx.restore();
  }
  window.__twocodeIslandBackdrop = (x, w, h, r) => {
    if (mode === 'expanded' && currentView === 'spotify') {
      if (spotifyConnected && spotifyState.track) coverBackdrop(x, w, h, r);
      else { window.__twocodeTintIsland = '#e01f4c'; window.__twocodeTintAt = performance.now(); } // no song: still the colour of music
    }
    const page = mode === 'expanded' && window.__twocodeTintIsland && performance.now() - (window.__twocodeTintAt || 0) < 120, folded = !page && foldedTint();
    const want = page || Boolean(folded);
    if (page) tintColour = window.__twocodeTintIsland; else if (folded) tintColour = folded;
    const strength = page ? (window.__twocodeTintStrength ?? 1) : folded ? 0.85 : 0; window.__twocodeTintStrength = undefined; // a page may dim it (it says so every frame)
    if (page) tintTall = window.__twocodeTintTall ?? 1.1; window.__twocodeTintTall = undefined; // and say how high the light reaches
    // (beta 108) by the clock, not per frame: at rest the island draws only 15 to 30 times a second, so how long a page's
    // colour lingered in the small island after it closed depended on the PC (a founder's video, 9 Nov). (beta 109) 108 made
    // it go at once; the same founder: "I prefer the fading, it makes it look more alive". So it fades in about 1.2 s, on
    // every PC the same.
    const now = performance.now(), dt = Math.min(100, Math.max(0, now - (tintT || now))); tintT = now;
    tintK += (strength - tintK) * (1 - Math.pow(strength < tintK ? 0.96 : 0.88, dt / 16.7));
    window.__twocodeTintNow = want && tintK > 0.05 ? tintColour : null; // Kleurglas washes the whole island in it (glass-ui.js); only while it is wanted, the glass glides by itself
    if (tintK < 0.01 || !tintColour) return;
    ctx.save(); islandPath(x, 0, w, h, r); ctx.clip();
    // the folded island is small, so there the colour fills it almost evenly (a little deeper at the bottom)
    if (h >= 60) {
      ctx.translate(x + w / 2, h * 1.22); ctx.scale(w * 1.3, h * tintTall);
      const hill = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); hill.addColorStop(0, rgba(tintColour, tintK)); hill.addColorStop(0.4, rgba(tintColour, 0.38 * tintK)); hill.addColorStop(0.72, rgba(tintColour, 0));
      ctx.fillStyle = hill; ctx.fillRect(-1, -2, 2, 3); ctx.restore(); return;
    }
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgba(tintColour, 0.3 * tintK)); g.addColorStop(0.5, rgba(tintColour, 0.4 * tintK)); g.addColorStop(1, rgba(tintColour, 0.6 * tintK));
    ctx.fillStyle = g; ctx.fillRect(x, 0, w, h); ctx.restore();
  };
  // ---- Spotify Connect: where the music plays (this PC, your phone, the car…) and moving it, like Spotify's speaker button ----
  let devicesOpen = false, devices = [], devicesNote = '';
  function devIcon(type, x, y, s, colour) { // small line icons per kind of device
    ctx.save(); ctx.strokeStyle = colour; ctx.fillStyle = colour; ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.beginPath();
    if (type === 'Smartphone') ctx.roundRect(x - s * 0.28, y - s * 0.5, s * 0.56, s, 2.5);
    else if (type === 'Automobile') { ctx.roundRect(x - s * 0.5, y - s * 0.1, s, s * 0.38, 3); ctx.moveTo(x - s * 0.32, y - s * 0.1); ctx.lineTo(x - s * 0.2, y - s * 0.38); ctx.lineTo(x + s * 0.2, y - s * 0.38); ctx.lineTo(x + s * 0.32, y - s * 0.1); }
    else if (type === 'Speaker' || type === 'CastAudio' || type === 'AVR') { ctx.roundRect(x - s * 0.34, y - s * 0.5, s * 0.68, s, 3); ctx.moveTo(x + s * 0.14, y + s * 0.12); ctx.arc(x, y + s * 0.12, s * 0.14, 0, Math.PI * 2); }
    else if (type === 'TV' || type === 'CastVideo') { ctx.roundRect(x - s * 0.5, y - s * 0.38, s, s * 0.62, 2); ctx.moveTo(x - s * 0.22, y + s * 0.42); ctx.lineTo(x + s * 0.22, y + s * 0.42); }
    else { ctx.roundRect(x - s * 0.42, y - s * 0.36, s * 0.84, s * 0.56, 2); ctx.moveTo(x - s * 0.55, y + s * 0.34); ctx.lineTo(x + s * 0.55, y + s * 0.34); } // a laptop
    ctx.stroke(); ctx.restore();
  }
  async function loadDevices() {
    devicesNote = '…';
    try { const r = await api.spotifyDevices?.(); devices = r?.devices || []; devicesNote = r?.ok ? (devices.length ? '' : 'Open Spotify op een ander apparaat, dan zie je het hier.') : (r?.error || 'Kon je apparaten niet ophalen.'); }
    catch { devicesNote = 'Kon je apparaten niet ophalen.'; }
  }
  async function moveTo(device) {
    devicesNote = 'Wisselen naar ' + device.name + '…';
    const r = await api.spotifyTransfer?.(device.id).catch(e => ({ ok: false, error: e.message }));
    if (r?.ok) { devicesOpen = false; devicesNote = ''; window.__twocodeNotice('soundMoved', { title: device.name, body: (window.__twocodePrefs?.().lang === 'nl' ? 'Speelt nu op ' : 'Now playing on ') + device.name }); setTimeout(() => refreshSpotify(), 700); }
    else devicesNote = r?.error || 'Dat lukte niet.';
  }

  // The player: one glass card tinted by the album cover, the cover big on the left,
  // then the song, a clean progress line and iPhone-style controls (a white play button in the middle).
  drawSpotify = function (content) {
    window.__twocodeLyrics?.tick();
    const left = content.x + 4, top = content.y + 2, track = spotifyState.track;
    hit.ghost = null;
    if (!spotifyConnected) { // not linked yet: a small tile, two lines and one button
      const x0 = content.x, y0 = content.y + 6;
      box(x0, y0, 52, 52, 10, '#1c1c1e'); window.__twocodeIcon?.('music', x0 + 26, y0 + 26, 22, '#8e8e93', null, 'rgba(0,0,0,0)');
      text('Spotify koppelen', x0 + 64, y0 + 22, 15, '#fff', 600);
      text('Dan zie en bedien je je muziek hier.', x0 + 64, y0 + 40, 12, '#8e8e93', 400);
      const b = { x: x0 + 64, y: y0 + 54, width: 128, height: 28 }, over = inside(pointer.x, pointer.y, b);
      box(b.x, b.y, b.width, b.height, 8, over ? '#e5e5ea' : '#ffffff');
      text('Koppel Spotify', b.x + b.width / 2, b.y + 18.5, 12, '#000', 600, 'center');
      hit.spConnect = b;
      return;
    }
    // V3: right of the cover the song, the line that is sung big, the next line, the timeline and the buttons
    const soft = 'rgba(255,255,255,.55)', L = islandBounds.x, x0 = track ? L + COVER_W : L + 24, right = L + islandBounds.width - 20, w = right - x0;
    const display = (str, tx, ty, sz, col, weight = 600, max, spacing = 0) => { ctx.save(); ctx.font = `${weight} ${sz}px Inter, "Segoe UI", sans-serif`; ctx.letterSpacing = `${spacing}px`; ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      let t = String(str || ''); if (max) while (t.length > 1 && ctx.measureText(t).width > max) t = t.slice(0, -2) + '…'; ctx.fillText(t, tx, ty); ctx.restore(); };
    // the big line: two lines at most, a smaller size when it does not fit
    const fit = s => { for (const sz of [27, 23, 19]) { ctx.save(); ctx.font = `700 ${sz}px Inter, "Segoe UI", sans-serif`; ctx.letterSpacing = `${-sz * 0.025}px`; const out = []; let cur = '';
      for (const word of String(s || '').split(/\s+/)) { const t = cur ? cur + ' ' + word : word; if (ctx.measureText(t).width > w && cur) { out.push(cur); cur = word; } else cur = t; }
      if (cur) out.push(cur); ctx.restore(); if (out.length <= 2 || sz === 19) return { sz, lines: out.slice(0, 2) }; } };
    const lyr = track && window.__twocodeLyrics?.has() ? window.__twocodeLyrics.around() : null;
    // (beta 121) a song's name, artist and words stay as they are, also when wrapped over two lines or cut with "…" (Andrey:
    // in Spanish, words inside the lyrics were translated). Only Twenty-One's own lines ("nothing playing") are translated.
    const song = track ? (window.__twocodeSongText || (d => d())) : (d => d());
    const big = song(() => fit(!track ? tr2('Er speelt nu niks') : lyr ? (lyr.now || track.name) : track.name)), lh = big.sz + 4, k = lyr ? lyr.k : 1;
    if (track) song(() => {
      ctx.save(); ctx.font = '600 12.5px Inter, "Segoe UI", sans-serif'; const nameW = Math.min(w * 0.62, ctx.measureText(track.name).width); ctx.restore();
      if (lyr) { display(track.name, x0, 52, 12.5, '#ffffff', 600, w * 0.62); display(' · ' + (track.artist || ''), x0 + nameW, 52, 12.5, 'rgba(255,255,255,.72)', 500, w - nameW); }
    });
    hit.spTitle = track ? { x: x0, y: 38, width: w, height: 20 } : null;
    ctx.save(); ctx.globalAlpha *= k; const bigY = (lyr ? 88 : 72) + (1 - k) * 12;
    if (lyr && lyr.lit != null && lyr.now && window.__twocodeLitText) { // word by word (lyrics-ui.js): the words sung so far bright
      let before = 0;
      big.lines.forEach((t, i) => { ctx.save(); ctx.font = `700 ${big.sz}px Inter, "Segoe UI", sans-serif`; ctx.letterSpacing = `${-big.sz * 0.025}px`; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        window.__twocodeLitText(t, x0, bigY + i * lh, lyr.lit - before); ctx.restore(); before += t.split(/\s+/).filter(Boolean).length; });
    } else song(() => big.lines.forEach((t, i) => display(t, x0, bigY + i * lh, big.sz, '#ffffff', 700, null, -big.sz * 0.025)));
    ctx.restore();
    const under = bigY + (big.lines.length - 1) * lh + 22;
    if (lyr) song(() => display(lyr.next, x0, under, 13, soft, 500, w));
    else if (track) song(() => display(track.artist, x0, under, 13, 'rgba(255,255,255,.72)', 500, w));
    else display(tr2('Start muziek in Spotify, of druk op afspelen.'), x0, under, 13, 'rgba(255,255,255,.72)', 500, w);
    // the timeline: elapsed, a thin bar (grows when you point at it), remaining
    const barY = 176, bx0 = x0 + 46, bw = right - 52 - bx0, part = spotifyState.duration_ms ? position() / spotifyState.duration_ms : 0;
    const overBar = inside(pointer.x, pointer.y, { x: bx0, y: barY - 8, width: bw, height: 16 }), bh = overBar ? 6 : 4;
    monoText(time(position()), x0, barY + 4, 11.5, '#ffffff');
    box(bx0, barY - bh / 2, bw, bh, bh / 2, 'rgba(255,255,255,.22)');
    box(bx0, barY - bh / 2, Math.max(bh, bw * part), bh, bh / 2, '#ffffff');
    monoText(spotifyState.duration_ms ? '-' + time(spotifyState.duration_ms - position()) : '0:00', right, barY + 4, 11.5, '#ffffff', 500, 'right');
    hit.spSeek = { x: bx0, y: barY - 8, width: bw, height: 16 };
    // previous, a white round play or pause, next; where it plays, on the right
    const cy = 208, mid = (x0 + right) / 2;
    const ctl = (kx, kind, key, size) => { const b = { x: kx - 20, y: cy - 14, width: 40, height: 28 }, over = inside(pointer.x, pointer.y, b);
      ctx.save(); ctx.globalAlpha *= over ? 0.6 : 1; mediaIcon(kind, kx, cy, size, '#ffffff'); ctx.restore(); hit[key] = b; };
    ctl(mid - 46, 'prev', 'spPrev', 12); ctl(mid + 46, 'next', 'spNext', 12);
    { const b = { x: mid - 17, y: cy - 17, width: 34, height: 34 }, over = inside(pointer.x, pointer.y, b);
      ctx.save(); ctx.beginPath(); ctx.arc(mid, cy, 17, 0, Math.PI * 2); ctx.fillStyle = over ? '#e5e5ea' : '#ffffff'; ctx.fill(); ctx.restore();
      mediaIcon(spotifyState.is_playing ? 'pause' : 'play', mid + (spotifyState.is_playing ? 0 : 1), cy, 13, '#000000'); hit.spPlay = b; }
    const dev = spotifyState.device;
    const dw = 28, dbx = right - dw, dby = cy - 12, overDev = inside(pointer.x, pointer.y, { x: dbx, y: dby, width: dw, height: 24 });
    box(dbx, dby, dw, 24, 8, devicesOpen || overDev ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.1)');
    devIcon(dev?.type || 'Computer', dbx + dw / 2, dby + 12, 13, '#ffffff');
    hit.spDevices = { x: dbx, y: dby, width: dw, height: 24 };
    hit.spOpen = null;
    for (let i = 0; i < 5; i++) hit['spDev' + i] = null;
    if (devicesOpen) { // where it plays: a list like iOS's AirPlay menu
      const pw = 280, list = devices.slice(0, 4), ph = 52 + list.length * 40 + (devicesNote ? 22 : 0), px = right - pw, py = Math.max(content.y, dby - ph - 8);
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; box(px, py, pw, ph, 12, '#1c1c1e'); ctx.restore();
      text('Speel af op', px + 16, py + 28, 15, '#fff', 600);
      text('✕', px + pw - 22, py + 28, 14, '#8e8e93', 600, 'center'); hit.spDevClose = { x: px + pw - 40, y: py + 6, width: 36, height: 36 };
      list.forEach((d, i) => {
        const ry = py + 44 + i * 40, b = { x: px + 6, y: ry, width: pw - 12, height: 40 }, over = inside(pointer.x, pointer.y, b);
        box(px + 16, ry, pw - 32, 1, 0, '#2c2c2e');
        if (over) box(b.x, b.y + 2, b.width, b.height - 4, 8, '#2c2c2e');
        devIcon(d.type, px + 26, ry + 20, 15, '#ffffff');
        text(d.name, px + 46, ry + 25, 15, '#ffffff', d.active ? 600 : 500, 'left', pw - 110);
        if (d.active) { ctx.save(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(px + pw - 30, ry + 20); ctx.lineTo(px + pw - 26, ry + 24); ctx.lineTo(px + pw - 19, ry + 16); ctx.stroke(); ctx.restore(); }
        hit['spDev' + i] = { ...b, device: d };
      });
      if (devicesNote) text(devicesNote, px + 16, py + ph - 12, 12, '#8e8e93', 500, 'left', pw - 32);
    }
  };

  async function control(action) {
    window.dispatchEvent(new CustomEvent('twocode:badge', { detail: 'dj' }));
    if (action === 'play' || action === 'pause') { spotifyState.is_playing = action === 'play'; spotifySyncAt = performance.now(); }
    try { const result = await api.spotifyControl(action); if (!result?.ok && result?.error) console.warn('[Twenty-One spotify]', result.error); } catch {}
    setTimeout(() => refreshSpotify(), 350);
  }
  // ---- swipe for music: drag left/right over the island (or swipe with two fingers on the touchpad) ----
  // left = next song, right = previous song. Works on the small island and on the Spotify page.
  let drag = null, swallowClick = false, wheelX = 0, wheelAt = 0, lastSwipe = 0;
  const canSwipe = (x, y) => spotifyConnected && spotifyState.track && inside(x, y, islandBounds) && (mode === 'compact' || currentView === 'spotify');
  function swipe(dir) {
    if (performance.now() - lastSwipe < 700) return; lastSwipe = performance.now();
    { const en = window.__twocodePrefs?.().lang !== 'nl'; window.__twocodeNotice('nextSong', { title: dir > 0 ? (en ? 'Next song' : 'Volgend nummer') : (en ? 'Previous song' : 'Vorig nummer') }); }
    window.__twocodeKick?.(dir > 0 ? -0.05 : 0.05);
    control(dir > 0 ? 'next' : 'previous');
  }
  canvas.addEventListener('pointerdown', e => { drag = canSwipe(e.clientX, e.clientY) ? { x: e.clientX, y: e.clientY } : null; });
  canvas.addEventListener('pointerup', e => {
    if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag = null;
    if (Math.abs(dx) > 48 && Math.abs(dy) < 36) { swallowClick = true; swipe(dx < 0 ? 1 : -1); }
  });
  // on window (capture) so it runs before every other click handler: a swipe is not a click
  window.addEventListener('click', e => { if (swallowClick) { swallowClick = false; e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  canvas.addEventListener('wheel', e => {
    if (!canSwipe(e.clientX, e.clientY) || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    const now = performance.now(); if (now - wheelAt > 250) wheelX = 0; wheelAt = now; wheelX += e.deltaX;
    if (Math.abs(wheelX) > 90) { swipe(wheelX > 0 ? 1 : -1); wheelX = 0; }
  }, { passive: true });
  canvas.addEventListener('click', async event => {
    if (currentView !== 'spotify' || mode !== 'expanded') return;
    const x = event.clientX, y = event.clientY, hits = {
      spDevClose: () => { devicesOpen = false; },
      ...Object.fromEntries([0, 1, 2, 3].map(i => ['spDev' + i, () => hit['spDev' + i]?.device && moveTo(hit['spDev' + i].device)])),
      spDevices: () => { devicesOpen = !devicesOpen; if (devicesOpen) loadDevices(); },
      spPrev: () => control('previous'), spNext: () => control('next'),
      spPlay: () => control(spotifyState.is_playing ? 'pause' : 'play'), spOpen: () => control('open'), spTitle: () => control('open'),
      spConnect: async () => { try { await api.spotifyConnect(); } catch {} refreshSpotify(); },
      spSeek: () => {
        const bar = hit.spSeek, ms = Math.round(((x - bar.x) / bar.width) * (spotifyState.duration_ms || 0));
        spotifyState.progress_ms = ms; spotifySyncAt = performance.now(); api.spotifySeek(ms).catch(() => {});
      }
    };
    if (devicesOpen && !['spDevices', 'spDevClose', 'spDev0', 'spDev1', 'spDev2', 'spDev3'].some(k => inside(x, y, hit[k]))) { devicesOpen = false; event.preventDefault(); event.stopImmediatePropagation(); return; } // a click elsewhere closes the list
    for (const [key, run] of Object.entries(hits)) {
      if (inside(x, y, hit[key])) { event.preventDefault(); event.stopImmediatePropagation(); run(); return; }
    }
  }, true);
})();
