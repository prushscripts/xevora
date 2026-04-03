function xevoraTransition(e, destination) {
  if (e && e.preventDefault) e.preventDefault();
  if (document.getElementById('xev-overlay')) return;

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    #xev-overlay {
      position: fixed; inset: 0; z-index: 999999;
      background: #03060D;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      opacity: 0; transition: opacity 220ms ease-out;
      overflow: hidden;
    }
    #xev-scan {
      position: absolute; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(37,99,235,0.09), rgba(96,165,250,0.18), rgba(37,99,235,0.09), transparent);
      animation: xScan 2.2s linear infinite; pointer-events: none; z-index: 2;
    }
    #xev-corner-tl, #xev-corner-tr, #xev-corner-bl, #xev-corner-br {
      position: absolute; width: 20px; height: 20px; pointer-events: none; z-index: 3;
      opacity: 0; transition: opacity 300ms ease 300ms;
    }
    #xev-corner-tl { top: 32px; left: 32px; border-top: 1.5px solid rgba(37,99,235,0.4); border-left: 1.5px solid rgba(37,99,235,0.4); }
    #xev-corner-tr { top: 32px; right: 32px; border-top: 1.5px solid rgba(37,99,235,0.4); border-right: 1.5px solid rgba(37,99,235,0.4); }
    #xev-corner-bl { bottom: 32px; left: 32px; border-bottom: 1.5px solid rgba(37,99,235,0.4); border-left: 1.5px solid rgba(37,99,235,0.4); }
    #xev-corner-br { bottom: 32px; right: 32px; border-bottom: 1.5px solid rgba(37,99,235,0.4); border-right: 1.5px solid rgba(37,99,235,0.4); }
    #xev-glow {
      position: absolute; width: 420px; height: 420px; border-radius: 50%;
      background: radial-gradient(circle, rgba(37,99,235,0.16) 0%, rgba(37,99,235,0.05) 40%, transparent 68%);
      animation: xGlow 2.6s ease-in-out infinite; pointer-events: none;
    }
    #xev-ring1 {
      position: absolute; top: 50%; left: 50%; width: 300px; height: 300px; border-radius: 50%;
      border: 1px solid rgba(37,99,235,0.22);
      animation: xRing 3s cubic-bezier(0.16,1,0.3,1) infinite; pointer-events: none;
    }
    #xev-ring2 {
      position: absolute; top: 50%; left: 50%; width: 220px; height: 220px; border-radius: 50%;
      border: 1px solid rgba(96,165,250,0.14);
      animation: xRing 4.2s cubic-bezier(0.16,1,0.3,1) infinite reverse; pointer-events: none;
    }
    #xev-ring3 {
      position: absolute; top: 50%; left: 50%; width: 160px; height: 160px; border-radius: 50%;
      border: 1px solid rgba(37,99,235,0.08);
      animation: xRing 6s cubic-bezier(0.16,1,0.3,1) infinite 1s; pointer-events: none;
    }
    #xev-grid {
      position: absolute; top: 50%; left: 50%; width: 500px; height: 500px; border-radius: 50%;
      transform: translate(-50%, -50%);
      background: repeating-conic-gradient(rgba(37,99,235,0.03) 0deg, transparent 1deg, transparent 30deg, rgba(37,99,235,0.03) 31deg);
      animation: xevGlow 4s ease-in-out infinite; pointer-events: none; z-index: 1;
    }
    #xev-center {
      position: relative; z-index: 10;
      display: flex; flex-direction: column; align-items: center;
      opacity: 0; transform: scale(0.85);
      transition: opacity 400ms ease 100ms, transform 400ms cubic-bezier(0.16,1,0.3,1) 100ms;
    }
    #xev-center.xev-in { opacity: 1; transform: scale(1); }
    #xev-hexwrap {
      width: 80px; height: 80px; border-radius: 16px;
      background: rgba(6,11,20,1);
      border: 1px solid rgba(37,99,235,0.35);
      box-shadow: 0 0 0 1px rgba(59,130,246,0.12), 0 0 40px rgba(37,99,235,0.3);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 20px;
    }
    #xev-wordmark {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px; letter-spacing: 0.5em;
      color: #F1F5FF; margin-bottom: 6px;
      opacity: 0; transition: opacity 300ms ease 500ms;
    }
    #xev-wordmark.xev-in { opacity: 1; }
    #xev-status {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px; letter-spacing: 0.18em;
      color: #4E6D92; margin-bottom: 24px;
      opacity: 0; transition: opacity 300ms ease 650ms;
    }
    #xev-status.xev-in { opacity: 1; }
    #xev-bar-wrap {
      width: 180px; height: 2px;
      background: rgba(37,99,235,0.12); border-radius: 999px; overflow: hidden;
    }
    #xev-bar-fill {
      height: 100%; width: 0%; background: #3B82F6;
      box-shadow: 0 0 12px rgba(59,130,246,1), 0 0 24px rgba(37,99,235,0.6);
      border-radius: 999px;
      transition: width 1300ms cubic-bezier(0.16,1,0.3,1);
    }
    @keyframes xScan {
      0%   { top: -2px; opacity: 0; }
      4%   { opacity: 1; }
      96%  { opacity: 1; }
      100% { top: 100vh; opacity: 0; }
    }
    @keyframes xGlow {
      0%,100% { opacity: 0.7; transform: scale(1); }
      50%      { opacity: 1;   transform: scale(1.1); }
    }
    @keyframes xRing {
      0%   { transform: translate(-50%, -50%) scale(0.9);  opacity: 0.7; }
      50%  { transform: translate(-50%, -50%) scale(1.08); opacity: 0.15; }
      100% { transform: translate(-50%, -50%) scale(0.9);  opacity: 0.7; }
    }
    @keyframes xevGlow {
      0%, 100% { opacity: 0.45; }
      50%      { opacity: 0.85; }
    }
  `;
  document.head.appendChild(style);

  // Build overlay
  const overlay = document.createElement('div'); overlay.id = 'xev-overlay';
  const scan = document.createElement('div'); scan.id = 'xev-scan';
  const corners = ['tl','tr','bl','br'].map(p => { const d = document.createElement('div'); d.id = 'xev-corner-'+p; return d; });
  const glow = document.createElement('div'); glow.id = 'xev-glow';
  const ring1 = document.createElement('div'); ring1.id = 'xev-ring1';
  const ring2 = document.createElement('div'); ring2.id = 'xev-ring2';
  const ring3 = document.createElement('div'); ring3.id = 'xev-ring3';
  const xevGrid = document.createElement('div'); xevGrid.id = 'xev-grid';

  const center = document.createElement('div'); center.id = 'xev-center';
  const hexwrap = document.createElement('div'); hexwrap.id = 'xev-hexwrap';
  hexwrap.innerHTML = '<svg width="44" height="44" viewBox="0 0 100 100" fill="none"><polygon points="50,6 89,28 89,72 50,94 11,72 11,28" fill="#060B14" stroke="rgba(37,99,235,0.5)" stroke-width="2"/><path d="M33,25 L43,25 L50,37 L57,25 L67,25 L55,50 L67,75 L57,75 L50,63 L43,75 L33,75 L45,50 Z" fill="#2563EB"/><polygon points="50,43 57,50 50,57 43,50" fill="#60A5FA"/></svg>';

  const wordmark = document.createElement('div'); wordmark.id = 'xev-wordmark'; wordmark.textContent = 'XEVORA';
  const status = document.createElement('div'); status.id = 'xev-status'; status.textContent = 'INITIALIZING...';
  const barWrap = document.createElement('div'); barWrap.id = 'xev-bar-wrap';
  const barFill = document.createElement('div'); barFill.id = 'xev-bar-fill';
  barWrap.appendChild(barFill);
  var spark = document.createElement('div');
  spark.id = 'xev-spark';
  spark.style.cssText = 'position:absolute;right:0;top:50%;transform:translateY(-50%);width:6px;height:6px;border-radius:50%;background:#fff;box-shadow:0 0 8px 4px rgba(59,130,246,0.9),0 0 16px 8px rgba(37,99,235,0.5);opacity:0;transition:opacity 100ms ease;pointer-events:none;';
  barWrap.style.position = 'relative';
  barWrap.style.overflow = 'visible';
  barWrap.appendChild(spark);

  center.appendChild(hexwrap);
  center.appendChild(wordmark);
  center.appendChild(status);
  center.appendChild(barWrap);

  overlay.appendChild(scan);
  corners.forEach(c => overlay.appendChild(c));
  overlay.appendChild(glow);
  overlay.appendChild(ring1);
  overlay.appendChild(ring2);
  overlay.appendChild(ring3);
  overlay.appendChild(xevGrid);
  overlay.appendChild(center);
  document.body.appendChild(overlay);

  // Animate in
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    corners.forEach(c => c.style.opacity = '1');
    setTimeout(() => {
      center.classList.add('xev-in');
      wordmark.classList.add('xev-in');
      status.classList.add('xev-in');
    }, 50);
    setTimeout(() => {
      barFill.style.width = '100%';
      spark.style.opacity = '1';
      spark.style.transition = 'right 1400ms cubic-bezier(0.4,0,0.2,1), opacity 100ms ease';
      setTimeout(function () { spark.style.right = '0'; }, 10);
    }, 200);
  });

  // Status cycling
  const statuses = ['INITIALIZING...', 'AUTHENTICATING...', 'LOADING WORKSPACE...'];
  let si = 0;
  const statusInterval = setInterval(() => {
    si = (si + 1) % statuses.length;
    status.style.opacity = '0';
    setTimeout(() => {
      status.textContent = statuses[si];
      status.style.opacity = '1';
    }, 150);
  }, 500);

  // Navigate after bar completes
  setTimeout(function () {
    clearInterval(statusInterval);
    overlay.style.transition = 'opacity 400ms ease-in';
    overlay.style.opacity = '0';
    setTimeout(function () { window.location.href = destination; }, 380);
  }, 1600);
}
