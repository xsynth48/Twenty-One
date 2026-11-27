(function windowUI() {
  let away = false;
  let savedView = null;
  let captureUntil = 0;

  const time = () => performance.now();

  const protectedView = () =>
    typeof currentView !== 'undefined' &&
    typeof mode !== 'undefined' &&
    mode === 'expanded' &&
    ['project', 'settings', 'monitor', 'assistant'].includes(currentView);

  function state() {
    return {
      view:
        typeof currentView === 'undefined'
          ? null
          : currentView,

      mode:
        typeof mode === 'undefined'
          ? null
          : mode,

      hidden: document.hidden,
      focused: document.hasFocus(),

      frameAgeMs:
        typeof lastFrame === 'undefined'
          ? null
          : Math.round(time() - lastFrame),

      projectDisplay:
        document.getElementById(
          'twocode-project-v2'
        )?.style.display,

      settingsDisplay:
        document.getElementById(
          'twocode-settings-v2'
        )?.style.display
    };
  }

  function restore() {
    // Ctrl+Alt+T (or the tray): your mouse is not on the island, so it stays open 5 s before it may fold in
    window.__twocodeStayOpenUntil = performance.now() + 5000;
    window.__twocodeTuck?.set(false); // tucked away: back
    window.__twocodeGameMode?.openAnyway(); // also while something runs full screen (game mode, tuck-ui.js): you asked for it

    if (savedView) {
      currentView = savedView;
    }

    if (typeof setMode === 'function') {
      setMode('expanded', false);
    }

    return state();
  }

  window.addEventListener('blur', () => {
    if (!away) {
      savedView = protectedView()
        ? currentView
        : null;
    }

    away = true;
  });

  window.addEventListener('focus', () => {
    const returning =
      away && savedView != null;

    away = false;

    if (savedView && mode !== 'expanded') {
      restore();
    }

    savedView = null;

    captureUntil =
      returning || time() < captureUntil
        ? time() + 1000
        : 0;
  });

  window.addEventListener(
    'keydown',
    event => {
      if (
        event.metaKey &&
        event.shiftKey &&
        event.key.toLowerCase() === 's'
      ) {
        if (protectedView()) {
          savedView = currentView;
        }

        captureUntil = time() + 15000;
      }

      if (
        event.key === 'Escape' &&
        protectedView() &&
        (away || time() < captureUntil)
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );

  window.__twocodeWindowDebug = Object.freeze({
    state,
    restore
  });
})();
