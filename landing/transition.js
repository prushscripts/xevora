(function() {
  var overlay, hexWrap, hexSvg, wordmark, statusEl, barTrack, barFill, barDot, sparks;
  var startTime = null;
  var redirected = false;

  var STAGES = {
    FADE_IN: { start: 0, end: 400 },
    LOADING: { start: 400, end: 1900 },
    READY: { start: 1900, end: 2200 },
    PORTAL: { start: 2200, end: 3200 }
  };

  var STATUS = [
    { at: 0,    text: 'INITIALIZING...' },
    { at: 500,  text: 'AUTHENTICATING...' },
    { at: 1000, text: 'LOADING WORKSPACE...' },
    { at: 1500, text: 'ALMOST READY...' },
    { at: 1900, text: 'READY.' }
  ];

  var lastStatus = -1;
  var sparkInterval = null;

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  function easeInCubic(t) {
    return t * t * t;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function createSpark() {
    if (!barDot || !overlay) return;
    var dotRect = barDot.getBoundingClientRect();
    var spark = document.createElement('div');
    spark.style.cssText = [
      'position:fixed',
      'width:3px',
      'height:3px',
      'border-radius:50%',
      'pointer-events:none',
      'z-index:100001',
      'left:' + (dotRect.left + dotRect.width / 2) + 'px',
      'top:' + (dotRect.top + dotRect.height / 2) + 'px',
    ].join(';');
    var colors = ['#ffffff', '#60a5fa', '#93c5fd', '#bfdbfe', '#3B82F6'];
    spark.style.background = colors[Math.floor(Math.random() * colors.length)];
    var angle = (Math.random() * 90) - 45;
    var rad = angle * Math.PI / 180;
    var speed = 3 + Math.random() * 8;
    var vx = Math.cos(rad) * speed;
    var vy = (Math.sin(rad) - 1) * speed;
    document.body.appendChild(spark);
    var sparkStart = performance.now();
    var lifetime = 250 + Math.random() * 200;
    function animateSpark(now) {
      var elapsed = now - sparkStart;
      var progress = elapsed / lifetime;
      if (progress >= 1) {
        spark.remove();
        return;
      }
      var x = parseFloat(spark.style.left) + vx * (1 - progress);
      var y = parseFloat(spark.style.top) + vy + (progress * progress * 4);
      spark.style.left = x + 'px';
      spark.style.top = y + 'px';
      spark.style.opacity = (1 - progress) * 0.9;
      spark.style.transform = 'scale(' + (1 - progress * 0.5) + ')';
      requestAnimationFrame(animateSpark);
    }
    requestAnimationFrame(animateSpark);
  }

  function createPortalRing(delay) {
    var ring = document.createElement('div');
    ring.style.cssText = [
      'position:fixed',
      'border-radius:50%',
      'border:2px solid #3B82F6',
      'pointer-events:none',
      'z-index:100001',
      'left:50%',
      'top:50%',
      'transform:translate(-50%,-50%) scale(0)',
      'opacity:0.8',
      'width:20px',
      'height:20px',
    ].join(';');
    overlay.appendChild(ring);
    var ringStart = performance.now() + delay;
    function animateRing(now) {
      if (now < ringStart) { requestAnimationFrame(animateRing); return; }
      var elapsed = now - ringStart;
      var duration = 600;
      var progress = clamp(elapsed / duration, 0, 1);
      var scale = progress * 80;
      var opacity = (1 - progress) * 0.6;
      ring.style.transform = 'translate(-50%,-50%) scale(' + scale + ')';
      ring.style.opacity = opacity;
      if (progress < 1) {
        requestAnimationFrame(animateRing);
      } else {
        ring.remove();
      }
    }
    requestAnimationFrame(animateRing);
  }

  function triggerPortalExplosion() {
    // Multiple expanding rings
    for (var i = 0; i < 5; i++) {
      createPortalRing(i * 80);
    }

    // Flash white-blue
    var flash = document.createElement('div');
    flash.style.cssText = [
      'position:fixed',
      'inset:0',
      'background:#1d4ed8',
      'z-index:100002',
      'opacity:0',
      'pointer-events:none'
    ].join(';');
    document.body.appendChild(flash);

    // Hex scales to fill screen
    if (hexWrap) {
      var hexStart = performance.now();
      var hexDuration = 600;
      function animateHex(now) {
        var elapsed = now - hexStart;
        var progress = clamp(elapsed / hexDuration, 0, 1);
        var easedProgress = easeInCubic(progress);
        var scale = lerp(1, 25, easedProgress);
        var opacity = progress > 0.7 ? 1 - ((progress - 0.7) / 0.3) : 1;
        hexWrap.style.transform = 'translate(-50%,-50%) scale(' + scale + ')';
        hexWrap.style.opacity = opacity;
        if (progress < 1) requestAnimationFrame(animateHex);
      }
      requestAnimationFrame(animateHex);
    }

    // Flash sequence
    setTimeout(function() {
      flash.style.opacity = '0.9';
      setTimeout(function() {
        flash.style.opacity = '0';
        flash.style.transition = 'opacity 200ms';
        setTimeout(function() {
          overlay.style.background = '#000000';
          if (!redirected) {
            redirected = true;
            window.location.href = 'https://app.xevora.io/auth/login';
          }
        }, 200);
      }, 120);
    }, 300);
  }

  function tick(now) {
    if (!startTime) startTime = now;
    var elapsed = now - startTime;

    // STAGE 1: Fade in (0-400ms)
    if (elapsed <= STAGES.FADE_IN.end) {
      var fadeProgress = clamp(elapsed / STAGES.FADE_IN.end, 0, 1);
      overlay.style.opacity = fadeProgress;

      // Hex scales in
      if (hexWrap) {
        var hexScale = lerp(0.5, 1, easeInOut(fadeProgress));
        hexWrap.style.opacity = fadeProgress;
        hexWrap.style.transform = 'translate(-50%,-50%) scale(' + hexScale + ')';
      }

      // Wordmark slides up
      if (wordmark) {
        var wordY = lerp(20, 0, easeInOut(fadeProgress));
        wordmark.style.opacity = fadeProgress;
        wordmark.style.transform = 'translateY(' + wordY + 'px)';
      }

      // Bar track fades in
      if (barTrack) {
        barTrack.style.opacity = clamp((elapsed - 200) / 200, 0, 1);
      }
    }

    // STAGE 2: Loading bar (400-1900ms)
    if (elapsed >= STAGES.LOADING.start && elapsed <= STAGES.LOADING.end) {
      var loadElapsed = elapsed - STAGES.LOADING.start;
      var loadDuration = STAGES.LOADING.end - STAGES.LOADING.start;
      var loadProgress = clamp(loadElapsed / loadDuration, 0, 1);
      var easedLoad = easeInOut(loadProgress);

      if (barFill) {
        barFill.style.width = (easedLoad * 100) + '%';
      }
      if (barDot) {
        barDot.style.opacity = '1';
        barDot.style.left = (easedLoad * 100) + '%';
      }

      // Status text
      for (var i = STATUS.length - 1; i >= 0; i--) {
        if (elapsed >= STATUS[i].at && lastStatus !== i) {
          lastStatus = i;
          if (statusEl) {
            statusEl.style.opacity = '0';
            statusEl.style.transform = 'translateY(4px)';
            ;(function(text, isReady) {
              setTimeout(function() {
                statusEl.textContent = text;
                statusEl.style.transition = 'opacity 200ms, transform 200ms';
                statusEl.style.opacity = '1';
                statusEl.style.transform = 'translateY(0)';
                if (isReady) {
                  statusEl.style.color = '#3B82F6';
                }
              }, 100);
            })(STATUS[i].text, STATUS[i].text === 'READY.');
          }
          break;
        }
      }
    }

    // Bar complete — stop sparks
    if (elapsed > STAGES.LOADING.end && sparkInterval) {
      clearInterval(sparkInterval);
      sparkInterval = null;
      if (barDot) barDot.style.opacity = '0';
    }

    // STAGE 3: Ready pulse (1900-2200ms)
    if (elapsed >= STAGES.READY.start && elapsed <= STAGES.READY.end) {
      if (barFill) barFill.style.width = '100%';
      var readyProgress = clamp((elapsed - STAGES.READY.start) / 300, 0, 1);
      // Hex pulse
      if (hexWrap) {
        var pulse = 1 + Math.sin(readyProgress * Math.PI) * 0.12;
        hexWrap.style.transform = 'translate(-50%,-50%) scale(' + pulse + ')';
      }
      // Fade out bar elements
      if (barTrack) {
        barTrack.style.opacity = clamp(1 - readyProgress * 2, 0, 1);
      }
      if (statusEl) {
        statusEl.style.opacity = clamp(1 - readyProgress * 2, 0, 1);
      }
    }

    // STAGE 4: Portal explosion (2200ms)
    if (elapsed >= STAGES.PORTAL.start && !redirected) {
      triggerPortalExplosion();
      return; // Stop the rAF loop
    }

    requestAnimationFrame(tick);
  }

  function launch() {
    // Build overlay DOM
    overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'background:#03060D',
      'z-index:99999',
      'opacity:0',
      'pointer-events:all'
    ].join(';');

    // Hex icon
    hexWrap = document.createElement('div');
    hexWrap.style.cssText = [
      'position:absolute',
      'left:50%',
      'top:42%',
      'transform:translate(-50%,-50%) scale(0.5)',
      'opacity:0',
      'width:80px',
      'height:80px'
    ].join(';');
    hexWrap.innerHTML = '<svg viewBox="0 0 100 100" width="80" height="80" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="tg-hbg" cx="50%" cy="50%" r="60%"><stop offset="0%" stop-color="#0B1A3E"/><stop offset="100%" stop-color="#03060D"/></radialGradient><filter id="tg-xb" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect width="100" height="100" rx="20" fill="#03060D"/><polygon points="50,8 92,32 92,68 50,92 8,68 8,32" fill="url(#tg-hbg)" stroke="#1E3A6E" stroke-width="1.5"/><polygon points="50,8 92,32 92,68 50,92 8,68 8,32" fill="none" stroke="#2563EB" stroke-width="1" opacity="0.6"/><g filter="url(#tg-xb)"><line x1="22" y1="22" x2="78" y2="78" stroke="#1d4ed8" stroke-width="14" stroke-linecap="round"/><line x1="78" y1="22" x2="22" y2="78" stroke="#1d4ed8" stroke-width="14" stroke-linecap="round"/></g><line x1="22" y1="22" x2="78" y2="78" stroke="#3B82F6" stroke-width="8" stroke-linecap="round"/><line x1="78" y1="22" x2="22" y2="78" stroke="#3B82F6" stroke-width="8" stroke-linecap="round"/><line x1="22" y1="22" x2="78" y2="78" stroke="#93c5fd" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/><line x1="78" y1="22" x2="22" y2="78" stroke="#93c5fd" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/><circle cx="50" cy="50" r="3" fill="#bfdbfe" opacity="0.9"/></svg>';
    overlay.appendChild(hexWrap);

    // Concentric rings behind hex
    for (var r = 0; r < 3; r++) {
      var ring = document.createElement('div');
      var ringSize = 120 + r * 60;
      ring.style.cssText = [
        'position:absolute',
        'left:50%',
        'top:42%',
        'width:' + ringSize + 'px',
        'height:' + ringSize + 'px',
        'border-radius:50%',
        'border:1px solid rgba(37,99,235,' + (0.15 - r * 0.04) + ')',
        'transform:translate(-50%,-50%)',
        'pointer-events:none',
        'animation:ringPulse' + r + ' ' + (2.5 + r * 0.3) + 's ease-in-out infinite'
      ].join(';');
      overlay.appendChild(ring);
    }

    // XEVORA wordmark
    wordmark = document.createElement('div');
    wordmark.textContent = 'XEVORA';
    wordmark.style.cssText = [
      'position:absolute',
      'left:50%',
      'top:calc(42% + 60px)',
      'transform:translateX(-50%) translateY(20px)',
      'font-family:"Plus Jakarta Sans",sans-serif',
      'font-weight:800',
      'font-size:22px',
      'letter-spacing:0.3em',
      'color:#F1F5FF',
      'opacity:0',
      'white-space:nowrap'
    ].join(';');
    overlay.appendChild(wordmark);

    // Status text
    statusEl = document.createElement('div');
    statusEl.textContent = 'INITIALIZING...';
    statusEl.style.cssText = [
      'position:absolute',
      'left:50%',
      'top:calc(42% + 96px)',
      'transform:translateX(-50%)',
      'font-family:"JetBrains Mono",monospace',
      'font-size:11px',
      'letter-spacing:0.15em',
      'color:#4E6D92',
      'opacity:1',
      'white-space:nowrap'
    ].join(';');
    overlay.appendChild(statusEl);

    // Bar track
    barTrack = document.createElement('div');
    barTrack.style.cssText = [
      'position:absolute',
      'left:50%',
      'top:calc(42% + 124px)',
      'transform:translateX(-50%)',
      'width:260px',
      'height:3px',
      'background:rgba(37,99,235,0.15)',
      'border-radius:2px',
      'overflow:visible',
      'opacity:0'
    ].join(';');

    // Bar fill
    barFill = document.createElement('div');
    barFill.style.cssText = [
      'position:absolute',
      'left:0',
      'top:0',
      'height:100%',
      'width:0%',
      'background:linear-gradient(90deg,#1d4ed8,#3B82F6,#60a5fa)',
      'border-radius:2px',
      'transition:none'
    ].join(';');
    barTrack.appendChild(barFill);

    // Bar dot
    barDot = document.createElement('div');
    barDot.style.cssText = [
      'position:absolute',
      'top:50%',
      'left:0%',
      'transform:translate(-50%,-50%)',
      'width:10px',
      'height:10px',
      'border-radius:50%',
      'background:#ffffff',
      'box-shadow:0 0 8px 3px #3B82F6, 0 0 20px 6px rgba(59,130,246,0.4)',
      'opacity:0',
      'z-index:2'
    ].join(';');
    barTrack.appendChild(barDot);
    overlay.appendChild(barTrack);

    // Ring pulse keyframes
    var style = document.createElement('style');
    style.textContent = [
      '@keyframes ringPulse0{0%,100%{opacity:0.4;transform:translate(-50%,-50%) scale(1)}50%{opacity:0.1;transform:translate(-50%,-50%) scale(1.05)}}',
      '@keyframes ringPulse1{0%,100%{opacity:0.25;transform:translate(-50%,-50%) scale(1)}50%{opacity:0.06;transform:translate(-50%,-50%) scale(1.05)}}',
      '@keyframes ringPulse2{0%,100%{opacity:0.12;transform:translate(-50%,-50%) scale(1)}50%{opacity:0.03;transform:translate(-50%,-50%) scale(1.05)}}'
    ].join('');
    document.head.appendChild(style);

    document.body.appendChild(overlay);

    // Spark interval during loading
    setTimeout(function() {
      sparkInterval = setInterval(createSpark, 80);
    }, 400);

    // Kick off rAF loop
    requestAnimationFrame(tick);
  }

  // Expose trigger function
  window.xevoraTransition = function(targetUrl) {
    launch();
  };
})();
