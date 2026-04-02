function xevoraTransition(e, destination) {
  if (e && e.preventDefault) e.preventDefault();

  var existing = document.getElementById('xev-transition-overlay');
  if (existing) return;

  var style = document.createElement('style');
  style.textContent = '@keyframes xevGlow{0%,100%{opacity:0.3}50%{opacity:0.7}} @keyframes xevBarFill{from{width:0%}to{width:100%}} @keyframes xevSlideUp{from{transform:translateY(0)}to{transform:translateY(-100vh)}}';
  document.head.appendChild(style);

  var overlay = document.createElement('div');
  overlay.id = 'xev-transition-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#03060D;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;transition:opacity 200ms ease-out;';

  var glow = document.createElement('div');
  glow.style.cssText = 'position:absolute;width:240px;height:240px;background:radial-gradient(circle,rgba(37,99,235,0.18) 0%,transparent 70%);border-radius:50%;animation:xevGlow 1.5s ease-in-out infinite;pointer-events:none;';

  var logo = document.createElement('div');
  logo.style.cssText = 'width:52px;height:52px;background:rgba(37,99,235,0.12);border:1px solid rgba(59,130,246,0.3);border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;position:relative;z-index:1;';
  logo.innerHTML = '<svg width="26" height="26" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="50,6 89,28 89,72 50,94 11,72 11,28" fill="#0B1422" stroke="rgba(37,99,235,0.5)" stroke-width="2"/><path d="M33,25 L43,25 L50,37 L57,25 L67,25 L55,50 L67,75 L57,75 L50,63 L43,75 L33,75 L45,50 Z" fill="#2563EB"/><polygon points="50,43 57,50 50,57 43,50" fill="#60A5FA"/></svg>';

  var wordmark = document.createElement('div');
  wordmark.style.cssText = 'font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:0.4em;color:#4E6D92;margin-bottom:28px;position:relative;z-index:1;';
  wordmark.textContent = 'XEVORA';

  var barWrap = document.createElement('div');
  barWrap.style.cssText = 'width:160px;height:2px;background:rgba(37,99,235,0.12);border-radius:999px;overflow:hidden;position:relative;z-index:1;';

  var barFill = document.createElement('div');
  barFill.style.cssText = 'height:100%;width:0%;background:#3B82F6;border-radius:999px;';

  barWrap.appendChild(barFill);
  overlay.appendChild(glow);
  overlay.appendChild(logo);
  overlay.appendChild(wordmark);
  overlay.appendChild(barWrap);
  document.body.appendChild(overlay);

  requestAnimationFrame(function() {
    overlay.style.opacity = '1';
    setTimeout(function() {
      barFill.style.transition = 'width 950ms cubic-bezier(0.4,0,0.2,1)';
      barFill.style.width = '100%';
    }, 60);
  });

  setTimeout(function() {
    overlay.style.transition = 'opacity 200ms ease-out, transform 480ms cubic-bezier(0.4,0,0.2,1)';
    overlay.style.transform = 'translateY(-100vh)';
    setTimeout(function() {
      window.location.href = destination;
    }, 380);
  }, 1100);
}
