(function windowMain() {
  const {
    app,
    BrowserWindow,
    ipcMain
  } = require('electron');

  // The keys for this (Ctrl+Alt+T by default) are set in shortcuts-main.cjs; it calls app.twocodeOpenIsland().
  const crashed = new Set();

  let recovering = false;

  const safe = value => String(value || '')
    .replace(/https?:\/\/\S+/gi, '[URL]')
    .replace(
      /\b(?:sk-[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_.-]+)/g,
      '[verborgen]'
    )
    .replace(/\bBearer\s+\S+/gi, 'Bearer [verborgen]')
    .replace(
      /((?:access_token|refresh_token|api_key|authorization|code|state)\s*[=:]\s*)[^\s,;]+/gi,
      '$1[verborgen]'
    );

  // (beta 83) When Twenty-One starts and stops is also kept in userData/stops.log (no more than that, at most about 200 KB): Twenty-One
  // was gone one evening with no crash in Windows' own logs, and nothing could say why.
  const KEEP = new Set(['started', 'renderer-stopped', 'child-stopped', 'close-request', 'before-quit']);
  const keep = (name, text) => {
    if (!KEEP.has(name)) return;
    try {
      const fs = require('node:fs'), file = require('node:path').join(app.getPath('userData'), 'stops.log');
      try { if (fs.statSync(file).size > 100 * 1024) fs.renameSync(file, file + '.old'); } catch {}
      fs.appendFileSync(file, `${new Date().toISOString()} ${name} ${text}\n`);
    } catch {}
  };
  const log = (name, details = {}) => {
    const text = safe(JSON.stringify(details));
    console.log('[Twenty-One venster]', name, text);
    keep(name, text);
  };

  async function inspectUI(win, code) {
    let timer;

    try {
      return await Promise.race([
        win.webContents.executeJavaScript(code),

        new Promise((_resolve, reject) => {
          timer = setTimeout(
            () => reject(
              new Error('De tekenlaag reageert niet.')
            ),
            1500
          );
        })
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  function nativeState(win) {
    if (win.isDestroyed()) {
      return { destroyed: true };
    }

    return {
      visible: win.isVisible(),
      minimized: win.isMinimized(),
      focused: win.isFocused(),
      top: win.isAlwaysOnTop(),
      bounds: win.getBounds()
    };
  }

  async function snapshot(win) {
    log('window-status', nativeState(win));

    if (
      win.isDestroyed() ||
      win.webContents.isDestroyed()
    ) {
      return;
    }

    try {
      const state = await inspectUI(
        win,
        'window.__twocodeWindowDebug ' +
        '? window.__twocodeWindowDebug.state() ' +
        ': ({ uiLoaded: false })'
      );

      log('ui-status', state);
    } catch (error) {
      log('ui-status-fout', {
        message: error.message
      });
    }
  }

  app.on('browser-window-created', (_event, win) => {
    for (const name of [
      'show',
      'hide',
      'minimize',
      'restore',
      'focus',
      'blur',
      'close',
      'closed'
    ]) {
      win.on(name, () =>
        log(name, nativeState(win))
      );
    }

    win.webContents.on(
      'console-message',
      // Electron 44: everything is on the event object (the old extra arguments are deprecated)
      event => {
        const message = event.message;
        const level = event.level;

        if (
          level === 'error' ||
          level === 3 ||
          String(message).startsWith('[Twenty-One frame]')
        ) {
          log('renderer-error', {
            message: safe(message).slice(0, 1500)
          });
        }
      }
    );

    win.webContents.on('did-finish-load', () => {
      crashed.delete(win.webContents.id);
      snapshot(win).catch(() => {});
    });

    win.webContents.on(
      'before-input-event',
      (_event, input) => {
        if (
          input.type === 'keyDown' &&
          (
            input.key === 'Escape' ||
            input.key === 'PrintScreen' ||
            (
              input.meta &&
              input.shift &&
              String(input.key).toLowerCase() === 's'
            )
          )
        ) {
          log('key', {
            key: input.key,
            meta: input.meta,
            shift: input.shift
          });
        }
      }
    );
  });

  app.on(
    'render-process-gone',
    (_event, contents, details) => {
      crashed.add(contents.id);

      log('renderer-stopped', {
        reason: details.reason,
        exitCode: details.exitCode
      });
    }
  );

  app.on('child-process-gone', (_event, details) => {
    log('child-stopped', {
      type: details.type,
      reason: details.reason,
      exitCode: details.exitCode
    });
  });

  ipcMain.on('window:close', () =>
    log('close-request')
  );

  app.on('before-quit', () => {
    log('before-quit');
  });

  app.whenReady().then(() => {
    log('started', { version: app.getVersion() });
    app.twocodeOpenIsland = (
      async () => {
        if (recovering) return;

        const win = BrowserWindow.getAllWindows()
          .find(item => !item.isDestroyed());

        if (!win) {
          log('geen-venster');
          return;
        }

        recovering = true;

        try {
          log('voor-herstel', nativeState(win));

          if (win.isMinimized()) {
            win.restore();
          }

          win.showInactive();
          win.setAlwaysOnTop(true, 'pop-up-menu'); // (the same height as game-mode-main.cjs ON_TOP)
          win.moveTop();

          if (crashed.has(win.webContents.id)) {
            log('renderer-opnieuw-laden');

            setTimeout(() => {
              if (!win.isDestroyed()) {
                win.webContents.reload();
              }
            }, 50);
          } else {
            await inspectUI(
              win,
              'window.__twocodeWindowDebug && ' +
              'window.__twocodeWindowDebug.restore()'
            );

            await snapshot(win);
          }
        } catch (error) {
          log('herstel-fout', {
            message: error.message
          });
        } finally {
          recovering = false;
        }
      }
    );

    log('ready', {
      shortcut: 'shortcuts-main.cjs'
    });
  });
})();
