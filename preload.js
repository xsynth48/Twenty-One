(function preloadBridge() {
  'use strict';

  const { contextBridge, ipcRenderer, webUtils } = require('electron');

  function subscribe(channel, callback) {
    if (typeof callback !== 'function') {
      return () => {};
    }

    const listener = (_event, data) => callback(data);

    ipcRenderer.on(channel, listener);

    return () => ipcRenderer.removeListener(channel, listener);
  }

  contextBridge.exposeInMainWorld('twocode', {
    connect: () => ipcRenderer.invoke('twocode:connect'),
    getConnection: () => ipcRenderer.invoke('twocode:get-connection'),
    getState: () => ipcRenderer.invoke('twocode:get-state'),

    spotifyConnect: () => ipcRenderer.invoke('spotify:connect'),
    spotifyGetState: () => ipcRenderer.invoke('spotify:get-state'),
    spotifyControl: action =>
      ipcRenderer.invoke('spotify:control', action),
    spotifyDevices: () => ipcRenderer.invoke('spotify:devices'),
    lyricsGet: q => ipcRenderer.invoke('lyrics:get', q), // song lyrics from LRCLIB (lyrics-main.cjs)
    spotifyTransfer: id => ipcRenderer.invoke('spotify:transfer', id),
    spotifySeek: positionMs =>
      ipcRenderer.invoke('spotify:seek', positionMs),
    spotifyDisconnect: () =>
      ipcRenderer.invoke('spotify:disconnect'),

    projectGet: () => ipcRenderer.invoke('project:get'),
    projectChoose: () => ipcRenderer.invoke('project:choose'),
    projectRescan: () => ipcRenderer.invoke('project:rescan'),
    projectSearch: query =>
      ipcRenderer.invoke('project:search', { query }),
    projectRead: (file, line = 1) =>
      ipcRenderer.invoke('project:read', { file, line }),

    projectAgentGet: () => ipcRenderer.invoke('project-agent:get'),
  projectAgentOpen: () => ipcRenderer.invoke('project-agent:open'),
  projectAgentSend: message => ipcRenderer.invoke('project-agent:send', { message }),
  projectAgentUndo: () => ipcRenderer.invoke('project-agent:undo'),
  onProjectAgentProgress: callback => subscribe('project-agent:progress', callback),
  projectEditorOpen: file => ipcRenderer.invoke('project-editor:open', { file }),
  projectEditorSend: (file, message) => ipcRenderer.invoke('project-editor:edit', { file, message }),
  projectEditorUndo: file => ipcRenderer.invoke('project-editor:undo', { file }),
  onProjectEditorProgress: callback => subscribe('project-editor:progress', callback),
  projectV2Get: () => ipcRenderer.invoke('projectv2:get'),
    projectV2Choose: () => ipcRenderer.invoke('projectv2:choose'),
    projectV2ListFiles: () =>
      ipcRenderer.invoke('projectv2:list-files'),
    projectV2AiStatus: () =>
      ipcRenderer.invoke('projectv2:ai-status'),
    projectV2ChatGet: file =>
      ipcRenderer.invoke('projectv2:chat-get', { file }),
    projectV2ChatSend: (file, message) =>
      ipcRenderer.invoke('projectv2:chat-send', { file, message }),
    projectV2ChatReset: file =>
      ipcRenderer.invoke('projectv2:chat-reset', { file }),

    aiSettingsGet: () => ipcRenderer.invoke('ai-settings:get'),
    aiSettingsSetProvider: provider =>
      ipcRenderer.invoke('ai-settings:set-provider', provider),
    aiSettingsSetKey: (type, key) =>
      ipcRenderer.invoke('ai-settings:set-key', { type, key }),
    aiSettingsClearKey: type =>
      ipcRenderer.invoke('ai-settings:clear-key', type),
    aiSettingsSetModel: model =>
      ipcRenderer.invoke('ai-settings:set-model', model),
    aiSettingsTest: () =>
      ipcRenderer.invoke('ai-settings:test'),
    aiSettingsChatGPTLogin: () =>
      ipcRenderer.invoke('ai-settings:chatgpt-login'),
    aiSettingsChatGPTCancel: () =>
      ipcRenderer.invoke('ai-settings:chatgpt-cancel'),
    aiSettingsChatGPTLogout: () =>
      ipcRenderer.invoke('ai-settings:chatgpt-logout'),

    aiMonitorGet: () => ipcRenderer.invoke('ai-monitor:get'),
    aiMonitorWindows: () => ipcRenderer.invoke('ai-monitor:windows'),
    aiMonitorConnect: (provider, targetId) => ipcRenderer.invoke('ai-monitor:connect', { provider, targetId }),
    aiMonitorDisconnect: provider => ipcRenderer.invoke('ai-monitor:disconnect', { provider }),
    aiMonitorOpenSource: provider => ipcRenderer.invoke('ai-monitor:open-source', { provider }),
    aiMonitorHooksInstall: agent => ipcRenderer.invoke('ai-monitor:hooks-install', { agent }),
    aiMonitorHooksUninstall: agent => ipcRenderer.invoke('ai-monitor:hooks-uninstall', { agent }),
    // Extras: file tray, calendar, weather, volume, Bluetooth battery
    pathForFile: file => { try { return webUtils.getPathForFile(file); } catch { return ''; } },
    trayGet: () => ipcRenderer.invoke('extras:tray-get'),
    trayAdd: paths => ipcRenderer.invoke('extras:tray-add', { paths }),
    trayRemove: filePath => ipcRenderer.invoke('extras:tray-remove', { path: filePath }),
    trayOpen: filePath => ipcRenderer.invoke('extras:tray-open', { path: filePath }),
    trayDrag: filePath => ipcRenderer.send('extras:tray-drag', filePath),
    extrasConfig: config => ipcRenderer.invoke('extras:config', config),
    calendarNext: () => ipcRenderer.invoke('extras:calendar'),
    weatherNow: () => ipcRenderer.invoke('extras:weather'),
    agendaGet: () => ipcRenderer.invoke('extras:agenda'),
    agendaGoogle: () => ipcRenderer.invoke('extras:google-calendar'),
    agendaAdd: event => ipcRenderer.invoke('extras:agenda-add', event),
    agendaRemove: id => ipcRenderer.invoke('extras:agenda-remove', id),
    musicMeter: on => ipcRenderer.send('music:meter', Boolean(on)),
    onMusicPeak: callback => subscribe('music:peak', callback),
    onVolume: callback => subscribe('extras:volume', callback),
    volumeSet: level => ipcRenderer.invoke('extras:volume-set', { level }),
    volumeGet: () => ipcRenderer.invoke('extras:volume-get'),
    clipsGet: () => ipcRenderer.invoke('extras:clips-get'),
    clipsCopy: index => ipcRenderer.invoke('extras:clips-copy', { index }),
    clipsClear: () => ipcRenderer.invoke('extras:clips-clear'),
    onClips: callback => subscribe('extras:clips', callback),
    noteGet: () => ipcRenderer.invoke('extras:note-get'),
    noteSet: text => ipcRenderer.invoke('extras:note-set', { text }),
    onShortcut: callback => subscribe('extras:shortcut', callback),
    // Settings → General: "Start with Windows" and "Restart" (tray-main.cjs). They were missing here, so the switch
    // jumped straight back off and Restart did nothing (a user reported it).
    loginGet: () => ipcRenderer.invoke('app:login-get'),
    loginSet: on => ipcRenderer.invoke('app:login-set', Boolean(on)),
    restart: () => ipcRenderer.send('app:restart'),
    // ideas from users: the island's size and see-through (main.js, settings-app-main.cjs), CPU and memory for the
    // resting island (system-main.cjs), your own links on Home (links-main.cjs)
    islandScale: scale => ipcRenderer.send('island:scale', Number(scale) || 1),
    islandStyle: style => ipcRenderer.send('island:style', style === 'floating' ? 'floating' : 'attached'),
    systemStats: () => ipcRenderer.invoke('system:stats'),
    netState: () => ipcRenderer.invoke('net:state'), // Wi-Fi and Bluetooth (system-main.cjs, net-ui.js)
    netRadio: (kind, on) => ipcRenderer.invoke('net:radio', kind === 'bt' ? 'bt' : 'wifi', Boolean(on)),
    netOpen: what => ipcRenderer.send('net:open', String(what || '')),
    // Twenty-One Drop: files between the island and your phone (drop-main.cjs, drop-ui.js)
    dropStart: () => ipcRenderer.invoke('drop:start'),
    dropStop: () => ipcRenderer.invoke('drop:stop'),
    dropStatus: () => ipcRenderer.invoke('drop:status'),
    dropShow: () => ipcRenderer.send('drop:show'),
    onDropStatus: callback => subscribe('drop:status', callback),
    onDropEvent: callback => subscribe('drop:event', callback),
    guardConfig: config => ipcRenderer.send('guard:config', config),
    guardStats: () => ipcRenderer.invoke('guard:stats'),
    onGuardEvent: callback => subscribe('guard:event', callback),
    onTextureDemo: callback => subscribe('texture:demo', callback), // the Store's "See it on your island" (texture-ui.js)
    linksGet: () => ipcRenderer.invoke('links:get'),
    linksOpen: url => ipcRenderer.send('links:open', String(url || '')),
    voiceOpen: key => ipcRenderer.invoke('voice:open', String(key || '')), // Robo's voice commands: a well-known site (links-main.cjs)
    onLinks: callback => subscribe('links:changed', callback),
    onGameMode: callback => subscribe('game-mode:changed', callback), // game-mode-main.cjs
    onMusicChanged: callback => subscribe('music:changed', callback), // media-main.cjs: another song, play or pause
    onSeekFailed: callback => subscribe('music:seek-failed', callback), // media-main.cjs: the music app does not let us jump in the song
    gameModeGet: () => ipcRenderer.invoke('game-mode:get'),
    gameModeHide: hide => ipcRenderer.send('game-mode:hide', Boolean(hide)),
    displays: nl => ipcRenderer.invoke('island:displays', Boolean(nl)), // display-main.cjs: the screens, for Settings → Island
    setDisplay: id => ipcRenderer.invoke('island:set-display', String(id || 'main')),
    onBluetooth: callback => subscribe('extras:bluetooth', callback),
    aiMonitorHooksAnswer:(sessionId, answers) => ipcRenderer.invoke('ai-monitor:hooks-answer', { sessionId, answers }),
    aiMonitorHooksPlan: (sessionId, approve, feedback) => ipcRenderer.invoke('ai-monitor:hooks-plan', { sessionId, approve, feedback }),
    aiMonitorHooksJump: sessionId => ipcRenderer.invoke('ai-monitor:hooks-jump', { sessionId }),
    aiMonitorHooksModel: model => ipcRenderer.invoke('ai-monitor:hooks-model', { model }),
    aiMonitorHooksTest: (kind, command) => ipcRenderer.invoke('ai-monitor:hooks-test', { kind, command }),
    aiMonitorHooksReply:(sessionId, text) => ipcRenderer.invoke('ai-monitor:hooks-reply', { sessionId, text }),
    aiMonitorHooksSeen:() => ipcRenderer.invoke('ai-monitor:hooks-seen'),
    aiMonitorHooksDecide:(sessionId, behavior) => ipcRenderer.invoke('ai-monitor:hooks-decide', { sessionId, behavior }),
    aiMonitorReply:(provider, questionId, text) => ipcRenderer.invoke('ai-monitor:reply', { provider, questionId, text }),
    onAiMonitorState: callback => subscribe('ai-monitor:state', callback),
    onAiMonitorOpen: callback => subscribe('ai-monitor:open', callback),

    setIslandInteractive: interactive =>
      ipcRenderer.send('island:set-interactive', interactive),
    setIslandState: state =>
      ipcRenderer.send('island:set-state', state),
    setMode: mode =>
      ipcRenderer.send('window:set-mode', mode),
    openUrl: url =>
      ipcRenderer.send('twocode:open-url', url),
    close: () =>
      ipcRenderer.send('window:close'),
    // Twenty-One's own notifications (notify-ui.js, notice-main.cjs)
    noticeReady: () => ipcRenderer.send('notice:ready'),
    noticeClick: token => ipcRenderer.send('notice:click', token),
    noticeWindows: data => ipcRenderer.send('notice:windows', data),
    noticeCard: data => ipcRenderer.send('notice:card', data),
    noticeCardClose: () => ipcRenderer.send('notice:card-close'),
    onNoticeShow: callback => subscribe('notice:show', callback),
    onNoticeChoice: callback => subscribe('notice:choice', callback),
    // Sign in with Google (google-main.cjs)
    googleStatus: () => ipcRenderer.invoke('google:status'),
    googleSignIn: () => ipcRenderer.invoke('google:sign-in'),
    googleMail: () => ipcRenderer.invoke('google:mail'),
    googleSend: mail => ipcRenderer.invoke('google:send', mail),
    googleOpenMail: tab => ipcRenderer.send('google:open-mail', tab),
    onGoogle: callback => subscribe('google:changed', callback),
    // Other apps' notifications in the island (media-main.cjs, only while you switched it on)
    winNoticesListen: on => ipcRenderer.send('winnotice:listen', Boolean(on)),
    winNoticeHide: id => ipcRenderer.send('winnotice:hide', id),
    winNoticeOpen: appId => ipcRenderer.send('winnotice:open', appId),
    winNoticeSettings: () => ipcRenderer.send('winnotice:settings'),
    onWinNotice: callback => subscribe('winnotice:new', callback),
    onWinNoticeStatus: callback => subscribe('winnotice:status', callback),
    onPointer: callback =>
      subscribe('companion:pointer', callback),
    onGoodbye: callback =>
      subscribe('twocode:goodbye', callback),
    // Robo the buddy (buddy-main.cjs): grab him out of the island and drop him on the screen
    settingsOpen: tab => ipcRenderer.send('settings-app:open', typeof tab === 'string' ? tab : ''), // the Twenty-One app, its own window
    // updates from twocode.nl (auto-update.cjs): what is ready, and "install now" (Twenty-One restarts)
    langMain: code => ipcRenderer.send('lang:main', code), // the tray and dialogs (lang-main.cjs)
    welcomeOpen: () => ipcRenderer.send('welcome:open'), // the welcome tour (welcome-main.cjs)
    updateState: () => ipcRenderer.invoke('update:state'),
    updateInstall: () => ipcRenderer.send('update:install'),
    updateCheck: () => ipcRenderer.invoke('update:check'),
    onUpdateState: callback => subscribe('update:state', callback),
    buddyGrab: info => ipcRenderer.send('buddy:grab', info),
    buddyWarm: () => ipcRenderer.send('buddy:warm'),
    buddyDrop: () => ipcRenderer.send('buddy:drop'),
    buddyFrame: url => ipcRenderer.send('buddy:frame', url),
    // Robo's chat in the island (chat-ui.js)
    // more (beta 129): { see } Settings → Robo sees which app you have open, { rid } this question's id for its streamed words
    buddyAsk: (kind, text, history, lang, more = {}) => ipcRenderer.invoke('buddy:ask', { kind, text, history, lang, ...(typeof more?.see === 'boolean' ? { see: more.see } : {}), ...(more?.rid ? { rid: String(more.rid).slice(0, 40) } : {}) }),
    onRoboDelta: callback => subscribe('robo:delta', callback), // the answer so far, while Robo Plus writes it (beta 129)
    roboSeePref: on => ipcRenderer.send('robo:see-pref', on !== false),
    buddyApply: () => ipcRenderer.invoke('buddy:apply'),
    buddyForget: () => ipcRenderer.send('buddy:forget'),
    buddyAi: () => ipcRenderer.invoke('buddy:ai'),
    buddyUseAi: id => ipcRenderer.invoke('buddy:use-ai', id),
    buddyLogin: () => ipcRenderer.invoke('buddy:login'),
    buddyApplyFix: () => ipcRenderer.invoke('buddy:apply-fix'),
    buddyCancelFix: () => ipcRenderer.send('buddy:cancel-fix'),
    roboSpeak: (text, lang) => ipcRenderer.invoke('robo:speak', text, lang), // Robo's voice: a WAV (media-main.cjs)
    roboListen: () => ipcRenderer.send('robo:listen'),                        // Windows' voice typing in Robo's chat
    // Robo listens himself (speech-main.cjs): is the model there, fetch it once, and your words → text
    roboHearReady: () => ipcRenderer.invoke('robo:hear-ready'),
    roboHearPrepare: () => ipcRenderer.invoke('robo:hear-prepare'),
    onRoboHearProgress: callback => subscribe('robo:hear-progress', callback),
    roboHear: (pcm, lang, levels) => ipcRenderer.invoke('robo:hear', { pcm, lang, levels }),
    // "Robo, do it" (buddy-main.cjs + jarvis-actions.cjs): a plan from your AI, then its steps one by one
    roboDo: (text, history, lang) => ipcRenderer.invoke('robo:do', { text, history, lang }),
    roboDoStep: i => ipcRenderer.invoke('robo:do-step', Number(i)),
    roboDoYes: () => ipcRenderer.send('robo:do-yes'),
    roboDoNo: () => ipcRenderer.send('robo:do-no'),
    // Robo Plus (test, beta 124; robo-plus-main.cjs): Robo does it himself on the screen; his steps come in as they happen
    roboPlus: () => ipcRenderer.invoke('robo:plus'),
    roboAgentStop: () => ipcRenderer.send('robo:agent-stop'),
    roboAgentAnswer: yes => ipcRenderer.send('robo:agent-answer', yes === true),
    onRoboAgent: callback => subscribe('robo:agent', callback),
    // Robo Plus, "write anywhere": the selected text came in (pick what Robo does with it), your choice goes back
    onRoboWrite: callback => subscribe('robo:write', callback),
    roboWritePick: (kind, text) => ipcRenderer.invoke('robo:write-pick', { kind: String(kind || ''), text: String(text || '').slice(0, 500) }),
    roboWriteCancel: () => ipcRenderer.send('robo:write-cancel'),
    onBuddyChat: callback => subscribe('buddy:chat', callback),
    // Robo's chats (beta 128, robo-chats.cjs): up to four, on this PC only; the window in front of you for the eye chip;
    // copying an answer; a link in an answer (http/https) opens in your browser
    roboChats: () => ipcRenderer.invoke('robo:chats'),
    roboChatsSave: (id, messages) => ipcRenderer.send('robo:chats-save', { id: String(id || ''), messages: Array.isArray(messages) ? messages : [] }),
    roboChatsNew: (replace = false, id = '') => ipcRenderer.invoke('robo:chats-new', { replace: replace === true, id: String(id || '') }),
    roboChatsClose: id => ipcRenderer.invoke('robo:chats-close', String(id || '')),
    roboChatsSelect: id => ipcRenderer.invoke('robo:chats-select', String(id || '')),
    roboChatsSee: (id, on) => ipcRenderer.invoke('robo:chats-see', { id: String(id || ''), on: on !== false }),
    roboFront: () => ipcRenderer.invoke('robo:front'),
    roboCopy: text => ipcRenderer.send('robo:copy', String(text || '').slice(0, 100000)),
    roboOpenLink: url => ipcRenderer.send('robo:open-link', String(url || '')),
    settingsFrame: url => ipcRenderer.send('settings-app:frame', url), // the settings app's own Robo
    // packs (license-main.cjs): which paid apps are open
    licenseGet: () => ipcRenderer.invoke('license:get'),
    onLicense: callback => subscribe('license:changed', callback),
    licenseBuy: appId => ipcRenderer.invoke('license:buy', String(appId || '')), // paywall-ui.js: "Unlock Twenty-One"
    licenseTry: email => ipcRenderer.invoke('license:try', String(email || '')), // "Try 1 day free" (beta 64; the e-mail since beta 70)
    onBuddy: callback => {
      subscribe('buddy:home', () => callback('home'));
      subscribe('buddy:mood', data => callback('mood', data));
      subscribe('buddy:collapse', () => callback('collapse'));
      subscribe('buddy:dropped', () => callback('dropped'));
      subscribe('buddy:out', () => callback('out')); // Robo Plus: he flew out to work

    }
  });
})();
