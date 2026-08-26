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
/* =====================================================================
   SOURCES

   Every question in the bank carries a key into this table, and the control
   page prints the citation under the question as it is served. Each one was
   checked against the cited page in August 2026 before it went in — the
   first cut of this bank was written from memory and two questions were
   wrong, which is exactly the failure mode a live taping cannot absorb.

   Records move. Re-check the record questions before a taping; the ones
   most likely to shift are the single-season and career leaders, the
   "never been to a Super Bowl" question, and anything naming a current
   coach or a recent draft.
   ===================================================================== */
const SOURCES = {
  rules:        ['American football rules — Wikipedia', 'https://en.wikipedia.org/wiki/American_football_rules'],
  sbchamps:     ['List of Super Bowl champions — Wikipedia', 'https://en.wikipedia.org/wiki/List_of_Super_Bowl_champions'],
  sblx:         ['Super Bowl LX — ESPN', 'https://www.espn.com/nfl/story/_/id/47822193/2026-super-bowl-lx-patriots-seahawks-live-highlights-results'],
  sb1:          ['Packers beat Chiefs in first Super Bowl — HISTORY', 'https://www.history.com/this-day-in-history/january-15/packers-beat-chiefs-in-first-super-bowl'],
  superbowl:    ['Super Bowl — Wikipedia', 'https://en.wikipedia.org/wiki/Super_Bowl'],
  sbmvp:        ['Super Bowl MVP Award — Wikipedia', 'https://en.wikipedia.org/wiki/Super_Bowl_Most_Valuable_Player_Award'],
  montana:      ['Joe Montana — Wikipedia', 'https://en.wikipedia.org/wiki/Joe_Montana'],
  brady:        ['Tom Brady — Wikipedia', 'https://en.wikipedia.org/wiki/Tom_Brady'],
  brady199:     ["Brady's 199th overall selection — Patriots.com", 'https://www.patriots.com/video/25th-anniversary-of-tom-brady-s-199-overall-draft-selection-by-the-patriots-in-2000-nfl-draft'],
  records:      ['List of NFL records (individual) — Wikipedia', 'https://en.wikipedia.org/wiki/List_of_National_Football_League_records_(individual)'],
  qbrec:        ['List of NFL quarterback records — Wikipedia', 'https://en.wikipedia.org/wiki/List_of_National_Football_League_quarterback_records'],
  sacks:        ['NFL career sacks leaders — Wikipedia', 'https://en.wikipedia.org/wiki/List_of_National_Football_League_career_sacks_leaders'],
  intlead:      ['NFL interceptions leaders — Wikipedia', 'https://en.wikipedia.org/wiki/List_of_National_Football_League_annual_interceptions_leaders'],
  mvp:          ['AP NFL Most Valuable Player Award — Wikipedia', 'https://en.wikipedia.org/wiki/Associated_Press_NFL_Most_Valuable_Player_Award'],
  coachwins:    ['NFL head coaches with 50 wins — Wikipedia', 'https://en.wikipedia.org/wiki/List_of_National_Football_League_head_coaches_with_50_wins'],
  firstpick:    ['List of first overall NFL draft picks — Wikipedia', 'https://en.wikipedia.org/wiki/List_of_first_overall_National_Football_League_draft_picks'],
  draft83:      ['1983 NFL draft — Wikipedia', 'https://en.wikipedia.org/wiki/1983_NFL_draft'],
  rodgers05:    ['Aaron Rodgers drafted by the Packers, 2005 — WISN', 'https://www.wisn.com/article/look-back-aaron-rodgers-2005-nfl-draft-green-bay-packers/30587601'],
  perfect:      ['The only perfect season — NFL.com', 'https://www.nfl.com/news/1972-miami-dolphins-the-inside-story-of-the-only-perfect-season-in-nfl-history'],
  immaculate:   ['Immaculate Reception — Wikipedia', 'https://en.wikipedia.org/wiki/Immaculate_Reception'],
  icebowl:      ['The Ice Bowl — Packers.com', 'https://www.packers.com/photos/on-this-day-54th-anniversary-of-the-ice-bowl'],
  mcm:          ['Music City Miracle — Wikipedia', 'https://en.wikipedia.org/wiki/Music_City_Miracle'],
  tuck:         ['Tuck Rule Game — Wikipedia', 'https://en.wikipedia.org/wiki/Tuck_Rule_Game'],
  helmet:       ["Tyree's Helmet Catch — NFL.com", 'https://www.nfl.com/100/originals/100-greatest/detail.html?slug=plays-3'],
  philly:       ['Philly Special — Eagles.com', 'https://www.philadelphiaeagles.com/news/nick-foles-trey-burton-eagles-philly-special-espn-30-documentary'],
  comeback:     ['The Comeback — HISTORY', 'https://www.history.com/this-day-in-history/january-3/buffalo-bills-pull-off-greatest-comeback-in-nfl-history'],
  mnf:          ['First Monday Night Football game — ClevelandBrowns.com', 'https://www.clevelandbrowns.com/photos/photos-a-look-back-at-the-first-monday-night-football-game'],
  dorsett:      ["Dorsett's 99-yard run — ESPN", 'https://www.espn.com/blog/sportscenter/post/_/id/17411/this-day-in-sports-tony-dorsett-goes-99-yards-to-paydirt'],
  cromartie:    ['Cromartie sets NFL record with 109-yard return — ESPN', 'https://www.espn.com/espn/wire?id=3094477&section=nfl'],
  prater:       ['Longest field goal in NFL history — NFL.com', 'https://www.nfl.com/videos/longest-field-goal-in-nfl-history-matt-prater-makes-64-yard-field-goal-125657'],
  buddyryan:    ['Buddy Ryan, architect of the 1985 Bears defense — ESPN', 'https://www.espn.com/nfl/story/_/id/16579465/former-nfl-coach-defensive-guru-buddy-ryan-dies-age-85'],
  tuna:         ['Big Tuna — Wikipedia', 'https://en.wikipedia.org/wiki/Big_Tuna'],
  raiders:      ['Raiders relocation to Las Vegas — Wikipedia', 'https://en.wikipedia.org/wiki/Oakland_Raiders_relocation_to_Las_Vegas'],
  nflteams:     ['The 32 NFL clubs — NFL.com', 'https://www.nfl.com/teams/'],
  teams:        ['NFL club pages — NFL.com', 'https://www.nfl.com/teams/'],
  reid:         ['Andy Reid, head coach — Chiefs.com', 'https://www.chiefs.com/team/coaches-roster/andy-reid'],
  packerstitles:['Green Bay Packers — Pro Football Hall of Fame', 'https://www.profootballhof.com/teams/green-bay-packers'],
  thanksgiving: ['Thanksgiving and the NFL — Pro Football Hall of Fame', 'https://www.profootballhof.com/football-history/thanksgiving-and-the-nfl'],
  towel:        ['The Terrible Towel — Steelers coverage, SI', 'https://www.si.com/nfl/steelers/news/pittsburgh-steelers-tease-new-terrible-towel-announcement'],
  blackhole:    ["The Raiders' Black Hole — NBC Sports Bay Area", 'https://www.nbcsportsbayarea.com/nfl/ever-wonder-where-raiders-iconic-black-hole-fan-section-came-from/1319869/'],
  cheesehead:   ['Cheesehead — Wikipedia', 'https://en.wikipedia.org/wiki/Cheesehead'],
  americasteam: ["America's Team — Wikipedia", 'https://en.wikipedia.org/wiki/America%27s_Team'],
  brownshelmet: ['Cleveland Browns helmet history — Dawgs By Nature', 'https://www.dawgsbynature.com/2019/1/17/18186569/cleveland-browns-helmet-history'],
  payton:       ['Walter Payton — Pro-Football-Reference', 'https://www.pro-football-reference.com/players/P/PaytWa00.htm'],
  perry:        ['William Perry — Wikipedia', 'https://en.wikipedia.org/wiki/William_Perry_(American_football)'],
  lambeau:      ['Lambeau Field — Britannica', 'https://www.britannica.com/place/Lambeau-Field']
};

