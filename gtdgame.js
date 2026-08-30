/* =====================================================================
   GOING THE DISTANCE — the rules

   Every game rule lives here and nowhere else. Two pages play these games:
   control.html, where a host drives it and the result goes out to an OBS
   overlay, and play.html, where one person plays it in their own browser.
   If the rules lived in both, they would drift, and a fix to the drive
   would quietly not apply to the self-serve version.

   This module never touches the DOM. The page supplies three hooks:

     onChange  something the screen shows has changed — redraw / publish
     onCue     fire an audio cue by name
     onLog     a line for the play-by-play

   ===================================================================== */
window.GTDGame = (function(){
'use strict';

function create(hooks){
  const H = hooks || {};
  const changed = () => { if(H.onChange) H.onChange(); };
  const emit = c => { if(H.onCue && c) H.onCue(c); };
  const log = (m, cls) => { if(H.onLog) H.onLog(m, cls); };
  const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  const S = {
    mode:'drive', layout:'lower',
    showQ:true, showClock:true, showPlate:false, card:'m',
    banner:{ on:false, text:'', bad:false },
    plate:{ kick:'JOMBOY MEDIA', name:'GOING THE\nDISTANCE', sub:'' },
    pal:{ offP:'#1b3a5c', offT:'#fbcc7a', defP:'#7c1d2b', defT:'#e8eef4', skin:'#b07a52' },
    clockDur:20,
    filters:{ diff:'ladder', eras:GTD.ERAS.map(e => e[0]) },
    chyron:[], lifelines:[], round:{ on:false, remain:0, running:false },
    tmd:{ len:120, endsAt:0, remain:120, running:false, plays:0 },
    sd:{ streak:0, best:0, bestYards:0, alive:true },
    wg:{ wager:10 },
    outcome:null, lastQ:null,
    q:null, qnum:0, used:{},
    drive:{ los:1, down:1, dist:10, first:11, score:0, ll:{ pi:true, to:true, cc:true }, safe:1, marks:[25, 50, 80] },
    h2h:{ ball:50, poss:0, step:5, bonus:false, target:55,
          teams:[{ name:'JAKE', color:'#1b3a5c', score:0 }, { name:'TREV', color:'#7c1d2b', score:0 }] },
    play:null, playId:0, cue:null, cueId:0,
    clock:{ on:false, run:false, seq:0, t0:0, elapsed:0 },
    lastSnapshot:null, needNewDrive:false
  };
  
  /* =====================================================================
     CLOCK
  
     The authoritative timing lives here, not on the overlay: the host stops
     it by clicking the answer the contestant actually gave, so nothing
     depends on two machines agreeing what time it is.
     ===================================================================== */
  function startClock(){
    S.clock.run = true; S.clock.t0 = nowMs(); S.clock.elapsed = 0; S.clock.seq++;
    changed();
  }
  function stopClock(){
    if(!S.clock.run) return;
    S.clock.elapsed = Math.min(S.clockDur, (nowMs() - S.clock.t0) / 1000);
    S.clock.run = false;
  }
  function clockElapsed(){
    return S.clock.run ? Math.min(S.clockDur, (nowMs() - S.clock.t0) / 1000) : S.clock.elapsed;
  }
  
  /* =====================================================================
     SERVING A QUESTION
     ===================================================================== */
  /* Ladder difficulty lets the field position choose, which is the Millionaire
     ladder; anything else is the host's explicit call and overrides it. */
  function wantedDiff(){
    if(S.filters.diff !== 'ladder') return +S.filters.diff;
    return S.mode === 'h2h' ? 2 : GTD.tierFor(S.drive.los);
  }
  function serve(){
    if(SOLO.includes(S.mode) && (S.needNewDrive || S.drive.los >= 100)) newDrive(true);
    if(S.mode === 'sudden' && !S.sd.alive){ log('run is over — hit New attempt'); return; }
    const q = GTD.draw({ diff:wantedDiff(), eras:S.filters.eras, avoid:S.lastQ }, S.used);
    if(!q){ log('<span class="bad">nothing left in the bank for that filter</span>'); return; }
    S.used[q.id] = 1;
    /* what the next question has to be unlike: same shape, same game or
       season, same answer */
    S.lastQ = { kind:q.kind, subject:q.subject, answer:q.answer };
    S.q = { id:q.id, tier:q.diff, era:q.era, kind:q.kind, subject:q.subject, answer:q.answer,
            text:q.text, choices:q.choices, correct:q.correct,
            cite:q.cite, lock:-1, reveal:false, gone:[], num:++S.qnum,
            wager:S.mode === 'wager' ? S.wg.wager : 0 };
    S.play = null; S.banner = { on:false, text:'', bad:false };
    emit('snap');
    startClock();
    changed();
    log('<b>Q' + S.q.num + '</b> · ' + ['', 'easy', 'medium', 'hard'][q.diff] + ' · ' + q.era + ' · ' + esc(q.text));
  }
  
  function lock(i){
    if(!S.q || S.q.reveal) return;
    if(S.q.gone.includes(i)) return;
    stopClock();
    S.q.lock = i;
    emit('lockin');
    changed();
  }
  
  function timeExpired(){
    if(!S.q || S.q.reveal) return;
    S.clock.run = false; S.clock.elapsed = S.clockDur;
    S.q.lock = -1;
    changed();
    reveal();
  }
  
  function reveal(forced){
    if(!S.q || S.q.reveal) return;
    stopClock();
    S.q.reveal = true;
    const correct = S.q.lock === S.q.correct;
    const e = clockElapsed();
    const frac = S.clockDur > 0 ? e / S.clockDur : 1;
    const opts = { forced:forced || null };
    if(S.mode === 'drive') opts.yardsToGoal = 100 - S.drive.los;
    const res = GTD.resolve(correct, S.q.lock < 0 ? 1.2 : frac, opts);
    changed();
    route(res, e);
  }
  
  /* every mode that is one player driving one way shares the field state */
  const SOLO = ['drive', '2min', 'sudden', 'wager'];
  function route(res, e){
    S.outcome = null;
    if(S.mode === 'h2h') return advanceH2H(res, e);
    if(S.mode === '2min') return advanceTMD(res, e);
    if(S.mode === 'sudden') return advanceSudden(res, e);
    if(S.mode === 'wager') return advanceWager(res, e);
    return advanceDrive(res, e);
  }
  
  /* =====================================================================
     THE DRIVE
     ===================================================================== */
  function fallBack(){
    const D = S.drive;
    const havens = [1].concat(D.marks).filter(h => h <= D.los);
    const back = havens.length ? havens[havens.length - 1] : 1;
    D.los = back; D.down = 1; D.dist = 10; D.first = Math.min(110, back + 10);
    return back;
  }
  
  function advanceDrive(res, elapsed){
    const D = S.drive;
    const from = D.los;
    const raw = Math.round(from + res.yards);
    const to = Math.max(0, Math.min(100, raw));
    const td = raw >= 100;
    const safety = raw <= 0;
    let banner = null, bad = false, cue;
  
    const play = { id:++S.playId, key:res.key, label:res.label, yards:res.yards,
                   good:!!res.good, td:td, from:from, to:to };
  
    if(td){
      S.outcome = 'td';
      play.label = 'TOUCHDOWN'; play.yards = to - from;
      D.score += 7; D.los = 100; D.down = 1; D.dist = 10; D.first = 110;
      banner = 'TOUCHDOWN — 7 POINTS'; cue = 'touchdown'; S.needNewDrive = true;
    } else if(safety){
      S.outcome = 'safety';
      D.score = Math.max(0, D.score - 2);
      D.los = 20; D.down = 1; D.dist = 10; D.first = 30;
      banner = 'SAFETY — TWO OFF THE BOARD'; bad = true; cue = 'turnover';
    } else if(res.turnover){
      D.los = to;
      const back = fallBack();
      banner = res.label.toUpperCase() + ' — BACK TO THE ' + GTD.spot(back); bad = true; cue = 'turnover';
    } else {
      const gained = to - from;
      D.los = to;
      if(to >= D.first){
        D.down = 1; D.dist = Math.min(10, 100 - to); D.first = Math.min(110, to + 10);
        cue = res.good ? 'firstdown' : 'correct';
        if(res.key === 'bomb' || res.key === 'big') cue = 'bigplay';
      } else {
        D.dist = Math.max(1, D.first - to);
        D.down++;
        cue = res.good ? 'correct' : (res.key === 'sack' || res.key === 'tfl' ? 'sack' : 'wrong');
        if(D.down > 4){
          const back = fallBack();
          banner = 'TURNOVER ON DOWNS — BACK TO THE ' + GTD.spot(back); bad = true; cue = 'turnover';
        }
      }
      if(gained > 0) void 0;
    }
    S.play = play;
    S.banner = banner ? { on:true, text:banner, bad:bad } : { on:false, text:'', bad:false };
    emit(cue);
    log('<b>' + play.label + '</b> · ' + (play.yards >= 0 ? '+' : '') + play.yards + ' yds · ' +
            elapsed.toFixed(1) + 's · now ' + GTD.distText(D.down, D.dist, D.los) + ' at ' + GTD.spot(D.los),
            res.good ? 'good' : 'bad');
    changed();
  }
  
  function newDrive(quiet){
    const D = S.drive;
    D.los = 1; D.down = 1; D.dist = 10; D.first = 11;
    S.needNewDrive = false;
    S.banner = { on:false, text:'', bad:false };
    S.play = null;
    if(!quiet){ changed(); log('new drive from the 1'); }
  }
  
  function kickFG(){
    if(S.mode !== 'drive') return;
    const D = S.drive;
    const att = GTD.fgDistance(D.los);
    const good = att <= 57;
    const play = { id:++S.playId, key:'fg', label:good ? 'IT IS GOOD' : 'NO GOOD', yards:0,
                   good:good, fg:good, from:D.los, to:D.los };
    S.outcome = good ? 'fg' : 'fgmiss';
    if(good){ D.score += 3; S.banner = { on:true, text:att + '-YARD FIELD GOAL IS GOOD — 3 POINTS', bad:false }; }
    else S.banner = { on:true, text:att + '-YARD ATTEMPT IS NO GOOD', bad:true };
    S.play = play; S.needNewDrive = true;
    emit(good ? 'fieldgoal' : 'wrong');
    log('<b>' + att + '-yard field goal</b> — ' + (good ? 'good' : 'no good'), good ? 'good' : 'bad');
    changed();
  }
  
  /* =====================================================================
     TWO-MINUTE DRILL
  
     One clock for the whole round instead of one per question, which changes
     the rhythm completely: there is no time to deliberate, and a wrong answer
     costs you the clock rather than the down.
     ===================================================================== */
  function tmdRemain(){
    if(!S.tmd.running) return S.tmd.remain;
    return Math.max(0, (S.tmd.endsAt - Date.now()) / 1000);
  }
  function tmdSet(sec){
    S.tmd.remain = Math.max(0, sec);
    if(S.tmd.running) S.tmd.endsAt = Date.now() + S.tmd.remain * 1000;
  }
  function tmdStart(){
    S.tmd.running = true;
    S.tmd.endsAt = Date.now() + S.tmd.remain * 1000;
    S.banner = { on:false, text:'', bad:false };
    changed(); log('two-minute drill: clock running');
  }
  function tmdPause(){
    S.tmd.remain = tmdRemain(); S.tmd.running = false;
    changed(); log('clock stopped at ' + S.tmd.remain.toFixed(1) + 's');
  }
  function tmdReset(len){
    S.tmd.len = Math.max(30, Math.min(600, +len || S.tmd.len || 120));
    S.tmd = { len:S.tmd.len, endsAt:0, remain:S.tmd.len, running:false, plays:0 };
    S.drive.los = 20; S.drive.score = 0; S.play = null; S.needNewDrive = false;
    S.banner = { on:false, text:'', bad:false };
    changed(); log('two-minute drill reset');
  }
  function advanceTMD(res, elapsed){
    const D = S.drive;
    S.tmd.plays++;
    const from = D.los;
    let banner = null, bad = false, cue;
    let to = from, td = false;
  
    if(res.good){
      to = Math.max(0, Math.min(100, Math.round(from + res.yards)));
      td = to >= 100;
      cue = td ? 'touchdown' : (res.key === 'bomb' || res.key === 'big') ? 'bigplay' : 'correct';
    } else {
      /* the clock is the currency here, not the down */
      tmdSet(tmdRemain() - 10);
      cue = 'wrong'; bad = true;
      banner = 'INCOMPLETE — TEN SECONDS OFF THE CLOCK';
    }
  
    const play = { id:++S.playId, key:res.good ? res.key : 'inc',
                   label:td ? 'TOUCHDOWN' : res.good ? res.label : 'INCOMPLETE',
                   sub:res.good ? null : '−10 SECONDS',
                   yards:res.good ? to - from : 0, good:!!res.good, td:td, from:from, to:to };
  
    if(td){ D.score += 7; D.los = 20; banner = 'TOUCHDOWN — BALL BACK ON THE 20'; bad = false; }
    else if(res.good) D.los = to;
  
    if(tmdRemain() <= 0){
      S.outcome = 'time';
      S.tmd.running = false; S.tmd.remain = 0;
      banner = 'TIME — ' + D.score + ' POINTS IN THE DRILL'; bad = false; cue = 'turnover';
    }
    S.play = play;
    S.banner = banner ? { on:true, text:banner, bad:bad } : { on:false, text:'', bad:false };
    emit(cue);
    log('<b>' + play.label + '</b> · ' + elapsed.toFixed(1) + 's · ' +
            tmdRemain().toFixed(0) + 's left · ' + D.score + ' pts', res.good ? 'good' : 'bad');
    changed();
  }
  
  /* =====================================================================
     SUDDEN DEATH — one wrong answer ends the run
     ===================================================================== */
  function sdReset(){
    S.sd.streak = 0; S.sd.alive = true;
    S.drive.los = 1; S.drive.score = 0; S.play = null; S.needNewDrive = false;
    S.banner = { on:false, text:'', bad:false };
    changed(); log('sudden death: new attempt');
  }
  function advanceSudden(res, elapsed){
    const D = S.drive;
    const from = D.los;
    let banner = null, bad = false, cue, td = false;
    let to = from;
  
    if(res.good){
      to = Math.max(0, Math.min(100, Math.round(from + res.yards)));
      td = to >= 100;
      S.sd.streak++;
      cue = td ? 'touchdown' : (res.key === 'bomb' || res.key === 'big') ? 'bigplay' : 'correct';
      D.los = td ? 20 : to;
      if(td){ D.score += 7; banner = 'TOUCHDOWN — STILL ALIVE, BACK ON THE 20'; }
    } else {
      S.outcome = 'over';
      S.sd.alive = false;
      cue = 'turnover'; bad = true;
      banner = 'THE RUN IS OVER — ' + S.sd.streak + ' IN A ROW, ' + D.score + ' POINTS';
      if(S.sd.streak > S.sd.best){ S.sd.best = S.sd.streak; S.sd.bestYards = D.score; }
    }
  
    S.play = { id:++S.playId, key:res.good ? res.key : 'sack',
               label:td ? 'TOUCHDOWN' : res.good ? res.label : 'THAT IS THE BALLGAME',
               sub:res.good ? null : S.sd.streak + ' IN A ROW',
               yards:res.good ? to - from : -3, good:!!res.good, td:td,
               from:from, to:res.good ? to : Math.max(0, from - 3) };
    S.banner = banner ? { on:true, text:banner, bad:bad } : { on:false, text:'', bad:false };
    emit(cue);
    log('<b>' + S.play.label + '</b> · streak ' + S.sd.streak, res.good ? 'good' : 'bad');
    changed();
  }
  
  /* =====================================================================
     THE WAGER — call the yardage before the question goes up
     ===================================================================== */
  function advanceWager(res, elapsed){
    const D = S.drive;
    const from = D.los;
    const bet = S.q && S.q.wager ? S.q.wager : S.wg.wager;
    let banner = null, bad = false, cue, td = false, to;
  
    if(res.good){
      to = Math.min(100, from + bet);
      td = to >= 100;
      cue = td ? 'touchdown' : bet >= 25 ? 'bigplay' : 'correct';
      if(td){ D.score += 7; banner = 'TOUCHDOWN — ' + bet + '-YARD CALL PAID OFF'; D.los = 1; S.needNewDrive = true; }
      else D.los = to;
    } else {
      to = Math.max(1, from - bet);
      D.los = to;
      cue = 'sack'; bad = true;
      banner = 'MISSED THE CALL — ' + bet + ' YARDS THE OTHER WAY';
    }
  
    S.play = { id:++S.playId, key:res.good ? (bet >= 25 ? 'bomb' : 'solid') : 'sack',
               label:td ? 'TOUCHDOWN' : res.good ? 'CALLED IT' : 'MISSED THE CALL',
               sub:(res.good ? '+' : '−') + bet + ' YARDS',
               yards:res.good ? bet : -bet, good:!!res.good, td:td, from:from, to:to };
    S.banner = banner ? { on:true, text:banner, bad:bad } : { on:false, text:'', bad:false };
    emit(cue);
    log('<b>' + S.play.label + '</b> · wagered ' + bet + ' · now ' + GTD.spot(D.los), res.good ? 'good' : 'bad');
    changed();
  }
  
  /* =====================================================================
     HEAD TO HEAD
     ===================================================================== */
  function advanceH2H(res, elapsed){
    const H = S.h2h;
    const dir = H.poss === 0 ? 1 : -1;
    const from = H.ball;
    const fast = elapsed <= 5;
    const step = H.step * (H.bonus && fast && res.good ? 2 : 1);
    let to = from, td = false, banner = null, bad = false, cue;
    const me = H.teams[H.poss], them = H.teams[1 - H.poss];
  
    if(res.good){
      to = Math.max(0, Math.min(100, from + dir * step));
      td = dir > 0 ? to >= 100 : to <= 0;
      cue = td ? 'touchdown' : (H.bonus && fast ? 'bigplay' : 'correct');
    } else {
      cue = 'turnover'; bad = true;
      banner = me.name + ' GIVES IT UP — ' + them.name + "'S BALL";
    }
  
    const play = { id:++S.playId, key:res.good ? (td ? 'bomb' : 'solid') : 'inc',
                   label:td ? 'TOUCHDOWN' : res.good ? 'MOVE THE BALL' : 'TURNOVER',
                   sub:td ? '7 POINTS' : res.good ? '+' + step + ' YARDS' : them.name + "'S BALL",
                   yards:res.good ? dir * step : 0, good:!!res.good, td:td, from:from, to:to };
  
    if(td){
      S.outcome = 'h2hscore';
      me.score += 7;
      banner = me.name + ' SCORES — 7 POINTS';
      H.ball = 50; H.poss = 1 - H.poss;
    } else if(res.good){
      H.ball = to;
    } else {
      H.ball = from; H.poss = 1 - H.poss;
    }
    H.target = H.poss === 0 ? Math.min(100, H.ball + H.step) : Math.max(0, H.ball - H.step);
  
    S.play = play;
    S.banner = banner ? { on:true, text:banner, bad:bad } : { on:false, text:'', bad:false };
    emit(cue);
    log('<b>' + play.label + '</b> · ' + me.name + ' · ' + elapsed.toFixed(1) + 's · ball on ' + H.ball,
            res.good ? 'good' : 'bad');
    changed();
  }
  
  /* =====================================================================
     LIFELINES — Millionaire's three, wearing football clothes
     ===================================================================== */
  function lifelinePI(){
    const D = S.drive;
    if(!D.ll.pi || !S.q || S.q.reveal) return;
    const wrong = [0, 1, 2, 3].filter(i => i !== S.q.correct);
    GTD.shuffle(wrong).slice(0, 2).forEach(i => S.q.gone.push(i));
    D.ll.pi = false;
    S.banner = { on:true, text:'PASS INTERFERENCE — TWO ANSWERS COME OFF THE BOARD', bad:false };
    emit('lockin'); changed();
    log('lifeline: 50/50');
  }
  function lifelineTO(){
    const D = S.drive;
    if(!D.ll.to) return;
    D.ll.to = false;
    S.clockDur += 15;
    if(S.q && !S.q.reveal){ S.clock.run = true; S.clock.t0 = nowMs() - clockElapsed() * 1000; S.clock.seq++; }
    S.banner = { on:true, text:'TIMEOUT — FIFTEEN MORE SECONDS', bad:false };
    emit('lockin'); changed();
    log('lifeline: timeout, clock now ' + S.clockDur + 's');
  }
  function lifelineCC(){
    const D = S.drive;
    if(!D.ll.cc) return;
    D.ll.cc = false;
    S.clock.run = false; S.clock.elapsed = clockElapsed();
    S.banner = { on:true, text:"COACH'S CHALLENGE — ASK THE ROOM", bad:false };
    emit('lockin'); changed();
    log("lifeline: ask the room (clock held at " + clockElapsed().toFixed(1) + 's)');
  }
  
  /* =====================================================================
     RENDER
     ===================================================================== */
  
  /* The overlay renders whatever cells it is handed, so every game rule stays
     on this side of the wire. Each mode describes its own chyron here. */
  function buildChyron(){
    const D = S.drive, C = [];
    S.lifelines = [];
    if(S.mode === 'h2h'){
      const H = S.h2h, T = H.teams;
      const spot = H.ball === 50 ? 'MIDFIELD'
        : H.ball > 50 ? T[1].name.slice(0, 4) + ' ' + (100 - H.ball)
        : T[0].name.slice(0, 4) + ' ' + H.ball;
      C.push({ k:H.poss === 0 ? '● BALL' : 'ON DECK', v:T[0].name + ' ' + T[0].score, swatch:T[0].color, poss:H.poss === 0 });
      C.push({ k:'BALL ON', v:(H.poss === 0 ? '▶  ' : '◀  ') + spot + (H.poss === 0 ? '  ▶' : '  ◀'), cls:'gold', grow:true });
      C.push({ k:H.poss === 1 ? '● BALL' : 'ON DECK', v:T[1].name + ' ' + T[1].score, swatch:T[1].color, poss:H.poss === 1 });
    } else if(S.mode === '2min'){
      C.push({ k:'ON THE CLOCK', v:'--', cls:'gold', clock:true });
      C.push({ k:'BALL ON', v:GTD.spot(D.los) });
      C.push({ k:'TO THE HOUSE', v:Math.max(0, 100 - Math.round(D.los)) + ' YDS', grow:true });
      C.push({ k:'PLAYS', v:String(S.tmd.plays) });
      C.push({ k:'POINTS', v:String(D.score), cls:'gold' });
    } else if(S.mode === 'sudden'){
      C.push({ k:'IN A ROW', v:String(S.sd.streak), cls:'gold' });
      C.push({ k:'BALL ON', v:GTD.spot(D.los) });
      C.push({ k:'TO THE HOUSE', v:Math.max(0, 100 - Math.round(D.los)) + ' YDS', grow:true });
      C.push({ k:S.sd.alive ? 'STILL ALIVE' : 'RUN OVER', v:S.sd.alive ? 'YES' : 'NO', cls:S.sd.alive ? '' : 'gold' });
      C.push({ k:'BEST TODAY', v:String(S.sd.best) });
    } else if(S.mode === 'wager'){
      C.push({ k:'THE CALL', v:S.wg.wager + ' YDS', cls:'gold' });
      C.push({ k:'BALL ON', v:GTD.spot(D.los) });
      C.push({ k:'TO THE HOUSE', v:Math.max(0, 100 - Math.round(D.los)) + ' YDS', grow:true });
      C.push({ k:'POINTS', v:String(D.score), cls:'gold' });
    } else {
      C.push({ k:'DOWN', v:GTD.distText(D.down, D.dist, D.los), cls:'gold' });
      C.push({ k:'BALL ON', v:GTD.spot(D.los) });
      C.push({ k:'TO THE HOUSE', v:Math.max(0, 100 - Math.round(D.los)) + ' YDS', cls:'gold', grow:true });
      C.push({ k:'POINTS', v:String(D.score), cls:'gold' });
      S.lifelines = [['pi', 'PASS INT.'], ['to', 'TIMEOUT'], ['cc', 'CHALLENGE']]
        .map(([k, t]) => ({ t:t, on:!!D.ll[k] }));
    }
    S.chyron = C;
    S.round = S.mode === '2min'
      ? { on:true, remain:+tmdRemain().toFixed(1), running:S.tmd.running }
      : { on:false, remain:0, running:false };
  }

  function setMode(m){
    S.mode = m;
    S.q = null; S.play = null; S.banner = { on:false, text:'', bad:false };
    /* each mode wants a different spot on the field to open from */
    if(m === '2min'){ S.drive.los = 20; S.tmd.plays = 0; S.clockDur = Math.min(S.clockDur, 10); }
    else if(m === 'sudden'){ S.drive.los = 1; S.sd.streak = 0; S.sd.alive = true; }
    else if(m === 'wager'){ S.drive.los = 20; }
    else S.drive.los = 1;                 /* the drive starts on your own 1, always */
    S.drive.down = 1; S.drive.dist = 10; S.drive.first = Math.min(110, S.drive.los + 10);
    S.drive.marks = m === 'drive' ? [25, 50, 80] : [];
    S.needNewDrive = false;
    changed();
  }
  
  /* The state the overlay draws, built in one place so the broadcast page and
     the self-serve page can never disagree about what a game looks like. */
  function snapshot(view){
    const v = view || {};
    buildChyron();
    const out = {
      mode:S.mode, layout:v.layout || 'lower', card:v.card || 'm',
      plate:{ on:!!v.showPlate, kick:S.plate.kick, name:S.plate.name, sub:S.plate.sub },
      banner:S.banner,
      q:(v.showQ !== false && S.q) ? {
        on:true, text:S.q.text, choices:S.q.choices, correct:S.q.correct,
        tier:S.q.tier, lock:S.q.lock, reveal:S.q.reveal, gone:S.q.gone, num:S.q.num
      } : { on:false },
      clock:{ on:!!(v.showClock !== false && S.q && v.showQ !== false), dur:S.clockDur,
              seq:S.clock.seq, run:S.clock.run, elapsed:+clockElapsed().toFixed(2) },
      pal:S.pal, play:S.play, cue:S.cue,
      chyron:S.chyron, lifelines:S.lifelines, round:S.round
    };
    if(S.mode === 'h2h') out.h2h = S.h2h; else out.drive = S.drive;
    return out;
  }
  
  function setFilters(f){
    if(f.diff !== undefined) S.filters.diff = f.diff;
    if(f.eras) S.filters.eras = f.eras.slice();
  }
  function setWager(n){ S.wg.wager = n; changed(); }
  function lifeline(which){
    if(which === 'pi') return lifelinePI();
    if(which === 'to') return lifelineTO();
    if(which === 'cc') return lifelineCC();
  }
  function forceResult(k){
    if(S.q && !S.q.reveal){ stopClock(); S.q.reveal = true; }
    const f = Object.assign({}, GTD.FORCED[k]);
    if(k === 'house' && S.mode !== 'h2h') f.yards = 100 - S.drive.los;
    route(f, clockElapsed());
  }
  function toggleClock(){
    if(!S.q) return;
    if(S.clock.run){ stopClock(); }
    else { S.clock.run = true; S.clock.t0 = nowMs() - S.clock.elapsed * 1000; S.clock.seq++; }
    changed();
  }
  function clearQ(){ S.q = null; S.play = null; changed(); }

  return {
    S:S, snapshot:snapshot,
    serve:serve, lock:lock, timeExpired:timeExpired, reveal:reveal, clearQ:clearQ,
    setMode:setMode, setFilters:setFilters, wantedDiff:wantedDiff,
    newDrive:newDrive, kickFG:kickFG, lifeline:lifeline, forceResult:forceResult,
    tmdStart:tmdStart, tmdPause:tmdPause, tmdReset:tmdReset, tmdRemain:tmdRemain,
    sdReset:sdReset, setWager:setWager,
    startClock:startClock, stopClock:stopClock, clockElapsed:clockElapsed, toggleClock:toggleClock,
    buildChyron:buildChyron, route:route, SOLO:SOLO
  };
}
return { create:create };
})();
