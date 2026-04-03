function xevoraTransition(e, destination) {
  if (e && e.preventDefault) e.preventDefault();
  if (document.getElementById('xev-overlay')) return;

  var style = document.createElement('style');
  style.textContent = [
    '@keyframes xRing{0%{transform:translate(-50%,-50%) scale(0.9);opacity:0.7}50%{transform:translate(-50%,-50%) scale(1.1);opacity:0.15}100%{transform:translate(-50%,-50%) scale(0.9);opacity:0.7}}',
    '@keyframes xGlow{0%,100%{opacity:0.5}50%{opacity:1}}',
    '@keyframes xScan{0%{top:-2px;opacity:0}5%{opacity:0.5}95%{opacity:0.5}100%{top:100%;opacity:0}}',
    '@keyframes xParticle{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--px),var(--py)) scale(0)}}',
    '@keyframes xSparkPulse{0%,100%{box-shadow:0 0 6px 3px rgba(96,165,250,1),0 0 14px 6px rgba(37,99,235,0.8)}50%{box-shadow:0 0 10px 6px rgba(96,165,250,1),0 0 24px 12px rgba(37,99,235,0.9)}}'
  ].join('');
  document.head.appendChild(style);

  var ov = document.createElement('div');
  ov.id = 'xev-overlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#03060D;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;transition:opacity 250ms ease-out;overflow:hidden;';

  var scan = document.createElement('div');
  scan.style.cssText = 'position:absolute;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(37,99,235,0.2),rgba(96,165,250,0.5),rgba(37,99,235,0.2),transparent);animation:xScan 2.5s linear infinite;pointer-events:none;z-index:2;';

  var cornerStyles = [
    'top:28px;left:28px;border-top:1.5px solid rgba(37,99,235,0.5);border-left:1.5px solid rgba(37,99,235,0.5);',
    'top:28px;right:28px;border-top:1.5px solid rgba(37,99,235,0.5);border-right:1.5px solid rgba(37,99,235,0.5);',
    'bottom:28px;left:28px;border-bottom:1.5px solid rgba(37,99,235,0.5);border-left:1.5px solid rgba(37,99,235,0.5);',
    'bottom:28px;right:28px;border-bottom:1.5px solid rgba(37,99,235,0.5);border-right:1.5px solid rgba(37,99,235,0.5);'
  ];
  var corners = cornerStyles.map(function(s) {
    var d = document.createElement('div');
    d.style.cssText = 'position:absolute;width:20px;height:20px;opacity:0;transition:opacity 300ms ease 200ms;' + s;
    return d;
  });

  var glow = document.createElement('div');
  glow.style.cssText = 'position:absolute;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,rgba(37,99,235,0.15) 0%,transparent 68%);top:50%;left:50%;transform:translate(-50%,-50%);animation:xGlow 2.8s ease-in-out infinite;pointer-events:none;';

  function makeRing(size, dur, delay, opacity) {
    var r = document.createElement('div');
    r.style.cssText = 'position:absolute;width:'+size+'px;height:'+size+'px;border-radius:50%;border:1px solid rgba(37,99,235,'+opacity+');top:50%;left:50%;transform:translate(-50%,-50%);animation:xRing '+dur+'s cubic-bezier(0.16,1,0.3,1) infinite;animation-delay:'+delay+'s;pointer-events:none;transition:transform 400ms cubic-bezier(0.4,0,0.2,1),opacity 400ms ease;';
    return r;
  }

  var ring1 = makeRing(320, 3.2, 0, '0.2');
  var ring2 = makeRing(230, 4.5, 1.2, '0.12');
  var ring3 = makeRing(160, 5.5, 0.6, '0.07');

  var center = document.createElement('div');
  center.style.cssText = 'position:relative;z-index:10;display:flex;flex-direction:column;align-items:center;opacity:0;transform:scale(0.88);transition:opacity 350ms ease 80ms,transform 350ms cubic-bezier(0.16,1,0.3,1) 80ms;';

  var hexWrap = document.createElement('div');
  hexWrap.style.cssText = 'width:76px;height:76px;border-radius:14px;background:rgba(6,11,20,1);border:1px solid rgba(37,99,235,0.4);box-shadow:0 0 0 1px rgba(59,130,246,0.12),0 0 40px rgba(37,99,235,0.35);display:flex;align-items:center;justify-content:center;margin-bottom:20px;transition:box-shadow 300ms ease;';
  hexWrap.innerHTML = '<svg width="46" height="46" viewBox="0 0 100 100" fill="none"><polygon points="50,6 89,28 89,72 50,94 11,72 11,28" fill="#060B14" stroke="rgba(37,99,235,0.6)" stroke-width="2.5"/><path d="M33,25 L43,25 L50,37 L57,25 L67,25 L55,50 L67,75 L57,75 L50,63 L43,75 L33,75 L45,50 Z" fill="#2563EB"/><polygon points="50,43 57,50 50,57 43,50" fill="#60A5FA"/></svg>';

  var wordmark = document.createElement('div');
  wordmark.style.cssText = 'font-family:"JetBrains Mono",monospace;font-size:12px;letter-spacing:0.45em;color:#F1F5FF;margin-bottom:8px;';
  wordmark.textContent = 'XEVORA';

  var statusEl = document.createElement('div');
  statusEl.style.cssText = 'font-family:"JetBrains Mono",monospace;font-size:9px;letter-spacing:0.18em;color:#4E6D92;margin-bottom:24px;min-height:14px;transition:opacity 150ms ease;';
  statusEl.textContent = 'INITIALIZING...';

  var barWrap = document.createElement('div');
  barWrap.style.cssText = 'width:220px;height:3px;background:rgba(37,99,235,0.1);border-radius:999px;position:relative;overflow:visible;';

  var barFill = document.createElement('div');
  barFill.style.cssText = 'height:100%;width:0%;background:linear-gradient(90deg,rgba(37,99,235,0.5),#3B82F6,#93C5FD);border-radius:999px;position:relative;transition:width 1300ms cubic-bezier(0.4,0,0.15,1);';

  var spark = document.createElement('div');
  spark.style.cssText = 'position:absolute;right:-4px;top:50%;transform:translateY(-50%);width:10px;height:10px;border-radius:50%;background:#fff;box-shadow:0 0 6px 3px rgba(96,165,250,1),0 0 14px 6px rgba(37,99,235,0.8),0 0 28px 10px rgba(37,99,235,0.4);opacity:0;transition:opacity 200ms ease;animation:xSparkPulse 0.8s ease-in-out infinite;';

  var particleContainer = document.createElement('div');
  particleContainer.style.cssText = 'position:absolute;right:-4px;top:50%;transform:translateY(-50%);pointer-events:none;overflow:visible;';

  barFill.appendChild(spark);
  barFill.appendChild(particleContainer);
  barWrap.appendChild(barFill);
  center.appendChild(hexWrap);
  center.appendChild(wordmark);
  center.appendChild(statusEl);
  center.appendChild(barWrap);

  ov.appendChild(scan);
  corners.forEach(function(c) { ov.appendChild(c); });
  ov.appendChild(glow);
  ov.appendChild(ring1);
  ov.appendChild(ring2);
  ov.appendChild(ring3);
  ov.appendChild(center);
  document.body.appendChild(ov);

  function burstParticles(count) {
    for (var i = 0; i < (count || 8); i++) {
      (function(idx) {
        var p = document.createElement('div');
        var angle = (idx / (count || 8)) * Math.PI * 2 + Math.random() * 0.5;
        var dist = 14 + Math.random() * 24;
        var px = Math.cos(angle) * dist;
        var py = Math.sin(angle) * dist;
        var size = 2 + Math.random() * 3;
        p.style.cssText = 'position:absolute;width:'+size+'px;height:'+size+'px;border-radius:50%;background:rgba('+(Math.random()>0.5?'96,165,250':'147,197,253')+','+(0.6+Math.random()*0.4)+');--px:'+px+'px;--py:'+py+'px;animation:xParticle '+(500+Math.random()*300)+'ms ease-out forwards;animation-delay:'+(Math.random()*80)+'ms;top:0;left:0;';
        particleContainer.appendChild(p);
        setTimeout(function() { if (p.parentNode) p.parentNode.removeChild(p); }, 900);
      })(i);
    }
  }

  requestAnimationFrame(function() {
    ov.style.opacity = '1';
    corners.forEach(function(c) { c.style.opacity = '1'; });

    setTimeout(function() {
      center.style.opacity = '1';
      center.style.transform = 'scale(1)';

      setTimeout(function() {
        spark.style.opacity = '1';
        barFill.style.width = '100%';

        var burstInterval = setInterval(function() { burstParticles(8); }, 320);

        var statuses = ['INITIALIZING...', 'AUTHENTICATING...', 'LOADING WORKSPACE...'];
        var si = 0;
        var statusInterval = setInterval(function() {
          si = (si + 1) % statuses.length;
          statusEl.style.opacity = '0';
          setTimeout(function() {
            statusEl.textContent = statuses[si];
            statusEl.style.opacity = '1';
          }, 150);
        }, 440);

        setTimeout(function() {
          clearInterval(burstInterval);
          clearInterval(statusInterval);
          burstParticles(14);
          burstParticles(14);

          spark.style.opacity = '0';
          statusEl.style.opacity = '0';
          setTimeout(function() {
            statusEl.style.color = '#4ADE80';
            statusEl.style.letterSpacing = '0.35em';
            statusEl.textContent = 'READY.';
            statusEl.style.opacity = '1';
          }, 150);

          setTimeout(function() {
            /* DRAMATIC EXIT */
            /* Step 1: hex glows intensely */
            hexWrap.style.boxShadow = '0 0 0 2px rgba(59,130,246,0.5), 0 0 80px rgba(37,99,235,1), 0 0 160px rgba(37,99,235,0.7), 0 0 280px rgba(37,99,235,0.4)';

            /* Step 2: rings collapse */
            setTimeout(function() {
              [ring1, ring2, ring3].forEach(function(r) {
                r.style.animation = 'none';
                r.style.transform = 'translate(-50%,-50%) scale(0.05)';
                r.style.opacity = '0';
              });

              /* Step 3: center punches forward */
              setTimeout(function() {
                center.style.transition = 'transform 380ms cubic-bezier(0.4,0,0.2,1), opacity 200ms ease 280ms';
                center.style.transform = 'scale(18)';
                center.style.opacity = '0';

                /* Step 4: overlay fades */
                setTimeout(function() {
                  ov.style.transition = 'opacity 280ms ease-in';
                  ov.style.opacity = '0';

                  /* Blocker to prevent landing page flash */
                  var blocker = document.createElement('div');
                  blocker.style.cssText = 'position:fixed;inset:0;z-index:9999999;background:#03060D;';
                  document.body.appendChild(blocker);

                  setTimeout(function() {
                    window.location.href = destination;
                  }, 200);
                }, 200);
              }, 180);
            }, 220);
          }, 500);
        }, 1350);
      }, 150);
    }, 80);
  });
}
