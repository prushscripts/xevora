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
    { at: 0,    text: 'INITIALIZING...',       color: '#4E6D92' },
    { at: 500,  text: 'AUTHENTICATING...',     color: '#4E6D92' },
    { at: 1000, text: 'LOADING WORKSPACE...', color: '#4E6D92' },
    { at: 1500, text: 'ALMOST READY...',       color: '#4E6D92' },
    { at: 1900, text: 'READY.',                color: '#3B82F6' }
  ];

  var lastStatusIndex = -1;

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

  var SPARK_COLORS = [
    '#ffffff','#ffffff','#ffffff',
    '#fff9c4','#fef08a',
    '#bfdbfe','#93c5fd'
  ];

  function createSpark(originX, originY) {
    var el = document.createElement('div');
    
    var len = Math.random() * 14 + 6;
    var wid = Math.random() * 1.2 + 0.4;
    var color = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)];
    
    var angleBase = -110;
    var angleSpread = Math.random() * 120 - 60;
    var angle = angleBase + angleSpread;
    var rad = angle * Math.PI / 180;
    var speed = Math.random() * 7 + 3;
    
    var vx = Math.cos(rad) * speed;
    var vy = Math.sin(rad) * speed;
    var gravity = 0.28 + Math.random() * 0.18;
    var lifetime = Math.random() * 300 + 180;
    var rotation = angle;
    
    el.style.cssText = [
      'position:fixed',
      'width:' + len + 'px',
      'height:' + wid + 'px',
      'border-radius:' + wid + 'px',
      'background:linear-gradient(90deg,' + color + ' 0%,rgba(255,255,255,0.3) 100%)',
      'pointer-events:none',
      'z-index:100001',
      'left:' + originX + 'px',
      'top:' + originY + 'px',
      'transform-origin:left center',
      'transform:rotate(' + rotation + 'deg)',
      'opacity:1',
      'box-shadow:0 0 2px 0px ' + color
    ].join(';');
    document.body.appendChild(el);

    var t0 = performance.now();
    var hasLanded = false;
    var floorY = window.innerHeight * 0.68;

    function tick(now) {
      var elapsed = now - t0;
      var progress = elapsed / lifetime;
      if (progress >= 1) { el.remove(); return; }

      vx *= 0.975;
      vy += gravity;
      rotation = Math.atan2(vy, vx) * (180 / Math.PI);

      var x = parseFloat(el.style.left) + vx;
      var y = parseFloat(el.style.top) + vy;

      if (!hasLanded && y >= floorY) {
        hasLanded = true;
        floorSkitter(x, floorY, color);
        el.remove();
        return;
      }

      var opacity = progress < 0.2 
        ? 1 
        : 1 - ((progress - 0.2) / 0.8);
      opacity = Math.max(0, opacity);

      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.transform = 'rotate(' + rotation + 'deg)';
      el.style.opacity = opacity;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function floorSkitter(x, y, color) {
    if (Math.random() > 0.30) return;
    
    var count = Math.floor(Math.random() * 2) + 1;
    for (var i = 0; i < count; i++) {
      var sk = document.createElement('div');
      var skLen = Math.random() * 8 + 3;
      var skVx = (Math.random() - 0.5) * 5;
      var skVy = -(Math.random() * 1.5);
      var skColor = Math.random() > 0.5 ? '#ffffff' : color;
      
      sk.style.cssText = [
        'position:fixed',
        'width:' + skLen + 'px',
        'height:1px',
        'border-radius:1px',
        'background:linear-gradient(90deg,' + skColor + ',transparent)',
        'pointer-events:none',
        'z-index:100001',
        'left:' + x + 'px',
        'top:' + y + 'px',
        'opacity:0.9'
      ].join(';');
      document.body.appendChild(sk);

      var sk0 = performance.now();
      var skLife = Math.random() * 200 + 100;
      ;(function(el, vx, vy) {
        function animSk(now) {
          var prog = (now - sk0) / skLife;
          if (prog >= 1) { el.remove(); return; }
          vx *= 0.88;
          vy += 0.08;
          el.style.left = (parseFloat(el.style.left) + vx) + 'px';
          el.style.top = (parseFloat(el.style.top) + vy) + 'px';
          el.style.opacity = (1 - prog) * 0.8;
          requestAnimationFrame(animSk);
        }
        requestAnimationFrame(animSk);
      })(sk, skVx, skVy);
    }

    if (Math.random() > 0.5) {
      var splat = document.createElement('div');
      splat.style.cssText = [
        'position:fixed',
        'width:16px','height:3px',
        'border-radius:50%',
        'background:radial-gradient(ellipse,rgba(147,197,253,0.5) 0%,transparent 70%)',
        'pointer-events:none',
        'z-index:100000',
        'left:' + (x-8) + 'px',
        'top:' + (y-1) + 'px'
      ].join(';');
      document.body.appendChild(splat);
      var sp0 = performance.now();
      function animSplat(now) {
        var prog = Math.min((now-sp0)/350, 1);
        splat.style.opacity = (1-prog) * 0.6;
        splat.style.width = (16 + prog*20) + 'px';
        splat.style.left = (x - 8 - prog*10) + 'px';
        if (prog < 1) requestAnimationFrame(animSplat);
        else splat.remove();
      }
      requestAnimationFrame(animSplat);
    }
  }

  function createSmoke(ox, oy) {
    var sm = document.createElement('div');
    var sz = Math.random() * 6 + 3;
    sm.style.cssText = [
      'position:fixed',
      'width:' + sz + 'px',
      'height:' + sz + 'px',
      'border-radius:50%',
      'background:rgba(147,197,253,0.12)',
      'filter:blur(3px)',
      'pointer-events:none',
      'z-index:100000',
      'left:' + ox + 'px',
      'top:' + oy + 'px'
    ].join(';');
    document.body.appendChild(sm);
    var sm0 = performance.now();
    var smLife = Math.random() * 600 + 500;
    var smVx = (Math.random()-0.4) * 0.6;
    var smVy = -(Math.random() * 0.9 + 0.5);
    function animSmoke(now) {
      var prog = (now - sm0) / smLife;
      if (prog >= 1) { sm.remove(); return; }
      var nsz = sz + prog * 16;
      sm.style.width = nsz + 'px';
      sm.style.height = nsz + 'px';
      sm.style.left = (parseFloat(sm.style.left) + smVx) + 'px';
      sm.style.top = (parseFloat(sm.style.top) + smVy) + 'px';
      sm.style.opacity = (1 - prog) * 0.14;
      requestAnimationFrame(animSmoke);
    }
    requestAnimationFrame(animSmoke);
  }


  function triggerExit() {
    var seq = performance.now();
    
    // Phase 1 (0-200ms): Everything fades out cleanly
    if (barContainer) {
      barContainer.style.transition = 'opacity 200ms';
      barContainer.style.opacity = '0';
    }
    if (statusEl) {
      statusEl.style.transition = 'opacity 200ms';
      statusEl.style.opacity = '0';
    }
    if (hexWrap) {
      hexWrap.style.transition = 'opacity 200ms';
      hexWrap.style.opacity = '0';
    }
    if (wordmark) {
      wordmark.style.transition = 'opacity 200ms';
      wordmark.style.opacity = '0';
    }
    
    // Phase 2 (200-700ms): PRECISION SCAN LINE
    setTimeout(function() {
      var scan = document.createElement('div');
      scan.style.cssText = [
        'position:fixed',
        'left:0',
        'top:0',
        'width:100%',
        'height:1px',
        'pointer-events:none',
        'z-index:100010',
        'background:linear-gradient(90deg,transparent 0%,rgba(59,130,246,0.3) 15%,rgba(147,197,253,0.9) 40%,rgba(255,255,255,1) 50%,rgba(147,197,253,0.9) 60%,rgba(59,130,246,0.3) 85%,transparent 100%)',
        'box-shadow:0 0 8px 2px rgba(147,197,253,0.6),0 0 25px 8px rgba(59,130,246,0.25)',
        'will-change:transform'
      ].join(';');
      document.body.appendChild(scan);

      var scanDuration = 480;
      var sc0 = performance.now();
      function animScan(now) {
        var prog = Math.min((now - sc0) / scanDuration, 1);
        var eased = prog < 0.5 
          ? 4*prog*prog*prog 
          : 1 - Math.pow(-2*prog+2,3)/2;
        scan.style.transform = 'translateY(' + (eased * window.innerHeight) + 'px)';
        if (prog < 1) {
          requestAnimationFrame(animScan);
        } else {
          scan.remove();
          triggerFadeOut();
        }
      }
      requestAnimationFrame(animScan);
    }, 200);

    function triggerFadeOut() {
      var fade = document.createElement('div');
      fade.style.cssText = [
        'position:fixed',
        'inset:0',
        'background:#03060D',
        'z-index:100011',
        'opacity:0',
        'pointer-events:none',
        'will-change:opacity'
      ].join(';');
      document.body.appendChild(fade);

      // Two brief light streaks across screen
      for (var s = 0; s < 2; s++) {
        ;(function(delay, yPos) {
          setTimeout(function() {
            var streak = document.createElement('div');
            streak.style.cssText = [
              'position:fixed',
              'left:-100%',
              'top:' + yPos,
              'width:40%',
              'height:1px',
              'background:linear-gradient(90deg,transparent,rgba(147,197,253,0.6),transparent)',
              'pointer-events:none',
              'z-index:100012',
              'transition:left 300ms ease-in'
            ].join(';');
            document.body.appendChild(streak);
            setTimeout(function() {
              streak.style.left = '150%';
            }, 20);
            setTimeout(function() { streak.remove(); }, 400);
          }, delay);
        })(s * 60, (30 + s * 15) + '%');
      }

      // Fade in the dark overlay
      var f0 = performance.now();
      var fadeDur = 350;
      function animFade(now) {
        var prog = Math.min((now - f0) / fadeDur, 1);
        fade.style.opacity = prog * prog;
        if (prog < 1) {
          requestAnimationFrame(animFade);
        } else {
          window.location.href = 'https://app.xevora.io/auth/login';
        }
      }
      requestAnimationFrame(animFade);
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

      // Status text cycling - single element content swap
      for (var i = STATUS.length - 1; i >= 0; i--) {
        if (elapsed >= STATUS[i].at && lastStatusIndex !== i) {
          lastStatusIndex = i;
          if (statusEl) {
            statusEl.style.opacity = '0';
            statusEl.style.transform = 'translateY(4px)';
            ;(function(txt, col) {
              setTimeout(function() {
                statusEl.textContent = txt;
                statusEl.style.color = col;
                statusEl.style.transition = 'opacity 200ms, transform 200ms';
                statusEl.style.opacity = '1';
                statusEl.style.transform = 'translateY(0)';
              }, 120);
            })(STATUS[i].text, STATUS[i].color);
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

    // STAGE 4: Exit sequence (1900ms - when bar finishes)
    if (elapsed >= 1900 && !redirected) {
      redirected = true;
      triggerExit();
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

    // Plasma flare container
    flareContainer = document.createElement('div');
    flareContainer.style.cssText = [
      'position:absolute',
      'top:50%',
      'left:0%',
      'width:0',
      'height:0',
      'pointer-events:none',
      'z-index:5'
    ].join(';');
    barTrack.appendChild(flareContainer);

    var flareOuter = document.createElement('div');
    flareOuter.style.cssText = [
      'position:absolute',
      'width:40px',
      'height:40px',
      'border-radius:50%',
      'transform:translate(-50%,-50%)',
      'background:radial-gradient(circle,rgba(255,255,255,0.95) 0%,rgba(147,197,253,0.5) 20%,rgba(59,130,246,0.15) 50%,transparent 70%)',
      'animation:plasmaCore 0.3s ease-in-out infinite'
    ].join(';');

    var flareCore = document.createElement('div');
    flareCore.style.cssText = [
      'position:absolute',
      'width:5px',
      'height:5px',
      'border-radius:50%',
      'transform:translate(-50%,-50%)',
      'background:#ffffff',
      'box-shadow:0 0 2px 1px #fff,0 0 6px 3px #93c5fd,0 0 14px 6px #3B82F6,0 0 28px 10px rgba(37,99,235,0.7)'
    ].join(';');

    flareContainer.appendChild(flareOuter);
    flareContainer.appendChild(flareCore);

    // Keyframes for animations
    var style = document.createElement('style');
    style.textContent = [
      '@keyframes ringPulse0{0%,100%{opacity:0.12;transform:translate(-50%,-50%) scale(1)}50%{opacity:0.04;transform:translate(-50%,-50%) scale(1.06)}}',
      '@keyframes ringPulse1{0%,100%{opacity:0.08;transform:translate(-50%,-50%) scale(1)}50%{opacity:0.02;transform:translate(-50%,-50%) scale(1.06)}}',
      '@keyframes ringPulse2{0%,100%{opacity:0.04;transform:translate(-50%,-50%) scale(1)}50%{opacity:0.01;transform:translate(-50%,-50%) scale(1.06)}}',
      '@keyframes plasmaCore{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:1}50%{transform:translate(-50%,-50%) scale(1.3);opacity:0.85}}'
    ].join('');
    document.head.appendChild(style);

    document.body.appendChild(overlay);

    // Particle intervals during loading
    setTimeout(function() {
      sparkInterval = setInterval(function() {
        if (!flareContainer || !barTrack) return;
        var rect = barTrack.getBoundingClientRect();
        var barPct = parseFloat(barFill.style.width) / 100;
        var ox = rect.left + (rect.width * barPct);
        var oy = rect.top + rect.height / 2;
        createSpark(ox, oy);
        createSpark(ox, oy);
      }, 30);
      wispInterval = setInterval(function() {
        if (!flareContainer || !barTrack) return;
        var rect = barTrack.getBoundingClientRect();
        var barPct = parseFloat(barFill.style.width) / 100;
        var ox = rect.left + (rect.width * barPct);
        var oy = rect.top + rect.height / 2;
        createSmoke(ox, oy);
      }, 110);
    }, 400);

    // Kick off rAF loop
    requestAnimationFrame(tick);
  }

  // Expose trigger function
  window.xevoraTransition = function(targetUrl) {
    launch();
  };
})();
