function xevoraTransition(e, destination) {
  if (e && e.preventDefault) e.preventDefault();
  if (document.getElementById('xev-overlay')) return;

  var TOTAL_DURATION = 2800;
  var startTime = performance.now();

  var style = document.createElement('style');
  style.textContent = [
    '@keyframes xGlow{0%,100%{opacity:0.5}50%{opacity:1}}',
    '@keyframes xSparkPulse{0%,100%{box-shadow:0 0 6px 3px rgba(96,165,250,1),0 0 14px 6px rgba(37,99,235,0.8)}50%{box-shadow:0 0 10px 6px rgba(96,165,250,1),0 0 24px 12px rgba(37,99,235,0.9)}}'
  ].join('');
  document.head.appendChild(style);

  var ov = document.createElement('div');
  ov.id = 'xev-overlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#03060D;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;transition:opacity 250ms ease-out;overflow:hidden;';


  var glow = document.createElement('div');
  glow.style.cssText = 'position:absolute;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,rgba(37,99,235,0.15) 0%,transparent 68%);top:50%;left:50%;transform:translate(-50%,-50%);animation:xGlow 2.8s ease-in-out infinite;pointer-events:none;opacity:0;transition:opacity 300ms ease;';

  function makeRing(size, opacity) {
    var r = document.createElement('div');
    r.style.cssText = 'position:absolute;width:'+size+'px;height:'+size+'px;border-radius:50%;border:1px solid rgba(37,99,235,'+opacity+');top:50%;left:50%;transform:translate(-50%,-50%) scale(0);opacity:0;pointer-events:none;transition:transform 400ms cubic-bezier(0.4,0,0.2,1),opacity 400ms ease;will-change:transform,opacity;';
    return r;
  }

  var ring1 = makeRing(320, '0.2');
  var ring2 = makeRing(230, '0.12');
  var ring3 = makeRing(160, '0.07');

  var center = document.createElement('div');
  center.style.cssText = 'position:relative;z-index:10;display:flex;flex-direction:column;align-items:center;opacity:0;transform:scale(0.88);transition:opacity 350ms ease 80ms,transform 350ms cubic-bezier(0.16,1,0.3,1) 80ms;';

  var hexWrap = document.createElement('div');
  hexWrap.style.cssText = 'width:76px;height:76px;border-radius:14px;background:rgba(6,11,20,1);border:1px solid rgba(37,99,235,0.4);box-shadow:0 0 0 1px rgba(59,130,246,0.12),0 0 40px rgba(37,99,235,0.35);display:flex;align-items:center;justify-content:center;margin-bottom:20px;transition:box-shadow 300ms ease;';
  hexWrap.innerHTML = '<svg width="46" height="46" viewBox="0 0 100 100" fill="none"><polygon points="50,6 89,28 89,72 50,94 11,72 11,28" fill="#060B14" stroke="rgba(37,99,235,0.6)" stroke-width="2.5"/><path d="M33,25 L43,25 L50,37 L57,25 L67,25 L55,50 L67,75 L57,75 L50,63 L43,75 L33,75 L45,50 Z" fill="#2563EB"/><polygon points="50,43 57,50 50,57 43,50" fill="#60A5FA"/></svg>';

  var wordmark = document.createElement('div');
  wordmark.style.cssText = 'font-family:"Plus Jakarta Sans",sans-serif;font-weight:800;font-size:14px;letter-spacing:0.3em;color:#F1F5FF;margin-bottom:8px;opacity:0;transform:translateY(10px);transition:opacity 350ms ease,transform 350ms cubic-bezier(0.16,1,0.3,1);';
  wordmark.textContent = 'XEVORA';

  var statusEl = document.createElement('div');
  statusEl.style.cssText = 'font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:0.15em;color:#4E6D92;margin-bottom:24px;min-height:16px;transition:color 200ms ease,opacity 150ms ease;';
  statusEl.textContent = 'INITIALIZING...';

  var barWrap = document.createElement('div');
  barWrap.style.cssText = 'width:280px;height:3px;background:rgba(37,99,235,0.1);border-radius:999px;position:relative;overflow:visible;';

  var barFill = document.createElement('div');
  barFill.style.cssText =
    'height:100%;width:0%;transform-origin:left center;' +
    'background:linear-gradient(90deg,#1d4ed8,#3B82F6,#60a5fa);' +
    'border-radius:999px;position:relative;will-change:width;';

  var spark = document.createElement('div');
  spark.style.cssText =
    'position:absolute;right:-3px;top:50%;transform:translate(0,-50%);' +
    'width:6px;height:6px;border-radius:50%;background:#fff;' +
    'box-shadow:0 0 6px 3px rgba(96,165,250,1),0 0 14px 6px rgba(37,99,235,0.8);' +
    'opacity:0;animation:xSparkPulse 0.8s ease-in-out infinite;' +
    'will-change:opacity;';

  var particleContainer = document.createElement('div');
  particleContainer.style.cssText =
    'position:absolute;right:-3px;top:50%;transform:translate(0,-50%);pointer-events:none;overflow:visible;width:0;height:0;';

  barFill.appendChild(spark);
  barFill.appendChild(particleContainer);
  barWrap.appendChild(barFill);
  center.appendChild(hexWrap);
  center.appendChild(wordmark);
  center.appendChild(statusEl);
  center.appendChild(barWrap);

  ov.appendChild(glow);
  ov.appendChild(ring1);
  ov.appendChild(ring2);
  ov.appendChild(ring3);
  ov.appendChild(center);
  document.body.appendChild(ov);

  function burstParticles() {
    var count = 4 + Math.floor(Math.random() * 3);
    for (var i = 0; i < count; i++) {
      (function (idx) {
        var p = document.createElement('div');
        var angle = (Math.random() - 0.5) * (Math.PI / 2.5);
        var dist = 8 + Math.random() * 12;
        var px = Math.cos(angle) * dist;
        var py = Math.sin(angle) * dist;
        var size = 2 + Math.random() * 2;
        var dur = 300;
        var colors = ['255,255,255', '96,165,250', '147,197,253'];
        var col = colors[Math.floor(Math.random() * colors.length)];
        var op = 0.7 + Math.random() * 0.3;
        p.style.cssText =
          'position:absolute;width:' +
          size +
          'px;height:' +
          size +
          'px;border-radius:50%;background:rgba(' +
          col +
          ',' +
          op +
          ');top:0;left:0;';
        particleContainer.appendChild(p);

        if (typeof p.animate === 'function') {
          var anim = p.animate(
            [
              { transform: 'translate(0,0) scale(1)', opacity: 1 },
              { transform: 'translate(' + px + 'px,' + py + 'px) scale(0)', opacity: 0 },
            ],
            { duration: dur, easing: 'ease-out', fill: 'forwards' },
          );
          anim.onfinish = function () {
            if (p.parentNode) p.parentNode.removeChild(p);
          };
        } else {
          setTimeout(function () {
            if (p.parentNode) p.parentNode.removeChild(p);
          }, dur + 50);
        }
      })(i);
    }
  }

  var statusMessages = [
    { time: 0, text: 'INITIALIZING...', color: '#4E6D92' },
    { time: 400, text: 'AUTHENTICATING...', color: '#4E6D92' },
    { time: 900, text: 'LOADING WORKSPACE...', color: '#4E6D92' },
    { time: 1400, text: 'ALMOST READY...', color: '#4E6D92' },
    { time: 1700, text: 'READY.', color: '#3B82F6' }
  ];

  var lastParticleBurst = 0;
  var particleBurstInterval = 120;

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function animationLoop() {
    var elapsed = performance.now() - startTime;
    
    if (elapsed >= TOTAL_DURATION) {
      window.location.href = destination;
      return;
    }

    if (elapsed < 400) {
      var progress = elapsed / 400;
      ov.style.opacity = String(progress);
      glow.style.opacity = String(progress * 0.5);
      
      if (elapsed > 50) {
        var ringProgress = (elapsed - 50) / 350;
        var scale = easeInOutCubic(ringProgress);
        ring1.style.transform = 'translate(-50%,-50%) scale(' + scale + ')';
        ring1.style.opacity = String(scale * 0.2);
      }
      if (elapsed > 130) {
        var ringProgress = (elapsed - 130) / 270;
        var scale = easeInOutCubic(ringProgress);
        ring2.style.transform = 'translate(-50%,-50%) scale(' + scale + ')';
        ring2.style.opacity = String(scale * 0.12);
      }
      if (elapsed > 210) {
        var ringProgress = (elapsed - 210) / 190;
        var scale = easeInOutCubic(ringProgress);
        ring3.style.transform = 'translate(-50%,-50%) scale(' + scale + ')';
        ring3.style.opacity = String(scale * 0.07);
      }
      
      if (elapsed > 100) {
        var centerProgress = (elapsed - 100) / 300;
        center.style.opacity = String(centerProgress);
        center.style.transform = 'scale(' + (0.88 + centerProgress * 0.12) + ')';
      }
      if (elapsed > 200) {
        var wordProgress = (elapsed - 200) / 200;
        wordmark.style.opacity = String(wordProgress);
        wordmark.style.transform = 'translateY(' + (10 - wordProgress * 10) + 'px)';
      }
    }
    
    else if (elapsed >= 400 && elapsed < 1800) {
      var barProgress = Math.min(1, (elapsed - 400) / 1400);
      var easedProgress = easeInOutCubic(barProgress);
      barFill.style.width = (easedProgress * 100) + '%';
      
      if (barProgress > 0.05 && spark.style.opacity !== '1') {
        spark.style.opacity = '1';
      }
      
      if (elapsed - lastParticleBurst > particleBurstInterval && barProgress < 0.98) {
        burstParticles();
        lastParticleBurst = elapsed;
      }
      
      for (var i = 0; i < statusMessages.length; i++) {
        if (elapsed >= statusMessages[i].time && (i === statusMessages.length - 1 || elapsed < statusMessages[i + 1].time)) {
          if (statusEl.textContent !== statusMessages[i].text) {
            statusEl.textContent = statusMessages[i].text;
            statusEl.style.color = statusMessages[i].color;
          }
          break;
        }
      }
    }
    
    else if (elapsed >= 1800 && elapsed < 2400) {
      if (elapsed < 1850) {
        var fadeProgress = (elapsed - 1800) / 50;
        spark.style.opacity = String(1 - fadeProgress);
      }
      
      if (elapsed >= 1850 && elapsed < 2150) {
        var pulseProgress = (elapsed - 1850) / 300;
        var pulseScale = 1 + Math.sin(pulseProgress * Math.PI) * 0.15;
        hexWrap.style.transform = 'scale(' + pulseScale + ')';
        
        if (pulseProgress > 0.3) {
          var glowIntensity = (pulseProgress - 0.3) / 0.7;
          hexWrap.style.boxShadow = '0 0 0 2px rgba(59,130,246,' + (0.5 + glowIntensity * 0.5) + '), 0 0 ' + (40 + glowIntensity * 120) + 'px rgba(37,99,235,1), 0 0 ' + (80 + glowIntensity * 200) + 'px rgba(37,99,235,0.7)';
        }
      }
      
      if (elapsed >= 2000) {
        var collapseProgress = (elapsed - 2000) / 400;
        var collapseScale = 1 - easeInOutCubic(collapseProgress) * 0.95;
        ring1.style.transform = 'translate(-50%,-50%) scale(' + collapseScale + ')';
        ring1.style.opacity = String((1 - collapseProgress) * 0.2);
        ring2.style.transform = 'translate(-50%,-50%) scale(' + collapseScale + ')';
        ring2.style.opacity = String((1 - collapseProgress) * 0.12);
        ring3.style.transform = 'translate(-50%,-50%) scale(' + collapseScale + ')';
        ring3.style.opacity = String((1 - collapseProgress) * 0.07);
      }
      
      if (elapsed >= 2100) {
        var expandProgress = (elapsed - 2100) / 500;
        var expandScale = 1 + easeInOutCubic(expandProgress) * 17;
        center.style.transform = 'scale(' + expandScale + ')';
        
        if (expandScale > 12) {
          var fadeProgress = (expandScale - 12) / 6;
          center.style.opacity = String(1 - fadeProgress);
        }
        
        if (expandProgress > 0.4) {
          var glowProgress = (expandProgress - 0.4) / 0.6;
          glow.style.opacity = String(0.5 + glowProgress * 0.5);
          glow.style.transform = 'translate(-50%,-50%) scale(' + (1 + glowProgress * 2) + ')';
        }
      }
    }
    
    else if (elapsed >= 2400 && elapsed < 2500) {
      var flashProgress = (elapsed - 2400) / 100;
      ov.style.background = 'rgb(' + 
        Math.floor(3 + flashProgress * 26) + ',' + 
        Math.floor(6 + flashProgress * 68) + ',' + 
        Math.floor(13 + flashProgress * 223) + ')';
    }
    
    else if (elapsed >= 2500) {
      ov.style.background = '#000';
    }

    requestAnimationFrame(animationLoop);
  }

  requestAnimationFrame(function() {
    requestAnimationFrame(animationLoop);
  });
}
