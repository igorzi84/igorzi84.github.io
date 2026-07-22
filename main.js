(function(){
  var PING_ENDPOINT = 'https://zilberman-ping.igorzi84.workers.dev/ping';

  var nodeIds = ['n0','n1','n2','n3'];
  var edgeIds = ['e0','e1','e2'];
  var toast = document.getElementById('toast');
  var replayBtn = document.getElementById('replay');
  var running = false;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STEP_MS = reducedMotion ? 0 : 450;
  var REPLAY_COOLDOWN_S = 10;
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

  if(!toast || !replayBtn) return;

  function clean(value, limit){
    return String(value || '').replace(/[\r\n\t]/g, ' ').slice(0, limit || 80);
  }

  function referrerHost(){
    if(!document.referrer) return '';
    try { return new URL(document.referrer).hostname; }
    catch(e) { return ''; }
  }

  function campaign(){
    var params = new URLSearchParams(window.location.search);
    var result = {};
    UTM_KEYS.forEach(function(key){
      var value = params.get(key);
      if(value) result[key] = clean(value, 80);
    });
    return result;
  }

  function sendEvent(payload){
    fetch(PING_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(function(){});
  }

  function sendRealPing(){
    try{
      if(sessionStorage.getItem('zc_pinged')) return;
      sessionStorage.setItem('zc_pinged', '1');
    }catch(e){}
    sendEvent({
      event: 'visit',
      path: clean(window.location.pathname, 160),
      referrer: referrerHost(),
      campaign: campaign()
    });
  }

  document.querySelectorAll('[data-track]').forEach(function(link){
    link.addEventListener('click', function(){
      sendEvent({
        event: 'click',
        target: clean(link.getAttribute('data-track'), 40),
        path: clean(window.location.pathname, 160),
        referrer: referrerHost(),
        campaign: campaign()
      });
    });
  });

  function resetFlow(){
    nodeIds.forEach(function(id){
      var node = document.getElementById(id);
      if(node) node.classList.remove('active');
    });
    edgeIds.forEach(function(id){
      var edge = document.getElementById(id);
      if(edge) edge.classList.remove('active');
    });
    toast.classList.remove('show');
  }

  function runFlow(sendReal){
    if(running) return;
    running = true;
    resetFlow();
    var step = 0;
    var sequence = [];
    nodeIds.forEach(function(nid, i){
      sequence.push(nid);
      if(edgeIds[i]) sequence.push(edgeIds[i]);
    });

    function tick(){
      if(step >= sequence.length){
        toast.classList.add('show');
        if(sendReal) sendRealPing();
        setTimeout(function(){ toast.classList.remove('show'); }, reducedMotion ? 3000 : 10000);
        running = false;
        return;
      }
      var el = document.getElementById(sequence[step]);
      if(el) el.classList.add('active');
      step++;
      if(STEP_MS === 0){
        tick();
      }else{
        setTimeout(tick, STEP_MS);
      }
    }
    tick();
  }

  window.addEventListener('load', function(){
    if(reducedMotion){
      runFlow(true);
      return;
    }
    setTimeout(function(){ runFlow(true); }, 900);
  });

  replayBtn.addEventListener('click', function(){
    if(running || replayBtn.disabled) return;
    runFlow(false);
    var remaining = REPLAY_COOLDOWN_S;
    replayBtn.disabled = true;
    replayBtn.textContent = '⏳ wait ' + remaining + 's';
    var timer = setInterval(function(){
      remaining--;
      if(remaining <= 0){
        clearInterval(timer);
        replayBtn.disabled = false;
        replayBtn.textContent = '↻ send another ping';
        return;
      }
      replayBtn.textContent = '⏳ wait ' + remaining + 's';
    }, 1000);
  });
})();
