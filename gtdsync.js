/* =====================================================================
   GOING THE DISTANCE — the transport

   Getting a game's state onto a screen that isn't this one. Two pages
   publish: control.html, where a host is running a show, and play.html,
   when somebody playing solo wants a clean output to record.

   Two paths out, and they are for different things:

     BroadcastChannel  other tabs and windows in this same browser. Free,
                       instant, no setup — this is what a mirror window
                       for a screen recorder runs on.
     ntfy relays       another machine entirely, which is what an OBS
                       browser source is even when it is on the same desk.

   The relay half is the careful one. Every message goes to every enabled
   relay at once and counts as delivered the moment any one accepts it, so
   a 429 from ntfy.sh or a mirror going dark costs nothing while another is
   answering. Each relay carries its own backoff. The sequence number is
   clock-based rather than a counter, so reloading the publishing page
   cannot restart it below what the overlay has already applied — which
   would make the overlay ignore everything until the count caught up.
   ===================================================================== */
window.GTDSync = (function(){
'use strict';

/* A relay that hangs is worse than one that refuses: without a deadline the
   request sits on the browser's TCP timeout — a minute and a half — and that
   relay retries nothing in the meantime. */
const SEND_TIMEOUT = 6000;
function fetchWithTimeout(url, opts, ms){
  if(typeof AbortController === 'undefined') return fetch(url, opts);
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  return fetch(url, Object.assign({}, opts, { signal:ac.signal })).finally(() => clearTimeout(t));
}

function create(cfg){
  const C = cfg || {};
  const RELAY = GTD.RELAYS.map(r => Object.assign({}, r, {
    on:true, pending:null, inFlight:false, backoff:0, ok:0, fail:0, state:'idle'
  }));
  const store = C.storeKey || null;
  if(store){
    try{
      const saved = JSON.parse(localStorage.getItem(store) || 'null');
      if(saved) RELAY.forEach(r => { if(saved[r.host] !== undefined) r.on = !!saved[r.host]; });
    }catch(e){}
  }
  function saveRelays(){
    if(!store) return;
    try{
      const o = {}; RELAY.forEach(r => o[r.host] = r.on);
      localStorage.setItem(store, JSON.stringify(o));
    }catch(e){}
  }

  let topic = C.topic || '';
  let lastSig = null, sendTimer = null, sent = 0, lastN = 0;
  function nextSeq(){ lastN = Math.max(Date.now(), lastN + 1); return lastN; }
  const status = () => { if(C.onStatus) C.onStatus(RELAY, sent); };

  let BC = null;
  try{ BC = new BroadcastChannel(C.channel || 'going_the_distance'); }catch(e){}
  /* A mirror window that opens mid-round has missed every message so far, so
     it asks; whoever is publishing answers with the current state. */
  let latest = null;
  if(BC) BC.onmessage = ev => {
    const d = ev.data;
    if(d && d.__req && latest){ try{ BC.postMessage(latest); }catch(e){} }
  };

  function flushRelay(r){
    if(!r.on || r.inFlight || r.pending === null || !topic) return;
    r.inFlight = true;
    const body = r.pending; r.pending = null;
    fetchWithTimeout('https://' + r.host + '/' + encodeURIComponent(topic), { method:'POST', body:body }, SEND_TIMEOUT)
      .then(res => {
        if(res.status === 429 || res.status >= 500){
          if(r.pending === null) r.pending = body;          /* newest state wins */
          r.backoff = Math.min(30000, r.backoff ? Math.round(r.backoff * 1.8) : 2000);
          r.state = 'busy'; r.fail++;
        } else if(!res.ok){
          if(r.pending === null) r.pending = body;
          r.backoff = Math.min(30000, r.backoff ? Math.round(r.backoff * 1.8) : 4000);
          r.state = 'down'; r.fail++;
        } else { r.backoff = 0; r.ok++; r.state = 'ok'; }
      })
      .catch(() => {
        if(r.pending === null) r.pending = body;
        r.backoff = Math.min(30000, r.backoff ? Math.round(r.backoff * 1.8) : 3000);
        r.state = 'down'; r.fail++;
      })
      .then(() => {
        r.inFlight = false;
        status();
        if(r.pending !== null) setTimeout(() => flushRelay(r), r.backoff || 120);
      });
  }
  function flushAll(body){
    RELAY.forEach(r => { if(!r.on) return; r.pending = body; flushRelay(r); });
    status();
  }

  /* obj is the state the overlay draws. The caller owns the signature,
     because which fields are volatile is the game's business, not the
     transport's — a running clock must not look like a change worth a
     message. */
  function send(obj, force){
    latest = obj;
    if(BC){ try{ BC.postMessage(obj); }catch(e){} }
    if(!topic) return;
    const sig = C.sigOf ? C.sigOf(obj) : JSON.stringify(obj);
    if(!force && sig === lastSig) return;
    lastSig = sig;
    clearTimeout(sendTimer);
    sendTimer = setTimeout(() => {
      sent++;
      const out = Object.assign({}, obj, { n:nextSeq() });
      flushAll(JSON.stringify(out));
    }, 140);
  }

  /* Last resort with no network at all: the whole state base64'd into the
     display URL. Pasted into a source it paints the right picture, frozen. */
  function snapshotURL(base, obj){
    const body = JSON.stringify(Object.assign({}, obj, { n:nextSeq() }));
    const b64 = btoa(unescape(encodeURIComponent(body))).replace(/\+/g, '-').replace(/\//g, '_');
    return base + '#s=' + b64;
  }

  return {
    relays:RELAY, saveRelays:saveRelays, status:status,
    send:send, snapshotURL:snapshotURL,
    sent:() => sent,
    topic:() => topic,
    setTopic:t => { topic = (t || '').trim(); lastSig = null; }
  };
}
return { create:create };
})();
