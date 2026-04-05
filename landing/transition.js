(function() {
  var overlay, overlayContent, hexWrap, wordmark, statusEl, barContainer, barTrack, barFill, flareContainer;
  var startTime = null;
  var redirected = false;
  var sparks = [];
  var wisps = [];
  var sparkInterval = null;
  var wispInterval = null;

  var STAGES = {
    FADE_IN: { start: 0, end: 400 },
    LOADING: { start: 400, end: 1800 },
    DISSOLVE: { start: 1800, end: 2400 },
    PORTAL: { start: 2400, end: 2800 }
  };

  var STATUS = [
    { at: 0,    text: 'INITIALIZING...' },
    { at: 500,  text: 'AUTHENTICATING...' },
    { at: 1000, text: 'LOADING WORKSPACE...' },
    { at: 1500, text: 'ALMOST READY...' },
    { at: 1800, text: 'READY.' }
  ];

  var lastStatus = -1;

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

  var sparkColors = ['#ffffff','#ffffff','#fffbeb','#fef08a','#93c5fd','#60a5fa','#e0f2fe','#bfdbfe'];

  function createSpark() {
    if (!flareContainer) return;
    var rect = flareContainer.getBoundingClientRect();
    var originX = rect.left + rect.width / 2;
    var originY = rect.top + rect.height / 2;
    
    var spark = document.createElement('div');
    var size = Math.random() * 3.5 + 1.5;
    var color = sparkColors[Math.floor(Math.random() * sparkColors.length)];
    var angle = (Math.random() * 140) - 130;
    var rad = angle * Math.PI / 180;
    var speed = Math.random() * 9 + 4;
    var vx = Math.cos(rad) * speed;
    var vy = Math.sin(rad) * speed - 3;
    var gravity = 0.35 + Math.random() * 0.2;
    var lifetime = Math.random() * 350 + 200;
    var willHitFloor = Math.random() < 0.18;

    spark.style.cssText = [
      'position:fixed',
      'width:' + size + 'px',
      'height:' + (size * 1.6) + 'px',
      'border-radius:50% 50% 30% 30%',
      'background:' + color,
      'pointer-events:none',
      'z-index:100001',
      'left:' + originX + 'px',
      'top:' + originY + 'px',
      'box-shadow:0 0 ' + (size*2) + 'px ' + size + 'px ' + color
    ].join(';');
    document.body.appendChild(spark);

    var startTime = performance.now();
    var rotation = Math.random() * 360;
    var hasHitFloor = false;
    var screenH = window.innerHeight;
    var floorLine = screenH * 0.72;

    function animateSpark(now) {
      var elapsed = now - startTime;
      var progress = elapsed / lifetime;

      if (progress >= 1) {
        spark.remove();
        return;
      }

      vx *= 0.97;
      vy += gravity;
      rotation += vx * 3;

      var x = parseFloat(spark.style.left) + vx;
      var y = parseFloat(spark.style.top) + vy;

      if (willHitFloor && !hasHitFloor && y >= floorLine) {
        hasHitFloor = true;
        createFloorSplash(x, floorLine, color);
        vy = -(Math.abs(vy) * 0.3);
        vx *= 0.4;
      }

      var opacity = progress < 0.15 
        ? progress / 0.15 
        : 1 - ((progress - 0.15) / 0.85);
      opacity = Math.max(0, opacity * (1 - progress * 0.3));

      spark.style.left = x + 'px';
      spark.style.top = y + 'px';
      spark.style.opacity = opacity;
      spark.style.transform = 'rotate(' + rotation + 'deg) scaleY(' + (1 + Math.abs(vy) * 0.04) + ')';

      requestAnimationFrame(animateSpark);
    }
    requestAnimationFrame(animateSpark);
  }

  function createFloorSplash(x, y, color) {
    var count = Math.floor(Math.random() * 3) + 2;
    for (var i = 0; i < count; i++) {
      var floorSpark = document.createElement('div');
      var fs = Math.random() * 2 + 0.8;
      var fvx = (Math.random() - 0.5) * 6;
      var fvy = -(Math.random() * 2 + 0.5);
      floorSpark.style.cssText = [
        'position:fixed',
        'width:' + fs + 'px',
        'height:' + fs + 'px',
        'border-radius:50%',
        'background:' + color,
        'box-shadow:0 0 3px 1px ' + color,
        'pointer-events:none',
        'z-index:100001',
        'left:' + x + 'px',
        'top:' + y + 'px',
        'opacity:0.9'
      ].join(';');
      document.body.appendChild(floorSpark);

      var fsStart = performance.now();
      var fsLife = Math.random() * 250 + 150;
      ;(function(el, fvx, fvy) {
        function animateFloorSpark(now) {
          var elapsed = now - fsStart;
          var prog = elapsed / fsLife;
          if (prog >= 1) { el.remove(); return; }
          fvx *= 0.92;
          fvy += 0.15;
          el.style.left = (parseFloat(el.style.left) + fvx) + 'px';
          el.style.top = (parseFloat(el.style.top) + fvy) + 'px';
          el.style.opacity = (1 - prog) * 0.8;
          requestAnimationFrame(animateFloorSpark);
        }
        requestAnimationFrame(animateFloorSpark);
      })(floorSpark, fvx, fvy);
    }

    var splat = document.createElement('div');
    splat.style.cssText = [
      'position:fixed',
      'width:20px',
      'height:4px',
      'border-radius:50%',
      'background:radial-gradient(ellipse, rgba(96,165,250,0.6) 0%, transparent 70%)',
      'pointer-events:none',
      'z-index:100000',
      'left:' + (x - 10) + 'px',
      'top:' + (y - 2) + 'px',
      'opacity:0.8'
    ].join(';');
    document.body.appendChild(splat);
    var splatStart = performance.now();
    function animateSplat(now) {
      var prog = (now - splatStart) / 400;
      if (prog >= 1) { splat.remove(); return; }
      splat.style.opacity = (1 - prog) * 0.8;
      splat.style.width = (20 + prog * 30) + 'px';
      splat.style.left = (x - 10 - prog * 15) + 'px';
      requestAnimationFrame(animateSplat);
    }
    requestAnimationFrame(animateSplat);
  }

  function createSmoke() {
    if (!flareContainer) return;
    var rect = flareContainer.getBoundingClientRect();
    var originX = rect.left + rect.width / 2;
    var originY = rect.top + rect.height / 2;
    
    var smoke = document.createElement('div');
    var size = Math.random() * 8 + 4;
    smoke.style.cssText = [
      'position:fixed',
      'width:' + size + 'px',
      'height:' + size + 'px',
      'border-radius:50%',
      'background:radial-gradient(circle, rgba(147,197,253,0.2) 0%, transparent 70%)',
      'pointer-events:none',
      'z-index:100000',
      'left:' + originX + 'px',
      'top:' + originY + 'px',
      'filter:blur(2px)'
    ].join(';');
    document.body.appendChild(smoke);

    var startTime = performance.now();
    var lifetime = Math.random() * 500 + 600;
    var vx = (Math.random() - 0.3) * 0.8;
    var vy = -(Math.random() * 1.2 + 0.6);

    function animateSmoke(now) {
      var elapsed = now - startTime;
      var progress = elapsed / lifetime;
      if (progress >= 1) { smoke.remove(); return; }

      var x = parseFloat(smoke.style.left) + vx;
      var y = parseFloat(smoke.style.top) + vy;
      var currentSize = size + progress * 20;
      var opacity = (1 - progress) * 0.18;

      smoke.style.left = x + 'px';
      smoke.style.top = y + 'px';
      smoke.style.width = currentSize + 'px';
      smoke.style.height = currentSize + 'px';
      smoke.style.opacity = opacity;
      requestAnimationFrame(animateSmoke);
    }
    requestAnimationFrame(animateSmoke);
  }


  function triggerEntrance() {
    // Step 1: Bar + status fade out
    if (barContainer) barContainer.style.transition = 'opacity 200ms';
    if (barContainer) barContainer.style.opacity = '0';
    if (statusEl) statusEl.style.transition = 'opacity 200ms';
    if (statusEl) statusEl.style.opacity = '0';

    // Step 2: Status text → READY. and hex pulse
    setTimeout(function() {
      if (statusEl) {
        statusEl.textContent = 'READY.';
        statusEl.style.color = '#3B82F6';
        statusEl.style.opacity = '1';
      }
      if (hexWrap) {
        var hexPulseStart = performance.now();
        function pulseHex(now) {
          var elapsed = now - hexPulseStart;
          var progress = Math.min(elapsed / 300, 1);
          var scale = progress < 0.5 
            ? 1 + (progress * 2) * 0.12 
            : 1.12 - ((progress - 0.5) * 2) * 0.12;
          hexWrap.style.transform = 'scale(' + scale + ')';
          if (progress < 1) requestAnimationFrame(pulseHex);
        }
        requestAnimationFrame(pulseHex);
      }
    }, 200);

    // Step 3: Horizontal scan line (starts at 500ms)
    setTimeout(function() {
      var scanLine = document.createElement('div');
      scanLine.style.cssText = [
        'position:fixed',
        'left:0',
        'width:100%',
        'height:2px',
        'background:linear-gradient(90deg, transparent 0%, #3B82F6 20%, #93c5fd 50%, #3B82F6 80%, transparent 100%)',
        'box-shadow:0 0 20px 10px rgba(59,130,246,0.4), 0 0 60px 30px rgba(59,130,246,0.15)',
        'pointer-events:none',
        'z-index:100005',
        'top:-2px'
      ].join(';');
      document.body.appendChild(scanLine);

      var scanStart = performance.now();
      function animateScan(now) {
        var elapsed = now - scanStart;
        var progress = Math.min(elapsed / 500, 1);
        var eased = progress < 0.5 
          ? 2 * progress * progress 
          : -1 + (4 - 2 * progress) * progress;
        scanLine.style.top = (eased * window.innerHeight) + 'px';
        if (progress < 1) {
          requestAnimationFrame(animateScan);
        } else {
          scanLine.remove();
          triggerFinalWarp();
        }
      }
      requestAnimationFrame(animateScan);
    }, 500);

    // Step 4: Warp effect
    function triggerFinalWarp() {
      var warpOverlay = document.createElement('div');
      warpOverlay.style.cssText = [
        'position:fixed',
        'inset:0',
        'background:#03060D',
        'z-index:100006',
        'opacity:0',
        'pointer-events:none',
        'will-change:opacity'
      ].join(';');
      document.body.appendChild(warpOverlay);

      // Concentric rings expand from center
      for (var r = 0; r < 4; r++) {
        ;(function(delay) {
          setTimeout(function() {
            var ring = document.createElement('div');
            ring.style.cssText = [
              'position:fixed',
              'border-radius:50%',
              'border:1px solid rgba(59,130,246,0.6)',
              'pointer-events:none',
              'z-index:100007',
              'left:50%',
              'top:50%',
              'width:10px',
              'height:10px',
              'transform:translate(-50%,-50%) scale(1)',
              'opacity:0.8'
            ].join(';');
            document.body.appendChild(ring);

            var rStart = performance.now();
            var rDur = 600;
            function animateRing(now) {
              var prog = Math.min((now - rStart) / rDur, 1);
              var scale = 1 + prog * 180;
              ring.style.transform = 'translate(-50%,-50%) scale(' + scale + ')';
              ring.style.opacity = (1 - prog) * 0.6;
              if (prog < 1) {
                requestAnimationFrame(animateRing);
              } else {
                ring.remove();
              }
            }
            requestAnimationFrame(animateRing);
          }, delay);
        })(r * 80);
      }

      // Overlay fades in over 400ms then redirect
      var fadeStart = performance.now();
      function fadeToDark(now) {
        var prog = Math.min((now - fadeStart) / 400, 1);
        warpOverlay.style.opacity = prog * prog;
        if (prog < 1) {
          requestAnimationFrame(fadeToDark);
        } else {
          window.location.href = 'https://app.xevora.io/auth/login';
        }
      }
      requestAnimationFrame(fadeToDark);
    }
  }

  function tick(now) {
    if (!startTime) startTime = now;
    var elapsed = now - startTime;

    // STAGE 1: Fade in (0-400ms)
    if (elapsed <= STAGES.FADE_IN.end) {
      var fadeProgress = clamp(elapsed / STAGES.FADE_IN.end, 0, 1);
      overlay.style.opacity = fadeProgress;
      overlayContent.style.opacity = fadeProgress;

      // Hex scales in
      if (hexWrap) {
        var hexScale = lerp(0.5, 1, easeInOut(fadeProgress));
        hexWrap.style.transform = 'scale(' + hexScale + ')';
      }
    }

    // STAGE 2: Loading bar (400-1800ms)
    if (elapsed >= STAGES.LOADING.start && elapsed <= STAGES.LOADING.end) {
      var loadElapsed = elapsed - STAGES.LOADING.start;
      var loadDuration = STAGES.LOADING.end - STAGES.LOADING.start;
      var loadProgress = clamp(loadElapsed / loadDuration, 0, 1);
      var easedLoad = easeInOut(loadProgress);

      if (barFill) {
        barFill.style.width = (easedLoad * 100) + '%';
      }
      if (flareContainer) {
        flareContainer.style.left = (easedLoad * 100) + '%';
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

    // Bar complete — stop particles
    if (elapsed > STAGES.LOADING.end) {
      if (sparkInterval) {
        clearInterval(sparkInterval);
        sparkInterval = null;
      }
      if (wispInterval) {
        clearInterval(wispInterval);
        wispInterval = null;
      }
    }

    // STAGE 3: Dissolve out (1800-2400ms)
    if (elapsed >= STAGES.DISSOLVE.start && elapsed <= STAGES.DISSOLVE.end) {
      if (barFill) barFill.style.width = '100%';
      var dissolveElapsed = elapsed - STAGES.DISSOLVE.start;
      var dissolveDuration = STAGES.DISSOLVE.end - STAGES.DISSOLVE.start;
      
      // Hex final pulse (first 200ms)
      if (dissolveElapsed < 200 && hexWrap) {
        var pulseProgress = dissolveElapsed / 200;
        var pulse = 1 + Math.sin(pulseProgress * Math.PI) * 0.08;
        hexWrap.style.transform = 'scale(' + pulse + ')';
      }
      
      // Fade out all content (300ms starting at 1800ms)
      if (dissolveElapsed >= 0) {
        var fadeProgress = clamp(dissolveElapsed / 300, 0, 1);
        overlayContent.style.opacity = 1 - fadeProgress;
      }
      
      // Collapse rings (400ms starting at 1800ms)
      var rings = overlay.querySelectorAll('.concentric-ring');
      if (dissolveElapsed >= 0) {
        var collapseProgress = clamp(dissolveElapsed / 400, 0, 1);
        for (var r = 0; r < rings.length; r++) {
          var scale = 1 - collapseProgress * 0.3;
          rings[r].style.transform = 'translate(-50%,-50%) scale(' + scale + ')';
          rings[r].style.opacity = (1 - collapseProgress) * (0.12 - r * 0.04);
        }
      }
    }

    // STAGE 4: Entrance sequence (1900ms - when bar finishes)
    if (elapsed >= 1900 && !redirected) {
      redirected = true;
      triggerEntrance();
      return;
    }

    requestAnimationFrame(tick);
  }

  function launch() {
    // Preload the destination page invisibly
    var preloadFrame = document.createElement('iframe');
    preloadFrame.src = 'https://app.xevora.io/auth/login';
    preloadFrame.style.cssText = [
      'position:fixed',
      'width:1px',
      'height:1px',
      'opacity:0',
      'pointer-events:none',
      'border:none',
      'top:-9999px',
      'left:-9999px'
    ].join(';');
    document.body.appendChild(preloadFrame);

    // Build overlay DOM
    overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'background:#03060D',
      'z-index:99999',
      'opacity:0',
      'pointer-events:all',
      'transform:translateZ(0)'
    ].join(';');

    // Centered flex column container
    overlayContent = document.createElement('div');
    overlayContent.style.cssText = [
      'position:absolute',
      'left:50%',
      'top:45%',
      'transform:translate(-50%,-50%)',
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'gap:0',
      'width:280px',
      'will-change:transform,opacity'
    ].join(';');
    overlay.appendChild(overlayContent);

    // Hex icon - 80px
    hexWrap = document.createElement('div');
    hexWrap.style.cssText = [
      'width:80px',
      'height:80px',
      'transform:scale(0.5)',
      'will-change:transform,opacity'
    ].join(';');
    hexWrap.innerHTML = '<svg viewBox="0 0 100 100" width="80" height="80" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="tg-hbg" cx="50%" cy="50%" r="60%"><stop offset="0%" stop-color="#0B1A3E"/><stop offset="100%" stop-color="#03060D"/></radialGradient><filter id="tg-xb" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect width="100" height="100" rx="20" fill="#03060D"/><polygon points="50,8 92,32 92,68 50,92 8,68 8,32" fill="url(#tg-hbg)" stroke="#1E3A6E" stroke-width="1.5"/><polygon points="50,8 92,32 92,68 50,92 8,68 8,32" fill="none" stroke="#2563EB" stroke-width="1" opacity="0.6"/><g filter="url(#tg-xb)"><line x1="22" y1="22" x2="78" y2="78" stroke="#1d4ed8" stroke-width="14" stroke-linecap="round"/><line x1="78" y1="22" x2="22" y2="78" stroke="#1d4ed8" stroke-width="14" stroke-linecap="round"/></g><line x1="22" y1="22" x2="78" y2="78" stroke="#3B82F6" stroke-width="8" stroke-linecap="round"/><line x1="78" y1="22" x2="22" y2="78" stroke="#3B82F6" stroke-width="8" stroke-linecap="round"/><line x1="22" y1="22" x2="78" y2="78" stroke="#93c5fd" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/><line x1="78" y1="22" x2="22" y2="78" stroke="#93c5fd" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/><circle cx="50" cy="50" r="3" fill="#bfdbfe" opacity="0.9"/></svg>';
    overlayContent.appendChild(hexWrap);

    // 16px gap (handled by margin)
    var gap1 = document.createElement('div');
    gap1.style.height = '16px';
    overlayContent.appendChild(gap1);

    // Concentric rings - positioned absolutely centered on hex
    var ringSizes = [140, 190, 240];
    var ringOpacities = [0.12, 0.08, 0.04];
    for (var r = 0; r < 3; r++) {
      var ring = document.createElement('div');
      ring.className = 'concentric-ring';
      ring.style.cssText = [
        'position:absolute',
        'left:50%',
        'top:45%',
        'width:' + ringSizes[r] + 'px',
        'height:' + ringSizes[r] + 'px',
        'border-radius:50%',
        'border:1px solid #2563EB',
        'opacity:' + ringOpacities[r],
        'transform:translate(-50%,-50%)',
        'pointer-events:none',
        'animation:ringPulse' + r + ' ' + (2.5 + r * 0.3) + 's ease-in-out infinite'
      ].join(';');
      overlay.appendChild(ring);
    }

    // XEVORA wordmark - below hex
    wordmark = document.createElement('div');
    wordmark.textContent = 'XEVORA';
    wordmark.style.cssText = [
      'font-family:"Plus Jakarta Sans",sans-serif',
      'font-weight:800',
      'font-size:22px',
      'letter-spacing:0.3em',
      'color:#F1F5FF',
      'white-space:nowrap',
      'will-change:transform,opacity'
    ].join(';');
    overlayContent.appendChild(wordmark);

    // 8px gap
    var gap2 = document.createElement('div');
    gap2.style.height = '8px';
    overlayContent.appendChild(gap2);

    // Status text
    statusEl = document.createElement('div');
    statusEl.textContent = 'INITIALIZING...';
    statusEl.style.cssText = [
      'font-family:"JetBrains Mono",monospace',
      'font-size:11px',
      'letter-spacing:0.15em',
      'color:#4E6D92',
      'white-space:nowrap',
      'transition:opacity 200ms, transform 200ms'
    ].join(';');
    overlayContent.appendChild(statusEl);

    // 24px gap
    var gap3 = document.createElement('div');
    gap3.style.height = '24px';
    overlayContent.appendChild(gap3);

    // Bar container
    barContainer = document.createElement('div');
    barContainer.style.cssText = [
      'position:relative',
      'width:260px',
      'height:3px',
      'will-change:opacity'
    ].join(';');
    overlayContent.appendChild(barContainer);

    // Bar track
    barTrack = document.createElement('div');
    barTrack.style.cssText = [
      'position:absolute',
      'left:0',
      'top:0',
      'width:100%',
      'height:3px',
      'background:rgba(37,99,235,0.12)',
      'border-radius:2px',
      'overflow:visible'
    ].join(';');
    barContainer.appendChild(barTrack);

    // Bar fill
    barFill = document.createElement('div');
    barFill.style.cssText = [
      'position:absolute',
      'left:0',
      'top:0',
      'height:100%',
      'width:0%',
      'background:linear-gradient(90deg,#1d4ed8 0%,#3B82F6 60%,#93c5fd 100%)',
      'border-radius:2px',
      'transition:none'
    ].join(';');
    barTrack.appendChild(barFill);

    // Multi-layer flare container
    flareContainer = document.createElement('div');
    flareContainer.style.cssText = [
      'position:absolute',
      'top:50%',
      'left:0%',
      'transform:translate(-50%,-50%)',
      'width:32px',
      'height:32px',
      'pointer-events:none',
      'z-index:10'
    ].join(';');
    barTrack.appendChild(flareContainer);

    // Outer glow ring - larger and more dramatic
    var flareGlowRing = document.createElement('div');
    flareGlowRing.style.cssText = [
      'position:absolute',
      'left:50%',
      'top:50%',
      'transform:translate(-50%,-50%)',
      'width:40px',
      'height:40px',
      'border-radius:50%',
      'background:radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(96,165,250,0.5) 20%, rgba(59,130,246,0.2) 50%, transparent 70%)',
      'z-index:9',
      'animation:flarePulse 0.35s ease-in-out infinite alternate'
    ].join(';');
    flareContainer.appendChild(flareGlowRing);

    // Mid glow layer
    var flareMidGlow = document.createElement('div');
    flareMidGlow.style.cssText = [
      'position:absolute',
      'left:50%',
      'top:50%',
      'transform:translate(-50%,-50%)',
      'width:16px',
      'height:16px',
      'border-radius:50%',
      'background:radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(147,197,253,0.6) 50%, transparent 100%)',
      'box-shadow:0 0 8px 4px rgba(255,255,255,0.6)',
      'z-index:10'
    ].join(';');
    flareContainer.appendChild(flareMidGlow);

    // Core dot - bright hard spark
    var flareCore = document.createElement('div');
    flareCore.style.cssText = [
      'position:absolute',
      'left:50%',
      'top:50%',
      'transform:translate(-50%,-50%)',
      'width:8px',
      'height:8px',
      'border-radius:50%',
      'background:#ffffff',
      'box-shadow:0 0 3px 1px #ffffff, 0 0 8px 3px #ffffff, 0 0 15px 6px #60a5fa, 0 0 25px 10px #3B82F6, 0 0 40px 15px rgba(37,99,235,0.4)',
      'z-index:11'
    ].join(';');
    flareContainer.appendChild(flareCore);

    // Hot center point
    var flareHotPoint = document.createElement('div');
    flareHotPoint.style.cssText = [
      'position:absolute',
      'left:50%',
      'top:50%',
      'transform:translate(-50%,-50%)',
      'width:3px',
      'height:3px',
      'border-radius:50%',
      'background:#ffffff',
      'box-shadow:0 0 2px 1px #ffffff',
      'z-index:12'
    ].join(';');
    flareContainer.appendChild(flareHotPoint);

    // Keyframes for animations
    var style = document.createElement('style');
    style.textContent = [
      '@keyframes ringPulse0{0%,100%{opacity:0.12;transform:translate(-50%,-50%) scale(1)}50%{opacity:0.04;transform:translate(-50%,-50%) scale(1.06)}}',
      '@keyframes ringPulse1{0%,100%{opacity:0.08;transform:translate(-50%,-50%) scale(1)}50%{opacity:0.02;transform:translate(-50%,-50%) scale(1.06)}}',
      '@keyframes ringPulse2{0%,100%{opacity:0.04;transform:translate(-50%,-50%) scale(1)}50%{opacity:0.01;transform:translate(-50%,-50%) scale(1.06)}}',
      '@keyframes flarePulse{from{transform:translate(-50%,-50%) scale(0.85);opacity:0.7}to{transform:translate(-50%,-50%) scale(1.15);opacity:1.0}}'
    ].join('');
    document.head.appendChild(style);

    document.body.appendChild(overlay);

    // Particle intervals during loading
    setTimeout(function() {
      sparkInterval = setInterval(function() {
        createSpark();
        createSpark();
      }, 35);
      wispInterval = setInterval(createSmoke, 100);
    }, 400);

    // Kick off rAF loop
    requestAnimationFrame(tick);
  }

  // Expose trigger function
  window.xevoraTransition = function(targetUrl) {
    launch();
  };
})();
