/* =====================================================================
   GOING THE DISTANCE — shared engine
   Jomboy Media · NFL trivia drive game

   Loaded by both control.html and display.html. Everything the overlay
   needs to draw a play lives here, so the ntfy payload only has to carry
   the state of the game, never the art.
   ===================================================================== */
window.GTD = (function(){
'use strict';

/* ---------------------------------------------------------------
   RELAYS

   Same reasoning as the Savant pages: ntfy's anonymous rate limit is per
   server per IP, and a public instance can simply be having a bad day.
   Publish to all of them at once, subscribe to all of them at once, first
   copy wins, sequence number collapses the duplicates.
   --------------------------------------------------------------- */
const RELAYS = [
  { host:'ntfy.sh',         label:'ntfy.sh' },
  { host:'ntfy.envs.net',   label:'envs.net' },
  { host:'ntfy.mzte.de',    label:'mzte.de' },
  { host:'ntfy.hostux.net', label:'hostux' }
];

/* =====================================================================
   QUESTION BANK

   "text|right answer|wrong|wrong|wrong" — the correct answer is always
   written first and the choices get shuffled when the question is served,
   so adding questions never means counting letters.

   Tier 1 plays in your own end, tier 2 past midfield, tier 3 in the red
   zone: the defense stiffens the closer you get, same as Millionaire's
   ladder getting nastier near the top.
   ===================================================================== */
const BANK = {
1:[
"How many points is a touchdown worth, before the extra point?|6|7|3|2",
"Which trophy goes to the Super Bowl champion?|The Vince Lombardi Trophy|The George Halas Trophy|The Pete Rozelle Trophy|The Lamar Hunt Trophy",
"How many players from one team are on the field at once?|11|10|12|9",
"Which team plays its home games at Lambeau Field?|Packers|Bears|Vikings|Lions",
"How many yards is it from goal line to goal line?|100|110|90|120",
"A field goal is worth how many points?|3|2|6|1",
"Which franchise is nicknamed America's Team?|Cowboys|Patriots|Steelers|49ers",
"Which player has won the most Super Bowls?|Tom Brady|Joe Montana|Charles Haley|Peyton Manning",
"How many downs does an offense get to gain 10 yards?|4|3|5|2",
"How many teams are in the NFL?|32|30|28|34",
"A safety is worth how many points?|2|1|3|6",
"Which team's helmet has no logo on it?|Browns|Raiders|Colts|Jets",
"Which team hosts a Thanksgiving game every single year?|Lions|Bears|Giants|Eagles",
"What do you call it when the quarterback is tackled behind the line?|A sack|A safety|A fumble|A pick",
"Which team plays at Arrowhead Stadium?|Chiefs|Broncos|Cardinals|Titans",
"The Terrible Towel belongs to which fan base?|Steelers|Ravens|Bengals|Browns",
"How many minutes are in an NFL quarter?|15|12|20|10",
"Which conference do the Green Bay Packers play in?|NFC|AFC|Both|Neither",
"Cheeseheads are fans of which team?|Packers|Vikings|Bears|Chiefs",
"Which position snaps the ball to start a play?|Center|Guard|Tackle|Fullback",
"What color is the flag officials throw for a penalty?|Yellow|Red|Blue|White",
"Which team has a horseshoe on its helmet?|Colts|Broncos|Texans|Rams",
"Who has been the Chiefs head coach since 2013?|Andy Reid|Sean McVay|John Harbaugh|Mike Tomlin",
"Which city do the Bengals call home?|Cincinnati|Cleveland|Columbus|Louisville",
"Which team won Super Bowl LVIII in February 2024?|Chiefs|49ers|Eagles|Bengals",
"The Super Bowl is played in which month?|February|January|March|December",
"How many points is an extra point kick worth?|1|2|3|None of them",
"Which team plays its home games in Foxborough, Massachusetts?|Patriots|Bills|Jets|Giants",
"Which bird is the Philadelphia team named after?|The eagle|The falcon|The raven|The cardinal",
"What is the line of scrimmage?|Where the ball is spotted|The goal line|The sideline|The 50-yard line"
],
2:[
"Who holds the single-season record for passing yards?|Peyton Manning|Tom Brady|Drew Brees|Patrick Mahomes",
"Who holds the single-season record for passing touchdowns?|Peyton Manning|Tom Brady|Dan Marino|Aaron Rodgers",
"Who is the NFL's all-time leading rusher?|Emmitt Smith|Walter Payton|Barry Sanders|Frank Gore",
"Who holds the single-season rushing record with 2,105 yards?|Eric Dickerson|Adrian Peterson|O.J. Simpson|Jamal Lewis",
"Which team finished the 2007 regular season 16-0?|Patriots|Colts|Packers|Steelers",
"Which is the only team to go undefeated and win the Super Bowl?|The 1972 Dolphins|The 1985 Bears|The 2007 Patriots|The 1962 Packers",
"Who made the Helmet Catch in Super Bowl XLII?|David Tyree|Mario Manningham|Plaxico Burress|Amani Toomer",
"Who caught the Philly Special touchdown in Super Bowl LII?|Nick Foles|Zach Ertz|Trey Burton|Alshon Jeffery",
"Who is the NFL's all-time leading scorer?|Adam Vinatieri|Morten Andersen|Gary Anderson|Justin Tucker",
"Who holds the career record for receiving yards?|Jerry Rice|Terrell Owens|Randy Moss|Larry Fitzgerald",
"Who is the official career sacks leader?|Bruce Smith|Reggie White|Kevin Greene|Deacon Jones",
"Which team came back from 28-3 down to win Super Bowl LI?|Patriots|Falcons|Seahawks|Broncos",
"Who has the most career passing yards?|Tom Brady|Drew Brees|Peyton Manning|Brett Favre",
"Who threw the most career interceptions?|Brett Favre|George Blanda|Vinny Testaverde|Drew Bledsoe",
"Which team drafted Aaron Rodgers in 2005?|Packers|49ers|Bears|Chargers",
"Who went first overall in the 2024 NFL Draft?|Caleb Williams|Jayden Daniels|Drake Maye|Marvin Harrison Jr.",
"Who went first overall in the 2023 NFL Draft?|Bryce Young|C.J. Stroud|Anthony Richardson|Will Levis",
"Which franchise moved to Las Vegas in 2020?|Raiders|Chargers|Rams|Cardinals",
"Which two teams played the 1967 Ice Bowl?|Packers and Cowboys|Bears and Vikings|Browns and Colts|Lions and Giants",
"Who is the only Super Bowl MVP from the losing team?|Chuck Howley|Jake Scott|Harvey Martin|Ray Lewis",
"Who has the most career rushing touchdowns?|Emmitt Smith|LaDainian Tomlinson|Marcus Allen|Walter Payton",
"Which kicker made a 64-yard field goal for Denver in 2013?|Matt Prater|Justin Tucker|Sebastian Janikowski|Greg Zuerlein",
"Which franchise has the most NFL championships all time?|Packers|Bears|Giants|Steelers",
"Who threw the pass on the Immaculate Reception?|Terry Bradshaw|Franco Harris|Joe Greene|Rocky Bleier",
"Which running back was nicknamed Sweetness?|Walter Payton|Barry Sanders|Gale Sayers|Earl Campbell",
"Which Bears lineman was called The Refrigerator?|William Perry|Dan Hampton|Steve McMichael|Richard Dent",
"In what year was the first Super Bowl played?|1967|1970|1963|1972",
"Which team won the first Super Bowl?|Packers|Chiefs|Colts|Jets",
"Who has the most career receiving touchdowns?|Jerry Rice|Randy Moss|Terrell Owens|Cris Carter",
"Which head coach has the most career wins?|Don Shula|George Halas|Bill Belichick|Tom Landry",
"Which team did Tom Brady win his seventh ring with?|Buccaneers|Patriots|Falcons|Chiefs",
"Who was the last defensive player to win NFL MVP?|Lawrence Taylor|J.J. Watt|Ray Lewis|Alan Page",
"Which quarterback threw seven touchdowns against the Raiders in 2013?|Nick Foles|Peyton Manning|Drew Brees|Tom Brady",
"The Tuck Rule game was the Patriots against which team?|Raiders|Steelers|Rams|Titans",
"Which fan section is known as the Black Hole?|The Raiders'|The Ravens'|The Jets'|The Bears'",
"The Music City Miracle knocked out which team?|Bills|Colts|Jaguars|Dolphins"
],
3:[
"Who holds the single-game rushing record with 296 yards?|Adrian Peterson|Jamal Lewis|Corey Dillon|Walter Payton",
"Who caught the Immaculate Reception?|Franco Harris|John Fuqua|Lynn Swann|Rocky Bleier",
"Which player caught a pass in 274 straight games?|Jerry Rice|Tony Gonzalez|Larry Fitzgerald|Marvin Harrison",
"Tom Brady was drafted with which overall pick in 2000?|199th|99th|155th|233rd",
"Who holds the single-game passing yards record with 554?|Norm Van Brocklin|Warren Moon|Ben Roethlisberger|Matt Schaub",
"Who was the first kicker named NFL MVP?|Mark Moseley|Jan Stenerud|Garo Yepremian|Lou Groza",
"Which team drafted Dan Marino in 1983?|Dolphins|Steelers|Jets|Bills",
"How many quarterbacks went in the first round of the 1983 draft?|Six|Four|Three|Eight",
"Who set the single-season receptions record with 149?|Michael Thomas|Marvin Harrison|Antonio Brown|Cooper Kupp",
"Who has the most career interceptions by a defender?|Paul Krause|Emlen Tunnell|Rod Woodson|Dick Lane",
"Which team blew a 35-3 lead in a 1993 playoff game?|Oilers|Chargers|Broncos|Raiders",
"Who played the most seasons in NFL history with 26?|George Blanda|Tom Brady|Morten Andersen|Adam Vinatieri",
"Who was the first Black quarterback to win a Super Bowl?|Doug Williams|Warren Moon|Randall Cunningham|Steve McNair",
"Who has the most career fumbles?|Brett Favre|Warren Moon|Dave Krieg|Kerry Collins",
"Whose 99-yard run in 1983 is the longest run from scrimmage ever?|Tony Dorsett|Ahman Green|Derrick Henry|Bo Jackson",
"Which of these franchises has never played in a Super Bowl?|Lions|Bengals|Panthers|Falcons",
"Who coordinated the 1985 Bears defense?|Buddy Ryan|Mike Ditka|Vince Tobin|Dave Wannstedt",
"What is the fewest points a team has scored in a Super Bowl?|3|0|6|7",
"Who passed Michael Vick for the most career rushing yards by a quarterback?|Lamar Jackson|Josh Allen|Russell Wilson|Cam Newton",
"Which quarterback won back-to-back MVPs in 2020 and 2021?|Aaron Rodgers|Patrick Mahomes|Tom Brady|Josh Allen",
"Which coach is nicknamed The Big Tuna?|Bill Parcells|Bill Cowher|Marty Schottenheimer|Jimmy Johnson",
"Whose 109-yard return in 2007 tied the longest play in NFL history?|Antonio Cromartie|Devin Hester|Cordarrelle Patterson|Josh Cribbs",
"Which team won Super Bowl V, the first after the AFL-NFL merger?|Colts|Cowboys|Chiefs|Vikings",
"Who won Super Bowl MVP three times in the 1980s?|Joe Montana|Terry Bradshaw|John Elway|Phil Simms",
"How many yards deep is an NFL end zone?|10|12|15|8",
"Which team hosted the first Monday Night Football game in 1970?|Browns|Jets|Chiefs|Cowboys",
"Which quarterback started 297 straight regular season games?|Brett Favre|Peyton Manning|Eli Manning|Philip Rivers",
"Ernie Nevers, Dub Jones and Gale Sayers all share which record?|Six touchdowns in a game|Five interceptions in a game|Four field goals in a quarter|Three safeties in a season",
"Who was the first overall pick of the 1998 NFL Draft?|Peyton Manning|Ryan Leaf|Charles Woodson|Randy Moss",
"Which stadium is nicknamed The Frozen Tundra?|Lambeau Field|Soldier Field|Highmark Stadium|Arrowhead Stadium"
]
};

/* parse "text|right|w|w|w" into a record, keeping the right answer flagged */
function parseRow(row, tier, i){
  const p = String(row).split('|').map(s => s.trim()).filter(s => s.length);
  if(p.length < 3) return null;
  return { id:'b'+tier+'-'+i, tier:tier, text:p[0], right:p[1], wrong:p.slice(2, 5) };
}
let POOL = [];
function rebuildPool(extra){
  POOL = [];
  [1,2,3].forEach(t => BANK[t].forEach((r, i) => { const q = parseRow(r, t, i); if(q) POOL.push(q); }));
  (extra || []).forEach((q, i) => { if(q) POOL.push({ ...q, id:'x'+i }); });
}
rebuildPool();

/* Custom questions arrive as pasted lines in the same pipe format, with an
   optional trailing tier number. Anything unreadable is reported rather than
   silently dropped — a typo in a taping's question list should be loud. */
function parseImport(text){
  const out = [], bad = [];
  String(text).split(/\r?\n/).forEach((line, i) => {
    const raw = line.trim();
    if(!raw || raw.startsWith('#')) return;
    const p = raw.split('|').map(s => s.trim());
    let tier = 2;
    if(p.length >= 6 && /^[123]$/.test(p[5])){ tier = +p[5]; }
    if(p.length < 3 || !p[0] || !p[1]){ bad.push(i + 1); return; }
    out.push({ tier:tier, text:p[0], right:p[1], wrong:p.slice(2, 5).filter(Boolean) });
  });
  return { rows:out, bad:bad };
}

function shuffle(a){
  const r = a.slice();
  for(let i = r.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/* Serve a question at a tier, avoiding anything already used this taping.
   Falls back a tier at a time rather than repeating. */
function draw(tier, used){
  const seen = used || {};
  for(const t of [tier, tier === 3 ? 2 : tier === 1 ? 2 : 1, 3, 1, 2]){
    const avail = POOL.filter(q => q.tier === t && !seen[q.id]);
    if(avail.length){
      const q = avail[Math.floor(Math.random() * avail.length)];
      const choices = shuffle([q.right].concat(q.wrong).slice(0, 4));
      return {
        id:q.id, tier:q.tier, text:q.text,
        choices:choices, correct:choices.indexOf(q.right)
      };
    }
  }
  return null;
}

/* which tier the field position calls for */
function tierFor(yard){ return yard >= 80 ? 3 : yard >= 45 ? 2 : 1; }

/* =====================================================================
   PLAY ENGINE

   Speed is the whole game. On a right answer the faster you were, the
   bigger the play. On a wrong answer the logic inverts and stays
   football-true: firing an answer out fast and missing is an incomplete
   pass, sitting on it and missing is holding the ball too long — a sack.
   ===================================================================== */
const BANDS = [
  { max:0.15, key:'bomb',   lo:26, hi:44, label:'DEEP SHOT',    call:'takes the top off it' },
  { max:0.35, key:'big',    lo:14, hi:24, label:'BIG GAIN',     call:'breaks it into the second level' },
  { max:0.60, key:'solid',  lo: 8, hi:13, label:'GOOD GAIN',    call:'moves the chains' },
  { max:0.85, key:'short',  lo: 4, hi: 7, label:'SHORT GAIN',   call:'grinds out a few' },
  { max:1.01, key:'scram',  lo: 1, hi: 3, label:'SCRAMBLE',     call:'barely gets back to the line' }
];
const MISS = [
  { max:0.40, key:'inc',   lo: 0, hi: 0, label:'INCOMPLETE',      call:'fires it into the dirt' },
  { max:0.70, key:'tfl',   lo:-4, hi:-2, label:'STUFFED',         call:'meets a wall in the backfield' },
  { max:1.01, key:'sack',  lo:-9, hi:-5, label:'SACKED',          call:'holds it too long and goes down' }
];

function rint(lo, hi){ return lo + Math.floor(Math.random() * (hi - lo + 1)); }

/* frac = elapsed / clock. Anything at or past 1 is a no-answer. */
function resolve(correct, frac, opts){
  const o = opts || {};
  if(o.forced) return { ...o.forced, forced:true };
  if(!correct && frac >= 1){
    return { key:'delay', label:'DELAY OF GAME', call:'lets the clock run out', yards:-5, good:false, turnover:false };
  }
  const table = correct ? BANDS : MISS;
  const band = table.find(b => frac <= b.max) || table[table.length - 1];
  let yards = rint(band.lo, band.hi);
  /* the red zone is a phone booth — no 40-yard chunk from the 8 */
  if(o.yardsToGoal != null) yards = Math.min(yards, o.yardsToGoal);
  return {
    key:band.key, label:band.label, call:band.call, yards:yards,
    good:correct, turnover:false, band:band.key
  };
}

/* the manual buttons on the control page */
const FORCED = {
  int:      { key:'int',   label:'INTERCEPTED',   call:'throws it right to the defense', yards:0,  good:false, turnover:true },
  fumble:   { key:'fum',   label:'FUMBLE',        call:'coughs it up',                   yards:-2, good:false, turnover:true },
  flag:     { key:'flag',  label:'PENALTY',       call:'gets flagged',                   yards:-10,good:false, turnover:false },
  free:     { key:'free',  label:'FREE PLAY',     call:'gets a gift from the defense',   yards:5,  good:true,  turnover:false },
  house:    { key:'house', label:'TAKES IT TO THE HOUSE', call:'is gone', yards:99,      good:true,  turnover:false }
};

/* =====================================================================
   8-BIT ART

   Everything is drawn as literal pixels onto a small canvas which is then
   scaled up with image-rendering:pixelated, so a "pixel" here really is a
   chunky square on air rather than a filter over smooth art.
   ===================================================================== */
const SPR = {
  idle:[
    "....HHHH....","...HHHHHHH..","..HHHHHHHHF.","..HHSSSSHFF.",
    "...SSSSSHF..","....TTTT....","..SJJJJJJS..","..SJJJJJJS..",
    "...JJJBBB...","...JJJJBB...","...PPPPP....","...PPPPP....",
    "..PP...PP...","..KK...KK...","..KK...KK...","............"
  ],
  runA:[
    "....HHHH....","...HHHHHHH..","..HHHHHHHHF.","..HHSSSSHFF.",
    "...SSSSSHF..","....TTTT....","...JJJJJJ...","..SJJJJJJJ..",
    "..SJJJJBBB..","...JJJJBB...","...PPPPP....","..PP..PPP...",
    ".KK....PP...",".K......KK..","........KK..","............"
  ],
  runB:[
    "....HHHH....","...HHHHHHH..","..HHHHHHHHF.","..HHSSSSHFF.",
    "...SSSSSHF..","....TTTT....","...JJJJJJJ..","...JJJJJJJS.",
    "..JJJJJBBBS.","...JJJJBB...","...PPPPP....","...PPPPP....",
    "..PP...PP...","..KK...KK...",".KK.....K...","............"
  ],
  cheer:[
    ".S.......SB.",".SS.HHHH.SBB","..SHHHHHHHS.","..HHHHHHHHF.",
    "..HHSSSSHFF.","....TTTT....","...JJJJJJ...","..JJJJJJJJ..",
    "..JJJJJJJJ..","...JJJJJJ...","...PPPPP....","...PPPPP....",
    "..KK...KK...","..KK...KK...","............","............"
  ],
  down:[
    "............","............","............","............",
    "............","............","............","............",
    "..........B.",".FHHTJJJJPP.",".HHHHJJJJPPK","..SS.JJ..PKK",
    "............","............","............","............"
  ],
  kick:[
    "....HHHH....","...HHHHHHH..","..HHHHHHHHF.","..HHSSSSHFF.",
    "...SSSSSHF..","....TTTT....","..SJJJJJJ...",".S.JJJJJJ...",
    "...JJJJJJ...","...JJJJJ....","...PPPP.....","...PP.PPP...",
    "..KK....PPP.",".KK......KKK","............","............"
  ]
};
const BALL = [".BB.","BWBB",".BB."];

/* 3x5 bitmap digits — a webfont that hasn't loaded yet would paint the
   yard numbers as nothing on the first frame, and the first frame is
   sometimes the only frame an OBS source ever renders. */
const DIG = {
  '0':["111","101","101","101","111"], '1':["010","110","010","010","111"],
  '2':["111","001","111","100","111"], '3':["111","001","111","001","111"],
  '4':["101","101","111","001","001"], '5':["111","100","111","001","111"],
  '6':["111","100","111","101","111"], '7':["111","001","010","010","010"],
  '8':["111","101","111","101","111"], '9':["111","101","111","001","111"],
  '&':["101","010","111","010","101"]
};

const PAL = {
  off: { H:'#1b3a5c', F:'#c9d6e2', S:'#b07a52', T:'#fbcc7a', J:'#1b3a5c', P:'#e8eef4', K:'#101a24', B:'#7a4a22', W:'#ffffff' },
  def: { H:'#7c1d2b', F:'#c9d6e2', S:'#8a5a3a', T:'#e8eef4', J:'#7c1d2b', P:'#c2ccd6', K:'#101a24', B:'#7a4a22', W:'#ffffff' }
};
function teamPal(base, primary, trim, skin){
  return { ...base, H:primary, J:primary, T:trim, S:skin || base.S };
}

const TURF_A = '#1d5c2e', TURF_B = '#24713a', LINE = '#dfeaf3';
const EZ_FILL = '#0d1f2d', EZ_EDGE = '#fbcc7a', POST = '#f2c53d';
const STAND = '#08131c';

/* Field geometry. Both views are the same 100 yards at 4 pixels a yard;
   only the axis changes, so everything downstream just asks for xy(yard). */
const GEO = {
  /* Sized so an integer upscale lands on a broadcast frame: the wide field
     is 480x124, which is exactly 1920 across at 4x; the tall one is 270x378,
     exactly 810 across at 3x with room above it for the question card. */
  h: { W:480, H:124, ppy:4, m:4,  ezd:36, fieldA:17, fieldB:117, standA:0, standB:13, base:104, numScale:2 },
  v: { W:270, H:378, ppy:3, m:9,  ezd:30, fieldA:12, fieldB:258, standA:0, standB:0,  base:0,   numScale:2 }
};

function geo(view){ return GEO[view === 'v' ? 'v' : 'h']; }

/* yard 0 is the offense's own goal line, yard 100 the one they are
   driving at. Lateral t runs 0..1 across the width of the field. */
function xy(view, yard, t){
  const g = geo(view);
  if(view === 'v'){
    const y = g.m + g.ezd + (100 - yard) * g.ppy;
    const x = g.fieldA + t * (g.fieldB - g.fieldA);
    return [x, y];
  }
  const x = g.m + g.ezd + yard * g.ppy;
  const y = g.fieldA + t * (g.fieldB - g.fieldA);
  return [x, y];
}

function px(ctx, x, y, w, h, c){ ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }

function drawSprite(ctx, art, x, y, scale, pal, flip){
  for(let r = 0; r < art.length; r++){
    const row = art[r];
    for(let c = 0; c < row.length; c++){
      const ch = row[c];
      if(ch === '.' || !pal[ch]) continue;
      const cc = flip ? (row.length - 1 - c) : c;
      px(ctx, x + cc * scale, y + r * scale, scale, scale, pal[ch]);
    }
  }
}

function drawNum(ctx, str, x, y, scale, color){
  let cx = x;
  for(const ch of String(str)){
    const g = DIG[ch];
    if(!g){ cx += 4 * scale; continue; }
    for(let r = 0; r < 5; r++) for(let c = 0; c < 3; c++)
      if(g[r][c] === '1') px(ctx, cx + c * scale, y + r * scale, scale, scale, color);
    cx += 4 * scale;
  }
  return cx - x - scale;
}

/* a stable per-pixel hash so the crowd doesn't shimmer every frame */
function hash(i){ let h = (i * 2654435761) % 4294967296; return (h ^ (h >>> 13)) / 4294967296; }

function ezRect(view, which){
  const g = geo(view), len = 100 * g.ppy;
  if(view === 'v'){
    const w = g.fieldB - g.fieldA;
    return which === 'opp' ? [g.fieldA, g.m, w, g.ezd] : [g.fieldA, g.m + g.ezd + len, w, g.ezd];
  }
  const h = g.fieldB - g.fieldA;
  return which === 'opp' ? [g.m + g.ezd + len, g.fieldA, g.ezd, h] : [g.m, g.fieldA, g.ezd, h];
}

function lineAcross(ctx, view, yard, thick, color){
  const g = geo(view);
  if(view === 'v'){
    const y = xy(view, yard, 0)[1];
    px(ctx, g.fieldA, y - (thick >> 1), g.fieldB - g.fieldA, thick, color);
  } else {
    const x = xy(view, yard, 0)[0];
    px(ctx, x - (thick >> 1), g.fieldA, thick, g.fieldB - g.fieldA, color);
  }
}

function bandFill(ctx, view, ya, yb, color){
  const g = geo(view);
  if(view === 'v'){
    const y0 = xy(view, yb, 0)[1], y1 = xy(view, ya, 0)[1];
    px(ctx, g.fieldA, y0, g.fieldB - g.fieldA, y1 - y0, color);
  } else {
    const x0 = xy(view, ya, 0)[0], x1 = xy(view, yb, 0)[0];
    px(ctx, x0, g.fieldA, x1 - x0, g.fieldB - g.fieldA, color);
  }
}

function goalPost(ctx, view, which, color){
  const g = geo(view), len = 100 * g.ppy;
  if(view === 'v'){
    const cx = Math.round((g.fieldA + g.fieldB) / 2);
    const y = which === 'opp' ? g.m + 3 : g.m + g.ezd + len + g.ezd - 16;
    /* head-on: crossbar plus two uprights */
    px(ctx, cx - 15, y, 30, 2, color);
    px(ctx, cx - 15, which === 'opp' ? y - 12 : y + 2, 2, 12, color);
    px(ctx, cx + 13, which === 'opp' ? y - 12 : y + 2, 2, 12, color);
    px(ctx, cx - 1, which === 'opp' ? y + 2 : y - 10, 2, 10, color);
  } else {
    const x = which === 'opp' ? g.m + g.ezd + len + g.ezd - 4 : g.m + 2;
    const base = g.fieldB - 8, top = base - 26;
    px(ctx, x, top + 8, 2, 20, color);          /* stem */
    px(ctx, x - 5, top + 6, 12, 2, color);      /* crossbar */
    px(ctx, x - 5, top - 6, 2, 12, color);
    px(ctx, x + 5, top - 6, 2, 12, color);
  }
}

/* ---------------------------------------------------------------
   drawField(canvas, spec)

   spec: { view, los, first, runner:{yard,frame,flip,lift}, defenders:[],
           ball:{yard,lift}|null, flash:0..1, pal:{off,def}, chains:bool,
           dead:bool, tint:'gold'|'red'|null }
   --------------------------------------------------------------- */
function drawField(cv, spec){
  const view = spec.view === 'v' ? 'v' : 'h';
  const g = geo(view);
  cv.width = g.W; cv.height = g.H;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, g.W, g.H);

  /* stands, horizontal only — the vertical cut has no room and the crowd
     would just be noise next to the question card */
  if(view === 'h' && g.standB > g.standA){
    px(ctx, 0, g.standA, g.W, g.standB - g.standA, STAND);
    for(let i = 0; i < 900; i++){
      const r = hash(i);
      const x = Math.floor(hash(i * 3 + 1) * g.W);
      const y = g.standA + Math.floor(r * (g.standB - g.standA));
      const lit = hash(i * 7 + 5);
      const c = spec.flash > 0.2 && lit < spec.flash ? '#fbcc7a' : (lit < 0.5 ? '#16283a' : '#1e364c');
      px(ctx, x, y, 1, 1, c);
    }
    px(ctx, 0, g.standB, g.W, 4, '#0d1f2d');
  }

  /* turf: five-yard mow stripes */
  for(let y5 = 0; y5 < 100; y5 += 5) bandFill(ctx, view, y5, y5 + 5, (y5 / 5) % 2 ? TURF_B : TURF_A);

  /* end zones */
  const own = ezRect(view, 'own'), opp = ezRect(view, 'opp');
  const ezOwn = (spec.ez && spec.ez.own) || EZ_FILL;
  const ezOpp = (spec.ez && spec.ez.opp) || EZ_FILL;
  px(ctx, own[0], own[1], own[2], own[3], ezOwn);
  px(ctx, opp[0], opp[1], opp[2], opp[3], ezOpp);
  /* chevrons in the target end zone, pointing the way home */
  for(let i = 0; i < 60; i++){
    const t = i / 60;
    if(view === 'v'){
      const y = opp[1] + 4 + ((i * 7) % (opp[3] - 8));
      const w = 3;
      px(ctx, opp[0] + 6 + ((i * 11) % (opp[2] - 12)), y, w, 1, i % 3 ? '#14304a' : '#1b3f5f');
    } else {
      const x = opp[0] + 4 + ((i * 5) % (opp[2] - 8));
      px(ctx, x, opp[1] + 4 + ((i * 13) % (opp[3] - 8)), 1, 3, i % 3 ? '#14304a' : '#1b3f5f');
    }
  }
  if(spec.flash > 0.3){
    ctx.globalAlpha = Math.min(0.9, spec.flash);
    px(ctx, opp[0], opp[1], opp[2], opp[3], EZ_EDGE);
    ctx.globalAlpha = 1;
  }

  /* boundary */
  if(view === 'v'){
    px(ctx, g.fieldA - 2, g.m, 2, g.ezd * 2 + 400, LINE);
    px(ctx, g.fieldB, g.m, 2, g.ezd * 2 + 400, LINE);
  } else {
    px(ctx, g.m, g.fieldA - 2, g.ezd * 2 + 400, 2, LINE);
    px(ctx, g.m, g.fieldB, g.ezd * 2 + 400, 2, LINE);
  }

  /* yard lines every five, goal lines fat */
  for(let y5 = 0; y5 <= 100; y5 += 5) lineAcross(ctx, view, y5, y5 % 10 === 0 ? 2 : 1, LINE);
  lineAcross(ctx, view, 0, 3, EZ_EDGE);
  lineAcross(ctx, view, 100, 3, EZ_EDGE);

  /* hash marks */
  for(let y1 = 1; y1 < 100; y1++){
    if(y1 % 5 === 0) continue;
    if(view === 'v' && y1 % 2) continue;   /* 3px a yard is too dense for every tick */
    [0.34, 0.66].forEach(t => {
      const p = xy(view, y1, t);
      if(view === 'v') px(ctx, p[0] - 2, p[1], 4, 1, LINE);
      else px(ctx, p[0], p[1] - 2, 1, 4, LINE);
    });
  }

  /* numbers every ten, counting down from both ends the way a field does */
  for(let y10 = 10; y10 <= 90; y10 += 10){
    const n = y10 <= 50 ? y10 : 100 - y10;
    const s = String(n);
    if(view === 'v'){
      const p = xy(view, y10, 0);
      const sc = g.numScale, wdt = s.length * 4 * sc - sc;
      drawNum(ctx, s, g.fieldA + 4, p[1] - 2 * sc, sc, 'rgba(230,240,250,.72)');
      drawNum(ctx, s, g.fieldB - 4 - wdt, p[1] - 2 * sc, sc, 'rgba(230,240,250,.72)');
    } else {
      const p = xy(view, y10, 0);
      const wdt = s.length * 8 - 2;
      drawNum(ctx, s, p[0] - wdt / 2, g.fieldA + 6, 2, 'rgba(230,240,250,.72)');
      drawNum(ctx, s, p[0] - wdt / 2, g.fieldB - 16, 2, 'rgba(230,240,250,.72)');
    }
  }

  goalPost(ctx, view, 'own', POST);
  goalPost(ctx, view, 'opp', POST);

  /* the two lines that tell the whole story */
  if(spec.chains !== false && spec.first != null && spec.first <= 100)
    lineAcross(ctx, view, spec.first, 2, '#f2c53d');
  if(spec.los != null) lineAcross(ctx, view, spec.los, 2, '#4fa8ff');

  const S2 = 2;                                   /* sprite pixels per field pixel */
  const palOff = (spec.pal && spec.pal.off) || PAL.off;
  const palDef = (spec.pal && spec.pal.def) || PAL.def;

  function placeSprite(yard, lane, lift){
    if(view === 'v'){
      const p = xy(view, yard, 0.5);
      return [Math.round(p[0] - 12 + (lane || 0)), Math.round(p[1] + 8 - 32 - (lift || 0))];
    }
    const p = xy(view, yard, 0.5);
    return [Math.round(p[0] - 12), Math.round(g.base - 32 + (lane || 0) - (lift || 0))];
  }

  (spec.defenders || []).forEach((d, i) => {
    const art = SPR[d.frame] || SPR.runA;
    const pos = placeSprite(d.yard, d.lane || (i ? 12 : -12), 0);
    drawSprite(ctx, art, pos[0], pos[1], S2, palDef, d.flip !== false);
  });

  if(spec.runner){
    const art = SPR[spec.runner.frame] || SPR.idle;
    const pos = placeSprite(spec.runner.yard, spec.runner.lane || 0, spec.runner.lift || 0);
    drawSprite(ctx, art, pos[0], pos[1], S2, palOff, !!spec.runner.flip);
  }

  if(spec.ball){
    const p = xy(view, spec.ball.yard, 0.5);
    const bx = view === 'v' ? p[0] - 4 : p[0] - 4;
    const by = view === 'v' ? p[1] - 6 - (spec.ball.lift || 0) : g.base - 24 - (spec.ball.lift || 0);
    drawSprite(ctx, BALL, Math.round(bx), Math.round(by), S2, palOff, false);
  }

  if(spec.tint){
    ctx.globalAlpha = 0.18;
    px(ctx, 0, 0, g.W, g.H, spec.tint === 'red' ? '#c8302a' : '#fbcc7a');
    ctx.globalAlpha = 1;
  }
  return ctx;
}

/* =====================================================================
   AUDIO

   Two layers. The stinger rack plays whatever files you drop on the
   control page, cached in IndexedDB so they survive a reload; anything you
   have not supplied falls through to an original chiptune stinger
   synthesised here, so the game is never silent out of the box.
   ===================================================================== */
const CUES = [
  ['tick',      'clock ticking under the question'],
  ['lockin',    'answer locked in'],
  ['correct',   'right answer sting'],
  ['wrong',     'wrong answer sting'],
  ['bigplay',   'chunk play / deep shot'],
  ['firstdown', 'moved the chains'],
  ['sack',      'sacked or stuffed'],
  ['turnover',  'pick or fumble'],
  ['touchdown', 'touchdown'],
  ['fieldgoal', 'field goal is good'],
  ['snap',      'question goes up'],
  ['riff',      'between-play bed / bumper']
];

let AC = null;
function ac(){
  if(!AC){ const C = window.AudioContext || window.webkitAudioContext; if(C) AC = new C(); }
  if(AC && AC.state === 'suspended') AC.resume();
  return AC;
}

/* one square-wave voice */
function blip(t0, freq, dur, gain, type){
  const a = ac(); if(!a) return;
  const o = a.createOscillator(), gN = a.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(freq, t0);
  gN.gain.setValueAtTime(0.0001, t0);
  gN.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  gN.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(gN); gN.connect(a.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
function noise(t0, dur, gain){
  const a = ac(); if(!a) return;
  const n = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, n, a.sampleRate);
  const d = buf.getChannelData(0);
  for(let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = a.createBufferSource(), gN = a.createGain();
  src.buffer = buf; gN.gain.value = gain;
  src.connect(gN); gN.connect(a.destination); src.start(t0);
}

/* Original chiptune stingers — placeholders you can overwrite with your
   own clips. Deliberately generic 8-bit phrases, not anybody's record. */
const CHIP = {
  tick:      a => blip(a, 880, 0.05, 0.10),
  snap:      a => { blip(a, 523, 0.07, 0.16); blip(a + 0.07, 784, 0.09, 0.16); },
  lockin:    a => { blip(a, 392, 0.07, 0.18); blip(a + 0.07, 587, 0.14, 0.18); },
  correct:   a => [523, 659, 784, 1046].forEach((f, i) => blip(a + i * 0.06, f, 0.12, 0.18)),
  wrong:     a => { blip(a, 233, 0.16, 0.20, 'sawtooth'); blip(a + 0.14, 175, 0.30, 0.20, 'sawtooth'); },
  bigplay:   a => [659, 784, 988, 1319, 1568].forEach((f, i) => blip(a + i * 0.05, f, 0.13, 0.19)),
  firstdown: a => { blip(a, 784, 0.08, 0.18); blip(a + 0.09, 784, 0.08, 0.18); blip(a + 0.20, 1046, 0.18, 0.18); },
  sack:      a => { noise(a, 0.22, 0.25); blip(a, 147, 0.26, 0.20, 'sawtooth'); },
  turnover:  a => { blip(a, 330, 0.10, 0.20, 'sawtooth'); blip(a + 0.1, 262, 0.10, 0.20, 'sawtooth'); blip(a + 0.2, 196, 0.34, 0.20, 'sawtooth'); },
  touchdown: a => { [523, 659, 784, 1046, 1319].forEach((f, i) => blip(a + i * 0.07, f, 0.16, 0.20));
                    [523, 784].forEach(f => blip(a + 0.42, f, 0.5, 0.16, 'triangle')); noise(a + 0.42, 0.5, 0.10); },
  fieldgoal: a => { blip(a, 659, 0.10, 0.18); blip(a + 0.11, 880, 0.10, 0.18); blip(a + 0.24, 1046, 0.26, 0.18); },
  /* a two-bar chugging bass-and-lead bed to sit under a bumper */
  riff:      a => {
    const step = 0.115;
    [0,0,3,0,5,3,0,-2].forEach((n, i) => blip(a + i * step, 110 * Math.pow(2, n / 12), step * 0.85, 0.13, 'square'));
    [12,12,15,12,17,15,12,10].forEach((n, i) => blip(a + i * step, 220 * Math.pow(2, n / 12), step * 0.6, 0.07, 'triangle'));
  }
};

/* ---------------------------------------------------------------
   STINGER RACK — your own clips, cached in IndexedDB

   Files are matched to cues by filename: touchdown.mp3, sack.wav,
   big-play.m4a. Same filename-driven idea as the other Jomboy tools, so
   there is nothing to configure at taping time — drop the folder in.
   --------------------------------------------------------------- */
const DB_NAME = 'gtd-sounds', DB_STORE = 'clips';
let DBP = null;
function db(){
  if(DBP) return DBP;
  DBP = new Promise((res, rej) => {
    if(!window.indexedDB) return rej(new Error('no indexedDB'));
    const rq = indexedDB.open(DB_NAME, 1);
    rq.onupgradeneeded = () => { if(!rq.result.objectStoreNames.contains(DB_STORE)) rq.result.createObjectStore(DB_STORE); };
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  });
  return DBP;
}
function dbPut(k, v){ return db().then(d => new Promise((res, rej) => {
  const tx = d.transaction(DB_STORE, 'readwrite'); tx.objectStore(DB_STORE).put(v, k);
  tx.oncomplete = res; tx.onerror = () => rej(tx.error);
})); }
function dbDel(k){ return db().then(d => new Promise((res, rej) => {
  const tx = d.transaction(DB_STORE, 'readwrite'); tx.objectStore(DB_STORE).delete(k);
  tx.oncomplete = res; tx.onerror = () => rej(tx.error);
})); }
function dbAll(){ return db().then(d => new Promise((res, rej) => {
  const tx = d.transaction(DB_STORE, 'readonly'), st = tx.objectStore(DB_STORE);
  const out = {}, rq = st.openCursor();
  rq.onsuccess = () => { const c = rq.result; if(!c) return res(out); out[c.key] = c.value; c.continue(); };
  rq.onerror = () => rej(rq.error);
})); }

/* filename -> cue. Loose on purpose: td.mp3, TOUCHDOWN 2.wav and
   touchdown-final.m4a should all land on the same peg. */
function cueFromName(name){
  const s = String(name).toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z]/g, '');
  const alias = {
    td:'touchdown', touchdown:'touchdown', score:'touchdown',
    fg:'fieldgoal', fieldgoal:'fieldgoal', kick:'fieldgoal',
    big:'bigplay', bigplay:'bigplay', bomb:'bigplay', chunk:'bigplay',
    first:'firstdown', firstdown:'firstdown', chains:'firstdown', movethechains:'firstdown',
    sack:'sack', stuffed:'sack', tackle:'sack',
    to:'turnover', turnover:'turnover', pick:'turnover', int:'turnover', fumble:'turnover',
    right:'correct', correct:'correct', good:'correct',
    wrong:'wrong', miss:'wrong', incomplete:'wrong',
    lock:'lockin', lockin:'lockin', locked:'lockin',
    tick:'tick', clock:'tick', timer:'tick',
    snap:'snap', question:'snap', hike:'snap',
    riff:'riff', bed:'riff', theme:'riff', bumper:'riff', intro:'riff'
  };
  if(alias[s]) return alias[s];
  for(const k in alias) if(s.indexOf(k) === 0 || s.indexOf(k) > -1) return alias[k];
  return null;
}

const decoded = {};
let bank = {};
let muted = false;

function initSound(){
  return dbAll().then(all => { bank = all || {}; return Object.keys(bank); }).catch(() => []);
}
function saveClip(cue, file){
  return file.arrayBuffer().then(buf => {
    const rec = { name:file.name, type:file.type, size:buf.byteLength, buf:buf };
    bank[cue] = rec; delete decoded[cue];
    return dbPut(cue, rec).then(() => rec).catch(() => rec);
  });
}
function dropFiles(files){
  const jobs = [], report = [];
  Array.from(files).forEach(f => {
    if(!/^audio\//.test(f.type) && !/\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(f.name)){ report.push([f.name, null]); return; }
    const cue = cueFromName(f.name);
    report.push([f.name, cue]);
    if(cue) jobs.push(saveClip(cue, f));
  });
  return Promise.all(jobs).then(() => report);
}
function clearClip(cue){ delete bank[cue]; delete decoded[cue]; return dbDel(cue).catch(() => {}); }
function listClips(){ const o = {}; Object.keys(bank).forEach(k => o[k] = { name:bank[k].name, size:bank[k].size }); return o; }

function playCue(cue){
  if(muted || !cue) return;
  const a = ac(); if(!a) return;
  const t = a.currentTime + 0.01;
  const rec = bank[cue];
  if(rec){
    if(decoded[cue]){ const s = a.createBufferSource(); s.buffer = decoded[cue]; s.connect(a.destination); s.start(t); return; }
    /* decodeAudioData detaches the buffer, so always hand it a copy */
    a.decodeAudioData(rec.buf.slice(0), b => {
      decoded[cue] = b;
      const s = a.createBufferSource(); s.buffer = b; s.connect(a.destination); s.start(a.currentTime + 0.01);
    }, () => { if(CHIP[cue]) CHIP[cue](a.currentTime + 0.01); });
    return;
  }
  if(CHIP[cue]) CHIP[cue](t);
}

/* ---------------------------------------------------------------
   little shared helpers
   --------------------------------------------------------------- */
function spot(yard){
  const y = Math.round(yard);
  if(y <= 0) return 'OWN GOAL LINE';
  if(y >= 100) return 'THE END ZONE';
  if(y === 50) return 'MIDFIELD';
  return (y < 50 ? 'OWN ' : 'OPP ') + (y < 50 ? y : 100 - y);
}
function ordinal(n){ return ['', '1ST', '2ND', '3RD', '4TH'][n] || (n + 'TH'); }
function distText(down, dist, los){
  if(los + dist >= 100) return ordinal(down) + ' & GOAL';
  return ordinal(down) + ' & ' + Math.max(1, Math.round(dist));
}
function fgDistance(los){ return Math.round(100 - los + 17); }

return {
  RELAYS, BANK, POOL:() => POOL, rebuildPool, parseImport, draw, tierFor, shuffle,
  resolve, FORCED, BANDS, MISS,
  drawField, SPR, PAL, teamPal, GEO, geo, xy, drawNum,
  CUES, playCue, initSound, dropFiles, clearClip, listClips, cueFromName,
  mute:v => { muted = !!v; }, isMuted:() => muted, audioCtx:ac,
  spot, ordinal, distText, fgDistance
};
})();