const BANK = {
1:[
"How many points is a touchdown worth, before the extra point?|6|7|3|2|rules",
"Which trophy goes to the Super Bowl champion?|The Vince Lombardi Trophy|The George Halas Trophy|The Pete Rozelle Trophy|The Lamar Hunt Trophy|sbchamps",
"How many players from one team are on the field at once?|11|10|12|9|rules",
"Which team plays its home games at Lambeau Field?|Packers|Bears|Vikings|Lions|teams",
"How many yards is it from goal line to goal line?|100|110|90|120|rules",
"A field goal is worth how many points?|3|2|6|1|rules",
"Which franchise is nicknamed America's Team?|Cowboys|Patriots|Steelers|49ers|americasteam",
"Which player has won the most Super Bowls?|Tom Brady|Joe Montana|Charles Haley|Peyton Manning|brady",
"How many downs does an offense get to gain 10 yards?|4|3|5|2|rules",
"How many teams are in the NFL?|32|30|28|34|nflteams",
"A safety is worth how many points?|2|1|3|6|rules",
"Which team's helmet has no logo on it?|Browns|Raiders|Colts|Jets|brownshelmet",
"Which team hosts a Thanksgiving game every single year?|Lions|Bears|Giants|Eagles|thanksgiving",
"What do you call it when the quarterback is tackled behind the line?|A sack|A safety|A fumble|A pick|rules",
"Which team plays at Arrowhead Stadium?|Chiefs|Broncos|Cardinals|Titans|teams",
"The Terrible Towel belongs to which fan base?|Steelers|Ravens|Bengals|Browns|towel",
"How many minutes are in an NFL quarter?|15|12|20|10|rules",
"Which conference do the Green Bay Packers play in?|NFC|AFC|Both|Neither|teams",
"Cheeseheads are fans of which team?|Packers|Vikings|Bears|Chiefs|cheesehead",
"Which position snaps the ball to start a play?|Center|Guard|Tackle|Fullback|rules",
"What color is the flag officials throw for a penalty?|Yellow|Red|Blue|White|rules",
"Which team has a horseshoe on its helmet?|Colts|Broncos|Texans|Rams|teams",
"Who has been the Chiefs head coach since 2013?|Andy Reid|Sean McVay|John Harbaugh|Mike Tomlin|reid",
"Which city do the Bengals call home?|Cincinnati|Cleveland|Columbus|Louisville|teams",
"Which team won Super Bowl LVIII in February 2024?|Chiefs|49ers|Eagles|Bengals|sbchamps",
"The Super Bowl is played in which month?|February|January|March|December|superbowl",
"How many points is an extra point kick worth?|1|2|3|None of them|rules",
"Which team plays its home games in Foxborough, Massachusetts?|Patriots|Bills|Jets|Giants|teams",
"Which bird is the Philadelphia team named after?|The eagle|The falcon|The raven|The cardinal|teams",
"What is the line of scrimmage?|Where the ball is spotted|The goal line|The sideline|The 50-yard line|rules",
"Which team won Super Bowl LX in February 2026?|Seahawks|Patriots|Chiefs|Eagles|sblx"
],
2:[
"Who holds the single-season record for passing yards?|Peyton Manning|Tom Brady|Drew Brees|Patrick Mahomes|qbrec",
"Who holds the single-season record for passing touchdowns?|Peyton Manning|Tom Brady|Dan Marino|Aaron Rodgers|qbrec",
"Who is the NFL's all-time leading rusher?|Emmitt Smith|Walter Payton|Barry Sanders|Frank Gore|records",
"Who holds the single-season rushing record with 2,105 yards?|Eric Dickerson|Adrian Peterson|O.J. Simpson|Jamal Lewis|records",
"Which team finished the 2007 regular season 16-0?|Patriots|Colts|Packers|Steelers|perfect",
"Which is the only team to go undefeated and win the Super Bowl?|The 1972 Dolphins|The 1985 Bears|The 2007 Patriots|The 1962 Packers|perfect",
"Who made the Helmet Catch in Super Bowl XLII?|David Tyree|Mario Manningham|Plaxico Burress|Amani Toomer|helmet",
"Who caught the Philly Special touchdown in Super Bowl LII?|Nick Foles|Zach Ertz|Trey Burton|Alshon Jeffery|philly",
"Who is the NFL's all-time leading scorer?|Adam Vinatieri|Morten Andersen|Gary Anderson|Justin Tucker|records",
"Who holds the career record for receiving yards?|Jerry Rice|Terrell Owens|Randy Moss|Larry Fitzgerald|records",
"Who is the official career sacks leader?|Bruce Smith|Reggie White|Kevin Greene|Deacon Jones|sacks",
"Which team came back from 28-3 down to win Super Bowl LI?|Patriots|Falcons|Seahawks|Broncos|sbchamps",
"Who has the most career passing yards?|Tom Brady|Drew Brees|Peyton Manning|Brett Favre|qbrec",
"Who threw the most career interceptions?|Brett Favre|George Blanda|Vinny Testaverde|Drew Bledsoe|qbrec",
"Which team drafted Aaron Rodgers in 2005?|Packers|49ers|Bears|Chargers|rodgers05",
"Who went first overall in the 2024 NFL Draft?|Caleb Williams|Jayden Daniels|Drake Maye|Marvin Harrison Jr.|firstpick",
"Who went first overall in the 2023 NFL Draft?|Bryce Young|C.J. Stroud|Anthony Richardson|Will Levis|firstpick",
"Which franchise moved to Las Vegas in 2020?|Raiders|Chargers|Rams|Cardinals|raiders",
"Which two teams played the 1967 Ice Bowl?|Packers and Cowboys|Bears and Vikings|Browns and Colts|Lions and Giants|icebowl",
"Who is the only Super Bowl MVP from the losing team?|Chuck Howley|Jake Scott|Harvey Martin|Ray Lewis|sbmvp",
"Who has the most career rushing touchdowns?|Emmitt Smith|LaDainian Tomlinson|Marcus Allen|Walter Payton|records",
"Which kicker made a 64-yard field goal for Denver in 2013?|Matt Prater|Justin Tucker|Sebastian Janikowski|Greg Zuerlein|prater",
"Which franchise has the most NFL championships all time?|Packers|Bears|Giants|Steelers|packerstitles",
"Who threw the pass on the Immaculate Reception?|Terry Bradshaw|Franco Harris|Joe Greene|Rocky Bleier|immaculate",
"Which running back was nicknamed Sweetness?|Walter Payton|Barry Sanders|Gale Sayers|Earl Campbell|payton",
"Which Bears lineman was called The Refrigerator?|William Perry|Dan Hampton|Steve McMichael|Richard Dent|perry",
"In what year was the first Super Bowl played?|1967|1970|1963|1972|sb1",
"Which team won the first Super Bowl?|Packers|Chiefs|Colts|Jets|sb1",
"Who has the most career receiving touchdowns?|Jerry Rice|Randy Moss|Terrell Owens|Cris Carter|records",
"Which head coach has the most career wins?|Don Shula|George Halas|Bill Belichick|Tom Landry|coachwins",
"Which team did Tom Brady win his seventh ring with?|Buccaneers|Patriots|Falcons|Chiefs|sbchamps",
"Who was the last defensive player to win NFL MVP?|Lawrence Taylor|J.J. Watt|Ray Lewis|Alan Page|mvp",
"Which quarterback threw seven touchdowns against the Raiders in 2013?|Nick Foles|Peyton Manning|Drew Brees|Tom Brady|qbrec",
"The Tuck Rule game was the Patriots against which team?|Raiders|Steelers|Rams|Titans|tuck",
"Which fan section is known as the Black Hole?|The Raiders'|The Ravens'|The Jets'|The Bears'|blackhole",
"The Music City Miracle knocked out which team?|Bills|Colts|Jaguars|Dolphins|mcm",
"Which team took Cam Ward first overall in the 2025 draft?|Titans|Browns|Giants|Raiders|firstpick",
"Which team had the first overall pick in the 2026 draft?|Raiders|Titans|Browns|Jets|firstpick"
],
3:[
"Who holds the single-game rushing record with 296 yards?|Adrian Peterson|Jamal Lewis|Corey Dillon|Walter Payton|records",
"Who caught the Immaculate Reception?|Franco Harris|John Fuqua|Lynn Swann|Rocky Bleier|immaculate",
"Which player caught a pass in 274 straight games?|Jerry Rice|Tony Gonzalez|Larry Fitzgerald|Marvin Harrison|records",
"Tom Brady was drafted with which overall pick in 2000?|199th|99th|155th|233rd|brady199",
"Who holds the single-game passing yards record with 554?|Norm Van Brocklin|Warren Moon|Ben Roethlisberger|Matt Schaub|qbrec",
"Who is the only kicker ever named NFL MVP?|Mark Moseley|Jan Stenerud|Garo Yepremian|Lou Groza|mvp",
"Which team drafted Dan Marino in 1983?|Dolphins|Steelers|Jets|Bills|draft83",
"How many quarterbacks went in the first round of the 1983 draft?|Six|Four|Three|Eight|draft83",
"Who set the single-season receptions record with 149?|Michael Thomas|Marvin Harrison|Antonio Brown|Cooper Kupp|records",
"Who has the most career interceptions by a defender?|Paul Krause|Emlen Tunnell|Rod Woodson|Dick Lane|intlead",
"Which team blew a 35-3 lead in a 1993 playoff game?|Oilers|Chargers|Broncos|Raiders|comeback",
"Who played the most seasons in NFL history with 26?|George Blanda|Tom Brady|Morten Andersen|Adam Vinatieri|records",
"Who was the first Black quarterback to win a Super Bowl?|Doug Williams|Warren Moon|Randall Cunningham|Steve McNair|sbmvp",
"Who has the most career fumbles?|Brett Favre|Warren Moon|Dave Krieg|Kerry Collins|qbrec",
"Whose 99-yard run in 1983 is the longest run from scrimmage ever?|Tony Dorsett|Ahman Green|Derrick Henry|Bo Jackson|dorsett",
"Which of these franchises has never played in a Super Bowl?|Lions|Bengals|Panthers|Falcons|sbchamps",
"Who coordinated the 1985 Bears defense?|Buddy Ryan|Mike Ditka|Vince Tobin|Dave Wannstedt|buddyryan",
"What is the fewest points a team has scored in a Super Bowl?|3|0|6|7|sbchamps",
"Who passed Michael Vick for the most career rushing yards by a quarterback?|Lamar Jackson|Josh Allen|Russell Wilson|Cam Newton|qbrec",
"Which quarterback won back-to-back MVPs in 2020 and 2021?|Aaron Rodgers|Patrick Mahomes|Tom Brady|Josh Allen|mvp",
"Which coach is nicknamed The Big Tuna?|Bill Parcells|Bill Cowher|Marty Schottenheimer|Jimmy Johnson|tuna",
"Whose 109-yard return in 2007 tied the longest play in NFL history?|Antonio Cromartie|Devin Hester|Cordarrelle Patterson|Josh Cribbs|cromartie",
"Which team won Super Bowl V, the first after the AFL-NFL merger?|Colts|Cowboys|Chiefs|Vikings|sbchamps",
"Who was the first player to win three Super Bowl MVP awards?|Joe Montana|Terry Bradshaw|John Elway|Phil Simms|montana",
"How many yards deep is an NFL end zone?|10|12|15|8|rules",
"Which team hosted the first Monday Night Football game in 1970?|Browns|Jets|Chiefs|Cowboys|mnf",
"Which quarterback started 297 straight regular season games?|Brett Favre|Peyton Manning|Eli Manning|Philip Rivers|records",
"Ernie Nevers, Dub Jones, Gale Sayers and Alvin Kamara share which record?|Six touchdowns in a game|Five interceptions in a game|Four field goals in a quarter|Three safeties in a season|records",
"Who was the first overall pick of the 1998 NFL Draft?|Peyton Manning|Ryan Leaf|Charles Woodson|Randy Moss|firstpick",
"Which stadium is nicknamed The Frozen Tundra?|Lambeau Field|Soldier Field|Highmark Stadium|Arrowhead Stadium|lambeau"
]
};

