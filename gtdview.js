/* =====================================================================
   GOING THE DISTANCE — the overlay renderer

   The 8-bit field, the chyron, the question card, the play call and the
   clocks. Two pages draw this: display.html, which is the OBS browser
   source and gets its state over ntfy, and play.html, where somebody is
   playing in their own browser and the state is right there. Keeping one
   renderer is what stops the two from drifting apart pixel by pixel.

   Both pages ship the same stage markup; this module owns everything
   inside it and touches nothing else.
   ===================================================================== */
window.GTDView = (function(){
'use strict';

function mount(opts){
  const OPT = opts || {};
  const $ = id => document.getElementById(id);
  function diag(t){ const d = $('diag'); if(d) d.textContent = t; }

  /* The question card is sized independently of the field — it plays behind
     the contestants on the key, so the host gets to say how much room it takes
     without touching the lower third. */
  const CARD = { s:[0.48, 0.68], m:[0.58, 0.78], l:[0.74, 0.92] };
  const CARD_V = { s:[0.82, 0.82], m:[1, 0.94], l:[1, 1.06] };
  let cardSize = 'm';
  function applyCard(){
    const t = (layout === 'vert' ? CARD_V : CARD)[cardSize] || CARD.m;
    const r = document.documentElement.style;
    r.setProperty('--cw', t[0]); r.setProperty('--cs', t[1]);
  }

  /* ---------------------------------------------------------------
     LAYOUT

     ?layout= wins, then whatever the control page suggests, then the
     window's own shape — so dropping this into a 1080x1920 OBS source with
     no query string still comes up in the vertical cut.
     --------------------------------------------------------------- */
  const URL_LAYOUT = (OPT.layout || '').toLowerCase();
  let layout = URL_LAYOUT || (window.innerHeight > window.innerWidth ? 'vert' : 'lower');
  function setLayout(l){
    const v = ['lower','full','vert'].includes(l) ? l : 'lower';
    layout = v;
    const calling = document.body.classList.contains('calling');
    document.body.className = 'lay-' + v + (OPT.dev ? '' : ' clean') + (calling ? ' calling' : '') + (OPT.bodyClass ? ' ' + OPT.bodyClass : '');
    applyCard();
    autoScale();
  }
  /* Fit the art to whatever the source is actually sized at. The field only
     ever upscales by a whole number, so it stays hard-edged; the type gets
     the leftover fractional room. */
  let curPx = 4;
  function autoScale(){
    const W = window.innerWidth, H = window.innerHeight;
    const G = GTD.geo(layout === 'vert' ? 'v' : 'h');
    const forced = +OPT.px || 0;
    let px = forced || Math.max(1, Math.floor(W / G.W));
    if(layout === 'vert'){ while(px > 1 && G.H * px > H * 0.62) px--; }
    else if(layout === 'full'){ while(px > 1 && G.H * px > H * 0.30) px--; }
    applyPx(px);
  }
  function applyPx(px){
    curPx = px;
    const G = GTD.geo(layout === 'vert' ? 'v' : 'h');
    const fieldW = G.W;
    const r = document.documentElement.style;
    r.setProperty('--px', px);
    r.setProperty('--fw-px', G.W);
    r.setProperty('--fh-px', G.H);
    const s = +OPT.s || (fieldW * px) / (layout === 'vert' ? 900 : 1920);
    r.setProperty('--s', Math.max(0.25, Math.min(1.8, s)).toFixed(3));
  }
  /* Whatever the question card ends up being — one line or four — the stack
     has to fit the source, so step the field down until it does. Called after
     every render because the card's height is content-dependent. */
  function contentHeight(){
    const stage = document.getElementById('stage');
    const gap = parseFloat(getComputedStyle(stage).rowGap) || 0;
    let n = 0, h = 0;
    Array.from(stage.children).forEach(el => {
      if(!el.offsetHeight) return;
      h += el.offsetHeight; n++;
    });
    return h + Math.max(0, n - 1) * gap;
  }
  function fit(){
    if(OPT.px) return;
    /* #stage is a full-bleed flex box, so its own height is never the answer —
       measure what is actually in it */
    let guard = 6;
    while(guard-- > 0 && curPx > 1 && contentHeight() > window.innerHeight - 4) applyPx(curPx - 1);
  }
  setLayout(layout);
  addEventListener('resize', autoScale);

  /* =====================================================================
     STATE
     ===================================================================== */
  let ST = {
    mode:'drive', chyron:[], lifelines:[],
    plate:{ on:true, kick:"JOMBOY MEDIA", name:"GOING THE\nDISTANCE", sub:"" },
    banner:{ on:false, text:'', bad:false },
    q:{ on:false, text:'', choices:[], correct:0, tier:1, lock:-1, reveal:false, gone:[], num:1 },
    clock:{ on:false, dur:20, seq:0 },
    drive:{ los:1, down:1, dist:10, first:11, score:0, ll:{ pi:true, to:true, cc:true }, safe:1 },
    h2h:{ ball:50, poss:0, teams:[{name:'JAKE',color:'#1b3a5c',score:0},{name:'TREV',color:'#7c1d2b',score:0}] },
    play:null,
    pal:{ offP:'#1b3a5c', offT:'#fbcc7a', defP:'#7c1d2b', defT:'#e8eef4', skin:'#b07a52' },
    cue:null
  };

  /* =====================================================================
     ANIMATION

     A play is one short cutscene: a beat of stillness, the run, then the
     result frame. The clock is read once per frame from performance.now(),
     never accumulated, so a dropped frame in OBS shortens the animation
     instead of desyncing it from the state.
     ===================================================================== */
  let anim = null, lastPlayId = null, flash = 0, chyronPending = false;
  const now = () => performance.now();
  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  function startPlay(p){
    const dist = Math.abs((p.to != null ? p.to : p.from) - p.from);
    anim = {
      t0:now(), pre:280,
      run:Math.min(2400, 420 + dist * 34),
      hold:2600, p:p, called:false
    };
    if(p.key === 'inc') anim.run = 900;
    if(p.fg) { anim.pre = 420; anim.run = 1100; }
  }

  function animSpec(){
    const view = layout === 'vert' ? 'v' : 'h';
    const mode = ST.mode;
    const base = mode === 'h2h'
      ? { los:ST.h2h.ball, first:ST.h2h.target }
      : { los:ST.drive.los, first:ST.drive.first };

    const spec = {
      view:view, los:base.los, first:base.first, chains:true,
      runner:null, defenders:[], ball:null, flash:0,
      pal:{
        off:GTD.teamPal(GTD.PAL.off, ST.pal.offP, ST.pal.offT, ST.pal.skin),
        def:GTD.teamPal(GTD.PAL.def, ST.pal.defP, ST.pal.defT, ST.pal.skin)
      },
      ez:{ own:shade(mode === 'h2h' ? ST.h2h.teams[1].color : ST.pal.offP),
           opp:shade(mode === 'h2h' ? ST.h2h.teams[0].color : ST.pal.defP) },
      marks:mode === 'h2h' ? [] : (ST.drive.marks || [])
    };

    const dirFlip = mode === 'h2h' && ST.h2h.poss === 1;

    if(!anim){
      spec.runner = { yard:base.los, frame:'idle', flip:dirFlip };
      spec.defenders = defAt(base.los + (dirFlip ? -9 : 9), dirFlip);
      spec.flash = flash;
      return spec;
    }

    const p = anim.p, t = now() - anim.t0;
    const from = p.from;
    /* the ball is spotted on the goal line but nobody stops there — carry the
       sprite four yards past it so a score reads as a score */
    const to = (p.to != null ? p.to : p.from) + (p.td ? 4 : 0);

    if(t < anim.pre){
      spec.runner = { yard:from, frame:p.fg ? 'kick' : 'idle', flip:dirFlip };
      spec.defenders = defAt(from + (dirFlip ? -10 : 10), dirFlip);
      return spec;
    }
    const rt = Math.min(1, (t - anim.pre) / anim.run);
    const y = from + (to - from) * ease(rt);
    const stepped = Math.floor((t - anim.pre) / 95) % 2 ? 'runB' : 'runA';

    if(p.key === 'inc'){
      spec.runner = { yard:from, frame:rt < 1 ? 'idle' : 'idle', flip:dirFlip };
      const fly = from + (dirFlip ? -16 : 16) * rt;
      spec.ball = { yard:Math.max(0, Math.min(100, fly)), lift:Math.sin(rt * Math.PI) * 30 };
      spec.defenders = defAt(from + (dirFlip ? -12 : 12), dirFlip);
    } else if(p.fg){
      spec.runner = { yard:from, frame:'kick', flip:dirFlip };
      const goal = dirFlip ? -4 : 104;
      spec.ball = { yard:Math.max(-4, Math.min(104, from + (goal - from) * rt)), lift:Math.sin(rt * Math.PI) * 52 };
      spec.defenders = [];
    } else if(rt < 1){
      spec.runner = { yard:y, frame:stepped, flip:dirFlip };
      const dTarget = to + (dirFlip ? -2 : 2);
      const dStart = from + (dirFlip ? -11 : 11);
      spec.defenders = defAt(dStart + (dTarget - dStart) * rt, dirFlip, stepped);
    } else {
      const down = p.key === 'sack' || p.key === 'tfl' || p.key === 'fum';
      const scored = p.td;
      spec.runner = { yard:to, frame:scored ? 'cheer' : down ? 'down' : 'idle', flip:dirFlip };
      spec.defenders = down ? defAt(to + (dirFlip ? -2 : 2), dirFlip, 'down') : defAt(to + (dirFlip ? -4 : 4), dirFlip);
      spec.los = to;
    }
    spec.flash = flash;
    return spec;
  }

  function defAt(yard, flip, frame){
    const y = Math.max(-2, Math.min(102, yard));
    const deep = layout === 'vert' ? 9 : 3;   /* how far off the runner's line they stand */
    return [
      { yard:y,                   lane:-deep, flip:!flip, frame:frame || 'runA' },
      { yard:y + (flip ? 3 : -3), lane:deep,  flip:!flip, frame:frame || 'runB' }
    ];
  }

  function shade(hex){
    try{
      const n = parseInt(String(hex).replace('#',''), 16);
      const k = 0.55;   /* dark enough to sit under white lines, light enough to read as a colour */
      const r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
      return 'rgb(' + r + ',' + g + ',' + b + ')';
    }catch(e){ return '#0d1f2d'; }
  }

  /* =====================================================================
     FRAME
     ===================================================================== */
  let lastFrame = 0;
  function frame(){
    lastFrame = now();
    /* touchdown and field-goal flashes decay on their own so the state
       payload never has to carry an animation value */
    if(flash > 0) flash = Math.max(0, flash - 0.035);

    GTD.drawField($('field'), animSpec());

    if(anim){
      const t = now() - anim.t0;
      if(!anim.called && t >= anim.pre + anim.run){
        anim.called = true; showCall(anim.p);
        if(chyronPending){ chyronPending = false; renderChyron(); }
      }
      if(t > anim.pre + anim.run + anim.hold){ anim = null; hideCall(); }
    }
    paintClock();
    paintRound();
  }
  function loop(){ frame(); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
  /* If rAF stalls — a hidden tab, a source OBS has stopped rendering — keep
     painting on a timer so the last state is at least correct on screen. */
  setInterval(() => { if(now() - lastFrame > 400) frame(); }, 250);
  (() => {
    let last = null;
    setInterval(() => {
      const t = document.timeline.currentTime;
      if(last !== null && t === last) document.documentElement.classList.add('no-anim');
      else if(last !== null) document.documentElement.classList.remove('no-anim');
      last = t;
    }, 1000);
  })();


  /* =====================================================================
     CHYRON
     ===================================================================== */
  /* The control page decides what the chyron says, and ships it as a list of
     cells. That keeps every game rule on one side of the wire: adding a mode
     means adding cells to a payload, not teaching the overlay a new game. */
  function renderChyron(){
    const host = $('chyron');
    host.innerHTML = '';
    (ST.chyron || []).forEach(c => {
      const d = document.createElement('div');
      d.className = 'cell' + (c.grow ? ' grow' : '') + (c.poss ? ' team poss' : c.swatch ? ' team' : '');
      const kk = document.createElement('div'); kk.className = 'k'; kk.textContent = c.k || '';
      const vv = document.createElement('div'); vv.className = 'v ' + (c.cls || '');
      if(c.clock){ vv.id = 'roundCell'; vv.textContent = roundText(); }
      else if(c.swatch){
        const sw = document.createElement('span'); sw.className = 'swatch'; sw.style.background = c.swatch;
        const nm = document.createElement('span'); nm.textContent = c.v == null ? '' : String(c.v);
        vv.append(sw, nm);
      } else {
        vv.textContent = c.v == null ? '' : String(c.v);
      }
      d.append(kk, vv);
      host.appendChild(d);
    });
    if(ST.lifelines && ST.lifelines.length){
      const ll = document.createElement('div');
      ll.className = 'cell lifelines' + (layout === 'vert' ? ' wide' : ' grow');
      ST.lifelines.forEach(l => {
        const sp = document.createElement('span');
        sp.className = 'll ' + (l.on ? 'live' : 'used');
        sp.textContent = l.t;
        ll.appendChild(sp);
      });
      host.appendChild(ll);
    }
  }

  /* =====================================================================
     QUESTION CARD
     ===================================================================== */
  const KEYS = ['A', 'B', 'C', 'D'];
  function renderQ(){
    const q = ST.q;
    $('qcard').classList.toggle('on', !!q.on);
    if(!q.on) return;
    const tierName = ['', 'OPENING DRIVE', 'MIDFIELD', 'RED ZONE'][q.tier] || 'MIDFIELD';
    $('qtier').textContent = tierName;
    $('qtier').className = 'tier t' + q.tier;
    $('qdrive').textContent = q.num ? 'PLAY ' + q.num : '';
    $('qtext').textContent = q.text || '';
    fitText(q.text || '', (q.choices || []));
    const host = $('choices'); host.innerHTML = '';
    (q.choices || []).forEach((c, i) => {
      const d = document.createElement('div');
      let cls = 'ch';
      if((q.gone || []).includes(i)) cls += ' gone';
      if(q.reveal){
        if(i === q.correct) cls += ' right';
        else if(i === q.lock) cls += ' wrong';
      } else if(i === q.lock) cls += ' lock';
      d.className = cls;
      const k = document.createElement('span'); k.className = 'key'; k.textContent = KEYS[i];
      const t = document.createElement('span'); t.className = 'txt'; t.textContent = c;
      d.append(k, t); host.appendChild(d);
    });
  }

  /* A long question set in one size either overflows the card or forces
     every short question to be small. Scale from the character count rather
     than measuring and reflowing: it is one class of question, the answer is
     stable frame to frame, and nothing has to settle. */
  function fitText(text, choices){
    const n = String(text).length;
    const qf = n <= 46 ? 1 : n <= 62 ? 0.88 : n <= 82 ? 0.76 : n <= 104 ? 0.66 : 0.58;
    const longest = choices.reduce((m, c) => Math.max(m, String(c).length), 0);
    const lim = layout === 'vert' ? 34 : 24;
    const cf = longest <= lim ? 1 : longest <= lim * 1.5 ? 0.84 : 0.7;
    const r = document.documentElement.style;
    r.setProperty('--qf', qf); r.setProperty('--cf', cf);
  }

  /* =====================================================================
     CLOCK — the display runs its own countdown off a sequence number rather
     than a resynced timestamp. Two machines' clocks disagree by seconds and
     the real timing is measured on the control page anyway, so what matters
     here is that the bar starts when the question does.
     ===================================================================== */
  /* The round clock in the two-minute drill belongs to the control page, but
     redrawing it there once a second would be a message a second. It ships a
     remaining value whenever anything else changes and the overlay counts down
     from that on its own. */
  let roundT0 = 0, roundRemain = 0, roundRunning = false, roundOn = false;
  function roundLeft(){
    if(!roundRunning) return roundRemain;
    return Math.max(0, roundRemain - (now() - roundT0) / 1000);
  }
  function roundText(){
    const t = roundLeft();
    const m = Math.floor(t / 60), sec = Math.floor(t % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }
  function paintRound(){
    if(!roundOn) return;
    const cell = $('roundCell');
    if(cell) cell.textContent = roundText();
  }

  let clockT0 = 0, clockSeq = -1, clockDur = 20, clockOn = false;
  const SEGS = 24;
  function paintClock(){
    const bar = $('clockbar');
    if(!clockOn){ bar.className = 'hide'; return; }
    const left = Math.max(0, clockDur - (now() - clockT0) / 1000);
    const f = clockDur > 0 ? left / clockDur : 0;
    const lit = Math.ceil(f * SEGS);
    if(bar.children.length !== SEGS){
      bar.innerHTML = '';
      for(let i = 0; i < SEGS; i++) bar.appendChild(document.createElement('i'));
    }
    for(let i = 0; i < SEGS; i++) bar.children[i].className = i < lit ? '' : 'off';
    bar.className = f > 0.5 ? '' : f > 0.22 ? 'warn' : 'hot';
  }

  /* =====================================================================
     PLAY CALL + BANNER
     ===================================================================== */
  function showCall(p){
    const el = $('playcall');
    el.querySelector('.label').textContent = p.label || '';
    const y = p.yards;
    el.querySelector('.yards').textContent = p.sub ? p.sub :
      p.td ? '7 POINTS' : p.fg ? '3 POINTS' :
      y > 0 ? '+' + y + ' YARDS' : y < 0 ? y + ' YARDS' : 'NO GAIN';
    el.className = 'on' + (p.td || p.fg ? ' score' : p.good === false ? ' bad' : (p.key === 'bomb' || p.key === 'big' ? ' big' : ''));
    document.body.classList.add('calling');
    if(p.td || p.fg) flash = 1;
  }
  function hideCall(){ $('playcall').className = ''; document.body.classList.remove('calling'); }

  function renderPlate(){
    const p = ST.plate || {};
    $('plate').classList.toggle('on', !!p.on);
    $('plateKick').textContent = p.kick || '';
    $('plateName').innerHTML = String(p.name || '').split('\n').map(escapeHTML).join('<br>');
    $('plateSub').textContent = p.sub || '';
    const b = ST.banner || {};
    $('banner').className = (b.on ? 'on' : '') + (b.bad ? ' bad' : '');
    $('banner').textContent = b.text || '';
  }
  function escapeHTML(s){ return String(s).replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c])); }

  function apply(st){
    if(!st || typeof st !== 'object') return;
    ['mode','plate','banner','q','drive','h2h','pal','chyron','lifelines'].forEach(k => { if(st[k] !== undefined) ST[k] = st[k]; });
    if(st.round){
      roundOn = !!st.round.on; roundRunning = !!st.round.running;
      roundRemain = +st.round.remain || 0; roundT0 = now();
    }
    if(st.card && st.card !== cardSize){ cardSize = st.card; applyCard(); }
    if(st.layout && !URL_LAYOUT) setLayout(st.layout);

    if(st.clock){
      const c = st.clock;
      clockDur = c.dur || 20;
      clockOn = !!c.on;
      if(c.seq !== clockSeq){
        clockSeq = c.seq;
        clockT0 = now() - (c.elapsed || 0) * 1000;
      }
      if(!c.run && c.on){ /* frozen: hold whatever is on the bar */ }
    }

    let held = false;
    if(st.play && st.play.id !== lastPlayId){
      lastPlayId = st.play.id;
      startPlay(st.play);
      /* the new down and distance rides along with the play, so hold it back
         until the runner actually gets there — otherwise the chyron reads
         2nd & 4 while the guy is still standing on 1st & 10 */
      held = true; chyronPending = true;
    } else if(st.play === null){
      anim = null; hideCall(); chyronPending = false;
    }

    if(st.cue && st.cue.id !== lastCueId){
      lastCueId = st.cue.id;
      if(OPT.sound) GTD.playCue(st.cue.name);
    }

    if(!held) renderChyron();
    renderQ(); renderPlate(); autoScale(); fit(); frame();
    if(OPT.onApplied) OPT.onApplied();
  }

  return {
    apply:apply, setLayout:setLayout, fit:fit, autoScale:autoScale, frame:frame,
    render:function(){ renderChyron(); renderQ(); renderPlate(); autoScale(); fit(); frame(); },
    layout:function(){ return layout; },
    state:function(){ return ST; },
    diag:diag
  };
}
return { mount:mount };
})();
