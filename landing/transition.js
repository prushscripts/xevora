/**
 * Fullscreen cinematic transition before navigating to the app.
 * Usage: onclick="xevoraTransition(event, 'https://app.xevora.io/auth/login')"
 */
(function () {
  'use strict';

  var STYLE_ID = 'xevora-transition-styles';
  var busy = false;

  var LOGO_SVG =
    '<svg class="xevora-t-svg" viewBox="0 0 100 100" width="48" height="48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<polygon points="50,6 89,28 89,72 50,94 11,72 11,28" fill="#0B1422" stroke="rgba(37,99,235,0.5)" stroke-width="1.5"/>' +
    '<polygon points="50,21 76,36 76,64 50,79 24,64 24,36" fill="none" stroke="rgba(37,99,235,0.13)" stroke-width="1"/>' +
    '<path d="M33,25 L43,25 L50,37 L57,25 L67,25 L55,50 L67,75 L57,75 L50,63 L43,75 L33,75 L45,50 Z" fill="#2563EB"/>' +
    '<polygon points="50,43 57,50 50,57 43,50" fill="#60A5FA"/>' +
    '</svg>';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent =
      '.xevora-t-overlay{' +
      'position:fixed;inset:0;z-index:99999;' +
      'background:#03060D;display:flex;align-items:center;justify-content:center;' +
      'opacity:0;transition:opacity 200ms ease-out,transform 500ms ease-in-out;' +
      'transform:translateY(0);pointer-events:auto;' +
      '}' +
      '.xevora-t-overlay.xevora-t-in{opacity:1;}' +
      '.xevora-t-overlay.xevora-t-out{transform:translateY(-100vh);}' +
      '.xevora-t-inner{' +
      'display:flex;flex-direction:column;align-items:center;gap:14px;' +
      'position:relative;text-align:center;' +
      '}' +
      '.xevora-t-logo-wrap{' +
      'position:relative;width:48px;height:48px;display:flex;align-items:center;justify-content:center;' +
      '}' +
      '.xevora-t-glow{' +
      'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);' +
      'width:140px;height:140px;pointer-events:none;z-index:0;' +
      'background:radial-gradient(circle,#2563EB 0%,transparent 70%);' +
      'opacity:.3;animation:xevoraTGlow 1.5s ease-in-out infinite;' +
      '}' +
      '@keyframes xevoraTGlow{0%,100%{opacity:.3}50%{opacity:.6}}' +
      '.xevora-t-svg{position:relative;z-index:1;display:block;flex-shrink:0;}' +
      '.xevora-t-wordmark{' +
      'margin:0;font-family:"JetBrains Mono",ui-monospace,monospace;' +
      'font-size:11px;letter-spacing:.4em;color:#4E6D92;text-transform:uppercase;' +
      '}' +
      '.xevora-t-bar{' +
      'width:160px;height:2px;background:rgba(37,99,235,.15);border-radius:1px;overflow:hidden;' +
      '}' +
      '.xevora-t-bar-fill{' +
      'height:100%;width:0;background:#3B82F6;' +
      'box-shadow:0 0 10px rgba(59,130,246,.45);' +
      'animation:xevoraTProg 1000ms cubic-bezier(0.4,0,0.2,1) forwards;' +
      '}' +
      '@keyframes xevoraTProg{from{width:0}to{width:100%}}';
    document.head.appendChild(s);
  }

  function xevoraTransition(event, url) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (busy) return;
    var targetUrl = url || 'https://app.xevora.io/auth/login';
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.location.href = targetUrl;
      return;
    }
    busy = true;
    injectStyles();

    var el = document.createElement('div');
    el.className = 'xevora-t-overlay';
    el.setAttribute('role', 'presentation');
    el.innerHTML =
      '<div class="xevora-t-inner">' +
      '<div class="xevora-t-logo-wrap">' +
      '<div class="xevora-t-glow" aria-hidden="true"></div>' +
      LOGO_SVG +
      '</div>' +
      '<p class="xevora-t-wordmark">XEVORA</p>' +
      '<div class="xevora-t-bar"><div class="xevora-t-bar-fill"></div></div>' +
      '</div>';

    document.body.appendChild(el);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.classList.add('xevora-t-in');
      });
    });

    window.setTimeout(function () {
      el.classList.add('xevora-t-out');
      window.location.href = targetUrl;
    }, 1100);
  }

  window.xevoraTransition = xevoraTransition;
})();