/* parse "text|right|w|w|w" into a record, keeping the right answer flagged */
/* Built-in rows are "text|right|wrong|wrong|wrong|sourceKey" — the tier comes
   from which list the row is in. Pasted rows use a tier number in slot 5 and
   free text in slot 6 instead; see parseImport. */
function parseRow(row, tier, i){
  const p = String(row).split('|').map(s => s.trim()).filter(s => s.length);
  if(p.length < 3) return null;
  return { id:'b'+tier+'-'+i, tier:tier, text:p[0], right:p[1], wrong:p.slice(2, 5), src:p[5] || null };
}
/* [label, url] for a question, or null if it came in without one */
function cite(q){
  if(!q || !q.src) return null;
  const s = SOURCES[q.src];
  if(s) return { label:s[0], url:s[1] };
  return { label:String(q.src), url:null };
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
    out.push({ tier:tier, text:p[0], right:p[1], wrong:p.slice(2, 5).filter(Boolean), src:p[6] || null });
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
        choices:choices, correct:choices.indexOf(q.right), cite:cite(q)
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
/* the extruded front face — the slab the turf sits on. The wide cut shows
   the near sideline, so it gets a grass lip; the tall cut is looking down
   the field at a barrier wall, so that one reads as concrete. */
const WALL_TOP = '#3f8a52', WALL = '#123047', WALL_DARK = '#08131c', WALL_LIP = '#1d4a6b';
const WALL_V_TOP = '#7f93a6', WALL_V = '#3b566e', WALL_V_DARK = '#08131c';

/* ---------------------------------------------------------------
   FIELD GEOMETRY

   The wide cut is a lower third and nothing more: 25 pixels tall, which
   is exactly 100 on air at 4x. There is no room for stands or a second
   row of numbers, so the yard markers live on the front face of the slab
   where a sprite can never sit on top of them.

   `kFar` is the forced perspective. The field is drawn as a trapezoid —
   the far sideline is kFar as wide as the near one — so the yard lines
   lean toward the middle and the whole thing reads as a solid block
   sitting on the screen rather than a flat sticker.
   --------------------------------------------------------------- */
const GEO = {
  h: { W:480, H:28,  ppy:4, m:4, ezd:36, fieldA:1,  fieldB:20,  wall:8, base:19, kFar:0.85, sprite:1, numScale:1 },
  v: { W:270, H:378, ppy:3, m:9, ezd:30, fieldA:12, fieldB:258, wall:8, base:0,  kFar:0.82, sprite:2, numScale:2 }
};

function geo(view){ return GEO[view === 'v' ? 'v' : 'h']; }

/* yard 0 is the offense's own goal line, yard 100 the one they are driving
   at; lateral t runs 0 (far sideline) to 1 (near sideline). Both axes are
   perspective-corrected here so every caller downstream gets it for free. */
function xy(view, yard, t){
  const g = geo(view);
  if(view === 'v'){
    const y = g.m + g.ezd + (100 - yard) * g.ppy;
    const cx = (g.fieldA + g.fieldB) / 2;
    const s = 1 - (1 - g.kFar) * Math.max(0, Math.min(1.1, yard / 100));
    return [cx + (g.fieldA + t * (g.fieldB - g.fieldA) - cx) * s, y];
  }
  const y = g.fieldA + t * (g.fieldB - g.fieldA);
  const cx = g.m + g.ezd + 50 * g.ppy;
  const s = g.kFar + (1 - g.kFar) * t;
  return [cx + (g.m + g.ezd + yard * g.ppy - cx) * s, y];
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
/* a squashed shadow on the turf — cheapest way to sit a sprite in the
   scene instead of on top of it */
function shadow(ctx, x, y, w, scale){
  px(ctx, x + scale, y, w - scale * 2, scale, 'rgba(0,0,0,.30)');
  px(ctx, x + scale * 2, y - scale, w - scale * 4, scale, 'rgba(0,0,0,.18)');
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

/* ---------------------------------------------------------------
   Everything on the field is drawn a scanline at a time, because with
   perspective a "rectangle" isn't one any more — a five-yard stripe is a
   trapezoid and a yard line leans. Row by row keeps every edge on a whole
   pixel, which is what stops the taper from turning into mush.
   --------------------------------------------------------------- */
function rowsOf(g){ return Math.max(1, g.fieldB - g.fieldA); }

function lineAcross(ctx, view, yard, thick, color){
  const g = geo(view);
  if(view === 'v'){
    const p0 = xy(view, yard, 0), p1 = xy(view, yard, 1);
    px(ctx, p0[0], p0[1] - (thick >> 1), p1[0] - p0[0], thick, color);
    return;
  }
  const rows = rowsOf(g);
  for(let r = 0; r < rows; r++){
    const x = xy(view, yard, r / (rows - 1 || 1))[0];
    px(ctx, x - (thick >> 1), g.fieldA + r, thick, 1, color);
  }
}

function bandFill(ctx, view, ya, yb, color){
  const g = geo(view);
  if(view === 'v'){
    const yTop = Math.round(xy(view, yb, 0)[1]), yBot = Math.round(xy(view, ya, 0)[1]);
    for(let y = yTop; y < yBot; y++){
      const yard = 100 - (y - g.m - g.ezd) / g.ppy;
      const x0 = xy(view, yard, 0)[0], x1 = xy(view, yard, 1)[0];
      px(ctx, x0, y, x1 - x0, 1, color);
    }
    return;
  }
  const rows = rowsOf(g);
  for(let r = 0; r < rows; r++){
    const t = r / (rows - 1 || 1);
    const x0 = xy(view, ya, t)[0], x1 = xy(view, yb, t)[0];
    px(ctx, x0, g.fieldA + r, x1 - x0, 1, color);
  }
}

/* end zones are just the ten yards either side of the field */
function ezYards(view){ const g = geo(view); return g.ezd / g.ppy; }
function ezFill(ctx, view, which, color){
  const d = ezYards(view);
  if(which === 'opp') bandFill(ctx, view, 100, 100 + d, color);
  else bandFill(ctx, view, -d, 0, color);
}

/* ---------------------------------------------------------------
   THE SLAB

   A front face under the near sideline, a lip where the two meet, and a
   dark base line. That edge is doing most of the 3-D work — without it
   the perspective just looks like a wonky rectangle.
   --------------------------------------------------------------- */
function slab(ctx, view, spec){
  const g = geo(view), d = ezYards(view);
  if(view === 'v'){
    const y0 = Math.round(xy(view, -d, 0)[1]);
    const x0 = xy(view, -d, 0)[0], x1 = xy(view, -d, 1)[0];
    px(ctx, x0 - 3, y0, (x1 - x0) + 6, 2, WALL_V_TOP);
    px(ctx, x0 - 3, y0 + 2, (x1 - x0) + 6, g.wall - 3, WALL_V);
    px(ctx, x0 - 3, y0 + g.wall - 1, (x1 - x0) + 6, 1, WALL_V_DARK);
    return;
  }
  const xL = xy(view, -d, 1)[0], xR = xy(view, 100 + d, 1)[0];
  const y0 = g.fieldB;
  px(ctx, xL, y0, xR - xL, 1, WALL_TOP);            /* grass lip catching the light */
  px(ctx, xL, y0 + 1, xR - xL, g.wall - 2, WALL);
  px(ctx, xL, y0 + g.wall - 1, xR - xL, 1, WALL_DARK);
  /* the ends of the slab, wedged in as the field narrows away from you */
  const rows = rowsOf(g);
  for(let r = 0; r < rows; r++){
    const t = r / (rows - 1 || 1);
    const l = xy(view, -d, t)[0], rr = xy(view, 100 + d, t)[0];
    px(ctx, l - 2, g.fieldA + r, 2, 1, WALL_LIP);
    px(ctx, rr, g.fieldA + r, 2, 1, WALL_LIP);
  }
}

/* yard markers ride on the front face where no sprite can ever cover them */
function wallNumbers(ctx, view, color){
  const g = geo(view);
  if(view === 'v') return;
  const sc = g.numScale, y = g.fieldB + 1 + Math.max(0, Math.floor((g.wall - 2 - 5 * sc) / 2));
  for(let y10 = 10; y10 <= 90; y10 += 10){
    const s = String(y10 <= 50 ? y10 : 100 - y10);
    const w = s.length * 4 * sc - sc;
    drawNum(ctx, s, xy(view, y10, 1)[0] - w / 2, y, sc, color);
  }
}

function goalPost(ctx, view, which, color){
  const g = geo(view), d = ezYards(view);
  if(view === 'v'){
    const back = which === 'opp' ? 100 + d - 1 : -d + 1;
    const p = xy(view, back, 0.5);
    const up = which === 'opp' ? -1 : 1;
    px(ctx, p[0] - 13, p[1], 26, 2, color);
    px(ctx, p[0] - 13, p[1] + (up > 0 ? 2 : -11), 2, 11, color);
    px(ctx, p[0] + 11, p[1] + (up > 0 ? 2 : -11), 2, 11, color);
    px(ctx, p[0] - 1, p[1] + (up > 0 ? -9 : 2), 2, 9, color);
    return;
  }
  const back = which === 'opp' ? 100 + d - 1.5 : -d + 1.5;
  const foot = xy(view, back, 0.72);
  const x = Math.round(foot[0]), yb = Math.round(foot[1]);
  px(ctx, x, yb - 7, 1, 7, color);                  /* stem */
  px(ctx, x - 4, yb - 8, 9, 1, color);              /* crossbar */
  px(ctx, x - 4, yb - 14, 1, 6, color);             /* uprights */
  px(ctx, x + 4, yb - 14, 1, 6, color);
}

function depthShade(ctx, view){
  const g = geo(view), d = ezYards(view);
  if(view === 'v'){
    const yTop = Math.round(xy(view, 100 + d, 0)[1]), yBot = Math.round(xy(view, -d, 0)[1]);
    for(let y = yTop; y < yBot; y++){
      const t = 1 - (y - yTop) / Math.max(1, yBot - yTop);   /* 1 at the far end */
      const yard = 100 - (y - g.m - g.ezd) / g.ppy;
      const x0 = xy(view, yard, 0)[0], x1 = xy(view, yard, 1)[0];
      px(ctx, x0, y, x1 - x0, 1, 'rgba(4,14,24,' + (t * 0.30).toFixed(3) + ')');
    }
    return;
  }
  const rows = rowsOf(g);
  for(let r = 0; r < rows; r++){
    const t = r / (rows - 1 || 1);                            /* 0 at the far sideline */
    const x0 = xy(view, -d, t)[0], x1 = xy(view, 100 + d, t)[0];
    px(ctx, x0, g.fieldA + r, x1 - x0, 1, 'rgba(4,14,24,' + ((1 - t) * 0.34).toFixed(3) + ')');
  }
  /* and a sliver of light along the near sideline, where the slab turns */
  const xl = xy(view, -d, 1)[0], xr = xy(view, 100 + d, 1)[0];
  px(ctx, xl, g.fieldB - 1, xr - xl, 1, 'rgba(255,255,255,.10)');
}

/* a stable per-pixel hash so nothing shimmers frame to frame */
function hash(i){ let h = (i * 2654435761) % 4294967296; return (h ^ (h >>> 13)) / 4294967296; }

/* ---------------------------------------------------------------
   drawField(canvas, spec)

   spec: { view, los, first, runner:{yard,frame,flip,lane,lift}, defenders:[],
           ball:{yard,lift}|null, flash:0..1, pal:{off,def}, ez:{own,opp},
           chains:bool, marks:[yard], tint:'gold'|'red'|null }
   --------------------------------------------------------------- */
function drawField(cv, spec){
  const view = spec.view === 'v' ? 'v' : 'h';
  const g = geo(view);
  if(cv.width !== g.W || cv.height !== g.H){ cv.width = g.W; cv.height = g.H; }
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, g.W, g.H);

  /* turf: five-yard mow stripes, each one a trapezoid */
  for(let y5 = 0; y5 < 100; y5 += 5) bandFill(ctx, view, y5, y5 + 5, (y5 / 5) % 2 ? TURF_B : TURF_A);

  const ezOwn = (spec.ez && spec.ez.own) || EZ_FILL;
  const ezOpp = (spec.ez && spec.ez.opp) || EZ_FILL;
  ezFill(ctx, view, 'own', ezOwn);
  ezFill(ctx, view, 'opp', ezOpp);
  if(spec.flash > 0.3){
    ctx.globalAlpha = Math.min(0.9, spec.flash);
    ezFill(ctx, view, 'opp', EZ_EDGE);
    ctx.globalAlpha = 1;
  }

  /* yard lines every five, goal lines in gold */
  for(let y5 = 0; y5 <= 100; y5 += 5) lineAcross(ctx, view, y5, y5 % 10 === 0 ? 2 : 1, LINE);
  lineAcross(ctx, view, 0, 2, EZ_EDGE);
  lineAcross(ctx, view, 100, 2, EZ_EDGE);

  /* hash marks, thinned out to whatever the depth can carry */
  const hashStep = 2;
  for(let y1 = 1; y1 < 100; y1 += hashStep){
    if(y1 % 5 === 0) continue;
    [0.34, 0.66].forEach(t => {
      const p = xy(view, y1, t);
      if(view === 'v') px(ctx, p[0] - 2, p[1], 4, 1, LINE);
      else px(ctx, p[0], p[1], 1, 1, 'rgba(223,234,243,.8)');
    });
  }

  /* Atmospheric perspective: lay a shade over the turf that fades out
     toward you. The trapezoid alone reads as a wonky rectangle — it is this
     that makes the back of the field feel further away than the front. */
  depthShade(ctx, view);

  if(view === 'v'){
    /* the tall cut has room for numbers on the field itself */
    const sc = g.numScale;
    for(let y10 = 10; y10 <= 90; y10 += 10){
      const s = String(y10 <= 50 ? y10 : 100 - y10);
      const w = s.length * 4 * sc - sc;
      const l = xy(view, y10, 0)[0], r = xy(view, y10, 1)[0], yy = xy(view, y10, 0)[1];
      drawNum(ctx, s, l + 4, yy - 2 * sc, sc, 'rgba(230,240,250,.72)');
      drawNum(ctx, s, r - 4 - w, yy - 2 * sc, sc, 'rgba(230,240,250,.72)');
    }
  }

  goalPost(ctx, view, 'own', POST);
  goalPost(ctx, view, 'opp', POST);

  /* the two lines that tell the whole story */
  if(spec.chains !== false && spec.first != null && spec.first > 0 && spec.first < 100)
    lineAcross(ctx, view, spec.first, 2, '#f2c53d');
  if(spec.los != null) lineAcross(ctx, view, spec.los, 2, '#4fa8ff');

  const SP = g.sprite;
  const palOff = (spec.pal && spec.pal.off) || PAL.off;
  const palDef = (spec.pal && spec.pal.def) || PAL.def;

  function feet(yard, lane){
    if(view === 'v'){
      const p = xy(view, yard, 0.5);
      return [Math.round(p[0] - 6 * SP + (lane || 0)), Math.round(p[1] + 8)];
    }
    return [Math.round(xy(view, yard, 0.62)[0] - 6 * SP), Math.round(g.base + (lane || 0))];
  }
  function put(s, pal, lane){
    const art = SPR[s.frame] || SPR.idle;
    const f = feet(s.yard, lane);
    shadow(ctx, f[0], f[1], 12 * SP, SP);
    drawSprite(ctx, art, f[0], f[1] - 16 * SP - (s.lift || 0), SP, pal, !!s.flip);
  }

  (spec.defenders || []).forEach((d, i) => put(d, palDef, d.lane != null ? d.lane : (i ? 2 : -2)));
  if(spec.runner) put(spec.runner, palOff, spec.runner.lane || 0);

  if(spec.ball){
    const p = xy(view, spec.ball.yard, view === 'v' ? 0.5 : 0.62);
    const by = (view === 'v' ? p[1] - 4 : g.base - 8) - (spec.ball.lift || 0);
    drawSprite(ctx, BALL, Math.round(p[0] - 2 * SP), Math.round(by), SP, palOff, false);
  }

  slab(ctx, view, spec);
  wallNumbers(ctx, view, 'rgba(230,240,250,.62)');

  /* safe havens, as pylons standing on the front face */
  (spec.marks || []).forEach(m => {
    const p = xy(view, m, 1);
    const lit = spec.los >= m;
    const c = lit ? '#fbcc7a' : 'rgba(251,204,122,.34)';
    if(view === 'v') px(ctx, p[0] + 2, p[1] - 2, 3, 4, c);
    else { px(ctx, p[0] - 1, g.fieldB - 3, 2, 3, c); px(ctx, p[0] - 1, g.fieldB + 1, 2, g.wall - 2, lit ? '#c9992f' : 'rgba(201,153,47,.35)'); }
  });

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
  RELAYS, BANK, SOURCES, cite, POOL:() => POOL, rebuildPool, parseImport, draw, tierFor, shuffle,
  resolve, FORCED, BANDS, MISS,
  drawField, SPR, PAL, teamPal, GEO, geo, xy, drawNum,
  CUES, playCue, initSound, dropFiles, clearClip, listClips, cueFromName,
  mute:v => { muted = !!v; }, isMuted:() => muted, audioCtx:ac,
  spot, ordinal, distText, fgDistance
};
})();
