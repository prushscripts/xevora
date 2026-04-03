function xevoraTransition(e, destination) {
  if (e && e.preventDefault) e.preventDefault();
  if (document.getElementById('xev-overlay')) return;

  var style = document.createElement('style');
  style.textContent = [
    '@keyframes xRing{0%{transform:translate(-50%,-50%) scale(0.9);opacity:0.7}50%{transform:translate(-50%,-50%) scale(1.1);opacity:0.15}100%{transform:translate(-50%,-50%) scale(0.9);opacity:0.7}}',
    '@keyframes xGlow{0%,100%{opacity:0.5}50%{opacity:1}}',
    '@keyframes xScan{0%{top:-2px;opacity:0}5%{opacity:0.6}95%{opacity:0.6}100%{top:100%;opacity:0}}',
    '@keyframes xSparkPop{0%{transform:translateY(-50%) scale(0);opacity:0}30%{transform:translateY(-50%) scale(1.4);opacity:1}100%{transform:translateY(-50%) scale(1);opacity:1}}',
    '@keyframes xParticle{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--px),var(--py)) scale(0)}}'
  ].join('');
  document.head.appendChild(style);

  var ov = document.createElement('div');
  ov.id = 'xev-overlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#03060D;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;transition:opacity 250ms ease-out;overflow:hidden;';

  /* Scan line */
  var scan = document.createElement('div');
  scan.style.cssText = 'position:absolute;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(37,99,235,0.2),rgba(96,165,250,0.5),rgba(37,99,235,0.2),transparent);animation:xScan 2.5s linear infinite;pointer-events:none;z-index:2;';

  /* Corner brackets */
  var corners = [
    'top:28px;left:28px;border-top:1.5px solid rgba(37,99,235,0.5);border-left:1.5px solid rgba(37,99,235,0.5);',
    'top:28px;right:28px;border-top:1.5px solid rgba(37,99,235,0.5);border-right:1.5px solid rgba(37,99,235,0.5);',
    'bottom:28px;left:28px;border-bottom:1.5px solid rgba(37,99,235,0.5);border-left:1.5px solid rgba(37,99,235,0.5);',
    'bottom:28px;right:28px;border-bottom:1.5px solid rgba(37,99,235,0.5);border-right:1.5px solid rgba(37,99,235,0.5);'
  ].map(function(s) {
    var d = document.createElement('div');
    d.style.cssText = 'position:absolute;width:18px;height:18px;opacity:0;transition:opacity 300ms ease 200ms;' + s;
    return d;
  });

  /* Glow */
  var glow = document.createElement('div');
  glow.style.cssText = 'position:absolute;width:380px;height:380px;border-radius:50%;background:radial-gradient(circle,rgba(37,99,235,0.16) 0%,transparent 68%);top:50%;left:50%;transform:translate(-50%,-50%);animation:xGlow 2.8s ease-in-out infinite;pointer-events:none;';

  /* Rings */
  function makeRing(size, dur, delay, opacity) {
    var r = document.createElement('div');
    r.style.cssText = 'position:absolute;width:'+size+'px;height:'+size+'px;border-radius:50%;border:1px solid rgba(37,99,235,'+opacity+');top:50%;left:50%;transform:translate(-50%,-50%);animation:xRing '+dur+'s cubic-bezier(0.16,1,0.3,1) infinite;animation-delay:'+delay+'s;pointer-events:none;';
    return r;
  }

  /* Center content */
  var center = document.createElement('div');
  center.style.cssText = 'position:relative;z-index:10;display:flex;flex-direction:column;align-items:center;opacity:0;transform:scale(0.88);transition:opacity 350ms ease 80ms,transform 350ms cubic-bezier(0.16,1,0.3,1) 80ms;';

  var hexWrap = document.createElement('div');
  hexWrap.style.cssText = 'width:72px;height:72px;border-radius:14px;background:rgba(6,11,20,1);border:1px solid rgba(37,99,235,0.4);box-shadow:0 0 0 1px rgba(59,130,246,0.12),0 0 40px rgba(37,99,235,0.35);display:flex;align-items:center;justify-content:center;margin-bottom:18px;';
  hexWrap.innerHTML = '<svg width="44" height="44" viewBox="0 0 100 100" fill="none"><polygon points="50,6 89,28 89,72 50,94 11,72 11,28" fill="#060B14" stroke="rgba(37,99,235,0.6)" stroke-width="2.5"/><path d="M33,25 L43,25 L50,37 L57,25 L67,25 L55,50 L67,75 L57,75 L50,63 L43,75 L33,75 L45,50 Z" fill="#2563EB"/><polygon points="50,43 57,50 50,57 43,50" fill="#60A5FA"/></svg>';

  var wordmark = document.createElement('div');
  wordmark.style.cssText = 'font-family:"JetBrains Mono",monospace;font-size:12px;letter-spacing:0.45em;color:#F1F5FF;margin-bottom:8px;';
  wordmark.textContent = 'XEVORA';

  var statusEl = document.createElement('div');
  statusEl.style.cssText = 'font-family:"JetBrains Mono",monospace;font-size:9px;letter-spacing:0.18em;color:#4E6D92;margin-bottom:22px;min-height:14px;transition:opacity 150ms ease;';
  statusEl.textContent = 'INITIALIZING...';

  /* Progress bar */
  var barWrap = document.createElement('div');
  barWrap.style.cssText = 'width:200px;height:3px;background:rgba(37,99,235,0.1);border-radius:999px;position:relative;overflow:visible;';

  var barFill = document.createElement('div');
  barFill.style.cssText = 'height:100%;width:0%;background:linear-gradient(90deg,rgba(37,99,235,0.6),#3B82F6,#60A5FA);border-radius:999px;position:relative;transition:width 1300ms cubic-bezier(0.4,0,0.15,1);';

  /* Spark at leading edge */
  var spark = document.createElement('div');
  spark.style.cssText = 'position:absolute;right:-3px;top:50%;transform:translateY(-50%) scale(0);width:10px;height:10px;border-radius:50%;background:#fff;box-shadow:0 0 6px 3px rgba(96,165,250,1),0 0 14px 6px rgba(37,99,235,0.8),0 0 28px 10px rgba(37,99,235,0.4);opacity:0;transition:opacity 200ms ease;';
  barFill.appendChild(spark);

  /* Particle container */
  var particles = document.createElement('div');
  particles.style.cssText = 'position:absolute;right:-3px;top:50%;transform:translateY(-50%);pointer-events:none;';
  barFill.appendChild(particles);

  barWrap.appendChild(barFill);

  center.appendChild(hexWrap);
  center.appendChild(wordmark);
  center.appendChild(statusEl);
  center.appendChild(barWrap);

  ov.appendChild(scan);
  corners.forEach(function(c) { ov.appendChild(c); });
  ov.appendChild(glow);
  ov.appendChild(makeRing(300, 3.2, 0, '0.18'));
  ov.appendChild(makeRing(220, 4.5, 1.2, '0.1'));
  ov.appendChild(makeRing(160, 5.5, 0.6, '0.06'));
  ov.appendChild(center);
  document.body.appendChild(ov);

  /* Particle burst function */
  function burstParticles() {
    for (var i = 0; i < 8; i++) {
      (function(idx) {
        var p = document.createElement('div');
        var angle = (idx / 8) * Math.PI * 2;
        var dist = 12 + Math.random() * 20;
        var px = Math.cos(angle) * dist;
        var py = Math.sin(angle) * dist;
        p.style.cssText = 'position:absolute;width:'+(2+Math.random()*3)+'px;height:'+(2+Math.random()*3)+'px;border-radius:50%;background:rgba(96,165,250,'+(0.6+Math.random()*0.4)+');--px:'+px+'px;--py:'+py+'px;animation:xParticle 600ms ease-out forwards;animation-delay:'+(Math.random()*100)+'ms;';
        particles.appendChild(p);
        setTimeout(function() { if (p.parentNode) p.parentNode.removeChild(p); }, 800);
      })(i);
    }
  }

  /* Animate in */
  requestAnimationFrame(function() {
    ov.style.opacity = '1';
    corners.forEach(function(c) { c.style.opacity = '1'; });
    setTimeout(function() {
      center.style.opacity = '1';
      center.style.transform = 'scale(1)';
      spark.style.opacity = '1';

      /* Start bar fill after brief pause */
      setTimeout(function() {
        barFill.style.width = '100%';
        spark.style.animation = 'xSparkPop 300ms ease-out forwards';

        /* Burst particles every 300ms while loading */
        var burstInterval = setInterval(burstParticles, 350);

        /* Status cycling */
        var statuses = ['INITIALIZING...', 'AUTHENTICATING...', 'LOADING WORKSPACE...'];
        var si = 0;
        var statusInterval = setInterval(function() {
          si = (si + 1) % statuses.length;
          statusEl.style.opacity = '0';
          setTimeout(function() {
            statusEl.textContent = statuses[si];
            statusEl.style.opacity = '1';
          }, 150);
        }, 450);

        /* After bar completes */
        setTimeout(function() {
          clearInterval(burstInterval);
          clearInterval(statusInterval);

          /* Final burst */
          burstParticles();
          burstParticles();

          statusEl.style.opacity = '0';
          setTimeout(function() {
            statusEl.style.color = '#4ADE80';
            statusEl.textContent = 'READY.';
            statusEl.style.opacity = '1';
          }, 150);

          /* Dramatic exit — scale up and fade */
          setTimeout(function() {
            center.style.transition = 'transform 400ms cubic-bezier(0.4,0,0.2,1), opacity 400ms ease-in';
            center.style.transform = 'scale(1.08)';
            ov.style.transition = 'opacity 400ms ease-in';
            ov.style.opacity = '0';
            setTimeout(function() {
              window.location.href = destination;
            }, 380);
          }, 500);

        }, 1350);

      }, 150);
    }, 80);
  });
}
