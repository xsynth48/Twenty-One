// Tuck the island away: right-click it (small, resting or open), or press the shortcut (Ctrl+Alt+H by default,
// shortcuts-main.cjs). Only a thin line stays at the top of the screen and every click goes through to what is under it,
// like a browser's tabs (users said a busy island blocked their tabs). Point at the line for a moment, press the keys
// again, or open the island (Ctrl+Alt+T, the tray) and Robo is back. While tucked, the line shows what is going on
// (a line that fills up; orange: Claude works, green: done, purple: focus, white: music), and when Claude or Codex needs you (a question, May I?) Robo comes
// back by himself, so nothing is missed. mascot.html's drawIslandFrame() asks draw() first.
(() => {
  const LINE_W = 300, LINE_H = 5, ZONE_W = 340, ZONE_H = 10, BACK_AFTER = 450;
  let tucked = false, hoverAt = 0, changedAt = 0, armed = false; // armed: the mouse left the line once since tucking
  const en = () => window.__twocodePrefs?.().lang === 'en';
  const zone = () => ({ x: innerWidth / 2 - ZONE_W / 2, y: 0, width: ZONE_W, height: ZONE_H });

  function set(on, quiet = false) {
    on = Boolean(on);
    if (on === tucked) return;
    tucked = on; hoverAt = 0; armed = false; changedAt = performance.now();
    if (!quiet) window.__twocodeChime?.('pop');
    try { setMode('rest', false); } catch {}
    if (on) {
      if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); // no typing into a hidden page
      let first = false; try { first = !localStorage.getItem('twocode:tucked-once'); localStorage.setItem('twocode:tucked-once', '1'); } catch {}
      if (first) window.__twocodeNotice('tucked', { title: en() ? 'Robo is tucked away' : 'Robo is weggeschoven',
        body: en() ? 'Point at the thin line at the top of your screen to bring him back.' : 'Ga met je muis op het dunne lijntje bovenaan je scherm om hem terug te halen.' });
    }
  }

  function colour() {
    const s = window.__twocodeIslandState?.() || {};
    return s.working ? '#ff9a1f' : s.done ? '#22e05a' : s.focus ? '#b78cff' : 'rgba(255,255,255,.9)';
  }

  // Game mode (game-mode-main.cjs): something runs full screen. The window hides (nothing is drawn) unless Game mode is
  // off in Settings; opening the island yourself (a shortcut, the tray) brings it back until the game ends.
  let fullscreen = false, gaming = false, openedAnyway = false;
  const gameMode = () => window.__twocodePrefs?.().gameMode !== false;
  function applyGame() {
    const want = fullscreen && gameMode() && !openedAnyway;
    if (want === gaming) return;
    gaming = want; window.twocode?.gameModeHide?.(gaming);
  }
  window.twocode?.onGameMode?.(on => { fullscreen = Boolean(on); if (!fullscreen) openedAnyway = false; applyGame(); });
  window.twocode?.gameModeGet?.().then(on => { fullscreen = Boolean(on); applyGame(); }).catch(() => {});
  setInterval(() => { // Game mode turned on or off in Settings; opened during a game: hidden again once it is small and quiet
    if (openedAnyway && mode !== 'expanded' && performance.now() > (window.__twocodeStayOpenUntil || 0) + 3000) openedAnyway = false;
    applyGame();
  }, 1000);
  window.__twocodeGameMode = Object.freeze({ active: () => gaming, openAnyway: () => { if (!fullscreen) return; openedAnyway = true; applyGame(); } });

  window.__twocodeTuck = Object.freeze({
    get: () => tucked,
    set: on => set(on),
    toggle: () => set(!tucked),
    // true: the island is tucked away and this frame is drawn (mascot.html stops there)
    draw(now) {
      if (gaming) { ctx.clearRect(0, 0, canvas.width, canvas.height); islandBounds = { x: 0, y: 0, width: 0, height: 0 }; sendInteractive(false); return true; } // game mode: nothing
      if (!tucked) return false;
      if (window.__twocodeIslandState?.().needsYou) { set(false); return false; } // Claude needs you: Robo is back
      const k = Math.min(1, (performance.now() - changedAt) / 220);
      // Lux (launch mode only, lux-ui.js): "Druppel", a small black drop on a stem with a light orbiting round it
      const drop = window.__twocodeLuxDrop?.(now, k), z = drop || zone();
      if (!drop) {
      const w = LINE_W * (0.4 + 0.6 * k);
      // V3: a long line that fills up as far as Claude, the song or the timer has come
      const x0 = innerWidth / 2 - w / 2, fill = Math.max(0, Math.min(1, window.__twocodeIslandState?.().progress || 0));
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.65 * k;
      ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.roundRect(x0, 1, w, LINE_H, LINE_H / 2); ctx.fill();
      if (fill > 0.005) { ctx.fillStyle = colour(); ctx.shadowColor = colour(); ctx.shadowBlur = 6; ctx.beginPath(); ctx.roundRect(x0, 1, Math.max(LINE_H, w * fill), LINE_H, LINE_H / 2); ctx.fill(); }
      ctx.restore();
      }
      islandBounds = { x: z.x, y: z.y, width: z.width, height: z.height };
      const over = pointer.known && inside(pointer.x, pointer.y, z);
      if (!over) armed = true; // right after a right-click the mouse is often still on the line: it must leave it once first
      if (over && armed) { if (!hoverAt) hoverAt = now; if (now - hoverAt > BACK_AFTER) set(false); } else hoverAt = 0;
      sendInteractive(over); // only the thin line catches the mouse; everything else goes through
      return true;
    },
  });

  // right-click the island: tuck it away. Also when it is open: with "open on hover" it opens as soon as you point at it,
  // so a right-click never reached the small island (a user). Typing in a field of the open island keeps its own menu.
  window.addEventListener('contextmenu', e => { // the window: the open island's pages are partly HTML on top of the canvas
    if (tucked || !inside(e.clientX, e.clientY, islandBounds) || e.target.closest?.('input, textarea, [contenteditable="true"]')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    set(true);
  }, true);
})();
