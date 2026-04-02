function xevoraTransition(e, destination) {
  if (e) e.preventDefault();

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    background: #03060D;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    opacity: 0; transition: opacity 200ms ease-out;
  `;

  const glow = document.createElement('div');
  glow.style.cssText = `
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 240px; height: 240px;
    background: radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%);
    border-radius: 50%;
    animation: xevGlow 1.5s ease-in-out infinite;
  `;

  const logo = document.createElement('div');
  logo.style.cssText = `
    width: 52px; height: 52px;
    background: rgba(37,99,235,0.12);
    border: 1px solid rgba(59,130,246,0.3);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 20px;
    position: relative; z-index: 1;
  `;
  logo.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 4L12 12M20 4L12 12M12 12L7 20M12 12L17 20" stroke="#3B82F6" stroke-width="2.5" stroke-linecap="round"/></svg>';

  const wordmark = document.createElement('div');
  wordmark.style.cssText = `
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px; letter-spacing: 0.4em;
    color: #4E6D92; margin-bottom: 28px;
    position: relative; z-index: 1;
  `;
  wordmark.textContent = 'XEVORA';

  const barWrap = document.createElement('div');
  barWrap.style.cssText = `
    width: 160px; height: 2px;
    background: rgba(37,99,235,0.12);
    border-radius: 999px; overflow: hidden;
    position: relative; z-index: 1;
  `;
  const barFill = document.createElement('div');
  barFill.style.cssText = `
    height: 100%; width: 0%;
    background: #3B82F6;
    border-radius: 999px;
    transition: width 1000ms cubic-bezier(0.4, 0, 0.2, 1);
  `;
  barWrap.appendChild(barFill);

  const style = document.createElement('style');
  style.textContent = `
    @keyframes xevGlow {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 0.7; }
    }
  `;
  document.head.appendChild(style);

  overlay.appendChild(glow);
  overlay.appendChild(logo);
  overlay.appendChild(wordmark);
  overlay.appendChild(barWrap);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    setTimeout(() => { barFill.style.width = '100%'; }, 50);
  });

  setTimeout(() => {
    overlay.style.transition = 'opacity 200ms ease-out, transform 500ms ease-in-out';
    overlay.style.transform = 'translateY(-100vh)';
    setTimeout(() => { window.location.href = destination; }, 400);
  }, 1150);
}
