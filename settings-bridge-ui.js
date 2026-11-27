// Settings are their own app now (settings-app.html, opened by settings-app-main.cjs). The settings code
// itself stays here in the island, where Robo and all his preferences live: the app asks for a list
// ("general" or "karakter") and every click in the app is played on a hidden copy of that list here.
//
// Everything you change in the app is a draft first: the app's own Robo shows it right away, the real Robo
// and the island only get it when you press Save (and nothing at all when you press Cancel).
(() => {
  const openView = setView;
  // The gear, the Settings tile and the AI shortcut all open the app instead of the small settings page.
  // An app from a pack you don't have yet opens Instellingen → Apps instead, where you can get it (once per few seconds:
  // dragging a file over the island asks for the Tray again and again).
  const PACK_VIEWS = ['focus', 'tray', 'clips', 'note', 'spotify'];
  let askedAt = 0;
  setView = (view, ...rest) => {
    if (view === 'settings' && window.twocode?.settingsOpen) { window.twocode.settingsOpen(); return; }
    if (PACK_VIEWS.includes(view) && license.locked.includes(view)) {
      if (performance.now() - askedAt > 4000) { askedAt = performance.now(); window.twocode?.settingsOpen?.('apps'); }
      return;
    }
    return openView(view, ...rest);
  };

  const root = document.getElementById('twocode-settings-v2');
  const box = document.createElement('div');
  box.id = 'tc-remote-settings'; box.hidden = true; box.setAttribute('aria-hidden', 'true');
  root.appendChild(box); // inside the settings root, so its click handler runs for clicks in here

  // ---------- apps you removed (ai-monitor-ui.js leaves them out of the island, buddy-ui.js for Robo) ----------
  let offCache = null, allOff = null; // read once, the island asks every frame
  const appsOff = () => { if (!offCache) { try { offCache = new Set(JSON.parse(localStorage.getItem('twocode:apps-off')) || []); } catch { offCache = new Set(); } } return offCache; };
  // ---------- packs (license-main.cjs): apps from a pack you did not buy are not in the island either ----------
  let license = { apps: ['focus', 'tray', 'clips', 'note', 'spotify', 'outfits'], locked: [] }; // free during the beta: everything is open
  window.__twocodeLicense = () => license;
  let licenseKnown = false;
  const setLicense = v => {
    if (!v || !Array.isArray(v.locked)) return;
    const wasOpen = licenseKnown && !license.locked.includes('guard');
    license = v; allOff = null; licenseKnown = true;
    if (wasOpen && v.locked.includes('guard') && window.__twocodePrefs?.().guardOn) // it was free for everyone, and that ended
      window.__twocodeNotice('hint', { title: window.__twocodePrefs().lang === 'en' ? 'Focus guard: unlock it in Settings → Apps' : 'Focusbewaker: ontgrendel hem in Instellingen → Apps' });
  };
  window.twocode?.licenseGet?.().then(setLicense).catch(() => {});
  window.twocode?.onLicense?.(setLicense);
  // what the island leaves out: the apps you removed, plus the ones still locked
  window.__twocodeAppsOff = () => (allOff ??= new Set([...appsOff(), ...license.locked]));

  // ---------- the draft ----------
  // prefs: a copy of Robo's preferences; sleep/login: the two switches that live outside prefs;
  // extras: city and calendar link typed but not saved; apps: the apps you want in your Twenty-One.
  let draft = null;
  const realLogin = () => box.querySelector('[data-login]')?.classList.contains('on') ?? false;
  function begin() {
    if (draft) return draft;
    box.innerHTML = window.__twocodeSettingsHtml?.('general') || '';
    // login: null until you flip it (its real value arrives a moment after start, so it is read when needed)
    draft = { prefs: window.__twocodeRealPrefs(), sleep: !!sleepEnabled, login: null, extras: {}, apps: [...appsOff()] };
    window.__twocodePreviewPrefs(draft.prefs);
    return draft;
  }
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function dirty() {
    if (!draft) return false;
    box.innerHTML = window.__twocodeSettingsHtml?.('general') || '';
    return !same(draft.prefs, window.__twocodeRealPrefs()) || draft.sleep !== !!sleepEnabled || (draft.login !== null && draft.login !== realLogin())
      || Object.keys(draft.extras).length > 0 || !same([...draft.apps].sort(), [...appsOff()].sort());
  }

  const settle = () => new Promise(r => setTimeout(r, 0)); // the English translation (i18n-ui.js) runs right after a change
  // A list as it looks with your draft.
  async function list(which) {
    const d = begin();
    box.innerHTML = window.__twocodeWithDraft(d.prefs, () => window.__twocodeSettingsHtml?.(which) || '');
    const set = (sel, on) => box.querySelectorAll(sel).forEach(b => { b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    set('[data-action="sleep"]', d.sleep);
    if (d.login !== null) set('[data-login]', d.login);
    for (const [key, value] of Object.entries(d.extras)) box.querySelectorAll('#tc-in-' + key).forEach(i => i.setAttribute('value', value));
    await settle();
    return box.innerHTML;
  }
  const info = () => {
    const d = draft, base = window.__twocodeLocker?.() || {};
    return { ...base, temp: /-?\d+°/.exec(window.__twocodeHomeWeather?.() || '')?.[0] || '', h12: Boolean(window.__twocodeTimeArgs?.()[1]?.hour12), name: (d?.prefs.name || '').trim() || base.name, lang: window.__twocodePrefs?.().lang === 'nl' ? 'nl' : 'en', dirty: dirty() };
  };

  // Play one click from the app on the draft.
  function clickDraft(el, values) {
    const d = begin();
    // what you typed in the app goes into the field here first
    for (const [id, value] of Object.entries(values || {})) {
      if (!/^tc-in-[\w-]+$/.test(id)) continue;
      document.querySelectorAll('#' + id).forEach(input => { input.value = String(value).slice(0, 2000); }); // every copy (the island may have one too)
    }
    if (el.dataset.action === 'sleep') { d.sleep = !d.sleep; return; }
    if (el.dataset.login) { d.login = !(d.login ?? el.classList.contains('on')); return; }
    if (el.dataset.save) { const key = el.dataset.pref; d.extras[key] = box.querySelector('#tc-in-' + key)?.value || ''; return; }
    // these really happen right now: quit, restart and the test buttons (they test the island itself)
    if (el.dataset.quit || el.dataset.restart || el.dataset.test || el.dataset.screen) { el.click(); return; } // (and the screen: the window moves now)
    window.__twocodeWithDraft(d.prefs, () => el.click());
    window.__twocodePreviewPrefs(d.prefs);
  }

  // Save: everything in the draft becomes real at once.
  async function saveDraft() {
    if (!draft) return;
    const d = draft;
    window.__twocodeSaveDraft(d.prefs);
    box.innerHTML = window.__twocodeSettingsHtml?.('karakter') || '';
    if (d.sleep !== !!sleepEnabled) box.querySelector('[data-action="sleep"]')?.click();
    box.innerHTML = window.__twocodeSettingsHtml?.('general') || '';
    if (d.login !== null && d.login !== realLogin()) box.querySelector('[data-login]')?.click();
    for (const [key, value] of Object.entries(d.extras)) { // the weather and calendar fields live on the Island tab
      box.innerHTML = window.__twocodeSettingsHtml?.('island') || '';
      document.querySelectorAll('#tc-in-' + key).forEach(i => { i.value = value; });
      box.querySelector(`[data-save][data-pref="${key}"]`)?.click();
    }
    offCache = new Set(d.apps); allOff = null;
    try { localStorage.setItem('twocode:apps-off', JSON.stringify(d.apps)); } catch {}
    draft = null;
    await new Promise(r => setTimeout(r, 120));
  }

  const NOTICE_FIELDS = { show: v => ['island', 'card', 'windows', 'off'].includes(v), size: v => ['small', 'big'].includes(v), stay: v => Number.isFinite(v) && v >= 1 && v <= 30, sound: v => ['done', 'question', 'pop', 'warn', 'party', 'badge', 'error', 'none'].includes(v),
    colour: v => v === 'auto' || /^#[0-9a-f]{6}$/i.test(v), place: v => ['top', 'tl', 'tr', 'bl', 'br'].includes(v), text: v => typeof v === 'boolean', focus: v => typeof v === 'boolean', games: v => typeof v === 'boolean', hideWin: v => typeof v === 'boolean' };
  // req: { kind: 'list' | 'click' | 'save' | 'discard' | 'apps' | 'app' | 'notices' | 'notice' | 'noticeTry', ... }
  window.__twocodeRemoteSettings = async req => {
    const which = ['karakter', 'island', 'guard'].includes(req?.which) ? req.which : 'general';
    if (req?.kind === 'save') await saveDraft();
    if (req?.kind === 'discard') { draft = null; window.__twocodePreviewPrefs(null); }
    if (req?.kind === 'apps' || req?.kind === 'app') {
      const d = begin();
      if (req.kind === 'app' && /^[a-z]+$/.test(req.id || '')) {
        const off = new Set(d.apps); if (req.on) off.delete(req.id); else off.add(req.id);
        d.apps = [...off];
      }
      return { off: d.apps, locked: license.locked, info: info() };
    }
    if (['notices', 'notice', 'noticeTry'].includes(req?.kind)) { // Settings → Notifications: a draft like everything else
      const d = begin(), v = req.value;
      if (req.kind === 'notice') {
        if (req.id === 'master') { if (req.field === 'windows') d.prefs.notify = v === true; if (req.field === 'dnd') d.prefs.noticeDnd = v === true; }
        else if (NOTICE_FIELDS[req.field]?.(v) && window.__twocodeNoticeCatalog?.(d.prefs).some(x => x.id === req.id)) ((d.prefs.notices ||= {})[req.id] ||= {})[req.field] = v;
      }
      if (req.kind === 'notice' && req.id === 'otherApps' && req.field === 'winSettings') window.twocode?.winNoticeSettings?.(); // Windows' own switch for reading notifications
      if (req.kind === 'notices' && window.__twocodeWinNoticeStatus && window.__twocodeWinNoticeStatus !== 'Allowed') window.twocode?.winNoticesListen?.(true);
      if (req.kind === 'noticeTry') window.__twocodeNoticeTry?.(req.id, d.prefs);
      return { list: window.__twocodeNoticeCatalog?.(d.prefs) || [], master: { windows: d.prefs.notify !== false, dnd: Boolean(d.prefs.noticeDnd) }, winStatus: window.__twocodeWinNoticeStatus || '', winLast: window.__twocodeWinNoticeLast || null, info: info() };
    }
    if (req?.kind === 'click') {
      await list(which);
      const el = req.row != null ? box.querySelectorAll('.tc-setting-row')[req.row] : box.querySelectorAll('button')[req.index];
      if (el && req.row != null) window.__twocodeWithDraft(begin().prefs, () => window.__twocodeDemo?.(el.dataset.demo)); // an example block: the app's Robo shows it
      else if (el) clickDraft(el, req.values);
      await new Promise(r => setTimeout(r, 30));
    }
    return { html: await list(which), info: info() };
  };

  // While the app is open its Robo is drawn too (buddy-ui.js), from the draft.
  window.__twocodeFaceForSettings = false;
  window.__twocodeSettingsClosed = () => { draft = null; window.__twocodePreviewPrefs(null); };
})();
