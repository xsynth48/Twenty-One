'use strict';
(function monitorIsland() {
  const api = window.twocode;
  if (!api?.aiMonitorGet) return;
  const names = { chatgpt: 'ChatGPT', claude: 'Claude', claudecode: 'Claude Code', codex: 'Codex' };
  const colours = { running: '#ff9a1f', sending: '#ff9a1f', question: '#ff9a1f', error: '#ff3b3b',
    stopped: '#ff3b3b', unavailable: '#ff3b3b', done: '#22e05a', ready: '#b8c0b5',
    connecting: '#b8c0b5', disconnected: '#7e887a', login: '#7e887a' };
  const labels = { running: 'Bezig', sending: 'Versturen', question: 'Vraag', error: 'Fout', stopped: 'Gestopt',
    unavailable: 'Niet beschikbaar', done: 'Klaar', ready: 'Ready', connecting: 'Verbinden', disconnected: 'Niet verbonden', login: 'Inloggen' };
  let state = { providers: Object.keys(names).map(provider => ({ provider, name: names[provider], state: 'disconnected', detail: 'Verbind jouw gesprek' })) };
  let selected = null, choosing = false, windows = [], error = '', pending = false, lastSignature = '';
  const drafts = new Map();
  const root = document.createElement('section'); root.id = 'twocode-ai-monitor'; document.body.appendChild(root);
  const statusReader = document.createElement('div'); statusReader.id = 'twocode-ai-monitor-status';
  statusReader.setAttribute('role', 'status'); statusReader.setAttribute('aria-live', 'polite'); document.body.appendChild(statusReader);
  const style = document.createElement('style'); style.textContent = `
#twocode-ai-monitor{position:absolute;z-index:60;display:none;color:#f4f7ef;font:12px/1.4 Inter, "Segoe UI", sans-serif;pointer-events:auto;user-select:text}
#twocode-ai-monitor *{box-sizing:border-box}
#twocode-ai-monitor-status{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);pointer-events:none}
#twocode-ai-monitor .am-shell{height:100%;display:flex;flex-direction:column;gap:7px;min-height:0;padding-bottom:4px}
#twocode-ai-monitor .am-head{display:flex;align-items:center;gap:8px;flex:none}
#twocode-ai-monitor .am-head strong{font-size:17px;flex:1}
#twocode-ai-monitor .am-hint{color:#c2ccbd;font-size:11px}
#twocode-ai-monitor button{border:1px solid #394333;border-radius:12px;padding:7px 11px;color:#eef3e8;background:#252c22;font:600 11px Inter, "Segoe UI", sans-serif;cursor:pointer}
#twocode-ai-monitor button:hover{background:#343e2d}
#twocode-ai-monitor button:focus-visible,#twocode-ai-monitor textarea:focus-visible{outline:2px solid #c6e994;outline-offset:2px}
#twocode-ai-monitor button:disabled{opacity:.5;cursor:default}
#twocode-ai-monitor .am-primary{background:#c6e994;color:#172011;border-color:#c6e994}
#twocode-ai-monitor .am-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;align-content:center;flex:1;min-height:0}
#twocode-ai-monitor .am-card{text-align:left;border:1px solid #404939;border-radius:17px;background:#192016;padding:14px;display:flex;flex-direction:column;gap:8px;min-width:0;font-weight:400}
#twocode-ai-monitor .am-card b{font-size:15px}
#twocode-ai-monitor .am-card .am-row{font-weight:600}
#twocode-ai-monitor .am-legend{display:flex;gap:14px;flex:none}
#twocode-ai-monitor .cc-status{display:inline-flex;align-items:center;gap:7px;margin-top:8px;padding:6px 11px;border-radius:14px;background:#121512;border:1px solid rgba(255,255,255,.08);font-weight:700;font-size:11px;white-space:nowrap}
#twocode-ai-monitor .cc-status i{width:8px;height:8px;border-radius:50%;background:var(--lamp);box-shadow:0 0 8px var(--lamp);display:block}
#twocode-ai-monitor .cc-icon{margin-top:6px;width:32px;height:30px;padding:0;font-size:14px}
#twocode-ai-monitor .cc-kicker{margin:6px 0 0;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9aa596}
#twocode-ai-monitor .cc-kicker + .tc-page-title{margin-top:1px}
#twocode-ai-monitor .cc-grid{display:grid;grid-template-columns:168px 1fr;gap:14px;flex:1;min-height:0;align-items:start}
#twocode-ai-monitor .cc-steps{display:flex;flex-direction:column;gap:2px;min-height:0;overflow:hidden;position:relative}
#twocode-ai-monitor .cc-steps::before{content:'';position:absolute;left:9px;top:14px;bottom:44px;width:1px;background:rgba(255,255,255,.08)}
#twocode-ai-monitor .cc-step{display:flex;gap:8px;align-items:flex-start;padding:5px 2px;min-width:0}
#twocode-ai-monitor .cc-step span{display:flex;flex-direction:column;min-width:0}
#twocode-ai-monitor .cc-step em{font-style:normal;font-weight:600;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;gap:6px;align-items:baseline}
#twocode-ai-monitor .cc-step em i{font-style:normal;font-weight:600;font-size:10px;color:#7f8a7a}
#twocode-ai-monitor .cc-step.todo em{color:#5d6858}
#twocode-ai-monitor .cc-step.running em{color:#ffb35c}
#twocode-ai-monitor .cc-step small{color:#7f8a7a;font:10px Consolas,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#twocode-ai-monitor .cc-step.done em{color:#aab4a5}
#twocode-ai-monitor .cc-step b{flex:none;width:19px;height:19px;border-radius:50%;display:grid;place-items:center;font-size:10px;margin-top:0;position:relative;z-index:1;background:#000}
#twocode-ai-monitor .cc-ok{background:#163d22;color:#22e05a}
#twocode-ai-monitor .cc-bad{background:#3d1616;color:#ff5c5c}
#twocode-ai-monitor .cc-dot{border:1.5px solid #2c342a}
#twocode-ai-monitor .cc-spin{border:2px solid rgba(255,154,31,.25);border-top-color:#ff9a1f;animation:cc-spin .8s linear infinite}
@keyframes cc-spin{to{transform:rotate(360deg)}}
#twocode-ai-monitor .cc-limit{margin-top:auto;display:grid;grid-template-columns:1fr auto;gap:4px 8px;font-size:10px;color:#9aa596;padding:6px 2px 2px}
#twocode-ai-monitor .cc-limit b{color:#e8eee4}
#twocode-ai-monitor .cc-limit div{grid-column:1/-1;height:4px;border-radius:3px;background:#232a22;overflow:hidden}
#twocode-ai-monitor .cc-limit i{display:block;height:100%;border-radius:3px}
#twocode-ai-monitor .cc-card{background:linear-gradient(180deg,#121612,#0c0f0c);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:13px 15px;display:flex;flex-direction:column;gap:8px;min-height:0;max-height:100%;overflow:auto;scrollbar-width:thin}
#twocode-ai-monitor .cc-wide{align-items:flex-start}
#twocode-ai-monitor .cc-center{justify-content:center}
#twocode-ai-monitor .cc-label{color:#9aa596;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
#twocode-ai-monitor .cc-big{margin:0;font-size:15px;font-weight:700}
#twocode-ai-monitor .cc-red{color:#ff8a8a}
#twocode-ai-monitor .cc-code{display:block;font:11px/1.45 Consolas,monospace;color:#ffd7ab;background:#151915;border-radius:8px;padding:6px 8px;white-space:pre-wrap;overflow-wrap:anywhere;max-height:56px;overflow:auto}
#twocode-ai-monitor .cc-msg{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.5;flex:1;min-height:0;overflow:auto}
#twocode-ai-monitor .cc-actions{display:flex;gap:8px;align-items:center;margin-top:auto}
#twocode-ai-monitor .cc-actions .am-note{flex:1}
#twocode-ai-monitor .am-ask{margin-bottom:8px}
#twocode-ai-monitor .am-tag{display:inline-block;background:#2a3227;color:#c6e994;border-radius:8px;padding:1px 7px;margin-right:6px;font-size:10px;font-weight:700}
#twocode-ai-monitor .am-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin:8px 0}
#twocode-ai-monitor .cc-solo{grid-template-columns:1fr}
#twocode-ai-monitor .cc-fit{scrollbar-width:none}
#twocode-ai-monitor .cc-fit .am-ask{margin:0}
#twocode-ai-monitor .cc-inline{display:flex;gap:8px;align-items:center}
#twocode-ai-monitor .cc-inline .am-note{flex:1;min-width:0}
#twocode-ai-monitor .cc-inline .am-primary{flex:none;padding:9px 18px}
#twocode-ai-monitor *{scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.16) transparent}
#twocode-ai-monitor ::-webkit-scrollbar{width:6px;height:6px}
#twocode-ai-monitor ::-webkit-scrollbar-track{background:transparent}
#twocode-ai-monitor ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.14);border-radius:3px}
#twocode-ai-monitor ::-webkit-scrollbar-button{display:none}
#twocode-ai-monitor .am-option:hover{border-color:rgba(255,179,92,.6);background:rgba(255,179,92,.08)}
#twocode-ai-monitor .am-option{display:flex;flex-direction:column;align-items:flex-start;gap:3px;text-align:left;font-weight:400;padding:10px 12px;border-radius:12px;min-width:0}
#twocode-ai-monitor .am-option small{color:#aab4a5;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
#twocode-ai-monitor .am-option.on{background:#ff9a1f;color:#1a1206;border-color:#ff9a1f}
#twocode-ai-monitor .am-option.on small{color:#3b2a0f}
#twocode-ai-monitor .am-note{flex:1;min-width:0;border:1px solid #536046;border-radius:10px;padding:6px 9px;background:#141b11;color:#f5f8f1;font:12px Inter, "Segoe UI", sans-serif;width:100%}
#twocode-ai-monitor .am-row .am-note{width:auto}
#twocode-ai-monitor .am-plan{border-left:3px solid #4cc9f0;padding:2px 10px;font-size:12px}
#twocode-ai-monitor .am-plan h4{margin:6px 0 2px;font-size:13px}
#twocode-ai-monitor .am-plan p{margin:2px 0}
#twocode-ai-monitor .am-plan code,#twocode-ai-monitor .am-li code{font:11px Consolas,monospace;color:#ffd7ab}
#twocode-ai-monitor .am-jump{margin-left:auto}
#twocode-ai-monitor .am-jump + .am-quiet{margin-left:0}
#twocode-ai-monitor .am-said{color:#aab4a5;font-size:11px;margin-bottom:3px}
#twocode-ai-monitor .am-question.am-done{border-left-color:#22e05a}
#twocode-ai-monitor .am-usage{flex:none}
#twocode-ai-monitor .am-lead{font-size:13px;margin:0 0 8px}
#twocode-ai-monitor .am-question b{display:block;margin-bottom:4px}
#twocode-ai-monitor .am-question code{display:block;font:11px/1.4 Consolas,monospace;color:#ffd7ab;white-space:pre-wrap;overflow-wrap:anywhere;max-height:70px;overflow:auto}
#twocode-ai-monitor .am-list{margin-top:8px;display:flex;flex-direction:column;gap:4px}
#twocode-ai-monitor .am-item{background:#151a13;border-radius:10px;padding:5px 9px;min-width:0}
#twocode-ai-monitor .am-item b{flex:none;max-width:40%}
#twocode-ai-monitor .am-quiet{margin-left:auto;background:transparent;border-color:transparent;color:#aab4a5}
#twocode-ai-monitor .am-quiet:hover{background:#2a1f1d;color:#ffaba3}
#twocode-ai-monitor .am-row{display:flex;align-items:center;gap:8px;flex:none}
#twocode-ai-monitor .am-dot{width:9px;height:9px;border-radius:50%;background:var(--lamp);box-shadow:0 0 10px color-mix(in srgb,var(--lamp),transparent 50%);display:inline-block;flex:none}
#twocode-ai-monitor .am-blink{animation:am-pulse 1.3s ease-in-out infinite}
#twocode-ai-monitor .am-body{flex:1;min-height:0;overflow:auto;scrollbar-width:thin;scrollbar-color:#536248 transparent}
#twocode-ai-monitor .am-question{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;border-left:3px solid #ffa94b;padding:3px 10px}
#twocode-ai-monitor .am-compose{display:flex;gap:8px;align-items:flex-end;flex:none}
#twocode-ai-monitor textarea{resize:none;flex:1;min-width:0;height:52px;border:1px solid #536046;border-radius:12px;padding:9px;background:#141b11;color:#f5f8f1;font:12px/1.4 Inter, "Segoe UI", sans-serif;user-select:text}
#twocode-ai-monitor .am-error{color:#ffaba3;font-size:11px;overflow-wrap:anywhere;max-height:44px;overflow:auto}
#twocode-ai-monitor .am-track{height:4px;overflow:hidden;border-radius:6px;background:#35402d;flex:none}
#twocode-ai-monitor .am-wave{width:35%;height:100%;background:#ffa94b;animation:am-travel 1.5s ease-in-out infinite}
#twocode-ai-monitor .am-clock{margin-left:auto;color:#d1dacb;font-variant-numeric:tabular-nums;font-size:11px}
#twocode-ai-monitor .am-window{display:block;width:100%;text-align:left;margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#twocode-ai-monitor .am-source{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
@keyframes am-pulse{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes am-travel{0%{transform:translateX(-100%)}100%{transform:translateX(380%)}}
#twocode-ai-monitor .cx-jump{margin-top:10px;display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:12px;background:#151915;border:1px solid rgba(255,255,255,.1);color:#e8eee4;font-size:11px;font-weight:600;white-space:nowrap}
#twocode-ai-monitor .cx-jump:hover{background:#1e241d;border-color:rgba(255,255,255,.22)}
#twocode-ai-monitor .cx-jump span{color:#9aa596}
#twocode-ai-monitor .cx-grid{display:grid;grid-template-columns:1.35fr 1fr;gap:12px;flex:1;min-height:0}
#twocode-ai-monitor .cx-hero{position:relative;display:flex;gap:16px;padding:16px 18px;border-radius:18px;border:1px solid rgba(255,255,255,.07);background:linear-gradient(160deg,#151a15,#0b0d0b);min-height:0;overflow:hidden}
#twocode-ai-monitor .cx-hero::before{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 0% 0%,var(--glow,transparent),transparent 60%);opacity:.18}
#twocode-ai-monitor .cx-orange{--glow:#ff9a1f}
#twocode-ai-monitor .cx-green{--glow:#22e05a}
#twocode-ai-monitor .cx-red{--glow:#ff3b3b}
#twocode-ai-monitor .cx-light{position:relative;flex:none;align-self:flex-start;display:flex;flex-direction:column;gap:6px;padding:7px 6px;border-radius:14px;background:#050605;border:1px solid rgba(255,255,255,.08)}
#twocode-ai-monitor .cx-light i{display:block;width:14px;height:14px;border-radius:50%;opacity:.16;transition:opacity .3s}
#twocode-ai-monitor .cx-light .red{background:#ff3b3b}
#twocode-ai-monitor .cx-light .orange{background:#ff9a1f}
#twocode-ai-monitor .cx-light .green{background:#22e05a}
#twocode-ai-monitor .cx-light i.on{opacity:1;box-shadow:0 0 12px currentColor}
#twocode-ai-monitor .cx-light .red.on{color:#ff3b3b}
#twocode-ai-monitor .cx-light .orange.on{color:#ff9a1f}
#twocode-ai-monitor .cx-light .green.on{color:#22e05a}
#twocode-ai-monitor .cx-light i.blink{animation:am-pulse 1.1s ease-in-out infinite}
#twocode-ai-monitor .cx-main{position:relative;flex:1;min-width:0;display:flex;flex-direction:column;gap:7px;min-height:0}
#twocode-ai-monitor .cx-label{display:flex;align-items:center;gap:8px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9aa596}
#twocode-ai-monitor .cx-label em{font-style:normal;color:#c2ccbd}
#twocode-ai-monitor .cx-label em.orange{color:#ffb35c}
#twocode-ai-monitor .cx-label em.green{color:#5ee88a}
#twocode-ai-monitor .cx-label em.red{color:#ff8a8a}
#twocode-ai-monitor .cx-label span{letter-spacing:0;text-transform:none;font-weight:600}
#twocode-ai-monitor .cx-timer{font-variant-numeric:tabular-nums;color:#e8eee4}
#twocode-ai-monitor .cx-title{margin:0;font-size:18px;font-weight:700;line-height:1.25;color:#fff;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
#twocode-ai-monitor .cx-code{display:block;font:11px/1.4 Consolas,monospace;color:#ffd7ab;background:rgba(255,255,255,.05);border-radius:8px;padding:5px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#twocode-ai-monitor .cx-prompt{margin-top:auto;display:flex;flex-direction:column;gap:2px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06)}
#twocode-ai-monitor .cx-prompt span{font-size:10px;font-weight:700;color:#7f8a7a;letter-spacing:.06em;text-transform:uppercase}
#twocode-ai-monitor .cx-prompt q{font-size:12px;color:#c2ccbd;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;quotes:'“' '”'}
#twocode-ai-monitor .cx-msg{flex:1;min-height:0;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font-size:12.5px;line-height:1.5;color:#eef3e8;padding-right:4px}
#twocode-ai-monitor .cx-compose textarea{height:38px;padding:9px 10px;border-radius:11px;background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.12)}
#twocode-ai-monitor .cx-compose .am-primary{padding:9px 16px}
#twocode-ai-monitor .cx-side{display:flex;flex-direction:column;gap:6px;padding:12px 12px 10px;border-radius:18px;border:1px solid rgba(255,255,255,.07);background:#0d100d;min-height:0;min-width:0}
#twocode-ai-monitor .cx-side-head{display:flex;justify-content:space-between;align-items:baseline;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9aa596;padding:0 2px}
#twocode-ai-monitor .cx-side-head small{letter-spacing:0;text-transform:none;font-weight:600;color:#7f8a7a}
#twocode-ai-monitor .cx-feed{flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column;gap:2px;-webkit-mask-image:linear-gradient(#000 78%,transparent);mask-image:linear-gradient(#000 78%,transparent)}
#twocode-ai-monitor .cx-step{display:flex;align-items:center;gap:9px;padding:4px 2px;min-width:0}
#twocode-ai-monitor .cx-ico{flex:none;width:26px;height:26px;border-radius:8px;display:grid;place-items:center;background:rgba(255,255,255,.05);color:#c2ccbd}
#twocode-ai-monitor .cx-step.running .cx-ico{background:rgba(255,154,31,.14);color:#ffb35c}
#twocode-ai-monitor .cx-txt{flex:1;min-width:0;display:flex;flex-direction:column}
#twocode-ai-monitor .cx-txt em{font-style:normal;font-size:11.5px;font-weight:600;color:#e8eee4}
#twocode-ai-monitor .cx-step.done .cx-txt em{color:#aab4a5}
#twocode-ai-monitor .cx-txt small{font:10px Consolas,monospace;color:#7f8a7a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#twocode-ai-monitor .cx-step > b{flex:none;width:16px;height:16px;border-radius:50%;display:grid;place-items:center;font-size:9px}
#twocode-ai-monitor .cx-ok{color:#22e05a;background:rgba(34,224,90,.12)}
#twocode-ai-monitor .cx-bad{color:#ff5c5c;background:rgba(255,92,92,.12)}
#twocode-ai-monitor .cx-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#5d6858;font-size:11px;text-align:center}
#twocode-ai-monitor .cx-limit{display:flex;flex-direction:column;gap:4px;padding:8px 2px 0;border-top:1px solid rgba(255,255,255,.06);font-size:10.5px;color:#9aa596}
#twocode-ai-monitor .cx-limit > div:first-child{display:flex;justify-content:space-between}
#twocode-ai-monitor .cx-limit b{color:#e8eee4}
#twocode-ai-monitor .cx-limit small{font-size:9.5px;color:#7f8a7a}
#twocode-ai-monitor .cx-bar{height:4px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden}
#twocode-ai-monitor .cx-bar i{display:block;height:100%;border-radius:3px}
#twocode-ai-monitor .cx-others{flex:none;font-size:10.5px;color:#9aa596;padding:0 4px}
#twocode-ai-monitor .tc-page-head > .ch-head-right{flex:none}
#twocode-ai-monitor .ch-head-right{display:flex;align-items:center;gap:8px;margin-top:10px}
#twocode-ai-monitor .ch-head-right .cx-jump{margin-top:0}
#twocode-ai-monitor .ch-status{display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border-radius:12px;background:#121512;border:1px solid rgba(255,255,255,.08);font-weight:700;font-size:11px;white-space:nowrap}
#twocode-ai-monitor .ch-status i{width:8px;height:8px;border-radius:50%;background:var(--lamp);box-shadow:0 0 8px var(--lamp);display:block}
#twocode-ai-monitor .ch-status b{font-weight:600;color:#c2ccbd;font-variant-numeric:tabular-nums}
#twocode-ai-monitor .ch-chat{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column-reverse;padding:2px 6px 6px 0}
#twocode-ai-monitor .ch-inner{display:flex;flex-direction:column;gap:8px}
#twocode-ai-monitor .ch-row{display:flex;align-items:flex-end;gap:8px;min-width:0}
#twocode-ai-monitor .ch-row.me{justify-content:flex-end}
#twocode-ai-monitor .ch-avatar{flex:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:#22291f;color:#c6e994;border:1px solid rgba(198,233,148,.2)}
#twocode-ai-monitor .ch-bubble{max-width:78%;padding:9px 13px;border-radius:16px 16px 16px 5px;background:#171c17;border:1px solid rgba(255,255,255,.07);font-size:12.5px;line-height:1.5;color:#eef3e8;white-space:pre-wrap;overflow-wrap:anywhere;min-width:0}
#twocode-ai-monitor .ch-bubble.me{border-radius:16px 16px 5px 16px;background:#2b3a26;border-color:rgba(198,233,148,.18);color:#f2f7ec}
#twocode-ai-monitor .ch-bubble.wide{max-width:none;flex:1;white-space:normal}
#twocode-ai-monitor .ch-bubble.ask{border-color:rgba(255,154,31,.45);background:#1d1810}
#twocode-ai-monitor .ch-bubble.error{border-color:rgba(255,92,92,.4);background:#1d1111;white-space:normal}
#twocode-ai-monitor .ch-bubble.typing{display:flex;align-items:center;gap:10px;white-space:normal}
#twocode-ai-monitor .ch-bubble .cc-actions{margin-top:8px}
#twocode-ai-monitor .ch-bubble .cx-code{margin-top:6px}
#twocode-ai-monitor .ch-label{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#ffb35c;margin-bottom:4px}
#twocode-ai-monitor .ch-dim{color:#9aa596}
#twocode-ai-monitor .ch-typing{display:inline-flex;gap:3px}
#twocode-ai-monitor .ch-typing i{width:6px;height:6px;border-radius:50%;background:#ffb35c;animation:ch-dot 1.2s ease-in-out infinite}
#twocode-ai-monitor .ch-typing i:nth-child(2){animation-delay:.15s}
#twocode-ai-monitor .ch-typing i:nth-child(3){animation-delay:.3s}
@keyframes ch-dot{0%,60%,100%{opacity:.25;transform:none}30%{opacity:1;transform:translateY(-3px)}}
#twocode-ai-monitor .ch-steps{display:flex;flex-direction:column;gap:1px;margin:0 0 0 32px;padding:2px 0 2px 10px;border-left:1.5px solid rgba(255,255,255,.08)}
#twocode-ai-monitor .ch-step{display:flex;align-items:center;gap:7px;font-size:11px;color:#9aa596;min-width:0;padding:2px 0}
#twocode-ai-monitor .ch-step .ch-ico{flex:none;display:grid;place-items:center;color:#7f8a7a}
#twocode-ai-monitor .ch-step.running .ch-ico,#twocode-ai-monitor .ch-step.running em{color:#ffb35c}
#twocode-ai-monitor .ch-step em{font-style:normal;font-weight:600;flex:none}
#twocode-ai-monitor .ch-step small{font:10.5px Consolas,monospace;color:#6f7a6b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1}
#twocode-ai-monitor .ch-step > b{flex:none;width:14px;height:14px;border-radius:50%;display:grid;place-items:center;font-size:8px}
#twocode-ai-monitor .ch-step > b.cc-spin{border-width:1.5px}
#twocode-ai-monitor .ch-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:#7f8a7a;text-align:center;font-size:11.5px}
#twocode-ai-monitor .ch-empty svg{color:#c6e994;margin-bottom:4px}
#twocode-ai-monitor .ch-empty b{color:#eef3e8;font-size:14px}
#twocode-ai-monitor .ch-compose{flex:none;display:flex;gap:8px;align-items:center;padding:6px;border-radius:16px;background:#111411;border:1px solid rgba(255,255,255,.09)}
#twocode-ai-monitor .ch-compose textarea{height:34px;border:0;background:transparent;padding:8px 8px;font-size:12.5px}
#twocode-ai-monitor .ch-compose textarea:focus-visible{outline:none}
#twocode-ai-monitor .ch-compose .am-primary{border-radius:11px;padding:8px 16px}
#twocode-ai-monitor .ch-foot{flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:10.5px;color:#7f8a7a;padding:2px 4px}
#twocode-ai-monitor .ch-limit{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
#twocode-ai-monitor .ch-limit b{color:#e8eee4}
#twocode-ai-monitor .ch-limit i{display:block;width:70px;height:4px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden}
#twocode-ai-monitor .ch-limit s{display:block;height:100%;border-radius:3px}
#twocode-ai-monitor .ch-summary{margin:2px 0 0 32px;padding:10px 12px;border-radius:14px;background:linear-gradient(180deg,#131813,#0e110e);border:1px solid rgba(255,255,255,.08);display:flex;flex-direction:column;gap:7px}
#twocode-ai-monitor .ch-sum-head{display:flex;justify-content:space-between;align-items:center;font-size:11px}
#twocode-ai-monitor .ch-sum-title{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9aa596}
#twocode-ai-monitor .ch-sum-head .ok{color:#5ee88a}
#twocode-ai-monitor .ch-sum-head .ask{color:#ffb35c}
#twocode-ai-monitor .ch-sum-head .bad{color:#ff8a8a}
#twocode-ai-monitor .ch-sum-chips{display:flex;flex-wrap:wrap;gap:6px}
#twocode-ai-monitor .ch-sum-chips span{display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:9px;background:rgba(255,255,255,.05);font-size:11px;color:#dfe7da}
#twocode-ai-monitor .ch-sum-chips svg{color:#9aa596}
#twocode-ai-monitor .ch-sum-files{display:flex;flex-wrap:wrap;align-items:center;gap:5px}
#twocode-ai-monitor .ch-sum-files small{font-size:10px;color:#7f8a7a;margin-right:2px}
#twocode-ai-monitor .ch-sum-files code{font:10.5px Consolas,monospace;color:#ffd7ab;background:rgba(255,215,171,.07);border-radius:6px;padding:2px 6px}
#twocode-ai-monitor .am-shell{position:relative}
#twocode-ai-monitor .ch-model{display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border-radius:12px;background:#121512;border:1px solid rgba(255,255,255,.08);font-size:11px;font-weight:700;color:#e8eee4;white-space:nowrap}
#twocode-ai-monitor .ch-model svg{color:#c6e994}
#twocode-ai-monitor .ch-model span{color:#7f8a7a;font-size:9px}
#twocode-ai-monitor .ch-model-menu{position:absolute;top:50px;right:0;z-index:20;width:420px;padding:8px;border-radius:16px;background:#101310;border:1px solid rgba(255,255,255,.12);box-shadow:0 18px 40px rgba(0,0,0,.6);display:grid;grid-template-columns:1fr 1fr;gap:4px}
#twocode-ai-monitor .ch-model-menu .ch-model-head,#twocode-ai-monitor .ch-model-menu p{grid-column:1/-1}
#twocode-ai-monitor .ch-model-head{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:2px 8px 4px;font-size:11px;font-weight:700;color:#fff}
#twocode-ai-monitor .ch-model-head small{font-weight:500;color:#9aa596;font-size:10px}
#twocode-ai-monitor .ch-model-menu button{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:1px;text-align:left;padding:6px 26px 6px 10px;min-width:0;border:1px solid transparent;border-radius:11px;background:transparent;font-weight:400}
#twocode-ai-monitor .ch-model-menu button:hover{background:rgba(255,255,255,.05)}
#twocode-ai-monitor .ch-model-menu button.on{background:rgba(198,233,148,.09);border-color:rgba(198,233,148,.25)}
#twocode-ai-monitor .ch-model-menu button b{font-size:12px}
#twocode-ai-monitor .ch-model-menu button small{font-size:10px;line-height:1.3;color:#9aa596}
#twocode-ai-monitor .ch-model-menu button i{position:absolute;right:11px;top:50%;transform:translateY(-50%);font-style:normal;color:#c6e994;font-weight:700}
#twocode-ai-monitor .ch-model-menu p{margin:4px 8px 2px;font-size:10px;color:#7f8a7a}
#twocode-ai-monitor .ch-model-menu code{font:10px Consolas,monospace;color:#ffd7ab}
#twocode-ai-monitor .am-picks{display:flex;gap:4px;padding:3px;margin:0 0 8px;border-radius:12px;background:#111411;border:1px solid rgba(255,255,255,.07);width:max-content}
#twocode-ai-monitor .am-pick{display:flex;align-items:center;gap:6px;border:0;background:transparent;color:#9aa596;padding:5px 11px;border-radius:9px;font:600 11px Inter, "Segoe UI", sans-serif;cursor:pointer}
#twocode-ai-monitor .am-pick:hover{color:#fff}
#twocode-ai-monitor .am-pick.on{background:#262d24;color:#fff}
#twocode-ai-monitor .am-pick i{width:7px;height:7px;border-radius:50%;background:var(--lamp);box-shadow:0 0 6px var(--lamp)}
/* on Robo's stage (Claude Code / Codex): the chat look, Robo bottom left */
#twocode-ai-monitor.cc-stage .am-shell{padding:8px 14px 10px 96px;gap:8px}
#twocode-ai-monitor.cc-stage .tc-page-head{align-items:center;margin:0;justify-content:space-between}
#twocode-ai-monitor.cc-stage .tc-page-head > .cc-pill{flex:0 1 auto;margin-right:auto}
#twocode-ai-monitor .cc-pill{display:inline-flex;align-items:center;gap:7px;padding:5px 12px;border-radius:999px;background:rgba(255,255,255,.1);font:600 12px Inter, "Segoe UI", sans-serif;color:#fff;max-width:340px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#twocode-ai-monitor .cc-pill i{width:8px;height:8px;border-radius:50%;background:var(--lamp);box-shadow:0 0 8px var(--lamp);flex:none}
#twocode-ai-monitor .cc-pill span{color:rgba(255,255,255,.55);font-weight:500}
#twocode-ai-monitor.cc-stage .ch-head-right{margin-top:0}
#twocode-ai-monitor.cc-stage .ch-model,#twocode-ai-monitor.cc-stage .ch-status,#twocode-ai-monitor.cc-stage .cx-jump{background:rgba(255,255,255,.09);border:0;border-radius:999px;padding:6px 12px}
#twocode-ai-monitor.cc-stage .ch-model svg{color:#ffc29a}
#twocode-ai-monitor.cc-stage .ch-model-menu{background:#1c120d;border-color:rgba(255,170,120,.18)}
#twocode-ai-monitor.cc-stage .ch-model-menu button.on{background:rgba(255,154,90,.14);border-color:rgba(255,154,90,.35)}
#twocode-ai-monitor.cc-stage .ch-model-menu button i{color:#ffb07a}
#twocode-ai-monitor.cc-stage .ch-chat{padding:0 6px 0 0}
#twocode-ai-monitor.cc-stage .ch-inner{gap:10px}
#twocode-ai-monitor.cc-stage .ch-avatar{display:none}
#twocode-ai-monitor.cc-stage .ch-bubble{font:13.5px/1.5 Inter, "Segoe UI", sans-serif}
#twocode-ai-monitor.cc-stage .ch-bubble:not(.me):not(.ask):not(.error):not(.wide){background:none;border:0;padding:0 2px;max-width:100%;color:#f6efe9}
#twocode-ai-monitor.cc-stage .ch-bubble.me{background:rgba(255,255,255,.13);border:0;border-radius:14px;padding:7px 14px;font-weight:600;font-size:13px;max-width:75%}
#twocode-ai-monitor.cc-stage .ch-bubble.ask{background:rgba(255,154,31,.13);border:1px solid rgba(255,179,92,.35);border-radius:14px}
#twocode-ai-monitor.cc-stage .ch-bubble.wide{background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.08);border-radius:14px}
#twocode-ai-monitor.cc-stage .ch-bubble.error{background:rgba(255,92,92,.12);border:1px solid rgba(255,120,120,.3);border-radius:14px}
#twocode-ai-monitor.cc-stage .ch-bubble.typing{background:none;border:0;padding:0 2px}
#twocode-ai-monitor.cc-stage .ch-typing i{background:#ffb07a}
#twocode-ai-monitor.cc-stage .ch-steps{margin:0;border-left-color:rgba(255,255,255,.12)}
#twocode-ai-monitor.cc-stage .ch-step{color:rgba(255,236,226,.62)}
#twocode-ai-monitor.cc-stage .ch-step small{color:rgba(255,236,226,.45)}
#twocode-ai-monitor.cc-stage .ch-summary{margin:0;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.08);border-radius:14px}
#twocode-ai-monitor.cc-stage .ch-sum-chips span{background:rgba(255,255,255,.08);color:#fff3ea}
#twocode-ai-monitor.cc-stage .ch-sum-files code{background:rgba(255,190,150,.12);color:#ffd1b0}
#twocode-ai-monitor.cc-stage .ch-compose{background:rgba(255,255,255,.08);border:0;border-radius:12px;padding:3px 4px 3px 6px}
#twocode-ai-monitor.cc-stage .ch-compose textarea{background:transparent;border:0;color:#fff}
#twocode-ai-monitor.cc-stage .ch-compose .am-primary{background:#fff;color:#1a1310;border:0;border-radius:999px;padding:7px 16px}
#twocode-ai-monitor.cc-stage .ch-foot{color:rgba(255,236,226,.55)}
#twocode-ai-monitor.cc-stage .am-primary{background:#ffb07a;border-color:#ffb07a;color:#2a1508}
#twocode-ai-monitor.cc-stage .ch-empty{color:rgba(255,236,226,.6)}#twocode-ai-monitor.cc-stage .ch-empty svg{color:#ffb07a}
#twocode-ai-monitor .ch-bubble.md{white-space:normal}
#twocode-ai-monitor .ch-bubble.md p{margin:0 0 8px}#twocode-ai-monitor .ch-bubble.md p:last-child{margin-bottom:0}
#twocode-ai-monitor .ch-bubble.md ul,#twocode-ai-monitor .ch-bubble.md ol{margin:2px 0 8px;padding-left:20px}#twocode-ai-monitor .ch-bubble.md li{margin:2px 0}
#twocode-ai-monitor .ch-bubble.md code{font:12px "Cascadia Code",Consolas,monospace;background:rgba(255,255,255,.1);border-radius:5px;padding:1px 5px;color:#ffe2cc}
#twocode-ai-monitor .ch-bubble.md pre{margin:4px 0 8px;padding:8px 11px;border-radius:10px;background:rgba(0,0,0,.32);border:1px solid rgba(255,255,255,.08);font:12px/1.5 "Cascadia Code",Consolas,monospace;color:#ffe6d4;white-space:pre-wrap;overflow-wrap:anywhere}
#twocode-ai-monitor .ch-bubble.md b{color:#fff}
/* the model menu: one clean list, the current one with a check */
#twocode-ai-monitor .ch-model-menu{top:40px;width:340px;padding:5px;border-radius:14px;background:#1c140f;border:1px solid rgba(255,190,150,.16);box-shadow:0 22px 50px rgba(0,0,0,.65);grid-template-columns:1fr;gap:2px}
#twocode-ai-monitor .ch-model-head{padding:5px 10px 4px;font:700 11.5px Inter, "Segoe UI", sans-serif;flex-direction:column;align-items:flex-start;gap:1px}
#twocode-ai-monitor .ch-model-head small{color:rgba(255,236,226,.5)}
#twocode-ai-monitor .ch-model-menu button{flex-direction:row;align-items:center;gap:10px;padding:6px 30px 6px 10px;border-radius:10px;font-family:Inter, "Segoe UI", sans-serif}
#twocode-ai-monitor .ch-model-menu button b{font-size:12.5px;min-width:70px;color:#fff}
#twocode-ai-monitor .ch-model-menu button small{font-size:11px;color:rgba(255,236,226,.55);line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
#twocode-ai-monitor .ch-model-menu button:hover{background:rgba(255,255,255,.07)}
#twocode-ai-monitor .ch-model-menu button.on{background:rgba(255,160,100,.16);border-color:transparent}
#twocode-ai-monitor .ch-model-menu button i{color:#ffb07a;font-size:13px}
#twocode-ai-monitor .ch-model-menu p{margin:2px 10px 3px;padding-top:5px;border-top:1px solid rgba(255,255,255,.07);font:10.5px Inter, "Segoe UI", sans-serif;color:rgba(255,236,226,.45)}
/* the reply box: like the chat's */
#twocode-ai-monitor .ch-compose{align-items:center;border-radius:14px;padding:4px 5px 4px 6px}
#twocode-ai-monitor .ch-compose textarea{height:32px;padding:7px 8px;font:13px Inter, "Segoe UI", sans-serif;caret-color:#ffc29a}
#twocode-ai-monitor .ch-compose:focus-within{box-shadow:inset 0 0 0 1px rgba(255,176,122,.5)}
#twocode-ai-monitor .ch-compose #am-send{width:30px;height:30px;padding:0;border-radius:50%;background:#fff;color:#1a1310;border:0;font:700 15px Inter, "Segoe UI", sans-serif;flex:none}
#twocode-ai-monitor .ch-compose #am-send:disabled{opacity:.4}
#twocode-ai-monitor.cc-codex .ch-typing i,#twocode-ai-monitor.cc-codex .am-primary{background:#7fb6ff;border-color:#7fb6ff;color:#06182e}
#twocode-ai-monitor.cc-codex .ch-bubble.ask{background:rgba(59,130,246,.14);border-color:rgba(127,182,255,.4)}
#twocode-ai-monitor.cc-codex .ch-compose:focus-within{box-shadow:inset 0 0 0 1px rgba(127,182,255,.55)}
#twocode-ai-monitor.cc-codex .ch-bubble.md code{color:#dbeaff}
#twocode-ai-monitor .ch-hist-title{font:700 10.5px Inter, "Segoe UI", sans-serif;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,236,226,.5);margin:2px 2px 0}
#twocode-ai-monitor .ch-hist{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.05);min-width:0}
#twocode-ai-monitor .ch-hist:hover{background:rgba(255,255,255,.09)}
#twocode-ai-monitor .ch-hist div{flex:1;min-width:0;display:flex;flex-direction:column}
#twocode-ai-monitor .ch-hist b{font:600 12.5px Inter, "Segoe UI", sans-serif;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#twocode-ai-monitor .ch-hist small{font:11px Inter, "Segoe UI", sans-serif;color:rgba(255,236,226,.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#twocode-ai-monitor .ch-hist-mark{flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:800;background:rgba(255,255,255,.08);color:#fff}
#twocode-ai-monitor .ch-hist-mark.done{background:rgba(94,232,138,.16);color:#7ef0a4}
#twocode-ai-monitor .ch-hist-mark.question{background:rgba(255,179,92,.18);color:#ffc27a}
#twocode-ai-monitor .ch-hist-mark.error{background:rgba(255,92,92,.16);color:#ff9a9a}
#twocode-ai-monitor .ch-hist i{flex:none;font:600 11px Inter, "Segoe UI", sans-serif;font-style:normal;color:rgba(255,236,226,.55)}
#twocode-ai-monitor .ch-hist i.done{color:#7ef0a4}#twocode-ai-monitor .ch-hist i.question{color:#ffc27a}#twocode-ai-monitor .ch-hist i.error{color:#ff9a9a}
/* ---- the Claude page as a Live Activity: right on the black, no cards (Claude orange, Codex blue) ---- */
#twocode-ai-monitor.cl-new{--acc:#ff9230;--ok:#30d158;--bad:#ff4245;--ask:#ffd600;--g:#8e8e93;--g1:#1c1c1e;--g2:#2c2c2e;--g3:#3a3a3c;font-family:Inter,"Segoe UI",sans-serif;color:#fff}
#twocode-ai-monitor.cl-new.cc-codex{--acc:#0091ff}
#twocode-ai-monitor.cl-new .am-shell{padding:0 16px 10px;gap:0}
#twocode-ai-monitor .lv-top{display:flex;align-items:center;gap:8px;height:22px;font-size:15px;font-weight:600;color:var(--tone,var(--acc))}
#twocode-ai-monitor .lv-hero{display:flex;align-items:center;gap:18px;margin-top:2px}
#twocode-ai-monitor .lv-ring{position:relative;flex:none;width:76px;height:76px}
#twocode-ai-monitor .lv-ring > svg{position:absolute;left:0;top:0;width:100%;height:100%;transform:rotate(-90deg)}
#twocode-ai-monitor .lv-ring circle{fill:none;stroke-width:8;stroke-linecap:round}
#twocode-ai-monitor .lv-ring i{position:absolute;inset:0;display:grid;place-items:center;color:var(--tone)}
#twocode-ai-monitor .lv-hero > div:not(.lv-ring){flex:1;min-width:0}
#twocode-ai-monitor .lv-who{font-size:15px;font-weight:600;color:var(--tone);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#twocode-ai-monitor .lv-hero .lv-title{font-size:26px;line-height:30px;font-weight:700}
#twocode-ai-monitor .lv-hero .lv-sub{margin-top:2px}
#twocode-ai-monitor .lv-clock{flex:none;align-self:flex-start;margin-top:2px;font-size:20px;font-weight:700;color:var(--tone);font-variant-numeric:tabular-nums}
#twocode-ai-monitor .lv-top svg{flex:none}
#twocode-ai-monitor .lv-top .lv-time{margin-left:auto;font-variant-numeric:tabular-nums}
#twocode-ai-monitor .lv-main{display:flex;align-items:flex-end;gap:16px;margin-top:10px}
#twocode-ai-monitor .lv-main > div{flex:1;min-width:0}
#twocode-ai-monitor .lv-title{margin:0;font-size:28px;line-height:32px;font-weight:650;letter-spacing:-.35px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#twocode-ai-monitor .lv-sub{margin:3px 0 0;font-size:15px;line-height:20px;color:var(--g);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#twocode-ai-monitor .lv-sub code,#twocode-ai-monitor .lv-mono{font:500 13px "Cascadia Mono",Consolas,monospace}
#twocode-ai-monitor .lv-btns{flex:none;display:flex;gap:8px}
#twocode-ai-monitor.cl-new button{border:0;border-radius:22px;height:36px;padding:0 14px;background:var(--g2);color:#fff;font:600 13px Inter,"Segoe UI",sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
#twocode-ai-monitor.cl-new button:hover{background:var(--g3)}
#twocode-ai-monitor.cl-new button:active{transform:scale(.97);transition:transform .1s ease-out}
#twocode-ai-monitor.cl-new .am-primary{background:#fff;color:#000}
#twocode-ai-monitor.cl-new .am-primary:hover{background:#e5e5ea}
#twocode-ai-monitor .lv-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;margin-top:14px}
#twocode-ai-monitor .lv-steps i{display:block;height:6px;border-radius:3px;background:var(--g3);overflow:hidden}
#twocode-ai-monitor .lv-steps i.d{background:#fff}#twocode-ai-monitor .lv-steps.done i{background:var(--ok)}
#twocode-ai-monitor .lv-steps i.n s{display:block;height:100%;width:40%;border-radius:3px;background:var(--tone,var(--acc));animation:lv-run 1.6s ease-in-out infinite}
@keyframes lv-run{50%{width:80%}}
#twocode-ai-monitor .lv-steps span{font-size:12px;font-weight:600;color:var(--g);margin-top:7px}
#twocode-ai-monitor .lv-steps span.n{color:#fff}
#twocode-ai-monitor .lv-list{flex:1;min-height:0;overflow:auto;margin-top:12px;scrollbar-width:none}
#twocode-ai-monitor .lv-cap{font-size:13px;font-weight:600;color:var(--g);margin:2px 0 2px}
#twocode-ai-monitor .lv-row{display:flex;align-items:center;gap:12px;height:36px;border-bottom:1px solid var(--g2)}
#twocode-ai-monitor .lv-row:last-child{border-bottom:0}
#twocode-ai-monitor .lv-ic{flex:none;width:24px;height:24px;border-radius:7px;display:grid;place-items:center;background:var(--g2);color:#fff}
#twocode-ai-monitor .lv-row b{flex:1;min-width:0;font:500 13px "Cascadia Mono",Consolas,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#twocode-ai-monitor .lv-row em{font-style:normal;font-size:13px;color:var(--g)}
#twocode-ai-monitor .lv-row em.run{color:var(--acc)}#twocode-ai-monitor .lv-row em.bad{color:var(--bad)}
#twocode-ai-monitor .lv-answer{font-size:15px;line-height:22px;color:#fff;white-space:normal}
#twocode-ai-monitor .lv-answer p{margin:0 0 8px}#twocode-ai-monitor .lv-answer p:last-child{margin:0}
#twocode-ai-monitor .lv-answer code{font:13px "Cascadia Mono",Consolas,monospace;background:var(--g2);border-radius:6px;padding:1px 6px}
#twocode-ai-monitor .lv-answer pre{margin:4px 0 8px;padding:10px 12px;border-radius:12px;background:var(--g1);font:12.5px/1.5 "Cascadia Mono",Consolas,monospace;white-space:pre-wrap}
#twocode-ai-monitor .lv-limit{flex:none;display:flex;align-items:center;gap:10px;height:26px;font-size:12px;font-weight:600;color:var(--g)}
#twocode-ai-monitor .lv-limit i{flex:1;max-width:220px;height:4px;border-radius:2px;background:var(--g3);overflow:hidden}
#twocode-ai-monitor .lv-limit s{display:block;height:100%;background:#fff}
#twocode-ai-monitor .lv-limit .ch-compose{flex:1}
/* Claude needs you: a question, a plan or a permission, with two same-size buttons */
#twocode-ai-monitor .lv-ask{flex:1;min-height:0;display:flex;flex-direction:column;margin-top:8px}
#twocode-ai-monitor .lv-ask h3{margin:0;font-size:22px;line-height:28px;font-weight:650;letter-spacing:-.3px}
#twocode-ai-monitor .lv-cmd{margin-top:10px;min-height:44px;border-radius:14px;background:var(--g1);display:flex;align-items:center;gap:10px;padding:10px 16px;font:500 14px "Cascadia Mono",Consolas,monospace;white-space:pre-wrap;word-break:break-all;max-height:84px;overflow:auto}
#twocode-ai-monitor .lv-two{margin-top:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding-top:12px}
#twocode-ai-monitor.cl-new .lv-two button{height:44px;font-size:15px;justify-content:center;border-radius:22px}
#twocode-ai-monitor .lv-scroll{flex:1;min-height:0;overflow:auto;margin-top:8px;font-size:14px;line-height:21px;scrollbar-width:none}
#twocode-ai-monitor.cl-new .am-option{display:flex;flex-direction:column;align-items:flex-start;height:auto;min-height:44px;width:100%;padding:8px 14px;border-radius:14px;background:var(--g1);text-align:left;margin-top:6px}
#twocode-ai-monitor.cl-new .am-option.on{background:#fff;color:#000}
#twocode-ai-monitor.cl-new .am-option small{font-weight:500;color:var(--g)}#twocode-ai-monitor.cl-new .am-option.on small{color:#3a3a3c}
#twocode-ai-monitor.cl-new .am-note{height:40px;border:0;border-radius:20px;background:var(--g1);color:#fff;padding:0 16px;font:15px Inter,"Segoe UI",sans-serif;outline:none;flex:1}
#twocode-ai-monitor.cl-new .ch-compose{display:flex;align-items:center;gap:8px;height:40px;border-radius:20px;background:var(--g1);padding:0 4px 0 16px}
#twocode-ai-monitor.cl-new .ch-compose textarea{flex:1;height:22px;border:0;background:transparent;color:#fff;font:15px Inter,"Segoe UI",sans-serif;resize:none;outline:none;padding:0}
#twocode-ai-monitor.cl-new .ch-compose #am-send{width:32px;height:32px;padding:0;justify-content:center;border-radius:50%;background:#fff;color:#000}
#twocode-ai-monitor.cl-new .ch-model-menu{top:auto;bottom:34px;right:0;background:var(--g1);border:0;border-radius:16px;box-shadow:0 18px 44px rgba(0,0,0,.6)}
#twocode-ai-monitor.cl-new .ch-model-menu button{height:auto;border-radius:12px;background:transparent}
#twocode-ai-monitor.cl-new .ch-model-menu button:hover{background:var(--g2)}
#twocode-ai-monitor.cl-new .ch-model-menu button.on{background:var(--g2)}
#twocode-ai-monitor.cl-new .ch-model-menu button i{color:var(--acc)}
#twocode-ai-monitor.cl-new .ch-model{height:26px;padding:0 10px;background:transparent;color:var(--g)}
#twocode-ai-monitor.cl-new .ch-model:hover{background:var(--g2);color:#fff}
/* v3, calm like Apple Music: white and grey, Claude's colour only on its cover, rounded rectangles instead of pills */
#twocode-ai-monitor.cl-new{--acc:#ffffff;--ask:#ffffff}
#twocode-ai-monitor .lv-ring{width:76px;height:76px;border-radius:10px;background:linear-gradient(135deg,#e08a6c,#9c4126);box-shadow:0 6px 18px rgba(0,0,0,.45)}
#twocode-ai-monitor.cc-codex .lv-ring{background:linear-gradient(135deg,#3a3a3c,#141416)}
#twocode-ai-monitor .lv-ring i{color:#fff}
#twocode-ai-monitor .lv-who{font-size:12px;font-weight:600;letter-spacing:.4px;text-transform:uppercase;color:var(--g)}
#twocode-ai-monitor .lv-hero .lv-title{font-size:24px;line-height:30px;font-weight:700;letter-spacing:-.3px}
#twocode-ai-monitor .lv-clock{font-size:13px;font-weight:600;color:var(--g)}
#twocode-ai-monitor .lv-prog{height:4px;border-radius:2px;background:var(--g3);margin-top:9px;overflow:hidden}
#twocode-ai-monitor .lv-prog s{display:block;height:100%;border-radius:2px;background:#fff;transition:width .4s ease-out}
#twocode-ai-monitor .lv-prog.live s{animation:lv-breathe 1.6s ease-in-out infinite}
@keyframes lv-breathe{50%{opacity:.6}}
#twocode-ai-monitor .lv-ic{border-radius:6px;background:var(--g2);color:#fff}
#twocode-ai-monitor .lv-row em.run{color:#fff}
#twocode-ai-monitor.cl-new button{border-radius:10px}
#twocode-ai-monitor.cl-new .lv-two button{border-radius:10px}
#twocode-ai-monitor.cl-new .lv-two .lv-no{background:var(--g2);color:#fff}
#twocode-ai-monitor.cl-new .lv-two .lv-no:hover{background:var(--g3)}
#twocode-ai-monitor.cl-new .lv-two .lv-yes{background:#fff;color:#000}
#twocode-ai-monitor.cl-new .lv-two .lv-yes:hover{background:#e5e5ea}
#twocode-ai-monitor .lv-cmd{border-radius:10px}
#twocode-ai-monitor.cl-new .am-option,#twocode-ai-monitor.cl-new .am-note,#twocode-ai-monitor.cl-new .ch-compose{border-radius:10px}
#twocode-ai-monitor.cl-new .ch-compose #am-send{border-radius:8px}
#twocode-ai-monitor.cl-new .ch-model-menu{border-radius:12px}
#twocode-ai-monitor.cl-new .ch-model-menu button{border-radius:8px}
/* code live: on black, the changed lines red / green, line numbers, Xcode's dark syntax colours */
#twocode-ai-monitor .lv-ring{width:60px;height:60px;border-radius:9px}
#twocode-ai-monitor .lv-ring svg{width:28px;height:28px}
#twocode-ai-monitor .lv-hero{gap:16px}
#twocode-ai-monitor .lv-hero .lv-title{font-size:21px;line-height:26px}
#twocode-ai-monitor .lv-hero .lv-sub{font-size:14px;line-height:18px}
#twocode-ai-monitor .lv-code{font:500 12.5px/20px "Cascadia Mono",Consolas,monospace;color:#e5e5ea}
#twocode-ai-monitor .lv-file{display:flex;align-items:center;gap:8px;height:24px;margin-bottom:4px;font:600 13px Inter,"Segoe UI",sans-serif;color:#fff}
#twocode-ai-monitor .lv-file span{height:16px;padding:0 5px;border-radius:4px;background:#2c2c2e;font:700 9.5px/16px Inter,"Segoe UI",sans-serif;color:#aeaeb2;letter-spacing:.3px}
#twocode-ai-monitor .lv-file em{margin-left:auto;font-style:normal;font-weight:500;font-size:12px;color:var(--g)}
#twocode-ai-monitor .lv-ln{display:flex;align-items:center;height:20px;border-radius:4px;white-space:pre;overflow:hidden;animation:lv-line .35s cubic-bezier(.2,.8,.2,1) both}
#twocode-ai-monitor .lv-ln:nth-child(3){animation-delay:.05s}#twocode-ai-monitor .lv-ln:nth-child(4){animation-delay:.1s}#twocode-ai-monitor .lv-ln:nth-child(5){animation-delay:.15s}#twocode-ai-monitor .lv-ln:nth-child(6){animation-delay:.2s}#twocode-ai-monitor .lv-ln:nth-child(7){animation-delay:.25s}
@keyframes lv-line{from{opacity:0;transform:translateX(-6px)}}
#twocode-ai-monitor .lv-ln i{flex:none;width:30px;padding-right:8px;text-align:right;font-style:normal;color:#636366}
#twocode-ai-monitor .lv-ln b{flex:none;width:14px;font-weight:600}
#twocode-ai-monitor .lv-ln code{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;font:inherit}
#twocode-ai-monitor .lv-ln.del{background:rgba(255,69,58,.13)}#twocode-ai-monitor .lv-ln.del b{color:#ff6961}#twocode-ai-monitor .lv-ln.del code{opacity:.75}
#twocode-ai-monitor .lv-ln.add{background:rgba(50,215,75,.12)}#twocode-ai-monitor .lv-ln.add b{color:#32d74b}
#twocode-ai-monitor .sx-k{color:#ff7ab2;font-weight:600}#twocode-ai-monitor .sx-s{color:#ff8170}#twocode-ai-monitor .sx-n{color:#d9c97c}#twocode-ai-monitor .sx-c{color:#7f8c98}#twocode-ai-monitor .sx-t{color:#5dd8ff}
#twocode-ai-monitor .lv-term .lv-file span{background:transparent;padding:0;font:600 13px "Cascadia Mono",Consolas,monospace;color:#32d74b}
#twocode-ai-monitor .lv-term .lv-file{font:600 13px "Cascadia Mono",Consolas,monospace}
#twocode-ai-monitor .lv-out{height:20px;white-space:pre;overflow:hidden;text-overflow:ellipsis;color:#aeaeb2;animation:lv-line .3s ease-out both}
#twocode-ai-monitor .lv-out.bad{color:#ff6961}#twocode-ai-monitor .lv-out.dim{color:#636366}
/* compact (notch-app size) */
#twocode-ai-monitor .lv-ring{width:48px;height:48px;border-radius:9px}
#twocode-ai-monitor .lv-ring svg{width:22px;height:22px}
#twocode-ai-monitor .lv-hero{gap:12px}
#twocode-ai-monitor .lv-who{font-size:10px}
#twocode-ai-monitor .lv-hero .lv-title{font-size:15px;line-height:19px;font-weight:600;letter-spacing:0}
#twocode-ai-monitor .lv-hero .lv-sub{font-size:12px;line-height:16px}
#twocode-ai-monitor .lv-clock{font-size:11px}
#twocode-ai-monitor .lv-prog{height:3px;margin-top:6px}
#twocode-ai-monitor .lv-list{margin-top:8px}
#twocode-ai-monitor .lv-row{height:30px;gap:10px}
#twocode-ai-monitor .lv-ic{width:20px;height:20px;border-radius:5px}
#twocode-ai-monitor .lv-row b{font-size:12px}
#twocode-ai-monitor .lv-row em,#twocode-ai-monitor .lv-cap{font-size:11px}
#twocode-ai-monitor .lv-answer{font-size:13px;line-height:19px}
#twocode-ai-monitor .lv-code{font-size:11.5px;line-height:18px}
#twocode-ai-monitor .lv-file{height:20px;font-size:12px;margin-bottom:2px}
#twocode-ai-monitor .lv-ln{height:18px}
#twocode-ai-monitor .lv-out{height:18px}
#twocode-ai-monitor .lv-limit{height:22px;font-size:11px}
#twocode-ai-monitor .lv-cmd{margin-top:8px;min-height:34px;padding:7px 12px;font-size:12px;border-radius:9px}
#twocode-ai-monitor .lv-two{gap:8px;padding-top:8px}
#twocode-ai-monitor.cl-new .lv-two button{height:32px;font-size:13px;border-radius:9px}
#twocode-ai-monitor.cl-new button{height:28px;font-size:12px}
#twocode-ai-monitor.cl-new .am-shell{padding:0 16px 4px}
/* v10: the glow (black at the top, the state's colour rising from the bottom), a big number left, a frosted card right */
@keyframes cp-turn{to{transform:rotate(360deg)}}
@keyframes cp-in{from{opacity:0;transform:translateY(4px)}}
@keyframes cp-run{to{transform:translateX(122%)}}
@keyframes cp-shine{from{background-position:100% 0}to{background-position:-100% 0}}
#twocode-ai-monitor.cl-new .gl-main{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:20px;align-items:center;margin-top:2px}
#twocode-ai-monitor.cl-new .gl-l{min-width:0}
#twocode-ai-monitor.cl-new .gl-tile{display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:12px;font-weight:600;color:rgba(255,255,255,.82);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#twocode-ai-monitor.cl-new .gl-tile span{flex:none;width:22px;height:22px;border-radius:6px;display:grid;place-items:center;color:#fff;background:linear-gradient(150deg,#eba184,#b54e2c);box-shadow:0 2px 8px rgba(0,0,0,.3)}
#twocode-ai-monitor.cc-codex .gl-tile span{background:linear-gradient(150deg,#6b9bff,#1d4fd8)}
#twocode-ai-monitor.cl-new .gl-tile span.live svg{animation:cp-turn 7s linear infinite}
#twocode-ai-monitor.cl-new .gl-big{margin:0;font-size:56px;line-height:52px;font-weight:700;letter-spacing:-2.6px;font-variant-numeric:tabular-nums;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#twocode-ai-monitor.cl-new .gl-big.word{font-size:38px;line-height:42px;letter-spacing:-1.4px}
#twocode-ai-monitor.cl-new .gl-sub{margin:6px 0 0;font-size:13px;line-height:17px;color:rgba(255,255,255,.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#twocode-ai-monitor.cl-new .gl-card{min-width:0;max-height:136px;overflow:hidden;box-sizing:border-box;border-radius:14px;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);backdrop-filter:blur(14px);padding:10px 12px;display:flex;flex-direction:column;animation:cp-in .3s cubic-bezier(.2,.8,.2,1) both}
#twocode-ai-monitor.cl-new .gl-cap{margin:0 0 2px;font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:rgba(255,255,255,.55)}
#twocode-ai-monitor.cl-new .gl-row{display:flex;align-items:center;gap:9px;height:26px;min-width:0;flex:none}
#twocode-ai-monitor.cl-new .gl-row b{flex:none;font-size:12.5px;font-weight:600;color:#fff}
#twocode-ai-monitor.cl-new .gl-row code{flex:1;min-width:0;font:500 11.5px "Cascadia Mono",Consolas,monospace;color:rgba(255,255,255,.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#twocode-ai-monitor.cl-new .gl-row.d b{color:rgba(255,255,255,.62)}
#twocode-ai-monitor.cl-new .gl-row .ic{flex:none;width:20px;height:20px;border-radius:6px;display:grid;place-items:center;background:rgba(255,255,255,.12);color:#fff;font-style:normal}
#twocode-ai-monitor.cl-new .gl-spin{flex:none;width:13px;height:13px;box-sizing:border-box;border-radius:50%;border:2px solid rgba(255,255,255,.25);border-top-color:#fff;animation:cp-turn .8s linear infinite}
#twocode-ai-monitor.cl-new .gl-ok{flex:none;display:grid;color:rgba(255,255,255,.55)}
#twocode-ai-monitor.cl-new .gl-row.h b{flex:1;min-width:0;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#twocode-ai-monitor.cl-new .gl-row.h em{flex:none;font-style:normal;font-size:11px;color:rgba(255,255,255,.6);font-variant-numeric:tabular-nums}
#twocode-ai-monitor.cl-new .gl-dot{flex:none;width:16px;height:16px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:9px;font-weight:800;background:rgba(255,255,255,.15);color:#fff}
#twocode-ai-monitor.cl-new .gl-dot.ok{background:#30d158;color:#000}#twocode-ai-monitor.cl-new .gl-dot.bad{background:#ff453a;color:#000}#twocode-ai-monitor.cl-new .gl-dot.ask{background:#ffd60a;color:#000}
#twocode-ai-monitor.cl-new .gl-md{min-height:0;overflow:auto;scrollbar-width:none;font-size:12.5px;line-height:18px;color:#fff}
#twocode-ai-monitor.cl-new .gl-md p{margin:0 0 6px}#twocode-ai-monitor.cl-new .gl-md p:last-child{margin:0}#twocode-ai-monitor.cl-new .gl-md ul,#twocode-ai-monitor.cl-new .gl-md ol{margin:0 0 6px;padding-left:18px}
#twocode-ai-monitor.cl-new .gl-md code{font:11.5px "Cascadia Mono",Consolas,monospace;background:rgba(255,255,255,.14);border-radius:5px;padding:1px 5px}
#twocode-ai-monitor.cl-new .gl-md pre{margin:4px 0 6px;padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.35);font:11.5px/1.5 "Cascadia Mono",Consolas,monospace;white-space:pre-wrap}
#twocode-ai-monitor.cl-new .gl-think p{margin:0;font-size:13px;line-height:18px;color:#fff;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
#twocode-ai-monitor.cl-new .gl-think span{display:inline-block;align-self:flex-start;margin-top:6px;font-size:12px;font-weight:600;background:linear-gradient(90deg,rgba(255,255,255,.4) 20%,#fff 50%,rgba(255,255,255,.4) 80%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:cp-shine 1.8s linear infinite}
#twocode-ai-monitor.cl-new .gl-empty{font-size:12.5px;line-height:18px;color:rgba(255,255,255,.8)}
#twocode-ai-monitor.cl-new .gl-cmd{max-height:100%;overflow:auto;scrollbar-width:none;font:500 12px/18px "Cascadia Mono",Consolas,monospace;color:#fff;white-space:pre-wrap;word-break:break-all}
#twocode-ai-monitor.cl-new .gl-cmd span{color:#7dffa0;margin-right:8px}
#twocode-ai-monitor.cl-new .gl-card .lv-file{color:#fff;margin-bottom:4px}#twocode-ai-monitor.cl-new .gl-card .lv-file em{color:rgba(255,255,255,.6)}#twocode-ai-monitor.cl-new .gl-card .lv-file span{background:rgba(255,255,255,.14);color:#fff}
#twocode-ai-monitor.cl-new .gl-card .lv-ln i{color:rgba(255,255,255,.45)}#twocode-ai-monitor.cl-new .gl-card .lv-out{color:rgba(255,255,255,.75)}#twocode-ai-monitor.cl-new .gl-card .lv-out.dim{color:rgba(255,255,255,.5)}
#twocode-ai-monitor.cl-new .gl-foot{flex:none;position:relative;display:flex;align-items:center;gap:12px;height:32px;margin-top:10px}
#twocode-ai-monitor.cl-new .gl-tools{margin-left:auto;flex:none;display:flex;gap:6px}
#twocode-ai-monitor.cl-new .gl-steps{flex:1;min-width:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}
#twocode-ai-monitor.cl-new .gl-steps i{position:relative;display:block;height:4px;border-radius:2px;background:rgba(255,255,255,.2);overflow:hidden}
#twocode-ai-monitor.cl-new .gl-steps .d i{background:#fff}
#twocode-ai-monitor.cl-new .gl-steps .n i::after{content:"";position:absolute;left:0;top:0;bottom:0;width:45%;border-radius:2px;background:#fff;animation:cp-run 1.3s ease-in-out infinite alternate}
#twocode-ai-monitor.cl-new .gl-steps span{display:block;margin-top:5px;font-size:11px;line-height:13px;font-weight:500;color:rgba(255,255,255,.5)}
#twocode-ai-monitor.cl-new .gl-steps .d span{color:rgba(255,255,255,.72)}#twocode-ai-monitor.cl-new .gl-steps .n span{color:#fff;font-weight:600}
#twocode-ai-monitor.cl-new .gl-steps.done div:last-child span{color:#fff;font-weight:600}
#twocode-ai-monitor.cl-new .gl-steps.bad .n i{background:#fff}#twocode-ai-monitor.cl-new .gl-steps.bad .n i::after{display:none}
#twocode-ai-monitor.cl-new .gl-chip{height:26px;padding:0 10px;border:0;border-radius:8px;background:rgba(255,255,255,.13);color:#fff;font:600 11.5px Inter,"Segoe UI",sans-serif;display:inline-flex;align-items:center;gap:5px;cursor:pointer}
#twocode-ai-monitor.cl-new .gl-chip:hover{background:rgba(255,255,255,.22)}
#twocode-ai-monitor.cl-new .gl-chip em,#twocode-ai-monitor.cl-new .gl-chip span{font-style:normal;font-weight:500;color:rgba(255,255,255,.65)}
#twocode-ai-monitor.cl-new .gl-limit{flex:1;min-width:0;display:flex;align-items:center;gap:10px;font-size:11.5px;font-weight:600;color:rgba(255,255,255,.75)}
#twocode-ai-monitor.cl-new .gl-limit i{flex:1;max-width:200px;height:4px;border-radius:2px;background:rgba(255,255,255,.2);overflow:hidden}
#twocode-ai-monitor.cl-new .gl-limit s{display:block;height:100%;border-radius:2px;background:#fff}
#twocode-ai-monitor.cl-new .gl-limit b{color:#fff;font-variant-numeric:tabular-nums}
#twocode-ai-monitor.cl-new .gl-compose{flex:1;height:32px;padding:0 3px 0 12px;border-radius:10px;background:rgba(255,255,255,.13)}
#twocode-ai-monitor.cl-new .gl-compose textarea{height:18px;font-size:13px;color:#fff}
#twocode-ai-monitor.cl-new .gl-compose textarea::placeholder{color:rgba(255,255,255,.55)}
#twocode-ai-monitor.cl-new .gl-compose #am-send{width:26px;height:26px;border-radius:7px;background:#fff;color:#000}
#twocode-ai-monitor.cl-new .gl-two{flex:none;display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
#twocode-ai-monitor.cl-new .gl-two button{height:34px;border:0;border-radius:10px;display:flex;align-items:center;justify-content:center;gap:6px;font:600 13px Inter,"Segoe UI",sans-serif;cursor:pointer}
#twocode-ai-monitor.cl-new .gl-two .gl-no{background:rgba(255,255,255,.14);color:#fff}#twocode-ai-monitor.cl-new .gl-two .gl-no:hover{background:rgba(255,255,255,.22)}
#twocode-ai-monitor.cl-new .gl-two .gl-yes{background:#fff;color:#000}#twocode-ai-monitor.cl-new .gl-two .gl-yes:hover{background:#e5e5ea}
#twocode-ai-monitor.cl-new .gl-two button:active{transform:scale(.98)}
#twocode-ai-monitor.cl-new .gl-col{flex:1;min-height:0;display:flex;flex-direction:column}
#twocode-ai-monitor.cl-new .gl-col .gl-tile{margin:4px 0 4px}
#twocode-ai-monitor.cl-new .gl-title{margin:0 0 8px;font-size:20px;line-height:24px;font-weight:700;letter-spacing:-.4px;color:#fff}
#twocode-ai-monitor.cl-new .gl-col .gl-card{max-height:none}
#twocode-ai-monitor.cl-new .gl-scroll{flex:1;min-height:0;overflow:auto;scrollbar-width:none}
#twocode-ai-monitor.cl-new .gl-note{flex:none;margin-top:8px;height:32px;border:0;border-radius:10px;background:rgba(255,255,255,.13);color:#fff;padding:0 12px;font:13px Inter,"Segoe UI",sans-serif;outline:none}
/* V3: the eyes and the time left, what he works on right */
#twocode-ai-monitor.cl-new .gl-main{display:block;position:relative;flex:1;margin:0}
#twocode-ai-monitor.cl-new .gl-l{position:absolute;left:-18px;top:0;bottom:0;width:160px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center}
#twocode-ai-monitor.cl-new .gl-eyes{display:flex;gap:22px;align-items:center;height:48px}
#twocode-ai-monitor.cl-new .gl-eyes i{display:block;width:26px;height:46px;border-radius:13px;background:#fff;box-shadow:0 0 24px rgba(255,255,255,.45);animation:gl-blink 5.2s linear infinite}
#twocode-ai-monitor.cl-new .gl-eyes i:last-child{animation-delay:.02s}
#twocode-ai-monitor.cl-new .gl-eyes.work{transform:translateX(6px)}
#twocode-ai-monitor.cl-new .gl-eyes.work i{background:#ffd2b0;box-shadow:0 0 24px rgba(255,154,77,.8)}
#twocode-ai-monitor.cl-new.cc-codex .gl-eyes.work i{background:#bcd6ff;box-shadow:0 0 24px rgba(91,155,255,.8)}
#twocode-ai-monitor.cl-new .gl-eyes.ask i{background:#ffe27a;box-shadow:0 0 24px rgba(255,214,10,.6)}
#twocode-ai-monitor.cl-new .gl-eyes.done i{background:#d4ecff;box-shadow:0 0 24px rgba(10,132,255,.7)}
#twocode-ai-monitor.cl-new .gl-eyes.bad i{background:#ffc2c2;box-shadow:0 0 24px rgba(226,44,62,.7)}
@keyframes gl-blink{0%,96%,100%{transform:scaleY(1)}98%{transform:scaleY(.08)}}
#twocode-ai-monitor.cl-new .gl-big{margin:0;width:100%;font:500 25px/25px "JetBrains Mono",Consolas,monospace;letter-spacing:-1px;text-align:center}
#twocode-ai-monitor.cl-new .gl-big.word{font:700 19px/23px Inter,"Segoe UI",sans-serif;letter-spacing:-.4px;white-space:normal}
#twocode-ai-monitor.cl-new .gl-sub{margin:7px 0 0;display:flex;align-items:center;justify-content:center;gap:6px;font:400 10.5px/14px "JetBrains Mono",Consolas,monospace;letter-spacing:.9px;color:#fff;text-transform:uppercase}
#twocode-ai-monitor.cl-new .gl-sub i{flex:none;width:7px;height:7px;background:#fff}
#twocode-ai-monitor.cl-new .gl-sub i.work{background:#ffd2b0}#twocode-ai-monitor.cl-new .gl-sub i.ask{background:#ffd60a}#twocode-ai-monitor.cl-new .gl-sub i.done{background:#0a84ff}#twocode-ai-monitor.cl-new .gl-sub i.bad{background:#ff6b6e}
#twocode-ai-monitor.cl-new .gl-r{position:absolute;left:148px;right:0;top:0;bottom:0}
#twocode-ai-monitor.cl-new .gl-what{display:flex;align-items:center;gap:10px;height:22px;font-size:15px;line-height:20px;font-weight:600;letter-spacing:-.15px}
#twocode-ai-monitor.cl-new .gl-what>span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#twocode-ai-monitor.cl-new .gl-what .gl-chip{flex:none;height:22px}
#twocode-ai-monitor.cl-new .gl-card{position:absolute;left:0;right:0;top:26px;height:112px;max-height:none;padding:9px 12px;border-radius:16px;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.1);box-shadow:none;backdrop-filter:none}
#twocode-ai-monitor.cl-new .gl-card .lv-code{margin:0 -12px;font:400 12px/20px "JetBrains Mono",Consolas,monospace;color:rgba(255,255,255,.75)}
#twocode-ai-monitor.cl-new .gl-card .lv-file{display:flex;justify-content:space-between;height:20px;margin:0;padding:0 12px;font:400 10.5px/20px "JetBrains Mono",Consolas,monospace;letter-spacing:.9px;color:rgba(255,255,255,.72)}
#twocode-ai-monitor.cl-new .gl-card .lv-file b{font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#twocode-ai-monitor.cl-new .gl-card .lv-file em{flex:none;font-style:normal;letter-spacing:0;font-size:11px}
#twocode-ai-monitor.cl-new .gl-card .lv-file em u{text-decoration:none;color:#8df0ae}#twocode-ai-monitor.cl-new .gl-card .lv-file em s{text-decoration:none;color:#ff9d9d}
#twocode-ai-monitor.cl-new .gl-card .lv-term .lv-file span{margin-right:6px;background:none;color:#8df0ae;font:inherit;padding:0;height:auto}
#twocode-ai-monitor.cl-new .gl-card .lv-ln{height:20px;padding:0 12px;border-radius:0}
#twocode-ai-monitor.cl-new .gl-card .lv-ln i{width:30px;padding:0;text-align:left;color:rgba(255,255,255,.4)}
#twocode-ai-monitor.cl-new .gl-card .lv-ln b{display:none}
#twocode-ai-monitor.cl-new .gl-card .lv-ln.del{background:rgba(255,80,80,.2)}#twocode-ai-monitor.cl-new .gl-card .lv-ln.del code{color:#ffb0b0;opacity:1}#twocode-ai-monitor.cl-new .gl-card .lv-ln.del i{color:rgba(255,176,176,.6)}
#twocode-ai-monitor.cl-new .gl-card .lv-ln.add{background:rgba(70,220,120,.2)}#twocode-ai-monitor.cl-new .gl-card .lv-ln.add code{color:#9df5bb}#twocode-ai-monitor.cl-new .gl-card .lv-ln.add i{color:rgba(157,245,187,.6)}
#twocode-ai-monitor.cl-new .gl-card .lv-out{padding:0 12px}
#twocode-ai-monitor.cl-new .gl-foot{position:absolute;left:0;right:0;top:150px;height:auto;margin:0}
#twocode-ai-monitor.cl-new .gl-steps i{height:3px}
#twocode-ai-monitor.cl-new .gl-steps span{font:400 10px/13px "JetBrains Mono",Consolas,monospace;letter-spacing:.9px;text-transform:uppercase;color:rgba(255,255,255,.75)}
#twocode-ai-monitor.cl-new .gl-steps .d span,#twocode-ai-monitor.cl-new .gl-steps .n span{color:#fff;font-weight:400}
#twocode-ai-monitor.cl-new .gl-perm .gl-card{height:78px}
/* a question or a plan: one column, the card under the title (not pinned at 26 px like the cards above: it fell over the title) */
#twocode-ai-monitor.cl-new .gl-col .gl-card{position:relative;left:auto;right:auto;top:auto;height:auto;flex:1;min-height:0}
#twocode-ai-monitor.cl-new .gl-col .gl-two{position:static;justify-content:flex-end;margin-top:8px}
#twocode-ai-monitor.cl-new .gl-col .gl-two button{height:40px}
#twocode-ai-monitor.cl-new .gl-col .am-plan{-webkit-mask-image:linear-gradient(#000 calc(100% - 22px),transparent);mask-image:linear-gradient(#000 calc(100% - 22px),transparent)}
#twocode-ai-monitor.cl-new .gl-two{position:absolute;right:0;top:116px;display:flex;gap:7px;margin:0}
#twocode-ai-monitor.cl-new .gl-two button{height:46px;padding:0 20px;border-radius:14px;font-size:15px;font-weight:700}
#twocode-ai-monitor.cl-new .gl-two .gl-yes{padding:0 26px}
#twocode-ai-monitor.cl-new .gl-compose{height:34px}
@media(prefers-reduced-motion:reduce){#twocode-ai-monitor.cl-new .gl-eyes i{animation:none}#twocode-ai-monitor.cl-new .gl-tile span.live svg,#twocode-ai-monitor.cl-new .gl-steps .n i::after,#twocode-ai-monitor.cl-new .gl-think span,#twocode-ai-monitor.cl-new .gl-card{animation:none}}
@media(prefers-reduced-motion:reduce){#twocode-ai-monitor .ch-typing i{animation:none}#twocode-ai-monitor .cx-light i.blink,#twocode-ai-monitor .am-blink,#twocode-ai-monitor .am-wave{animation:none}}
`; document.head.appendChild(style);
  const escape = text => String(text || '').replace(/[&<>"']/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x]));
  function md(text) {
    const inline = t => t.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    let html = '', list = null, block = null, para = [];
    const flush = () => { if (para.length) { html += '<p>' + inline(para.join('<br>')) + '</p>'; para = []; } }, close = () => { if (list) { html += `</${list}>`; list = null; } };
    for (const line of escape(text).split('\n')) {
      if (/^\s*```/.test(line)) { if (block) { html += `<pre>${block.join('\n')}</pre>`; block = null; } else { flush(); close(); block = []; } continue; }
      if (block) { block.push(line); continue; }
      const item = line.match(/^\s*(?:([-•*])|(\d+)[.)])\s+(.*)$/), head = line.match(/^#{1,4}\s+(.*)$/);
      if (item) { flush(); const kind = item[1] ? 'ul' : 'ol'; if (list !== kind) { close(); html += `<${kind}>`; list = kind; } html += '<li>' + inline(item[3]) + '</li>'; continue; }
      if (head) { flush(); close(); html += '<p><b>' + inline(head[1]) + '</b></p>'; continue; }
      if (!line.trim()) { flush(); close(); continue; }
      close(); para.push(line);
    }
    if (block) html += `<pre>${block.join('\n')}</pre>`;
    flush(); close(); return html;
  }
  const providers = () => state.providers || [];
  const current = () => providers().find(p => p.provider === selected);
  // Claude Code only shows in the small island while a session has something to tell (like Coucou).
  const shown = p => p.connected && !(p.kind === 'hooks' && p.state === 'ready');
  const active = () => providers().some(shown);
  const busy = p => ['running', 'sending'].includes(p.state);
  const key = p => p?.provider + ':' + (p?.questionId || '');
  const colourOf = state => paletteColour(state) || colours[state] || colours.disconnected; // paletteColour: defined below, used after init
  const lamp = p => `<span class="am-dot ${busy(p) ? 'am-blink' : ''}" style="--lamp:${colourOf(p.state)}"></span>`;
  // After you have looked at Claude Code, green/red/question go quiet again (eyes back to normal).
  function markSeen() {
    if (currentView === 'monitor' && ['claudecode', 'codex'].includes(selected) && api.aiMonitorHooksSeen) api.aiMonitorHooksSeen().then(update).catch(() => {});
  }
  function open(provider, exact) {
    // Claude Code, Codex, Claude or ChatGPT (the switch at the top of the page).
    // the AI tile on the home screen opens whichever AI has something to tell right now
    if (!exact && provider === 'claudecode' && top() && top().provider !== 'claudecode') provider = top().provider;
    const next = Object.hasOwn(names, provider) ? provider : 'claudecode';
    if (next !== selected) markSeen();
    selected = next; choosing = false; error = ''; render();
    setView('monitor'); setMode('expanded'); lastActivity = performance.now();
  }
  // Claude is done (or stopped): go to Claude. His own window (the terminal or VS Code) comes to the front; when you were in
  // it already, or it cannot come forward, the island shows his page, so a click never does nothing. Both the small blue
  // island and the "Claude Code is done" message do this (the user, 11 Nov: "I click and nothing happens, you don't go to
  // Claude": the message only opened the page, and the old glass made the first clicks fall through).
  function goTo(p) {
    if (!(p?.kind === 'hooks' && p.canJump && !p.ask && !p.plan && !p.permission)) return open(p?.provider, true);
    sound('click');
    api.aiMonitorHooksJump(p.sessionId).then(result => {
      if (!result?.ok || result.already) return open(p.provider, true);
      if (p.state !== 'question') api.aiMonitorHooksSeen?.().then(update).catch(() => {});
    }).catch(() => open(p.provider, true));
  }
  function small() {
    if (root.contains(document.activeElement)) document.activeElement.blur();
    markSeen(); currentView = 'home'; setMode('rest');
  }
  const bind = (id, fn) => root.querySelector('#' + id)?.addEventListener('click', fn);
  function render() {
    const p = current(), input = root.querySelector('textarea');
    const focused = Boolean(input && input === document.activeElement), start = input?.selectionStart, end = input?.selectionEnd;
    const sub = p?.kind === 'hooks' ? (p.connected ? (p.source?.title ? `Project: ${p.source.title}` : `Volgt al je ${p.name}-sessies`) : 'Nog niet gekoppeld') : '';
    root.innerHTML = p?.kind === 'hooks' ? `<div class="am-shell">${hooksPage(p, sub)}${error ? `<div class="am-error" role="alert">${escape(error)}</div>` : ''}</div>`
      : `<div class="am-shell"><div class="tc-page-head"><div><p class="tc-page-title">${escape(p?.name || 'Claude Code')}</p><p class="tc-page-sub">${escape(sub)}</p></div><button type="button" id="am-small">Klein</button></div>${
      choosing ? `<div class="am-hint">Open ${escape(names[selected])} in je browser of desktopapp en log daar in. Laat het gesprek open in een eigen venster. Kies daarna dat venster.</div><div class="am-body">${windows.length ? windows.map((win, index) => `<button type="button" class="am-window" data-window="${index}" ${pending ? 'disabled' : ''}>${escape(win.title)} <span class="am-hint">· ${escape(win.process)}</span></button>`).join('') : '<div class="am-hint">Nog geen geschikt venster gevonden. Houd een websitegesprek in een eigen venster.</div>'}</div><div class="am-row"><button type="button" id="am-launch">Open ${escape(names[selected])}</button><button type="button" id="am-scan" ${pending ? 'disabled' : ''}>Vernieuwen</button><button type="button" id="am-cancel">Terug</button></div>` :
      p?.kind === 'hooks' ? hooksPage(p) :
      p?.soon ? `<div class="am-body"><p><strong>${escape(names[selected])} komt binnenkort</strong></p><p class="am-hint">Straks volgt Robo je ${escape(names[selected])}-gesprekken met de Twenty-One-extensie voor Chrome. Nu volgt hij Claude Code en Codex.</p></div>` :
      !p?.connected ? `<div class="am-body"><p><strong>${T(`Volg ${escape(names[selected] || 'Claude Code')} met Robo`, `Follow ${escape(names[selected] || 'Claude Code')} with Robo`)}</strong></p><p class="am-hint">${T(`Zet ${escape(names[selected] || 'Claude Code')} aan in Twenty-One → Verbindingen. Twenty-One zoekt je gesprek zelf; je hoeft geen venster te kiezen.`, `Turn ${escape(names[selected] || 'Claude Code')} on in Twenty-One → Connections. Twenty-One finds your conversation by itself; no need to pick a window.`)}</p></div><div class="am-row"><button type="button" class="am-primary" id="am-open-connect">Open Verbindingen</button></div>` : false ? `<div class="am-body"><p><strong>Verbind jouw gesprek</strong></p><p class="am-hint">Gebruik de browser of desktopapp waarin je bent ingelogd. Log in op de originele site of app. Je wachtwoord blijft bij ${escape(names[selected])}.</p><p class="am-hint">Houd het gesprek open in een eigen venster terwijl je verder werkt.</p></div><div class="am-row"><button type="button" class="am-primary" id="am-connect">Kies jouw venster</button><button type="button" id="am-launch">Open ${escape(names[selected])}</button></div>` :
      `<div class="am-row">${lamp(p)}<strong>${escape(p.detail || labels[p.state])}</strong><span class="am-clock">${p.elapsed || 0}s</span></div>${busy(p) ? '<div class="am-track" role="status" aria-label="AI is bezig"><div class="am-wave"></div></div>' : ''}<div class="am-hint am-source" title="${escape(p.source?.title)}">${escape(p.source?.process)} · ${escape(p.source?.title)}</div><div class="am-body">${p.state === 'question' ? `<div class="am-question">${escape(p.question)}</div>` : `<p class="am-hint">${p.state === 'done' ? 'Je antwoord staat klaar in het gesprek.' : p.state === 'ready' ? 'Ready. Stel je vraag in het gesprek; de island volgt daarna de status.' : p.state === 'unavailable' ? 'Het gesprek is niet meer leesbaar. Houd het open, herstel het venster als het geminimaliseerd is, of verbind opnieuw.' : busy(p) ? 'Werk verder in een andere app. Laat dit gesprekvenster open; de island meldt een vraag of afgerond antwoord.' : 'Open het gesprek om de situatie te controleren.'}</p>`}</div>${p.canReply ? '<div class="am-compose"><textarea id="am-answer" maxlength="5000" placeholder="Jouw antwoord…" aria-label="Antwoord op de vraag"></textarea><button type="button" class="am-primary" id="am-send">Verstuur</button></div>' : ''}<div class="am-row"><button type="button" id="am-launch">Open gesprek</button><button type="button" id="am-connect">Opnieuw verbinden</button><button type="button" id="am-disconnect">Ontkoppelen</button></div>`
    }${error ? `<div class="am-error" role="alert">${escape(error)}</div>` : ''}</div>`;
    bind('am-small', small); bind('am-connect', choose);
    bind('am-scan', scan); bind('am-launch', launch); bind('am-cancel', () => { choosing = false; error = ''; render(); });
    bind('am-disconnect', async () => { const result = await api.aiMonitorDisconnect(selected); if (result.ok) update(result); else { error = result.error; render(); } });
    bind('am-send', reply);
    bind('am-open-connect', () => { window.twocode.settingsOpen?.('connect'); small(); }); // connecting lives in the Twenty-One app now
    bind('am-hooks-install', () => hooks('aiMonitorHooksInstall', current()?.agent)); bind('am-hooks-uninstall', () => hooks('aiMonitorHooksUninstall', current()?.agent));
    root.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => { if (b.dataset.pick !== selected) { markSeen(); selected = b.dataset.pick; choosing = false; error = ''; render(); } }));
    // Show the end of Claude's message (the question) when the answer box takes space.
    if (p?.kind === 'hooks' && !p.plan && !p.ask) { const body = root.querySelector('.am-body'); if (body) body.scrollTop = body.scrollHeight; }
    if (p?.ask) bindAsk(p);
    bind('am-plan-ok', () => hooks('aiMonitorHooksPlan', p?.sessionId, true, ''));
    bind('am-plan-no', () => hooks('aiMonitorHooksPlan', p?.sessionId, false, root.querySelector('#am-plan-note')?.value || ''));
    bind('am-jump', () => hooks('aiMonitorHooksJump', p?.sessionId));
    bind('am-model', () => { modelMenu = !modelMenu; render(); });
    for (const b of root.querySelectorAll('[data-model]')) b.addEventListener('click', () => { modelMenu = false; hooks('aiMonitorHooksModel', b.dataset.model); });
    root.querySelector('#am-plan-note')?.addEventListener('focus', () => { projectInputFocused = true; sendInteractive(true); });
    bind('am-allow',() => hooks('aiMonitorHooksDecide', p?.sessionId, 'allow')); bind('am-deny', () => hooks('aiMonitorHooksDecide', p?.sessionId, 'deny'));
    bind('am-always', () => hooks('aiMonitorHooksDecide', p?.sessionId, 'always'));
    for (const button of root.querySelectorAll('[data-provider]')) button.addEventListener('click', () => open(button.dataset.provider));
    for (const button of root.querySelectorAll('[data-window]')) button.addEventListener('click', () => connect(windows[Number(button.dataset.window)]?.id));
    const fresh = root.querySelector('textarea');
    if (fresh) {
      fresh.value = drafts.get(key(p)) || ''; fresh.disabled = pending;
      fresh.addEventListener('input', () => drafts.set(key(current()), fresh.value));
      fresh.addEventListener('focus', () => { projectInputFocused = true; sendInteractive(true); });
      fresh.addEventListener('blur', () => { projectInputFocused = false; });
      fresh.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); reply(); } });
      if (focused) { fresh.focus(); if (typeof fresh.setSelectionRange === 'function') fresh.setSelectionRange(start, end); }
      const send = root.querySelector('#am-send'); if (send) send.disabled = pending;
    } else projectInputFocused = false;
  }
  // Claude page, like an iPhone Live Activity:
  // left a big card with a real traffic light (Twenty-One's idea), what Claude does now, a live timer and your question;
  // right the activity feed (one line per step, with an icon) and your 5-hour limit.
  // Questions, plans and permissions get the full width, so answering is easy.
  const ICON_PATHS = {
    read: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/>',
    run: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m7 10 3 2.5L7 15M12 15h4"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
    web: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16"/>',
    agent: '<path d="M12 3v5M12 16v5M3 12h5M16 12h5M7 7l2 2M15 15l2 2M17 7l-2 2M9 15l-2 2"/>',
    other: '<circle cx="12" cy="12" r="7"/><path d="M12 9v3l2 2"/>'
  };
  const svg = (name, size = 15) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name] || ICON_PATHS.other}</svg>`;
  const EN = () => window.__twocodePrefs?.().lang === 'en', T = (nl, en) => EN() ? en : nl;
  const NOW_NL = { read: 'Leest', edit: 'Bewerkt', run: 'Voert uit', search: 'Zoekt', web: 'Zoekt online', agent: 'Helper bezig', other: 'Bezig' };
  const PAST_NL = { read: 'Gelezen', edit: 'Bewerkt', run: 'Uitgevoerd', search: 'Gezocht', web: 'Online gezocht', agent: 'Helper klaar', other: 'Gedaan' };
  const NOW_EN = { read: 'Reading', edit: 'Editing', run: 'Running', search: 'Searching', web: 'Searching the web', agent: 'Helper working', other: 'Working' };
  const PAST_EN = { read: 'Read', edit: 'Edited', run: 'Ran', search: 'Searched', web: 'Searched the web', agent: 'Helper done', other: 'Done' };
  const NOW = new Proxy({}, { get: (_, k) => (EN() ? NOW_EN : NOW_NL)[k] }), PAST = new Proxy({}, { get: (_, k) => (EN() ? PAST_EN : PAST_NL)[k] });
  const clock = sec => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; // 0:42, 2:07 (like a timer)
  const shortWhat = (kind, what) => !what ? '' : ['read', 'edit'].includes(kind) ? what.split(/[\\/]/).pop() : what.replace(/\s+/g, ' ');
  // Live timer: the page is only rebuilt on events, so this ticks the seconds in between.
  setInterval(() => {
    for (const el of root.querySelectorAll('.cx-timer[data-live="1"]')) el.textContent = clock(Number(el.dataset.base) + Math.floor((Date.now() - Number(el.dataset.at)) / 1000));
  }, 1000);

  // Which Claude model Claude Code uses (written to Claude Code's settings.json by the main process).
  const MODEL_INFO = { default: [window.__twocodePrefs?.().lang === 'en' ? 'Default' : 'Standaard', 'Wat Claude Code zelf kiest'], opus: ['Opus', 'Het slimst, voor moeilijke klussen'], sonnet: ['Sonnet', 'Snel en slim, voor de meeste dingen'],
    haiku: ['Haiku', 'Supersnel, voor kleine dingen'], opusplan: ['Opus plan', 'Opus plant, Sonnet bouwt'] };
  let modelMenu = false;
  function modelPicker(p) {
    const current = p.model || 'default', label = (current === 'default' ? T('Standaard', 'Default') : null) || MODEL_INFO[current]?.[0] || String(current).replace(/^custom:/, '');
    const button = `<button type="button" class="ch-model gl-chip" id="am-model" aria-expanded="${modelMenu}" title="Kies welk Claude-model Claude Code gebruikt"><em>Model</em>${escape(label)}<span>▾</span></button>`;
    const menu = !modelMenu ? '' : `<div class="ch-model-menu" role="menu"><div class="ch-model-head">Welk model gebruikt Claude?${p.modelNow ? `<small>Nu in gebruik: ${escape(p.modelNow)}</small>` : ''}</div>${
      Object.entries(MODEL_INFO).map(([key, [name, info]]) => `<button type="button" role="menuitemradio" aria-checked="${key === current}" class="${key === current ? 'on' : ''}" data-model="${key}"><b>${name}</b><small>${info}</small>${key === current ? '<i>✓</i>' : ''}</button>`).join('')
    }<p>Voor nieuwe sessies · in een lopend gesprek: <code>/model</code></p></div>`;
    return { button, menu };
  }

  // Code live (like an editor): the lines Claude changes, red out / green in, with line numbers and Xcode's dark colours.
  const KEYWORDS = /^(const|let|var|function|return|import|export|from|default|if|else|for|while|of|in|class|new|async|await|try|catch|throw|def|self|elif|None|True|False|true|false|null|undefined|this|type|interface|public|private|static|void|int|string|bool)$/;
  function syntax(line) {
    const out = [], re = /(\/\/.*$|#\s.*$)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g;
    let last = 0, m;
    while ((m = re.exec(line))) {
      out.push(escape(line.slice(last, m.index)));
      const [all, comment, str, num, word] = m;
      out.push(comment ? `<span class="sx-c">${escape(all)}</span>` : str ? `<span class="sx-s">${escape(all)}</span>` : num ? `<span class="sx-n">${escape(all)}</span>`
        : KEYWORDS.test(word) ? `<span class="sx-k">${escape(all)}</span>` : /^[A-Z]/.test(word) ? `<span class="sx-t">${escape(all)}</span>` : escape(all));
      last = m.index + all.length;
    }
    out.push(escape(line.slice(last)));
    return out.join('');
  }
  function codePanel(code, max = 6) {
    let del = code.start || 1, add = code.start || 1;
    const rows = (code.lines || []).slice(0, max).map(l => { const n = l.t === '-' ? del++ : add++;
      return `<div class="lv-ln ${l.t === '-' ? 'del' : 'add'}"><i>${n}</i><b>${l.t === '-' ? '−' : '+'}</b><code>${syntax(l.text)}</code></div>`; }).join('');
    const ext = (/\.([a-z0-9]{1,4})$/i.exec(code.file || '')?.[1] || '').toUpperCase();
    const plus = (code.lines || []).filter(l => l.t !== '-').length, minus = (code.lines || []).filter(l => l.t === '-').length;
    return `<div class="lv-code"><div class="lv-file"><b>${escape(String(code.file || '').split(/[\\/]/).pop().toUpperCase())}</b><em><u>+${plus}</u> <s>-${minus}</s></em></div>${rows}</div>`;
  }
  function termPanel(run) {
    const out = (run.out || []).slice(-3).map((l, i, all) => `<div class="lv-out${run.failed && i === all.length - 1 ? ' bad' : ''}">${escape(l)}</div>`).join('') || `<div class="lv-out dim">${T('Bezig…', 'Running…')}</div>`;
    return `<div class="lv-code lv-term"><div class="lv-file"><span>$</span>${escape(run.command)}</div>${out}</div>`;
  }
  let claudeTall = false; // the page grows a little while it shows code or the terminal
  function hooksPage(p) {
    claudeTall = false;
    const off = pending ? 'disabled' : '';
    const st = p.permission ? 'question' : p.state;
    const project = p.source?.title && p.source.title !== 'Geen actieve sessie' ? p.source.title : '';
    const statusText = EN() ? ({ running: 'Working', sending: 'Working', question: 'Waiting for you', done: 'Done', error: 'Error', stopped: 'Stopped' }[st] || 'Idle')
      : ({ running: 'Bezig', sending: 'Bezig', question: 'Wacht op jou', done: 'Klaar', error: 'Fout', stopped: 'Gestopt' }[st] || 'Rustig');
    // Only while Claude works: a live timer. When he's done the time doesn't matter anymore.
    const timer = busy(p) ? ` · <b class="cx-timer" data-live="1" data-base="${p.elapsed || 0}" data-at="${Date.now()}">${clock(p.elapsed || 0)}</b>` : '';
    const calm = p.agent === 'codex' ? '#5b9bff' : '#e8865a', lampOf = x => ['ready', 'disconnected', 'connecting'].includes(x) ? calm : colourOf(x); // quiet = the AI's own colour, not grey
    const pill = p.connected ? `<span class="ch-status" style="--lamp:${lampOf(st)}"><i class="${busy(p) ? 'am-blink' : ''}"></i>${statusText}${timer}</span>` : '';
    const jump = p.canJump ? `<button type="button" class="cx-jump" id="am-jump" title="Breng het ${escape(p.name)}-venster naar voren">Naar terminal <span>↗</span></button>` : '';
    const picker = p.connected && p.agent !== 'codex' ? modelPicker(p) : { button: '', menu: '' }; // the Claude model choice is for Claude Code only
    const head = p.connected
      ? `<div class="tc-page-head"><div class="cc-pill"><i style="--lamp:${lampOf(st)}" class="${busy(p) ? 'am-blink' : ''}"></i>${escape(project || p.name)}${project ? `<span>· ${escape(p.name)}</span>` : ''}</div><div class="ch-head-right">${picker.button}${pill}${jump}</div></div>${picker.menu}`
      : `<div class="tc-page-head"><div><p class="cc-kicker">${escape(p.name)}</p><p class="tc-page-title">${escape(project || p.name)}</p></div><div class="ch-head-right">${picker.button}${pill}${jump}</div></div>${picker.menu}`;
    if (!p.connected) {
      if (p.agent === 'codex' && p.available === false) return head + `<div class="cc-card cc-wide"><p class="cc-big">Codex staat nog niet op deze pc</p><p class="am-hint">Installeer Codex (de AI-programmeerhulp van OpenAI) en open hem één keer. Kom daarna hier terug om hem te koppelen.</p></div>`;
      return head + `<div class="cc-card cc-wide"><p class="cc-big">Zie meteen wat ${escape(p.name)} doet</p><p class="am-hint">Bezig, een vraag, klaar of een fout: Twenty-One laat het zien${p.agent === 'codex' ? ', terwijl jij iets anders doet' : ', ook als je Claude Code vanaf je telefoon bestuurt'}.</p>${
        p.error ? `<p class="am-error">${escape(p.error)}</p>` : p.hooksInstalled ? '<p class="am-hint">Gekoppeld. Even wachten tot Twenty-One klaar is met starten.</p>'
          : `<button type="button" class="am-primary" id="am-open-connect">Koppelen in Twenty-One</button><p class="am-hint">Eén schakelaar in Twenty-One → Verbindingen. Daarna doet Twenty-One de rest.</p>`}</div>`;
    }

    // ---- the glow, like the music page: black at the top, the colour of what happens rising from the bottom (glowOf, drawn
    // on the island). Left one big thing (the time, or how many jobs today), right a frosted card with what happens now
    // (the code, the terminal, the steps, his answer, his question); at the bottom how far he is. ----
    const steps = p.steps || [], working = busy(p), failed = ['error', 'stopped'].includes(st);
    const idle = !working && !p.prompt && !['done', 'question', 'error', 'stopped'].includes(st);
    const MARK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 4v16M4 12h16M6.3 6.3l11.4 11.4M17.7 6.3 6.3 17.7"/></svg>';
    const CHECK = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7"/></svg>';
    const CROSS = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    const where = escape(project || p.name);
    const tile = `<div class="gl-tile"><span class="${working ? 'live' : ''}">${MARK}</span>${where}</div>`;
    const eyesOf = cls => `<div class="gl-eyes ${cls}"><i></i><i></i></div>`;
    // (mid: a third button between them, e.g. "Always" when Claude Code offers to stop asking)
    const two = (noId, noLabel, yesId, yesLabel, mid) => `<div class="gl-two"><button type="button" class="gl-no" id="${noId}" ${off}>${noLabel}</button>${mid ? `<button type="button" class="gl-no" id="${mid[0]}" title="${mid[2] || ''}" ${off}>${mid[1]}</button>` : ''}<button type="button" class="gl-yes" id="${yesId}" ${off}>${yesLabel}</button></div>`;
    // Claude needs you: the question big on the left, what he wants to do in the card, two same-size buttons
    if (p.permission || p.ask || p.plan) {
      const lastAsk = steps[steps.length - 1], editAsk = p.permission && p.code && lastAsk?.kind === 'edit' && lastAsk.state === 'running';
      claudeTall = Boolean(editAsk || p.plan || p.ask);
      if (p.permission && !p.ask && !p.plan) { claudeTall = false; return `<div class="gl-main gl-perm"><div class="gl-l">${eyesOf('work ask')}<p class="gl-sub"><i class="ask"></i>${T('Wacht op jou', 'Waiting')}</p></div>`
        + `<div class="gl-r"><div class="gl-what"><span>${escape(p.permission.tool ? `${p.name}: ${(s => s.charAt(0).toLowerCase() + s.slice(1))(window.__twocodeTr?.(p.permission.tool) ?? p.permission.tool)}` : T('Claude wil iets doen', 'Claude wants to do something'))}</span></div><div class="gl-card">${editAsk ? codePanel(p.code, 2) : `<div class="lv-code"><div class="lv-file"><b>${T('TERMINAL', 'TERMINAL')}</b></div></div><div class="gl-cmd"><span>$</span>${escape(p.permission.what || p.permission.tool)}</div>`}</div>`
        + two('am-deny', T('Weigeren', 'Deny'), 'am-allow', T('Toestaan', 'Allow'), p.permission.always ? ['am-always', T('Altijd', 'Always'), T('Toestaan en niet meer vragen', 'Allow and don\'t ask again')] : null) + '</div></div>'; }
      if (p.plan) return `<div class="gl-col">${tile}<p class="gl-title">${T('Claude heeft een plan', 'Claude has a plan')}</p><div class="gl-card gl-scroll am-plan">${planHtml(p.plan)}</div>`
        + `<input id="am-plan-note" class="gl-note" maxlength="4000" placeholder="${T('Wat moet er anders? (mag leeg)', 'What should change? (optional)')}">${two('am-plan-no', T('Aanpassen', 'Change it'), 'am-plan-ok', T('Goedkeuren', 'Approve'))}</div>`;
      return `<div class="gl-col">${tile}<p class="gl-title">${T('Claude vraagt iets', 'Claude asks something')}</p><div class="gl-card gl-scroll">${askForm(p)}</div></div>`;
    }
    const phase = st === 'done' ? 3 : steps.reduce((m, x) => Math.max(m, x.kind === 'edit' ? 1 : x.kind === 'run' ? 2 : 0), 0);
    const doing = !steps.length ? T('Denkt na', 'Thinking') : [T('Code lezen', 'Reading code'), T('Aanpassen', 'Making changes'), T('Tests draaien', 'Running tests')][Math.min(2, phase)];
    const past = (state.history || []).filter(h => (h.agent || 'claude') === (p.agent || 'claude'));
    const today = past.filter(h => new Date(h.at).toDateString() === new Date().toDateString() && h.result === 'done').length;
    const five = p.usage?.fiveHour, lastStep = steps[steps.length - 1];
    const RES = { done: ['ok', CHECK], question: ['ask', '?'], error: ['bad', '!'], stopped: ['bad', '!'] };
    let big, word = false, sub, card;
    if (idle) {
      big = String(today); sub = T(today === 1 ? 'klus gedaan vandaag' : 'klussen gedaan vandaag', today === 1 ? 'job done today' : 'jobs done today');
      card = past.length ? `<p class="gl-cap">${T('Laatst gedaan', 'Recently')}</p>` + past.slice(0, 3).map(h => { const [cls, g] = RES[h.result] || ['', '•'];
        return `<div class="gl-row h"><i class="gl-dot ${cls}">${g}</i><b>${escape(h.prompt)}</b><em>${escape(new Date(h.at).toLocaleTimeString(...window.__twocodeTimeArgs()))}</em></div>`; }).join('')
        : `<div class="gl-empty">${T(`Geef ${escape(p.name)} een klus in je terminal. Hier zie je dan live wat hij doet: de code, de tests en zijn antwoord.`, `Give ${escape(p.name)} a job in your terminal. You'll see what it does here, live: the code, the tests and its answer.`)}</div>`;
    } else if (st === 'question') {
      big = T('Jouw beurt', 'Your turn'); word = true; sub = T('Claude wacht op je antwoord', 'Claude is waiting for you');
      card = `<div class="gl-md md">${md(p.question || p.lastMessage || T('Claude heeft je nodig in de terminal.', 'Claude needs you in the terminal.'))}</div>`;
    } else if (st === 'done') {
      big = p.elapsed ? clock(p.elapsed) : T('Klaar', 'Done'); word = !p.elapsed; sub = T('Klaar · alle stappen gedaan', 'Done · every step');
      card = `<div class="gl-md md">${p.lastMessage ? md(p.lastMessage) : T('Klaar. Zijn antwoord staat in de terminal.', 'Done. The answer is in the terminal.')}</div>`;
    } else if (failed) {
      big = T('Gestopt', 'Stopped'); word = true; sub = escape(p.detail || T('Er ging iets mis', 'Something went wrong'));
      card = `<div class="gl-md"><b>${escape(p.detail || T('Er ging iets mis', 'Something went wrong'))}</b><br>${T('Kijk in de terminal wat er misging.', 'Check the terminal to see what went wrong.')}</div>`;
    } else {
      big = `<span class="cx-timer" data-live="1" data-base="${p.elapsed || 0}" data-at="${Date.now()}">${clock(p.elapsed || 0)}</span>`;
      sub = `${doing} · ${T(`stap ${Math.min(4, phase + 1)} van 4`, `step ${Math.min(4, phase + 1)} of 4`)}`;
      card = lastStep?.kind === 'edit' && p.code ? codePanel(p.code, 3)
        : lastStep?.kind === 'run' && p.run ? termPanel(p.run)
        : !steps.length ? `<div class="gl-think">${p.prompt ? `<p>“${escape(p.prompt)}”</p>` : ''}<span>${T('Claude denkt na…', 'Claude is thinking…')}</span></div>`
        : steps.slice(-3).map(x => { const now = x.state === 'running';
          return `<div class="gl-row${now ? '' : ' d'}"><i class="ic">${svg(x.kind, 12)}</i><b>${(now ? NOW : PAST)[x.kind] || ''}</b><code>${escape(shortWhat(x.kind, x.what))}</code>${now ? '<span class="gl-spin"></span>' : `<span class="gl-ok">${CHECK}</span>`}</div>`; }).join('');
    }
    const PH = [T('Lezen', 'Read'), T('Aanpassen', 'Edit'), T('Testen', 'Test'), T('Klaar', 'Done')];
    const stepBar = `<div class="gl-steps${st === 'done' ? ' done' : failed ? ' bad' : ''}">${PH.map((label, i) => {
      const cls = st === 'done' || i < phase ? 'd' : i === phase && (working || failed) ? 'n' : ''; return `<div class="${cls}"><i></i><span>${label}</span></div>`; }).join('')}</div>`;
    const compose = p.canReply && !p.ask && !p.plan && !p.permission
      ? `<div class="ch-compose gl-compose"><textarea id="am-answer" maxlength="5000" placeholder="${st === 'question' ? T('Jouw antwoord…', 'Your answer…') : T('Typ iets voor Claude…', 'Type something for Claude…')}" aria-label="${T('Bericht aan Claude Code', 'Message to Claude Code')}"></textarea><button type="button" id="am-send" aria-label="${T('Stuur', 'Send')}" title="${T('Stuur (Enter)', 'Send (Enter)')}">↑</button></div>` : '';
    const limit = five ? `<div class="gl-limit">${T('5-uurslimiet', '5-hour limit')}<i><s style="width:${Math.min(100, five.used)}%"></s></i><b>${five.used}%</b></div>` : '<span></span>';
    const term = p.canJump ? `<button type="button" class="gl-chip" id="am-jump" title="${T('Breng de terminal naar voren', 'Bring the terminal to the front')}">Terminal<em>↗</em></button>` : '';
    const foot = `<div class="gl-foot">${idle ? limit : compose || stepBar}<span class="gl-tools">${idle ? picker.button : ''}</span>${idle ? picker.menu : ''}</div>`;
    const look = working ? 'work' : st === 'done' ? 'done' : st === 'question' ? 'ask' : failed ? 'bad' : '';
    const label = working ? (!steps.length ? T('Denkt na', 'Thinking') : [T('Lezen', 'Reading'), T('Aanpassen', 'Editing'), T('Testen', 'Testing')][Math.min(2, phase)]) : st === 'done' ? T('Klaar', 'Done') : st === 'question' ? T('Jouw beurt', 'Your turn') : failed ? T('Gestopt', 'Stopped') : T(today === 1 ? 'klus vandaag' : 'klussen vandaag', today === 1 ? 'job today' : 'jobs today');
    const bigShown = st === 'question' ? '' : failed ? '' : big;
    return `<div class="gl-main"><div class="gl-l">${eyesOf(look)}<div>${bigShown ? `<p class="gl-big${word ? ' word' : ''}">${bigShown}</p>` : ''}<p class="gl-sub"><i class="${look}"></i>${label}</p></div></div>`
      + `<div class="gl-r"><div class="gl-what"><span>${escape(p.prompt || project || p.name)}</span>${term}</div><div class="gl-card">${card}</div>${foot}</div></div>`;
  }
  // Multiple-choice questions: click an option (or several), or type your own answer.
  let askKey = '', askPick = {}, askOther = {};
  function askForm(p) {
    const keyNow = p.sessionId + JSON.stringify(p.ask);
    if (keyNow !== askKey) { askKey = keyNow; askPick = {}; askOther = {}; }
    return p.ask.map((q, qi) => `<div class="am-ask"><div class="am-said">${q.header ? `<span class="am-tag">${escape(q.header)}</span>` : ''}${escape(q.question)}${q.multiSelect ? ` <i>(${T('kies er meer', 'pick one or more')})</i>` : ''}</div><div class="am-options">${
      q.options.map((o, oi) => `<button type="button" class="am-option ${(askPick[qi] || []).includes(o.label) ? 'on' : ''}" data-q="${qi}" data-o="${oi}" title="${escape(o.description)}"><b>${escape(o.label)}</b>${o.description ? `<small>${escape(o.description)}</small>` : ''}</button>`).join('')
    }</div><div class="cc-inline"><input class="am-note" data-other="${qi}" maxlength="2000" placeholder="${T('Of typ je eigen antwoord…', 'Or type your own answer…')}" value="${escape(askOther[qi] || '')}">${qi === p.ask.length - 1 ? `<button type="button" class="am-primary" id="am-ask-send" ${pending ? 'disabled' : ''}>${T('Stuur', 'Send')}</button>` : ''}</div></div>`).join('');
  }
  function bindAsk(p) {
    for (const b of root.querySelectorAll('[data-q]')) b.addEventListener('click', () => {
      const qi = Number(b.dataset.q), q = p.ask[qi], label = q.options[Number(b.dataset.o)].label, list = askPick[qi] || [];
      askPick[qi] = q.multiSelect ? (list.includes(label) ? list.filter(x => x !== label) : [...list, label]) : [label];
      askOther[qi] = '';
      // One single-choice question: one click is enough.
      if (p.ask.length === 1 && !q.multiSelect) sendAsk(p); else render();
    });
    for (const input of root.querySelectorAll('[data-other]')) {
      input.addEventListener('input', () => { askOther[Number(input.dataset.other)] = input.value; });
      input.addEventListener('focus', () => { projectInputFocused = true; sendInteractive(true); });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sendAsk(p); } });
    }
    bind('am-ask-send', () => sendAsk(p));
  }
  function sendAsk(p) {
    const answers = {};
    p.ask.forEach((q, qi) => { answers[q.question] = (askOther[qi] || '').trim() || (q.multiSelect ? askPick[qi] || [] : (askPick[qi] || [])[0] || ''); });
    hooks('aiMonitorHooksAnswer', p.sessionId, answers);
  }
  // Plans are Markdown: show headings, lists and code in a readable way.
  function planHtml(md) {
    return escape(md).split('\n').map(line => {
      const inline = s => s.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
      if (/^#{1,6}\s/.test(line)) return `<h4>${inline(line.replace(/^#+\s*/, ''))}</h4>`;
      if (/^\s*([-*]|\d+\.)\s/.test(line)) return `<div class="am-li">• ${inline(line.replace(/^\s*([-*]|\d+\.)\s/, ''))}</div>`;
      return line.trim() ? `<p>${inline(line)}</p>` : '';
    }).join('');
  }
  async function hooks(method, ...args) {
    if (pending) return; pending = true; error = ''; render();
    try { const result = await api[method](...args); if (result.ok) update(result); else error = result.error; }
    catch (failure) { error = failure.message; } finally { pending = false; render(); }
  }
  async function launch() {
    const result = await api.aiMonitorOpenSource(selected);
    if (!result.ok) { error = result.error; render(); }
  }
  async function choose() { choosing = true; error = ''; render(); await scan(); }
  async function scan() {
    if (pending) return; pending = true; render();
    try { const result = await api.aiMonitorWindows(); windows = result.windows || []; error = result.ok ? '' : result.error; }
    catch (failure) { error = failure.message; } finally { pending = false; render(); }
  }
  async function connect(targetId) {
    if (pending || !targetId) return; const provider = selected; pending = true; error = ''; render();
    try {
      const result = await api.aiMonitorConnect(provider, targetId);
      if (result.ok) { choosing = false; update(result); } else error = result.error;
    } catch (failure) { error = failure.message; } finally { pending = false; render(); }
  }
  async function reply() {
    const p = current(), text = (drafts.get(key(p)) || '').trim();
    if (pending || !p?.canReply || !text) return;
    const provider = p.provider, questionId = p.questionId, draftKey = key(p);
    pending = true; error = ''; render();
    try {
      // Claude Code: the answer wakes Claude through the asyncRewake Stop hook.
      const result = p.kind === 'hooks' ? await api.aiMonitorHooksReply(p.sessionId, text) : await api.aiMonitorReply(provider, questionId, text);
      if (result.ok && p.kind === 'hooks') update(result);
      if (result.ok) drafts.delete(draftKey); else error = result.error;
    } catch (failure) { error = failure.message; } finally { pending = false; render(); }
  }
  let stateAt = Date.now(); // when the last state arrived (the clock on Home counts on from there)
  // Done: a steady blue until you look at it (open the Claude page), then green that slowly fades away.
  let doneKey = '', doneSeenAt = 0;
  const DONE_BLUE = '#0a84ff', DONE_FADE = 2800;
  window.__twocodeDoneLook = p => { // null, or { colour, k } (k: how strong the glow is, 0..1)
    if (!p || p.state !== 'done' || p.permission) return null;
    if (!doneSeenAt) return { colour: DONE_BLUE, k: 1, fresh: true };
    const k = 1 - (performance.now() - doneSeenAt) / DONE_FADE;
    return k > 0 ? { colour: '#30d158', k: k * k * (3 - 2 * k) } : null;
  };
  // Claude's and Codex's own notifications (notify-ui.js): when one changes state. If you are looking at it, only the sound.
  const lastHook = {};
  function tellStates() {
    const tell = window.__twocodeNotice;
    for (const p of providers()) {
      if (p.kind !== 'hooks') continue;
      const was = lastHook[p.provider], now = lastHook[p.provider] = p.permission ? 'permission' : p.state;
      if (!was || was === now) continue;
      const who = p.agent === 'codex' ? 'Codex' : 'Claude Code', project = p.source?.title && p.source.title !== 'Geen actieve sessie' ? p.source.title : '';
      const line = text => (project ? project + ': ' : '') + String(text || '').slice(0, 180), reopen = () => open(p.provider, true);
      const looking = () => mode === 'expanded' && ['monitor', 'assistant'].includes(currentView) && current()?.provider === p.provider, stillThis = what => { const q = providers().find(x => x.provider === p.provider); return !q || (q.permission ? 'permission' : q.state) !== what || looking(); };
      const view = { label: T('Bekijk', 'View'), primary: true, run: reopen };
      if (now === 'permission') {
        const quick = !p.ask && !p.plan && p.permission.kind === 'tool';
        tell('claudeAsk', { seen: looking(), title: T(`${who} wil toestemming`, `${who} asks for permission`), body: line(p.permission.what || window.__twocodeTr?.(p.permission.tool) || p.permission.tool), open: reopen, until: () => stillThis('permission'), btns: quick
          ? [{ label: T('Weiger', 'Deny'), run: () => hooks('aiMonitorHooksDecide', p.sessionId, 'deny') },
            ...(p.permission.always ? [{ label: T('Altijd', 'Always'), run: () => hooks('aiMonitorHooksDecide', p.sessionId, 'always') }] : []),
            { label: T('Sta toe', 'Allow'), primary: true, run: () => hooks('aiMonitorHooksDecide', p.sessionId, 'allow') }] : [view] });
      } else if (now === 'question') tell('claudeQuestion', { seen: looking(), title: T(`${who} heeft een vraag`, `${who} has a question`), body: line(p.question || p.detail), open: reopen, btns: [view] });
      else if (now === 'done') tell('claudeDone', { seen: looking(), title: T(`${who} is klaar`, `${who} is done`), body: line(p.prompt || p.detail), right: p.elapsed ? clockText({ elapsed: p.elapsed }) : undefined, open: () => goTo(providers().find(x => x.provider === p.provider) || p) });
      else if (now === 'error') tell('claudeError', { seen: looking(), title: T(`${who}: fout`, `${who}: error`), body: line(p.detail), open: () => goTo(providers().find(x => x.provider === p.provider) || p) });
    }
  }
  function update(next) {
    stateAt = Date.now();
    { const q = next?.providers?.find?.(x => x.kind === 'hooks' && x.state === 'done'), key = q ? `${q.sessionId}:${q.elapsed}:${q.prompt}` : '';
      if (key && key !== doneKey) { doneKey = key; doneSeenAt = 0; } if (!key) doneKey = ''; }
    if (!next?.ok || !Array.isArray(next.providers)) return;
    state = next; window.__twocodeMonitorIndicator = providers();
    tellStates();
    try { askSize(); settleSize(); } catch {} // a task that starts or ends changes the small island right away
    // Ignore ticking clocks when deciding to re-render; they are updated in place below.
    const signature = JSON.stringify(providers().map(p => ({ ...p, elapsed: 0, list: p.list?.map(s => ({ ...s, elapsed: 0 })) }))) + (state.history?.[0]?.at || 0);
    if (signature !== lastSignature) {
      lastSignature = signature; render();
      statusReader.textContent = providers().map(p => `${p.name}: ${labels[p.state]}`).join('. ');
    }
    const clock = root.querySelector('.am-clock:not([data-sid])'); if (clock) clock.textContent = `${current()?.elapsed || 0}s`;
    for (const item of current()?.list || []) {
      const el = [...root.querySelectorAll('.am-clock[data-sid]')].find(x => x.dataset.sid === item.id); if (el) el.textContent = `${item.elapsed}s`;
    }
  }
  // ---- Traffic light in the eyes of the ghost (read by drawGhost in mascot.html) ----
  // Bright, saturated colours so they stand out from the normal pale eyes, even in the tiny island.
  const EYES = { running: { color: '#ff9a1f', blink: true }, sending: { color: '#ff9a1f', blink: true }, question: { color: '#ff9a1f' },
    done: { color: '#22e05a' }, error: { color: '#ff3b3b' }, stopped: { color: '#ff3b3b' }, unavailable: { color: '#ff3b3b' } };
  const PRIORITY = ['question', 'error', 'stopped', 'unavailable', 'running', 'sending', 'done'];
  const top = () => providers().filter(shown).sort((a, b) => PRIORITY.indexOf(a.state) - PRIORITY.indexOf(b.state))[0];
  // A colour-blind friendly palette can be chosen in Settings (twocode-fun.js provides it).
  const paletteColour = state => {
    const pal = window.__twocodePalette?.(); if (!pal) return null;
    return { running: pal.busy, sending: pal.busy, question: pal.question, done: pal.done, error: pal.error, stopped: pal.error, unavailable: pal.error }[state] || null;
  };
  window.__twocodeEyes = () => { const s = top()?.state, e = EYES[s]; return e ? { ...e, color: paletteColour(s) || e.color } : null; };
  window.__twocodeStateColour = s => paletteColour(s) || EYES[s]?.color || null; // your traffic-light colours (Robo's stage glows in them too)
  // Leaving the Claude Code screen any other way (home, apps, settings) also counts as "seen".
  const oldSetView = setView;
  setView = function (next) { if (next !== 'monitor') markSeen(); return oldSetView(next); };

  // ---- Three sizes: small (rest), medium (compact: music), large (expanded) ----
  const music = () => Boolean(spotifyConnected && spotifyState.is_playing && spotifyState.track);
  // Medium size stays while music plays or a focus timer runs.
  // ...and while it shows a short message (startup "Hoi!", volume bar, battery), so that isn't closed right away.
  const needsAnswer = () => { const p = top(); return Boolean(p && (p.permission || p.state === 'question')); };
  // While music plays the island shows it at medium size. The little button on it tucks the music away
  // (the island stays small, the line under it still shows how far the song is); hover the island and press it again to bring it back.
  let musicTucked = false; try { localStorage.removeItem('twocode:music-tucked'); } catch {}
  function tuckMusic(on) {
    musicTucked = on; try { localStorage.setItem('twocode:music-tucked', on ? '1' : '0'); } catch {}
    window.__twocodeChime?.('pop'); oldSetMode(on ? 'rest' : 'compact', false); if (on) holdClosed = true;
  }
  const claudeWorking = () => { const p = top(); return Boolean(p && busy(p)); }; // a running task is a Live Activity: it stays in view, small
  // for the tucked-away island (tuck-ui.js): the colour of its thin line, and whether Claude or Codex needs you
  window.__twocodeIslandState = () => { const p = top(), f = window.__twocodeFocus, focusing = Boolean(f?.active());
    const phase = (p?.steps || []).reduce((m, x) => Math.max(m, x.kind === 'edit' ? 1 : x.kind === 'run' ? 2 : 0), 0);
    const sung = spotifyState?.duration_ms ? Math.min(1, ((spotifyState.progress_ms || 0) + (spotifyState.is_playing ? performance.now() - spotifySyncAt : 0)) / spotifyState.duration_ms) : 0;
    return { needsYou: needsAnswer(), working: claudeWorking(), done: p?.state === 'done', music: music(), focus: focusing,
      progress: claudeWorking() ? (phase + 1) / 4 : p?.state === 'done' ? 1 : focusing ? 1 - f.left() / f.length() : music() ? sung : 0 }; };
  const medium = () => Boolean(window.__twocodeNoticeSize?.()) || (music() && !musicTucked) || Boolean(window.__twocodeFocus?.active()) || Boolean(window.__twocodeCompactMessage?.()) || needsAnswer() || claudeWorking();
  window.__twocodeStatus = () => top();
  let holdClosed = false;
  window.__twocodeHoldClosed = () => { holdClosed = true; };
  // While Claude waits for an answer the small island pops open and gets wider (room for the buttons).
  let wideFor = false;
  // A song with lyrics (lyrics-ui.js) makes the small island wider too: room for the line that is sung. Also while Claude
  // works: then he gets a little island of his own on the left (drawSmall, a user's idea), so the lyrics never disappear.
  const lyricsWide = () => Boolean(window.__twocodeLyrics?.has()) && music() && !musicTucked && !window.__twocodeFocus?.active() && !needsAnswer();
  // music in the middle, Claude in his pill on the left (drawSmall): with or without lyrics
  window.__twocodeLyricsWide = () => lyricsWide(); // (lux-ui.js: the medium lyrics island)
  // (lux-ui.js: the small island shows only Claude at work, so it may be the roomier 340 x 46 with what he does in words)
  window.__twocodeLuxMusicOnly = () => !window.__twocodeListenPill?.() && !window.__twocodeNoticeSize?.() && !needsAnswer() && !window.__twocodeCompactMessage?.() && !lyricsWide() && musicOnly();
  window.__twocodeLuxClaudeOnly = () => !window.__twocodeListenPill?.() && !window.__twocodeNoticeSize?.() && !needsAnswer() && !window.__twocodeCompactMessage?.() && !lyricsWide() && !musicOnly() && claudeWorking();
  const musicSplit = () => music() && !musicTucked && !window.__twocodeFocus?.active() && !needsAnswer();
  const musicOnly = () => musicSplit() && !window.__twocodeCompactMessage?.();
  const compactWidth = () => window.__twocodeListenPill?.()?.width || window.__twocodeNoticeSize?.()?.width || (needsAnswer() ? (window.__twocodeLuxTogether?.() ? 470 : 440) : window.__twocodeCompactMessage?.() ? 300 : lyricsWide() ? window.__twocodeLyrics.width() : musicOnly() ? 290 : claudeWorking() ? 210 : window.__twocodeFocus?.active() ? 170 : 300);
  function lyricSize() {
    const w = compactWidth();
    if (w !== UI.COMPACT_W) UI.COMPACT_W = w;
    // (Lux, launch mode only: its sizes can differ from COMPACT_W / COMPACT_H, so it follows modeTarget; a hop or knock is a few px)
    const goal = window.__twocodeLux?.() ? modeTarget('compact') : null;
    if (mode === 'compact' && !transition && (goal ? Math.abs(visual.width - goal.width) > 1 || Math.abs(visual.height - goal.height) > 6 : Math.abs(visual.width - w) > 1)) oldSetMode('compact', false);
  }
  function askSize() {
    const want = needsAnswer();
    if (want === wideFor) return; wideFor = want;
    UI.COMPACT_W = compactWidth();
    if (want && mode !== 'expanded') oldSetMode('compact', false);
    else if (!want && mode === 'compact') { oldSetMode('compact', false); settleSize(); }
  }
  const oldTargetHeight = targetHeight, oldSetMode = setMode, oldDrawExpanded = drawExpanded, oldDrawSmall = drawSmall, oldHover = updateHover;
  targetHeight = function () { return ['monitor', 'assistant'].includes(currentView) ? (claudeTall ? 318 : 268) : oldTargetHeight(); };
  // While music plays, the island rests at medium size so the sound wave stays visible.
  let hoverOpening = false;
  setMode = function (next, playSound = true) {
    if (next === 'expanded' && hoverOpening && mode === 'compact' && lyricsWide() && currentView !== 'spotify') setView('spotify'); // a song with lyrics: its page, with the lines before and after
    return oldSetMode(next === 'rest' && medium() ? 'compact' : next, playSound);
  };
  function settleSize() {
    if (!introFinished || pointer.known && inside(pointer.x, pointer.y, islandBounds)) return;
    if (medium() && mode === 'rest') setMode('compact', false);
    else if (!medium() && mode === 'compact') oldSetMode('rest', false);
  }
  window.__twocodeSettleSize = settleSize;
  setInterval(async () => { await refreshSpotify(); settleSize(); }, 4000);
  // the Claude page always has its light: Claude's own colour, stronger while he works; amber when he needs you, red when he
  // stopped, blue and then green when he is done
  const glowOf = p => { const own = { colour: p?.agent === 'codex' ? '#3b82f6' : '#ef7b37', k: 0.9 };
    if (!p?.connected || p.kind !== 'hooks') return own;
    if (p.permission || p.state === 'question') return { colour: '#d6a00a', k: 1 };
    if (['error', 'stopped'].includes(p.state)) return { colour: '#e22c3e', k: 1 };
    if (busy(p)) return { ...own, k: 0.88 + 0.12 * Math.sin(performance.now() / 1000 * Math.PI) }; // it breathes while he works
    return window.__twocodeDoneLook(p) || own; };
  window.__twocodeMonitorEyes = () => ['monitor', 'assistant'].includes(currentView) && current()?.kind === 'hooks' && Boolean(current()?.connected); // the page shows Robo's big eyes itself (never two pairs)
  drawExpanded = function (alpha) {
    if (currentView === 'shortcuts') { drawHeader(alpha); return; } // choosing your Home (home-ui.js)
    if (!['monitor', 'assistant'].includes(currentView)) return oldDrawExpanded(alpha);
    const glow = glowOf(current()); if (glow) { window.__twocodeTintIsland = glow.colour; window.__twocodeTintStrength = glow.k; window.__twocodeTintAt = performance.now(); }
    drawHeader(alpha); // the Claude page uses the full width (no Twenty-One, usage is shown in the page itself)
    // Claude Code / Codex: the page itself (DOM) draws its cards on the black glass
  };
  // Medium island: music (or status text) on the left, the ghost with traffic-light eyes far right.
  // Medium island, one clear layout: [left: cover or icon] [middle: wave or text] [right: Twenty-One].
  // Twenty-One's eyes always show Claude's state; a focus timer is the ring around him.
  // Priority for the middle: short message > Claude needs you > music > focus timer > Claude working.
  let attentionState = '', attentionUntil = 0;
  // The sound wave shows only REAL sound from this PC. Silent (or the sound can't be read) → flat little dots,
  // never a fake wave. Each bar eases to its level, so it rises and settles smoothly.
  const barLevels = {};
  function bars(x0, x1, y, count, maxH = 18) {
    const levels = window.__twocodeAudioLevels?.(), w = (x1 - x0) / count, key = count + ':' + Math.round(maxH);
    const shown = barLevels[key] ||= new Array(count).fill(0);
    const loud = levels ? Math.max(...levels) : 0;
    ctx.save(); const colour = window.__twocodeAlbumColour || '#1ed760';
    for (let i = 0; i < count; i++) {
      const want = levels && loud > 0.04 ? levels[Math.floor(i * levels.length / count)] : 0;
      shown[i] += (want - shown[i]) * (want > shown[i] ? 0.55 : 0.18);
      const h = Math.max(2, Math.min(maxH, 2 + shown[i] * (maxH - 2)));
      ctx.globalAlpha = 0.35 + 0.65 * Math.min(1, shown[i] * 4); ctx.fillStyle = colour;
      ctx.beginPath(); ctx.roundRect(x0 + i * w + w * 0.2, y - h / 2, w * 0.6, h, 1.5); ctx.fill();
    }
    ctx.restore();
  }
  window.__twocodeBars = bars; // also used by the big Spotify player
  // Medium island (36 px high): [album cover] [real sound wave] [Twenty-One], like the iPhone's Dynamic Island.
  // While Spotify plays (here or on your phone): a thin line along the bottom of the small island shows how far the song is.
  function songLine() {} // no progress line under the island anymore: the Dynamic Island keeps its edge clean
  // the music button on the medium island: caught on pointerdown (window, capture), before the island reacts to the press
  let swallowTuckClick = false, tuckBox = null; // where the button is (kept between frames)
  window.addEventListener('pointerdown', e => {
    if (mode !== 'compact' || !music() || !inside(e.clientX, e.clientY, tuckBox)) return;
    e.preventDefault(); e.stopImmediatePropagation(); swallowTuckClick = true; tuckMusic(!musicTucked);
  }, true);
  for (const type of ['pointerup', 'mousedown', 'mouseup', 'click']) window.addEventListener(type, e => { if (!swallowTuckClick) return; e.preventDefault(); e.stopImmediatePropagation(); if (type === 'click') swallowTuckClick = false; }, true);
  function smallStatus(p) {
    if (!EN()) return p.detail || labels[p.state];
    const step = (p.steps || []).filter(x => x.state === 'running').pop();
    if (busy(p)) return step ? `${NOW[step.kind] || 'Working'} ${shortWhat(step.kind, step.what)}` : 'Working';
    return { done: 'Done ✓', question: 'Waiting for you', error: 'Error', stopped: 'Stopped' }[p.state] || 'Idle';
  }
  // The volume in the small island: Robo's eyes stretch out into the bar (a customer's idea), the speaker fades in, and the
  // bar glides to the new level.
  let volumeShown = null, volumeAt = 0, volumeLast = 0;
  function drawVolume(icon, level, left, cy, right) {
    const now = performance.now(), k = Math.max(0, Math.min(1, level / 100));
    if (now - volumeLast > 400 || volumeShown == null) { volumeAt = now; volumeShown = k; } // shown again: start from the eyes
    volumeLast = now;
    volumeShown += (k - volumeShown) * 0.35;
    const e = 1 - Math.pow(1 - Math.min(1, (now - volumeAt) / 280), 3), mix = (a, b) => a + (b - a) * e;
    const mid = (left + right) / 2, x = left + 34, w = Math.max(60, right - x - 2), h = 8, y = cy - h / 2, fill = Math.max(h, w * volumeShown);
    ctx.save();
    ctx.globalAlpha = e;
    window.__twocodeIcon?.('speaker', left + 10, cy, 18, '#ffffff', level / 100, '#ffffff');
    ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fill();
    ctx.restore();
    // the eyes (about 6 x 10, 17 px apart, drawIslandEyes): the left one becomes the white part, the right one flows into its end
    ctx.save();
    ctx.fillStyle = '#ffffff'; ctx.shadowColor = 'rgba(255,255,255,.6)'; ctx.shadowBlur = 10 * (1 - e);
    const lw = mix(6, fill), lh = mix(10, h), ly = mix(cy - 5, y);
    ctx.beginPath(); ctx.roundRect(mix(mid - 11.5, x), ly, lw, lh, Math.min(lw, lh) / 2); ctx.fill();
    if (e < 1) { const rw = mix(6, h); ctx.globalAlpha = 1 - e; ctx.beginPath(); ctx.roundRect(mix(mid + 5.5, x + fill - h), ly, rw, lh, Math.min(rw, lh) / 2); ctx.fill(); }
    ctx.restore();
  }
  // Robo listens (chat-ui.js, Ctrl+Alt+Space; the user asked for "a whole new animation" instead of the chat): his two eyes
  // open up into a sound wave that follows your voice (the middle moves most, a slow breath while you are quiet), a light
  // rises from below, stronger the louder you talk; while he works out what you said the wave lies down into a row of dots
  // with a light running along it; then your words rise in, and his answer. The first time: what is coming in, as a ring.
  const listenWave = [];
  let listenGlow = 0;
  function drawListen(p, left, cy, right, mid, H) {
    const now = performance.now(), age = now - p.at, ease = t => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
    const { x: ix, width: iw } = islandBounds;
    const light = (k, drift) => { // the colour from below: blue drifting to violet
      if (k < 0.01) return;
      const mixK = 0.5 + 0.5 * Math.sin(drift), rgb = `${Math.round(10 + 150 * mixK)},${Math.round(132 - 52 * mixK)},${Math.round(255 - 25 * mixK)}`;
      ctx.save(); islandPath(ix, 0, iw, H, visual.radius); ctx.clip(); ctx.translate(ix + iw / 2, H * 1.42); ctx.scale(iw * 0.8, H * 1.25);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, `rgba(${rgb},${k})`); g.addColorStop(0.55, `rgba(${rgb},${0.38 * k})`); g.addColorStop(0.88, `rgba(${rgb},0)`);
      ctx.fillStyle = g; ctx.fillRect(-1, -2, 2, 2); ctx.restore();
    };
    if (p.stage === 'learning') {
      const k = Math.max(0, Math.min(1, p.progress || 0)), r = 8.5, rx = right - r - 2;
      text(p.label || T('Robo leert luisteren… eenmalig', 'Robo is learning to listen… one time'), left + 4, cy + 4.5, 13, '#ffffff', 600, 'left', rx - r - 52 - left);
      monoText(`${Math.round(k * 100)}%`, rx - r - 8, cy + 4.5, 12, 'rgba(255,255,255,.62)', 500, 'right');
      ctx.save(); ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(rx, cy, r, 0, Math.PI * 2); ctx.stroke();
      if (k > 0) { ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.arc(rx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke(); }
      ctx.restore();
      return;
    }
    if (p.stage === 'listen' || p.stage === 'hear') {
      const N = 15, gap = 7, span = (N - 1) * gap, e = ease(age / 420), hearing = p.stage === 'hear', level = hearing ? 0 : Math.min(1, Math.pow(p.level || 0, 0.7) * 1.25);
      listenGlow += ((hearing ? 0.22 : 0.3 + 0.62 * level) - listenGlow) * 0.12;
      light(listenGlow * e, now / 1300);
      ctx.save(); ctx.fillStyle = '#ffffff'; ctx.shadowColor = 'rgba(255,255,255,.5)'; ctx.shadowBlur = 6;
      for (let i = 0; i < N; i++) {
        const middle = Math.exp(-Math.pow((i - (N - 1) / 2) / (N * 0.38), 2)); // the middle moves most
        const wobble = 0.4 + 0.6 * Math.abs(Math.sin(now / 130 + i * 1.9) * Math.cos(now / 330 - i * 0.7));
        const breath = 3.2 * (0.5 + 0.5 * Math.sin(now / 380 - i * 0.5)) * (1 - Math.min(1, level * 2.5)); // a slow wave rolls along while you are quiet
        const want = hearing ? 3.6 : 3.6 + breath + level * middle * wobble * (H - 10);
        listenWave[i] = listenWave[i] == null ? 3.6 : listenWave[i] + (want - listenWave[i]) * (want > listenWave[i] ? 0.5 : 0.2);
        // out of the eyes (about 6 x 10, 17 px apart, drawIslandEyes) into the wave
        const to = mid - span / 2 + i * gap, from = i < (N - 1) / 2 ? mid - 8.5 : i > (N - 1) / 2 ? mid + 8.5 : mid;
        const x = from + (to - from) * e, w = 6.2 + (3.6 - 6.2) * e, h = 10 + (listenWave[i] - 10) * e;
        if (hearing) { const run = ((age / 1000) % 1.25) / 1.25 * (N + 8) - 4; ctx.globalAlpha = 0.3 + 0.7 * Math.exp(-Math.pow(i - run, 2) / 3.5); }
        else ctx.globalAlpha = Math.abs(i - (N - 1) / 2) === 1 ? 1 : ease((e - 0.12) / 0.5); // (the two next to the middle are his eyes; the others appear as they spread)
        ctx.beginPath(); ctx.roundRect(x - w / 2, cy - h / 2, w, h, w / 2); ctx.fill();
      }
      ctx.restore();
      return;
    }
    // your words (said) or his answer (reply): they rise in, his light fades out under them
    listenGlow *= 0.9; light(listenGlow, now / 1300);
    const e = ease(age / 320);
    ctx.save(); ctx.globalAlpha = e;
    text(p.text, mid, cy + 5 + (1 - e) * 5, 14, p.bad ? 'rgba(255,255,255,.66)' : '#ffffff', 600, 'center');
    ctx.restore();
  }
  window.__twocodeDrawListen = drawListen; // (tests)
  // Lux (launch mode only): the medium lyrics island. The cover (38), the line that is sung (word by word, 15 px), under it
  // the song and the artist, the time left on the right. false: nothing to show here (the normal small layout draws)
  function luxLyrics(left, right, cy, H) {
    const sung = lyricsWide() ? window.__twocodeLyrics?.now?.() : null, track = spotifyState?.track; if (!track) return false;
    const cs = 38, cx0 = left - 4, top = cy - cs / 2;
    if (albumImage?.complete && albumImage.naturalWidth) { ctx.save(); ctx.beginPath(); ctx.roundRect(cx0, top, cs, cs, 10); ctx.clip(); ctx.drawImage(albumImage, cx0, top, cs, cs); ctx.restore(); }
    else box(cx0, top, cs, cs, 10, '#1c1c1e');
    const dur = spotifyState?.duration_ms || 0, at = Math.min(dur, (spotifyState.progress_ms || 0) + (spotifyState.is_playing ? performance.now() - spotifySyncAt : 0));
    const left$ = dur ? Math.max(0, Math.round((dur - at) / 1000)) : 0, timeText = dur ? `-${Math.floor(left$ / 60)}:${String(left$ % 60).padStart(2, '0')}` : '';
    if (timeText) monoText(timeText, right, cy + 4, 12, 'rgba(255,255,255,.6)', 500, 'right');
    const x0 = cx0 + cs + 14, w = right - (timeText ? 52 : 4) - x0, line = sung?.text || track.name || '';
    (window.__twocodeSongText || (d => d()))(() => {
      ctx.save(); ctx.font = '600 15px Inter, "Segoe UI", sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      let t = line; while (t.length > 1 && ctx.measureText(t).width > w) t = t.slice(0, -2) + '…';
      ctx.fillStyle = '#ffffff';
      if (sung?.text && sung.lit != null && window.__twocodeLitText) window.__twocodeLitText(t, x0, cy - 7, sung.lit, 0.32);
      else ctx.fillText(t, x0, cy - 7);
      ctx.restore();
      text([track.name, track.artist].filter(Boolean).join(' · '), x0, cy + 14, 11.5, 'rgba(255,255,255,.55)', 500, 'left', w);
    });
    return true;
  }
  // Lux "together" (launch mode only): eyes looking down at the top, "Claude asks" in amber, what he wants to do, the
  // command in grey, "Don't allow" and "Allow" as round buttons; the bottom row only when a song plays or Focus runs
  window.__twocodeLuxTogether = () => { const p = top(); return Boolean(window.__twocodeLux?.() && p?.permission?.kind === 'tool' && !p.ask && !p.plan); };
  window.__twocodeLuxTogetherRow = () => Boolean(music() || window.__twocodeFocus?.active());
  function luxAsk(p, left, right, H) {
    if (!window.__twocodeLux?.()) return false;
    const x0 = left + 8, x1 = right - 8, mid = (left + right) / 2;
    (window.__twocodeIslandEyes || drawGhost)(mid, 16, 0.8); hit.ghost = { x: mid - 22, y: 0, width: 44, height: 28 };
    const bh = 32, yesW = 84, noW = 112, by = 46, yesX = x1 - yesW, noX = yesX - 8 - noW;
    text(T(`${p.name || 'Claude'} vraagt`, `${p.name || 'Claude'} asks`), x0, 46, 12, '#ffb547', 600, 'left', noX - 16 - x0);
    const title = window.__twocodeTr?.(p.permission.tool) ?? p.permission.tool, what = String(p.permission.what || '');
    const file = what && !/s/.test(what) ? what.split(/[\/]/).pop() : '';
    text(file ? `${title}` : title, x0, 68, 17, '#ffffff', 600, 'left', noX - 16 - x0);
    if (what) { ctx.save(); ctx.font = '500 12px "JetBrains Mono", Consolas, monospace'; let t = what; while (t.length > 1 && ctx.measureText(t).width > noX - 16 - x0) t = t.slice(0, -2) + '…'; ctx.fillStyle = '#8e8e93'; ctx.textAlign = 'left'; ctx.fillText(t, x0, 88); ctx.restore(); }
    const btn = (x, w, label, key, primary) => { const over = inside(pointer.x, pointer.y, { x, y: by, width: w, height: bh });
      ctx.save(); ctx.beginPath(); ctx.roundRect(x, by, w, bh, bh / 2); ctx.fillStyle = primary ? (over ? '#e5e5ea' : '#ffffff') : (over ? '#3a3a3c' : '#2c2c2e'); ctx.fill(); ctx.restore();
      text(label, x + w / 2, by + 21, 13, primary ? '#000000' : '#ffffff', 600, 'center'); hit[key] = { x, y: by, width: w, height: bh }; };
    btn(noX, noW, T('Niet toestaan', "Don't allow"), 'cDeny', false); btn(yesX, yesW, T('Sta toe', 'Allow'), 'cAllow', true);
    if (window.__twocodeLuxTogetherRow()) { // together: what else is going on, quietly
      const y = H - 20; let x = x0;
      if (music() && spotifyState?.track) {
        if (albumImage?.complete && albumImage.naturalWidth) { ctx.save(); ctx.beginPath(); ctx.roundRect(x, y - 11, 16, 16, 4); ctx.clip(); ctx.drawImage(albumImage, x, y - 11, 16, 16); ctx.restore(); x += 24; }
        const song = [spotifyState.track.name, spotifyState.track.artist].filter(Boolean).join(' · ');
        (window.__twocodeSongText || (d => d()))(() => text(song, x, y + 2, 12, '#8e8e93', 500, 'left', (x1 - x) * (window.__twocodeFocus?.active() ? 0.6 : 1)));
      }
      const focus = window.__twocodeFocus;
      if (focus?.active()) {
        const left$ = Math.max(0, Math.ceil(focus.left() / 1000)), t = `Focus ${Math.floor(left$ / 60)}:${String(left$ % 60).padStart(2, '0')}`;
        ctx.save(); ctx.font = '500 12px Inter, "Segoe UI", sans-serif'; const tw = ctx.measureText(t).width; ctx.restore();
        ctx.save(); ctx.fillStyle = '#b18cff'; ctx.shadowColor = '#b18cff'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(x1 - tw - 10, y - 2, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        text(t, x1, y + 2, 12, '#8e8e93', 500, 'right');
      }
    }
    return true;
  }
  drawSmall = function () {
    hit.musicTuck = null; tuckBox = null;
    window.__twocodeLyrics?.tick();
    // opening or closing (the island is still narrow): only Robo's eyes, like the resting island. The old drawing for this
    // moment was a small robot head, which flashed at the top every time the island opened.
    if (mode === 'expanded') { (window.__twocodeIslandEyes || drawGhost)(islandBounds.x + islandBounds.width / 2, 16.5); return; }
    if (mode === 'rest') window.__twocodeRestFace?.size(); // as wide as what it shows (rest-ui.js)
    if (mode === 'rest' && window.__twocodeRestFace?.on()) { // the time, battery, CPU or memory next to (or instead of) the eyes
      if (window.__twocodeRestFace.eyes()) { // Robo's eyes, next to what is shown when it is only on one side
        const ex = window.__twocodeRestFace.eyesX(), cy = visual.height / 2;
        (window.__twocodeIslandEyes || drawGhost)(ex, cy); hit.ghost = { x: ex - 19, y: 0, width: 38, height: 24 }; songLine();
      }
      window.__twocodeRestFace.draw(); return;
    }
    if (mode !== 'compact') { oldDrawSmall(); songLine(); return; }
    songLine(); lyricSize();
    // Like the iPhone's Dynamic Island: Robo's eyes in the middle (the camera), the leading and trailing parts snug
    // against them, in one colour for one activity (Apple: design leading + trailing as one unit).
    const H = islandBounds.height, cy = H / 2, right = islandBounds.x + islandBounds.width - 14, left = islandBounds.x + 14, mid = islandBounds.x + islandBounds.width / 2;
    const p = top(), focus = window.__twocodeFocus, now = performance.now();
    const message = window.__twocodeCompactMessage?.(), needsYou = p && (p.state === 'question' || p.permission);
    if (p && p.state !== attentionState) { attentionState = p.state; attentionUntil = ['question', 'done', 'error'].includes(p.state) ? now + 4000 : 0; } // answered: back to work, not "Error"
    if (!p) attentionState = '';
    // Claude works (or just finished) while a song with lyrics plays: the song keeps the island and Claude moves into a
    // little island of his own on the left, his eyes in a ring that turns while he works and becomes a tick when he is done
    // (the split Dynamic Island, a user's idea). A question or an error still takes the whole island.
    const split = Boolean(p && !needsYou && (lyricsWide() || musicSplit()) && (busy(p) || (p.state === 'done' && now < attentionUntil)));
    window.__twocodeClaudeBubble = split && !message ? (busy(p) ? 'working' : 'done') : null;
    const focusOn = Boolean(focus?.active()), musicOn = Boolean(music()), claudeOn = !split && Boolean(p && (needsYou || now < attentionUntil || busy(p)));
    const primary = claudeOn ? 'claude' : focusOn ? 'focus' : musicOn ? 'music' : null;
    window.__twocodeBubbles = message ? [] : [focusOn && primary !== 'focus' ? 'focus' : null, musicOn && primary !== 'music' ? 'music' : null].filter(Boolean);
    const eyes = () => { (window.__twocodeIslandEyes || drawGhost)(mid, cy + 0.5); hit.ghost = { x: mid - 22, y: 0, width: 44, height: H }; };
    hit.ghost = null;
    const mmss = sec => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    const lead = (s, colour, x = left, maxW = right - 60 - x) => text(s, x, cy + 4.5, 13, colour, 600, 'left', maxW);
    const trail = (s, colour) => monoText(s, right, cy + 4.5, 12.5, colour, 500, 'right');
    const mark = (_c, kind = 'rest') => { if (window.__twocodeLuxMark?.(left - 2, cy, kind, H >= 40)) return; ctx.save(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.lineCap = 'round'; for (let i = 0; i < 4; i++) { const an = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(left + 7 - Math.cos(an) * 6.5, cy - Math.sin(an) * 6.5); ctx.lineTo(left + 7 + Math.cos(an) * 6.5, cy + Math.sin(an) * 6.5); ctx.stroke(); } ctx.restore(); };
    const colourFor = () => '#ffffff';
    // V3: the colour of what is going on rises inside the small island; the eyes only show when nothing is going on
    const smallGlow = (rgb, k = 1, kind = '') => { if (window.__twocodeLuxGlow?.(rgb, k, kind)) return; const { x, width: w, height: h } = islandBounds; ctx.save(); islandPath(x, 0, w, h, visual.radius); ctx.clip(); ctx.translate(x + w / 2, h * 1.38); ctx.scale(w * 0.92, h * 1.3);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, `rgba(${rgb},${k})`); g.addColorStop(0.52, `rgba(${rgb},${0.4 * k})`); g.addColorStop(0.86, `rgba(${rgb},0)`); ctx.fillStyle = g; ctx.fillRect(-1, -2, 2, 2); ctx.restore(); };
    const breathing = 0.86 + 0.14 * Math.sin(now / 1000 * Math.PI);
    const toRgb = c => { const m = /(\d+)\D+(\d+)\D+(\d+)/.exec(c || ''); if (m) return `${m[1]},${m[2]},${m[3]}`; const n = /^#[0-9a-f]{6}$/i.test(c || '') ? parseInt(c.slice(1), 16) : null; return n == null ? '224,31,76' : `${n >> 16},${(n >> 8) & 255},${n & 255}`; };

    const listening = window.__twocodeListenPill?.(); // Robo listens (chat-ui.js): his own pill
    if (listening) { drawListen(listening, left, cy, right, mid, H); return; }
    if (message && !message.trim()) { // hello and goodbye (twocode-fun.js keep the island open with a space): Robo is the show, big in the middle
      (window.__twocodeIslandEyes || drawGhost)(mid, cy + 0.5, 1.35); hit.ghost = { x: mid - 26, y: 0, width: 52, height: H };
      return;
    }
    if (message) {
      const volume = /^(\S+) [▮▯]{10} (\d+)%$/u.exec(message); // the volume (extras-ui.js): a real bar instead of block characters
      if (volume) { drawVolume(volume[1], Number(volume[2]), left, cy, right); return; }
      text(message, left + 2, cy + 5, 14, '#ffffff', 600, 'left', right - left); return;
    }
    if (p && !split && (needsYou || now < attentionUntil)) {
      const colour = colourFor(p.permission ? 'question' : p.state);
      const luxKind = p.permission || p.state === 'question' ? 'ask' : p.state === 'done' ? 'done' : 'error';
      smallGlow(p.permission || p.state === 'question' ? '214,160,10' : p.state === 'done' ? '10,132,255' : '226,44,62', 1, luxKind);
      // (Lux, launch mode only: the island grows into one calm card, "together": the question with its two buttons, and
      // under it what else is going on, your song and your focus time)
      if (H >= 90 && p.permission && !p.ask && !p.plan && p.permission.kind === 'tool' && luxAsk(p, left, right, H)) return;
      mark(colour, luxKind === 'error' ? 'rest' : luxKind);
      // Claude asks permission: answer right here, two same-size buttons, the likely one in white
      if (p.permission && !p.ask && !p.plan && p.permission.kind === 'tool') {
        const bw = 78, bh = 28, by = cy - bh / 2, yesX = right - bw, noX = yesX - bw - 8;
        lead(`${p.permission.what ? p.permission.what.split(/[\\/]/).pop() : p.permission.tool}`, '#ffffff', left + 22, noX - 12 - (left + 22));
        const btn = (x, label, key, primary) => { const over = inside(pointer.x, pointer.y, { x, y: by, width: bw, height: bh });
          ctx.save(); ctx.beginPath(); ctx.roundRect(x, by, bw, bh, 8); ctx.fillStyle = primary ? (over ? '#e5e5ea' : '#ffffff') : (over ? '#3a3a3c' : '#2c2c2e'); ctx.fill(); ctx.restore();
          text(label, x + bw / 2, by + 19, 13, primary ? '#000000' : '#ffffff', 600, 'center'); hit[key] = { x, y: by, width: bw, height: bh }; };
        btn(noX, T('Weiger', 'Deny'), 'cDeny', false); btn(yesX, T('Sta toe', 'Allow'), 'cAllow', true);
        return;
      }
      if (p.ask || p.plan) {
        lead(p.ask ? T('Claude vraagt iets', 'Claude asks') : T('Plan klaar', 'Plan ready'), colour, left + 22, right - 90 - left);
        const w = 70, bh = 28, x = right - w, over = inside(pointer.x, pointer.y, { x, y: cy - bh / 2, width: w, height: bh });
        ctx.save(); ctx.beginPath(); ctx.roundRect(x, cy - bh / 2, w, bh, 8); ctx.fillStyle = over ? '#e5e5ea' : '#ffffff'; ctx.fill(); ctx.restore();
        text(T('Bekijk', 'View'), x + w / 2, cy + 5, 13, '#000000', 600, 'center'); hit.cOpen = { x, y: cy - bh / 2, width: w, height: bh };
        return;
      }
      lead(p.state === 'question' ? T('Vraag', 'Question') : p.state === 'done' ? T('Klaar', 'Done') : T('Fout', 'Error'), colour, left + 22);
      if (p.elapsed && p.state === 'done') trail(mmss(p.elapsed), window.__twocodeLux?.() ? '#5aaeff' : colour); // (Lux: done is blue)
      return;
    }
    if (primary === 'claude' && p) {
      const steps = p.steps || [], phase = steps.reduce((m, x) => Math.max(m, x.kind === 'edit' ? 1 : x.kind === 'run' ? 2 : 0), 0);
      smallGlow('239,123,55', breathing, 'claude');
      mark(null, busy(p) ? 'work' : 'rest');
      const said = busy(p) ? (window.__twocodeLux?.() && H >= 40 ? smallStatus(p) : steps.length ? [T('Lezen', 'Reading'), T('Aanpassen', 'Editing'), T('Testen', 'Testing')][phase] : T('Denkt na', 'Thinking')) : smallStatus(p);
      // (Lux: thinking is a white sheen moving over the words, never a rainbow; with room it says what he does, "Editing invoice.ts")
      if (!(busy(p) && window.__twocodeLuxSheen?.(said, H >= 40 ? left + 40 : left + 22, cy + 5, H >= 40 ? 14 : 13, right - 56 - (H >= 40 ? left + 40 : left + 22)))) lead(said, '#ffffff', left + 22);
      if (busy(p)) trail(mmss((p.elapsed || 0) + Math.floor((Date.now() - stateAt) / 1000)), window.__twocodeLux?.() ? '#f0a07e' : '#ffffff');
      return;
    }
    if (primary === 'focus') { // the timer: a ring that runs empty, the time on the right
      smallGlow('122,75,224', 1, 'focus');
      const r = 8, done = 1 - focus.left() / focus.length();
      ctx.save(); ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(left + 8, cy, r, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(183,140,255,.3)'; ctx.stroke();
      ctx.beginPath(); ctx.arc(left + 8, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - done)); ctx.strokeStyle = '#b78cff'; ctx.stroke(); ctx.restore();
      monoText(focus.label(), right, cy + 4.5, 12.5, '#ffffff', 500, 'right');
      return;
    }
    if (primary === 'music') { // the cover, then the line that is sung (or the name of the song), in the colour of the album
      if (!window.__twocodeLuxCover?.(window.__twocodeAlbumColour)) smallGlow(toRgb(window.__twocodeAlbumColour));
      if (H >= 50 && window.__twocodeLux?.() && luxLyrics(left, right, cy, H)) return;
      if (window.__twocodeLuxMusicOnly?.() && window.__twocodeLux?.()) { // (Lux: cover, eyes, sound; the song's words get the medium island)
        const cs = 22, cx0 = islandBounds.x + 7;
        if (albumImage?.complete && albumImage.naturalWidth) { ctx.save(); ctx.beginPath(); ctx.roundRect(cx0, cy - cs / 2, cs, cs, 6); ctx.clip(); ctx.drawImage(albumImage, cx0, cy - cs / 2, cs, cs); ctx.restore(); }
        else { box(cx0, cy - cs / 2, cs, cs, 6, '#1c1c1e'); window.__twocodeIcon?.('music', cx0 + cs / 2, cy, 13, '#8e8e93', null, 'rgba(0,0,0,0)'); }
        (window.__twocodeIslandEyes || drawGhost)(mid, cy + 0.5); hit.ghost = { x: mid - 22, y: 0, width: 44, height: H };
        bars(right - 13, right + 2, cy, 3, 12);
        return;
      }
      const cs = 24, cx0 = left - 2;
      if (albumImage?.complete && albumImage.naturalWidth) { ctx.save(); ctx.beginPath(); ctx.roundRect(cx0, cy - cs / 2, cs, cs, 6); ctx.clip(); ctx.drawImage(albumImage, cx0, cy - cs / 2, cs, cs); ctx.restore(); }
      else { box(cx0, cy - cs / 2, cs, cs, 6, '#1c1c1e'); window.__twocodeIcon?.('music', cx0 + cs / 2, cy, 14, '#8e8e93', null, 'rgba(0,0,0,0)'); }
      // the sound wave on the right (back in beta 89, two users missed it): the bars only move with real sound
      const waveW = 26; bars(right - waveW + 3, right + 3, cy, 5, 16);
      const x0 = cx0 + cs + 10, w = right - waveW - 8 - x0, band = 20, name = spotifyState?.track?.name || '';
      const font = lyric0 => lyric0?.font || '600 13px Inter, "Segoe UI", sans-serif';
      // a new line rolls in from below while the old one rolls out at the top, in a narrow band, so two lines never stand on top of each other
      // (beta 121) a song's name and words are never translated, also not when cut with "…" (lyrics-ui.js __twocodeSongText)
      const line = (s, dy, f, lit) => (window.__twocodeSongText || (d => d()))(() => {
        const alpha = Math.max(0, 1 - Math.abs(dy) / band); if (!s || alpha <= 0.01) return;
        ctx.save(); ctx.globalAlpha *= alpha; ctx.font = f;
        const full = ctx.measureText(s).width; // too long: a smaller font first (down to 10.5 px), cut only after that
        if (full > w) ctx.font = f.replace(/\d+(\.\d+)?px/, m => Math.max(10.5, parseFloat(m) * w / full).toFixed(1) + 'px');
        let t = s; while (t.length > 1 && ctx.measureText(t).width > w) t = t.slice(0, -2) + '…';
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (lit != null && window.__twocodeLitText) { const tw = ctx.measureText(t).width; ctx.textAlign = 'left'; window.__twocodeLitText(t, x0 + w / 2 - tw / 2, cy + 0.5 + dy, lit); } // word by word (lyrics-ui.js)
        else ctx.fillText(t, x0 + w / 2, cy + 0.5 + dy);
        ctx.restore(); // (in the middle between the cover and the wave: a user saw it stick to the cover)
      });
      const lyric = lyricsWide() ? window.__twocodeLyrics.now() : null;
      ctx.save(); ctx.beginPath(); ctx.rect(x0 - 2, cy - band / 2 - 2, w + 4, band + 4); ctx.clip();
      if (lyric && (lyric.text || lyric.previous)) { line(lyric.previous || name, -band * lyric.k, font(lyric)); line(lyric.text || name, band * (1 - lyric.k), font(lyric), lyric.text ? lyric.lit : null); }
      else line(name, 0, font(lyric));
      ctx.restore();
      return;
    }
    if (p) { mark(null, 'rest'); lead(smallStatus(p), '#ffffff', left + 22); return; }
    eyes();
  };
  // The second activity in its own little island to the right (like the iPhone's split Dynamic Island): it grows out of
  // the edge, and a click opens that page. Music shows its cover, the timer a ring that runs empty.
  const bubbleK = { focus: 0, music: 0 };
  // the island's black, see-through like the island itself (Settings → Island → See-through; a user saw black circles and tiles)
  const islandBlack = () => { const smoke = window.__twocodeGlassSmoke?.(0, UI.COMPACT_H); if (smoke != null) return window.__twocodeGlassFill(smoke); // (Kleurglas: the same glass)
    const a = window.__twocodeIslandAlpha?.() ?? 1; return a >= 1 ? '#000' : `rgba(0,0,0,${a.toFixed(3)})`; };
  // Claude's little island on the left (see drawSmall): a short pill that grows out of the island's left edge like the
  // others do on the right. Working: Robo's eyes with a line in Claude's colour running round the inside of the pill.
  // Done: the line closes all the way round in green and the eyes make way for a tick, then the little island goes back
  // in (after the 4 s that "done" gets). A click opens the Claude page.
  let claudeK = 0, claudeState = null, claudeDoneAt = 0;
  const SPIN = 1.1; // seconds for one turn of the ring
  function drawClaudeBubble() {
    const want = mode === 'compact' && visual.height < 60 && !transition ? window.__twocodeClaudeBubble : null, now = performance.now();
    if (want === 'done' && claudeState !== 'done') claudeDoneAt = now;
    if (want) claudeState = want;
    claudeK += ((want ? 1 : 0) - claudeK) * (want ? 0.18 : 0.3);
    hit.bubbleClaude = null;
    if (claudeK < 0.02) { if (!want) claudeState = null; return; }
    const d = UI.BAR_H + 4, e = 1 - Math.pow(1 - claudeK, 3), w = (d + 16) * e, h = d * e, x = islandBounds.x - 8 - w, cx = x + w / 2, cy = h / 2;
    ctx.save(); islandPath(x, 0, w, h, h / 2); ctx.fillStyle = islandBlack(); ctx.fill(); ctx.restore();
    hit.bubbleClaude = { x, y: 0, width: w, height: h };
    if (e <= 0.6) return;
    const orange = paletteColour('running') || '#d97757', green = paletteColour('done') || '#30d158';
    // the track: a pill inside the pill. A dash as long as the whole way round repeats seamlessly, so the line can run
    // past the start of the path without a jump.
    const tx = x + 5, ty = 5, tw = w - 10, th = h - 10, round = 2 * (tw - th) + Math.PI * th;
    const track = () => { ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, th / 2); };
    const run = t => -(t / 1000 / SPIN) * round, SEG = 0.3;
    const eyes = () => { ctx.save(); track(); ctx.clip(); (window.__twocodeIslandEyes || drawGhost)(cx, cy + 0.5, 0.6); ctx.restore(); };
    ctx.save(); ctx.globalAlpha *= (e - 0.6) / 0.4; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (claudeState !== 'done') {
      track(); ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.stroke();
      ctx.save(); ctx.setLineDash([round * SEG, round * (1 - SEG)]); ctx.lineDashOffset = run(now); track(); ctx.strokeStyle = orange; ctx.stroke(); ctx.restore();
      eyes();
    } else {
      const k = Math.min(1, (now - claudeDoneAt) / 900), ring = 1 - Math.pow(1 - Math.min(1, k / 0.45), 3), tick = Math.max(0, Math.min(1, (k - 0.35) / 0.5));
      const part = SEG + (1 - SEG) * ring; // the line grows from where it was running until it goes all the way round
      ctx.save(); if (part < 0.999) { ctx.setLineDash([round * part, round * (1 - part)]); ctx.lineDashOffset = run(claudeDoneAt); } track(); ctx.strokeStyle = green; ctx.stroke(); ctx.restore();
      if (tick < 1) { ctx.save(); ctx.globalAlpha *= 1 - tick; eyes(); ctx.restore(); }
      if (tick > 0) { // the tick draws itself: down to the corner, then up
        const P = [[cx - 5, cy + 0.5], [cx - 1.5, cy + 4], [cx + 5.5, cy - 4]], l1 = Math.hypot(3.5, 3.5), l2 = Math.hypot(7, 8), len = (l1 + l2) * (1 - Math.pow(1 - tick, 3));
        ctx.beginPath(); ctx.moveTo(...P[0]);
        if (len <= l1) ctx.lineTo(P[0][0] + 3.5 * len / l1, P[0][1] + 3.5 * len / l1);
        else { ctx.lineTo(...P[1]); const f = (len - l1) / l2; ctx.lineTo(P[1][0] + 7 * f, P[1][1] - 8 * f); }
        ctx.strokeStyle = green; ctx.lineWidth = 2.6; ctx.stroke();
      }
    }
    ctx.restore();
  }
  const baseIslandShape = drawIsland;
  drawIsland = function (...args) {
    const result = baseIslandShape.apply(this, args);
    drawClaudeBubble();
    const list = mode === 'compact' && visual.height < 60 && !transition ? (window.__twocodeBubbles || []) : [];
    let x = islandBounds.x + islandBounds.width + 8;
    hit.bubbleFocus = null; hit.bubbleMusic = null;
    for (const kind of ['focus', 'music']) {
      const on = list.includes(kind);
      bubbleK[kind] += ((on ? 1 : 0) - bubbleK[kind]) * (on ? 0.18 : 0.3);
      if (bubbleK[kind] < 0.02) continue;
      const d = UI.BAR_H + 4, e = 1 - Math.pow(1 - bubbleK[kind], 3), w = d * e, h = d * e;
      ctx.save(); islandPath(x, 0, w, h, h / 2); ctx.fillStyle = islandBlack(); ctx.fill(); ctx.restore();
      if (e > 0.6) {
        const cx = x + w / 2, cy = h / 2;
        ctx.save(); ctx.globalAlpha *= (e - 0.6) / 0.4;
        if (kind === 'music') {
          if (albumImage?.complete && albumImage.naturalWidth) { ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, d / 2 - 6, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(albumImage, cx - d / 2 + 6, cy - d / 2 + 6, d - 12, d - 12); ctx.restore(); }
          else window.__twocodeIcon?.('music', cx, cy, 15, '#ffffff', null, 'rgba(0,0,0,0)');
        } else {
          const f = window.__twocodeFocus, left = f?.active() ? f.left() / f.length() : 0;
          ctx.lineWidth = 3; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.arc(cx, cy, d / 2 - 9, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(191,90,242,.3)'; ctx.stroke();
          ctx.beginPath(); ctx.arc(cx, cy, d / 2 - 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); ctx.strokeStyle = '#bf5af2'; ctx.stroke();
        }
        ctx.restore();
      }
      hit[kind === 'music' ? 'bubbleMusic' : 'bubbleFocus'] = { x, y: 0, width: d, height: d };
      x += w + 6;
    }
    return result;
  };
  canvas.addEventListener('click', e => {
    if (inside(e.clientX, e.clientY, hit.bubbleClaude)) { e.preventDefault(); e.stopImmediatePropagation(); sound('click'); open(top()?.provider); return; }
    const kind = inside(e.clientX, e.clientY, hit.bubbleMusic) ? 'spotify' : inside(e.clientX, e.clientY, hit.bubbleFocus) ? 'focus' : null;
    if (!kind) return;
    e.preventDefault(); e.stopImmediatePropagation(); sound('click');
    setView(kind); setMode('expanded');
  }, true);
  updateHover = function (now) {
    if (['monitor', 'assistant'].includes(currentView)) {
      if (mode !== 'expanded') return;
      // Only stay open while you are really typing here (window focused), or while a reply is being sent.
      const typing = document.hasFocus() && root.contains(document.activeElement) && /^(TEXTAREA|INPUT)$/.test(document.activeElement.tagName);
      if (typing || pending) { leaveStartedAt = null; return; }
      const over = pointer.known && inside(pointer.x, pointer.y, islandBounds);
      if (over) leaveStartedAt = null;
      else { leaveStartedAt ||= now; if (now - leaveStartedAt > (UI.MONITOR_LEAVE_DELAY || 900)) { small(); leaveStartedAt = null; } }
      return;
    }
    // Folded in with the collapse button: stay closed until the mouse has left the island once.
    if (holdClosed) { if (pointer.known && inside(pointer.x, pointer.y, islandBounds)) { hoverStartedAt = null; return; } holdClosed = false; }
    // Claude waits for an answer: the small island stays small under your mouse, so you can click Toestaan / Weigeren.
    // On the music button the island stays as it is, so you can press it (it would open on hover otherwise)
    if (mode === 'compact' && pointer.known && inside(pointer.x, pointer.y, tuckBox)) { hoverStartedAt = null; return; }
    const pa = top(); // (only when there are buttons to press; a plain question just opens on hover)
    if (mode === 'compact' && pa && (pa.permission || pa.ask || pa.plan) && pointer.known && inside(pointer.x, pointer.y, islandBounds)) { hoverStartedAt = null; return; }
    hoverOpening = true; try { return oldHover(now); } finally { hoverOpening = false; } // see setMode: a song with lyrics opens its page
  };
  // ---- Home: a small dashboard. Twenty-One on the left, three live widgets: music, Claude, focus ----
  const baseHomeHeight = targetHeight;
  targetHeight = function () { return currentView === 'home' || currentView === 'shortcuts' ? 268 : baseHomeHeight(); };
  // App icon: Twenty-One's own line icon on a soft coloured tile.
  // App icons are little Robo stickers: Robo himself does something with each app (headphones for Spotify,
  // a laptop for Claude Code, a stopwatch for Focus, peeking out of a box for the Tray …) on a bright tile.
  // Live bits: music notes dance while a song plays, his eyes turn orange while Claude works, the gear turns,
  // the alarm clock shows the real time.
  const ICON_BG = { music: ['#5be38c', '#1fae55'], terminal: ['#ffb38a', '#e8744a'], timer: ['#ffd27a', '#ff9a3d'], tray: ['#8fb8ff', '#4c7ff0'], copy: ['#7fe6d8', '#22b3a3'],
    note: ['#ffe58a', '#f5b92e'], gear: ['#c9b3ff', '#8b6cf0'], clock: ['#9fc2ff', '#6c7ff0'], home: ['#d8f5a8', '#9fd45a'], pen: ['#ffb3d6', '#f0609e'] };
  // Hover: Robo climbs a bit out of his tile, grows and looks ready (happy eyes, glowing light).
  // Click: he squashes and bounces back with a few sparkles.
  const iconAnim = new Map();
  canvas.addEventListener('pointerdown', e => {
    const t = performance.now();
    for (const a of iconAnim.values()) if (a.rect && t - a.seen < 120 && inside(e.clientX, e.clientY, a.rect)) { a.pressAt = t; window.__twocodeIconPressAt = t; }
  }, true);
  function appIcon(x, y, size, icon, colour, hot) {
    const c = ctx, now = performance.now(), u = size / 48, bg = ICON_BG[icon] || ICON_BG.home;
    const key = icon + ':' + Math.round(x / 4) + ':' + Math.round(y / 4);
    let st = iconAnim.get(key); if (!st) { st = { h: 0, pressAt: -1e9, seen: 0 }; iconAnim.set(key, st); }
    const hotRect = hot && typeof hot === 'object' ? hot : { x, y, width: size, height: size };
    const over = Boolean(hot) && pointer.known && inside(pointer.x, pointer.y, hotRect);
    st.h += ((over ? 1 : 0) - st.h) * 0.2; st.rect = hot ? hotRect : null; st.seen = now;
    const h = st.h, since = now - st.pressAt, press = since < 700 ? Math.exp(-since / 170) * Math.sin(since / 38) : 0, tilePress = since < 220 ? Math.sin(Math.min(1, since / 220) * Math.PI) : 0;
    const p = icon === 'terminal' ? top() : null, working = p && busy(p), playing = icon === 'music' && music() && Boolean(window.__twocodeHearing); // notes only bob when sound really plays here
    c.save(); c.translate(x, y); c.scale(u, u);
    if (tilePress) { c.translate(24, 24); c.scale(1 - 0.12 * tilePress, 1 - 0.12 * tilePress); c.translate(-24, -24); }
    // tile
    c.save(); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 6; c.shadowOffsetY = 2;
    const g = c.createLinearGradient(0, 0, 0, 48); g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]);
    c.beginPath(); c.roundRect(0, 0, 48, 48, 13); c.fillStyle = g; c.fill(); c.restore();
    c.save(); c.beginPath(); c.roundRect(0, 0, 48, 48, 13); c.clip(); c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.ellipse(16, 4, 26, 14, -0.2, 0, Math.PI * 2); c.fill(); c.restore();
    const ink = '#1d1b26', hx = 24, hy = icon === 'terminal' ? 23 : icon === 'tray' ? 27 : 26;
    const eyesCol = icon === 'terminal' && working ? '#ff9a3d' : '#5fd0ff';
    // Robo's head
    const head = () => {
      if (!['music', 'gear', 'home'].includes(icon)) { c.strokeStyle = '#e8efec'; c.lineWidth = 1.8; c.lineCap = 'round'; c.beginPath(); c.moveTo(hx, hy - 10); c.lineTo(hx, hy - 15); c.stroke(); c.beginPath(); c.arc(hx, hy - 16.5, 2.2 + 0.6 * h, 0, Math.PI * 2); c.fillStyle = working ? '#ff9a3d' : '#c6e994'; c.shadowColor = c.fillStyle; c.shadowBlur = 8 * h; c.fill(); c.shadowBlur = 0; }
      c.fillStyle = '#dfe9e5'; c.beginPath(); c.roundRect(hx - 15.5, hy - 2, 3, 6, 1.5); c.roundRect(hx + 12.5, hy - 2, 3, 6, 1.5); c.fill();
      const hg = c.createLinearGradient(0, hy - 12, 0, hy + 12); hg.addColorStop(0, '#ffffff'); hg.addColorStop(1, '#dbe7e2');
      c.beginPath(); c.ellipse(hx, hy, 14, 11.5, 0, 0, Math.PI * 2); c.fillStyle = hg; c.fill(); c.strokeStyle = 'rgba(0,0,0,.12)'; c.lineWidth = 0.8; c.stroke();
      c.beginPath(); c.roundRect(hx - 10, hy - 5.5, 20, 12, 5.5); c.fillStyle = ink; c.fill();
      c.fillStyle = eyesCol; c.strokeStyle = eyesCol; c.lineWidth = 1.6; c.lineCap = 'round';
      const blink = Math.floor(now / 3200 + size) % 7 === 0 && (now % 3200) < 140;
      for (const s of [-1, 1]) {
        const ex = hx + s * 4.3, ey = hy + 0.5;
        if (icon === 'music' || st.ready) { c.beginPath(); c.arc(ex, ey + 1.6, 2.2, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
        else if (icon === 'timer' || icon === 'terminal') { c.beginPath(); c.ellipse(ex, ey, 2, 1.3, 0, 0, Math.PI * 2); c.fill(); }
        else if (blink) { c.beginPath(); c.moveTo(ex - 2, ey); c.lineTo(ex + 2, ey); c.stroke(); }
        else { c.beginPath(); c.ellipse(ex, ey, 1.7, 2.7, 0, 0, Math.PI * 2); c.fill(); }
      }
    };
    if (h > 0.02) { c.save(); c.fillStyle = 'rgba(0,0,0,' + (0.22 * h) + ')'; c.beginPath(); c.ellipse(24, 43, 13 + 3 * h, 2.5, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
    c.save(); // everything below is "Robo": it climbs out of the frame on hover and squashes on click
    const lift = 9 * h + Math.sin(now / 260) * 0.8 * h, grow = 1 + 0.2 * h;
    c.translate(24, 44); c.scale(grow * (1 + 0.26 * press), grow * (1 - 0.26 * press)); c.translate(-24, -44 - lift / grow);
    if (h > 0.55 && !['music', 'timer', 'terminal'].includes(icon)) st.ready = true; else st.ready = false;
    head();
    if (icon === 'tray') { // peeking out of a box
      c.fillStyle = '#2f5fc4'; c.beginPath(); c.roundRect(7, 30, 34, 14, 3); c.fill(); c.fillStyle = '#3d70dc'; c.beginPath(); c.roundRect(5, 28, 38, 5, 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.roundRect(19, 36, 10, 2.5, 1.2); c.fill();
    }
    if (icon === 'music') { // headphones + dancing notes
      c.strokeStyle = ink; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.arc(hx, hy + 2, 15.5, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
      c.fillStyle = '#1aa34c'; c.strokeStyle = ink; c.lineWidth = 1.2; for (const s of [-1, 1]) { c.beginPath(); c.roundRect(hx + s * 15.5 - 3, hy - 3, 6, 10, 3); c.fill(); c.stroke(); }
      const bob = playing ? Math.sin(now / 180) * 2 : 0, bob2 = playing ? Math.sin(now / 180 + 2) * 2 : 0;
      c.fillStyle = '#ffffff'; c.strokeStyle = '#ffffff'; c.lineWidth = 1.4;
      c.beginPath(); c.ellipse(39, 12 + bob, 2.2, 1.7, -0.4, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(41, 11.5 + bob); c.lineTo(41, 5 + bob); c.lineTo(44, 6 + bob); c.stroke();
      c.globalAlpha = 0.85; c.beginPath(); c.ellipse(8, 9 + bob2, 1.8, 1.4, -0.4, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(9.6, 8.6 + bob2); c.lineTo(9.6, 3.5 + bob2); c.stroke(); c.globalAlpha = 1;
    }
    if (icon === 'terminal') { // a little laptop in front of him
      c.fillStyle = '#2b2a35'; c.beginPath(); c.roundRect(12, 30, 24, 13, 2); c.fill();
      c.fillStyle = '#ff9a3d'; c.font = 'bold 8px Consolas, monospace'; c.textBaseline = 'middle'; c.fillText('>_', 16, 36.5);
      c.fillStyle = '#c9c7d6'; c.beginPath(); c.moveTo(8, 43); c.lineTo(40, 43); c.lineTo(38, 46); c.lineTo(10, 46); c.closePath(); c.fill();
    }
    if (icon === 'timer') { // stopwatch
      const sx = 35.5, sy = 36; c.fillStyle = '#ffffff'; c.strokeStyle = '#e8743a'; c.lineWidth = 2; c.beginPath(); c.arc(sx, sy, 7.5, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#e8743a'; c.beginPath(); c.roundRect(sx - 1.5, sy - 11.5, 3, 3, 1); c.fill();
      const f = window.__twocodeFocus, part = f?.active() ? 1 - f.left() / (f.length() || 1) : (now / 6000) % 1;
      c.strokeStyle = ink; c.lineWidth = 1.4; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.sin(part * Math.PI * 2) * 5, sy - Math.cos(part * Math.PI * 2) * 5); c.stroke();
    }
    if (icon === 'copy') { // holding a clipboard
      c.fillStyle = '#8a5a2b'; c.beginPath(); c.roundRect(14, 30, 20, 16, 2.5); c.fill(); c.fillStyle = '#ffffff'; c.beginPath(); c.roundRect(16, 32.5, 16, 12, 1.5); c.fill();
      c.fillStyle = '#9aa3a8'; c.beginPath(); c.roundRect(20, 28.5, 8, 4, 1.5); c.fill(); c.fillStyle = '#22b3a3'; for (let i = 0; i < 3; i++) c.fillRect(18, 35 + i * 3, 12 - i * 3, 1.2);
    }
    if (icon === 'note') { // a sheet of paper and a pencil
      c.save(); c.translate(24, 38); c.rotate(-0.08); c.fillStyle = '#fffdf2'; c.beginPath(); c.roundRect(-10, -7, 20, 13, 1.5); c.fill(); c.fillStyle = '#e6c25a'; for (let i = 0; i < 3; i++) c.fillRect(-7, -4 + i * 3, 13 - (i === 2 ? 5 : 0), 1); c.restore();
      c.save(); c.translate(36, 33); c.rotate(0.7); c.fillStyle = '#ff6b6b'; c.fillRect(-1.6, -9, 3.2, 3); c.fillStyle = '#ffcc33'; c.fillRect(-1.6, -6, 3.2, 10); c.fillStyle = '#f2d7b0'; c.beginPath(); c.moveTo(-1.6, 4); c.lineTo(1.6, 4); c.lineTo(0, 7.5); c.closePath(); c.fill(); c.restore();
    }
    if (icon === 'gear') { // a gear turning on his head
      c.save(); c.translate(hx, hy - 16); c.rotate(now / 1400); c.fillStyle = '#ffffff'; c.beginPath();
      for (let i = 0; i < 16; i++) { const ang = i / 16 * Math.PI * 2, r = i % 2 ? 5 : 7; c.lineTo(Math.cos(ang) * r, Math.sin(ang) * r); } c.closePath(); c.fill();
      c.fillStyle = '#8b6cf0'; c.beginPath(); c.arc(0, 0, 2.2, 0, Math.PI * 2); c.fill(); c.restore();
    }
    if (icon === 'clock') { // alarm clock with the real time
      const cx2 = 35.5, cy2 = 36, d = new Date(); c.fillStyle = '#ff6b6b'; c.beginPath(); c.arc(cx2 - 5, cy2 - 7, 2.5, 0, Math.PI * 2); c.arc(cx2 + 5, cy2 - 7, 2.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ffffff'; c.strokeStyle = '#ff6b6b'; c.lineWidth = 2; c.beginPath(); c.arc(cx2, cy2, 7.5, 0, Math.PI * 2); c.fill(); c.stroke();
      const hand = (ang, len, w) => { c.lineWidth = w; c.beginPath(); c.moveTo(cx2, cy2); c.lineTo(cx2 + Math.sin(ang) * len, cy2 - Math.cos(ang) * len); c.stroke(); };
      c.strokeStyle = ink; c.lineCap = 'round'; hand(((d.getHours() % 12) + d.getMinutes() / 60) / 12 * Math.PI * 2, 3.5, 1.6); hand(d.getMinutes() / 60 * Math.PI * 2, 5.2, 1.1);
    }
    if (icon === 'home') { // a little roof as a hat
      c.fillStyle = '#e4572e'; c.beginPath(); c.moveTo(hx - 13, hy - 9); c.lineTo(hx, hy - 20); c.lineTo(hx + 13, hy - 9); c.closePath(); c.fill(); c.fillStyle = '#b8401f'; c.fillRect(hx + 5, hy - 19, 3, 6);
    }
    c.restore(); // end of Robo
    if (since < 380) { // sparkles
      const k = since / 380; c.fillStyle = '#ffffff';
      for (let i = 0; i < 7; i++) { const ang = i / 7 * Math.PI * 2 + 0.3, rr = 18 + 16 * k; c.globalAlpha = 1 - k; c.beginPath(); c.arc(24 + Math.cos(ang) * rr, 26 + Math.sin(ang) * rr, 2.2 * (1 - k) + 0.6, 0, Math.PI * 2); c.fill(); }
      c.globalAlpha = 1;
    }
    c.restore();
  }
  window.__twocodeAppIcon = appIcon;

  function claudeInfo() {
    const p = top(), st = p ? (p.permission ? 'question' : p.state) : 'ready';
    const agentName = p?.name || 'AI', project = p?.source?.title && p.source.title !== 'Geen actieve sessie' ? p.source.title : agentName;
    const statusText = !p ? 'Wacht op je AI' : p.permission || st === 'question' ? 'Wacht op jou' : busy(p) ? (p.detail || 'Bezig') : st === 'done' ? 'Klaar' : st === 'error' ? (p.detail || 'Fout') : 'Rustig';
    const lastLine = p?.code && busy(p) ? '+ ' + (p.code.lines.find(l => l.t !== '-')?.text || p.code.file) : p?.run ? (p.run.out.slice(-1)[0] || '$ ' + p.run.command) : String(p?.lastMessage || '').split('\n').filter(Boolean)[0] || '';
    return { p, st, project, statusText, dot: p ? colourOf(st) : '#4a504c', lastLine };
  }

  function claudeMark(x, y, colour, size = 16) { // a simple star mark, no container (Apple: logo marks without a container)
    ctx.save(); ctx.strokeStyle = colour; ctx.lineWidth = size * 0.16; ctx.lineCap = 'round'; const r = size * 0.4;
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke(); }
    ctx.restore();
  }
  const phaseOf = steps => steps.reduce((m, s) => Math.max(m, s.kind === 'edit' ? 1 : s.kind === 'run' ? 2 : 0), 0);
  function clockText(p) { const sec = (p.elapsed || 0) + Math.floor((Date.now() - stateAt) / 1000); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; }
  window.__twocodeHomeAi = () => {
    const info = claudeInfo(), p = info.p || providers().find(q => q.kind === 'hooks' && q.connected) || providers().find(q => q.kind === 'hooks'), st = info.p ? info.st : (p?.state || 'ready');
    const codex = (p?.agent || p?.provider) === 'codex', name = codex ? 'Codex' : 'Claude', say = (head, line, short = line, part = 0) => ({ provider: p?.provider || 'claudecode', codex, name, colour: codex ? '#3b82f6' : '#ef7b37', head, line, short, part });
    if (!p?.connected) return say(T('Koppel', 'Connect'), T('in Instellingen', 'in Settings'));
    const steps = p.steps || [], phase = phaseOf(steps), five = p.usage?.fiveHour;
    if (busy(p)) {
      const doing = !steps.length ? T('Denkt na', 'Thinking') : [T('Lezen', 'Reading'), T('Aanpassen', 'Editing'), T('Testen', 'Testing')][phase];
      return { ...say(clockText(p), doing + (p.code?.file && steps[steps.length - 1]?.kind === 'edit' ? ' ' + p.code.file : ''), doing, (phase + 0.5) / 4), working: true };
    }
    if (st === 'question') return { ...say(p.permission ? T('Mag dit?', 'May I?') : T('Jouw beurt', 'Your turn'), T(`${name} wacht op jou`, `${name} is waiting`), T('Wacht op jou', 'Waiting'), 1), asking: true };
    if (window.__twocodeDoneLook(st === 'done' ? p : null)) return say(T('Klaar', 'Done'), p.prompt || T('Alle stappen gedaan', 'Every step done'), T('Klaar', 'Done'), 1);
    if (['error', 'stopped'].includes(st)) return say(T('Gestopt', 'Stopped'), p.detail || '', T('Gestopt', 'Stopped'), 1);
    const today = (state.history || []).filter(h => (h.agent || 'claude') === (p.agent || 'claude') && new Date(h.at).toDateString() === new Date().toDateString() && h.result === 'done').length;
    return say(String(today), T(today === 1 ? 'klus vandaag' : 'klussen vandaag', today === 1 ? 'job today' : 'jobs today'), T(today === 1 ? 'klus vandaag' : 'klussen vandaag', today === 1 ? 'job today' : 'jobs today'), five ? five.used / 100 : 0);
  };
  window.__twocodeEditHome = () => { setView('shortcuts'); setMode('expanded'); sound('click'); }; // ⋯ → Customize Home

  // All apps, like the iPhone home screen: coloured app icons with their name under them, nothing else.
  const HOME_ICONS = [
    { id: 'spotify', key: 'spotifyApp', icon: 'music', nl: 'Muziek', en: 'Music', c: '#ffffff' },
    { id: 'chat', key: 'chatApp', icon: 'robo', nl: 'Robo', en: 'Robo', c: '#ffffff' },
    { id: 'claude', key: 'monitor_claudecode', icon: 'terminal', nl: 'Claude', en: 'Claude', c: '#ffffff' },
    { id: 'focus', key: 'focusApp', icon: 'timer', nl: 'Focus', en: 'Focus', c: '#ffffff' },
    { id: 'tray', key: 'trayApp', icon: 'tray', nl: 'Lade', en: 'Tray', c: '#ffffff' },
    { id: 'clips', key: 'clipsApp', icon: 'copy', nl: 'Klembord', en: 'Clipboard', c: '#ffffff' },
    { id: 'note', key: 'noteApp', icon: 'note', nl: 'Notitie', en: 'Note', c: '#ffffff' },
    { id: 'agenda', key: 'agendaApp', icon: 'agenda', nl: 'Agenda', en: 'Calendar', c: '#ffffff' },
    { id: 'mail', key: 'mailApp', icon: 'mail', nl: 'Mail', en: 'Mail', c: '#ffffff' },
    { id: 'mirror', key: 'mirrorApp', icon: 'camera', nl: 'Spiegel', en: 'Mirror', c: '#ffffff' },
    { id: 'settings', key: 'settingsApp', icon: 'gear', nl: 'Instellingen', en: 'Settings', c: '#ffffff' }
  ];
  const iconHover = {};
  function homeIcon(cx, cy, s, app) {
    const b = { x: cx - s / 2 - 10, y: cy - s / 2 - 6, width: s + 20, height: s + 34 }, over = inside(pointer.x, pointer.y, b);
    iconHover[app.id] = (iconHover[app.id] || 0) + ((over ? 1 : 0) - (iconHover[app.id] || 0)) * 0.3;
    const k = iconHover[app.id], r = s * 0.27;
    ctx.save(); ctx.beginPath(); ctx.roundRect(cx - s / 2, cy - s / 2, s, s, s * 0.22); ctx.fillStyle = k > 0.5 ? '#2c2c2e' : '#1c1c1e'; ctx.fill(); ctx.restore(); // a calm grey tile
    if (app.icon === 'robo') { // Robo's two eyes
      for (const side of [-1, 1]) { ctx.save(); ctx.beginPath(); ctx.ellipse(cx + side * s * 0.12, cy, s * 0.06, s * 0.095, 0, 0, Math.PI * 2); ctx.fillStyle = app.c; ctx.fill(); ctx.restore(); }
    } else if (app.icon === 'camera') {
      ctx.save(); ctx.strokeStyle = app.c; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.roundRect(cx - s * 0.25, cy - s * 0.15, s * 0.36, s * 0.3, 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + s * 0.13, cy - s * 0.04); ctx.lineTo(cx + s * 0.26, cy - s * 0.12); ctx.lineTo(cx + s * 0.26, cy + s * 0.12); ctx.lineTo(cx + s * 0.13, cy + s * 0.04); ctx.closePath(); ctx.stroke(); ctx.restore();
    } else if (app.icon === 'claude') claudeMark(cx, cy, app.c, s * 0.46);
    else window.__twocodeIcon?.(app.icon, cx, cy, s * 0.46, app.c, null, 'rgba(0,0,0,0)');
    return { b, over };
  }
  drawApps = function (area) {
    const focus = window.__twocodeFocus, p = top(), tray = window.__twocodeTrayCount?.() || 0, en = EN();
    const off = window.__twocodeAppsOff?.() || new Set(), shown = HOME_ICONS.filter(a => !off.has(a.id) && (a.id !== 'mail' || window.__twocodeGoogle?.available));
    for (const a of HOME_ICONS) if (!shown.includes(a)) delete hit[a.key];
    const cols = shown.length > 10 ? 6 : 5, rows = Math.ceil(shown.length / cols), s = 44, colW = area.width / cols, rowH = 82;
    const linkRow = (window.__twocodeLinks?.() || []).length ? rowH : 0, y0 = area.y + Math.max(8, (area.height - rows * rowH - linkRow) / 2) + s / 2;
    shown.forEach((app, i) => {
      const cx = area.x + colW * (i % cols) + colW / 2, cy = y0 + Math.floor(i / cols) * rowH;
      const { b } = homeIcon(cx, cy, s, app);
      const label = app.id === 'focus' && focus?.active() ? focus.label() : en ? app.en : app.nl;
      text(label, cx, cy + s / 2 + 16, 11, '#ffffff', 500, 'center', colW - 8);
      // little red badges, like on the iPhone: files in the tray, Claude waiting for you
      const count = app.id === 'tray' ? tray : app.id === 'claude' && p && (p.permission || p.state === 'question') ? 1 : 0;
      if (count) { ctx.save(); ctx.beginPath(); ctx.arc(cx + s / 2 - 4, cy - s / 2 + 4, 10, 0, Math.PI * 2); ctx.fillStyle = '#ff4245'; ctx.fill(); ctx.restore(); text(String(count), cx + s / 2 - 4, cy - s / 2 + 8, 11, '#fff', 700, 'center'); }
      if (app.id === 'claude' && p && busy(p)) { ctx.save(); ctx.globalAlpha = 0.55 + 0.45 * Math.sin(performance.now() / 260); ctx.beginPath(); ctx.arc(cx + s / 2 - 4, cy - s / 2 + 4, 6, 0, Math.PI * 2); ctx.fillStyle = '#ff9230'; ctx.fill(); ctx.restore(); }
      hit[app.key] = b;
    });
    delete hit.todayApp; delete hit.assistantApp; delete hit.projectApp;
    window.__twocodeLinksRow?.(area.x, y0 + rows * rowH - s / 2, area.width, cols);
  };
  canvas.addEventListener('click', e => { // Robo's app opens the chat
    if (!['apps', 'home'].includes(currentView) || mode !== 'expanded' || !inside(e.clientX, e.clientY, hit.chatApp)) return;
    e.preventDefault(); e.stopImmediatePropagation(); setView('chat'); setMode('expanded');
  }, true);

  canvas.addEventListener('click', event => {
    // A tap on Robo himself is for Robo (he hops, gets angry, gets dizzy), not for the card he stands on.
    if (mode === 'expanded' && inside(event.clientX, event.clientY, hit.ghost)) return;
    for (const provider of Object.keys(names)) {
      if (inside(event.clientX, event.clientY, hit['monitor_' + provider])) { event.preventDefault(); event.stopImmediatePropagation(); open(provider); return; }
    }
    // Answer from the small island (Toestaan / Weigeren / Bekijk).
    if (mode === 'compact') {
      const p = top(), stop = () => { event.preventDefault(); event.stopImmediatePropagation(); };
      if (p && inside(event.clientX, event.clientY, hit.cAllow)) { stop(); hooks('aiMonitorHooksDecide', p.sessionId, 'allow'); sound('click'); return; }
      if (p && inside(event.clientX, event.clientY, hit.cDeny)) { stop(); hooks('aiMonitorHooksDecide', p.sessionId, 'deny'); sound('click'); return; }
      if (p && inside(event.clientX, event.clientY, hit.cOpen)) { stop(); open(p.provider); return; }
    }
    // Click the small or medium island while the eyes show a colour: open that status.
    if (active() && mode !== 'expanded' && inside(event.clientX, event.clientY, islandBounds)) {
      event.preventDefault(); event.stopImmediatePropagation();
      const p = top();
      // Claude is done: go to Claude (goTo above); a question opens the page, so you can read it
      if (p && ['done', 'error'].includes(p.state)) return goTo(p);
      open(p?.provider);
    }
  }, true);
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && ['monitor', 'assistant'].includes(currentView)) { event.preventDefault(); event.stopImmediatePropagation(); small(); }
  }, true);
  api.onAiMonitorState(update); api.onAiMonitorOpen(({ provider }) => open(provider));
  api.aiMonitorGet().then(update).catch(failure => { error = failure.message; render(); });
  function position() {
    const show = ['monitor', 'assistant'].includes(currentView) && mode === 'expanded' && visual.width > 500 && visual.height > Math.min(targetHeight() - 30, 150);
    if (show && doneKey && !doneSeenAt && current()?.state === 'done') doneSeenAt = performance.now(); // you looked: green, fading out
    const display = show ? 'block' : 'none'; if (root.style.display !== display) root.style.display = display;
    if (show) {
      const p = current(), stage = Boolean(p?.kind === 'hooks' && p.connected && window.__twocodePlaceOnStage);
      root.classList.toggle('cl-new', stage); root.classList.toggle('cc-codex', stage && p.agent === 'codex'); // Codex: blue
      if (stage) window.__twocodePlaceOnStage(root, contentRect()); else window.__twocodePage.place(root, contentRect());
    }
    requestAnimationFrame(position);
  }
  window.__twocodeMonitor = Object.freeze({ open, small, state: () => state, selected: () => selected, refresh: () => { lastSignature = ''; update(state); } }); render(); requestAnimationFrame(position);
})();
