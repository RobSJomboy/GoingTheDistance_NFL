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

/* =====================================================================
   QUESTION BANK

   One row per question:

     text | right answer | wrong | wrong | wrong | difficulty | era | source

   The right answer is always written first and the four choices get
   shuffled when the question is served, so adding one never means counting
   letters. Difficulty is 1 easy / 2 medium / 3 hard and is graded *within
   its era* — someone who picks the 1970s knows who won Super Bowl IX, and
   marking that hard just because it is old makes the era filters
   unplayable. Era is 70s / 80s / 90s / 00s / 10s / 20s, or `any` for the
   evergreen ones (rules, all-time records, nicknames, venues).

   The last field keys into SOURCES. Everything here was checked against
   its cited page in August 2026; the bulk of the era questions are
   generated straight off four reference tables, so each one is true by
   construction of the table it came from.
   ===================================================================== */
const BANK = [
"How many points is a touchdown worth, before the extra point?|6|7|3|2|1|any|rules",
"Which trophy goes to the Super Bowl champion?|The Vince Lombardi Trophy|The George Halas Trophy|The Pete Rozelle Trophy|The Lamar Hunt Trophy|1|any|sbchamps",
"How many players from one team are on the field at once?|11|10|12|9|1|any|rules",
"Which team plays its home games at Lambeau Field?|Packers|Bears|Vikings|Lions|1|any|teams",
"How many yards is it from goal line to goal line?|100|110|90|120|1|any|rules",
"A field goal is worth how many points?|3|2|6|1|1|any|rules",
"Which franchise is nicknamed America's Team?|Cowboys|Patriots|Steelers|49ers|1|any|americasteam",
"Which player has won the most Super Bowls?|Tom Brady|Joe Montana|Charles Haley|Peyton Manning|1|any|brady",
"How many downs does an offense get to gain 10 yards?|4|3|5|2|1|any|rules",
"How many teams are in the NFL?|32|30|28|34|1|any|nflteams",
"A safety is worth how many points?|2|1|3|6|1|any|rules",
"Which team's helmet has no logo on it?|Browns|Raiders|Colts|Jets|1|any|brownshelmet",
"Which team hosts a Thanksgiving game every single year?|Lions|Bears|Giants|Eagles|1|any|thanksgiving",
"What do you call it when the quarterback is tackled behind the line?|A sack|A safety|A fumble|A pick|1|any|rules",
"Which team plays at Arrowhead Stadium?|Chiefs|Broncos|Cardinals|Titans|1|any|teams",
"The Terrible Towel belongs to which fan base?|Steelers|Ravens|Bengals|Browns|1|any|towel",
"How many minutes are in an NFL quarter?|15|12|20|10|1|any|rules",
"Which conference do the Green Bay Packers play in?|NFC|AFC|Both|Neither|1|any|teams",
"Cheeseheads are fans of which team?|Packers|Vikings|Bears|Chiefs|1|any|cheesehead",
"Which position snaps the ball to start a play?|Center|Guard|Tackle|Fullback|1|any|rules",
"What color is the flag officials throw for a penalty?|Yellow|Red|Blue|White|1|any|rules",
"Which team has a horseshoe on its helmet?|Colts|Broncos|Texans|Rams|1|any|teams",
"Who has been the Chiefs head coach since 2013?|Andy Reid|Sean McVay|John Harbaugh|Mike Tomlin|1|10s|reid",
"Which city do the Bengals call home?|Cincinnati|Cleveland|Columbus|Louisville|1|any|teams",
"Which team won Super Bowl LVIII in February 2024?|Chiefs|49ers|Eagles|Bengals|1|20s|sbchamps",
"The Super Bowl is played in which month?|February|January|March|December|1|any|superbowl",
"How many points is an extra point kick worth?|1|2|3|None of them|1|any|rules",
"Which team plays its home games in Foxborough, Massachusetts?|Patriots|Bills|Jets|Giants|1|any|teams",
"Which bird is the Philadelphia team named after?|The eagle|The falcon|The raven|The cardinal|1|any|teams",
"What is the line of scrimmage?|Where the ball is spotted|The goal line|The sideline|The 50-yard line|1|any|rules",
"Which team won Super Bowl LX in February 2026?|Seahawks|Patriots|Chiefs|Eagles|1|20s|sblx",
"Who holds the single-season record for passing yards?|Peyton Manning|Tom Brady|Drew Brees|Patrick Mahomes|2|10s|qbrec",
"Who holds the single-season record for passing touchdowns?|Peyton Manning|Tom Brady|Dan Marino|Aaron Rodgers|2|10s|qbrec",
"Who is the NFL's all-time leading rusher?|Emmitt Smith|Walter Payton|Barry Sanders|Frank Gore|2|any|records",
"Who holds the single-season rushing record with 2,105 yards?|Eric Dickerson|Adrian Peterson|O.J. Simpson|Jamal Lewis|2|80s|records",
"Which team finished the 2007 regular season 16-0?|Patriots|Colts|Packers|Steelers|2|00s|perfect",
"Which is the only team to go undefeated and win the Super Bowl?|The 1972 Dolphins|The 1985 Bears|The 2007 Patriots|The 1962 Packers|2|70s|perfect",
"Who made the Helmet Catch in Super Bowl XLII?|David Tyree|Mario Manningham|Plaxico Burress|Amani Toomer|2|00s|helmet",
"Who caught the Philly Special touchdown in Super Bowl LII?|Nick Foles|Zach Ertz|Trey Burton|Alshon Jeffery|2|10s|philly",
"Who is the NFL's all-time leading scorer?|Adam Vinatieri|Morten Andersen|Gary Anderson|Justin Tucker|2|any|records",
"Who holds the career record for receiving yards?|Jerry Rice|Terrell Owens|Randy Moss|Larry Fitzgerald|2|any|records",
"Who is the official career sacks leader?|Bruce Smith|Reggie White|Kevin Greene|Deacon Jones|2|any|sacks",
"Which team came back from 28-3 down to win Super Bowl LI?|Patriots|Falcons|Seahawks|Broncos|2|10s|sbchamps",
"Who has the most career passing yards?|Tom Brady|Drew Brees|Peyton Manning|Brett Favre|2|any|qbrec",
"Who threw the most career interceptions?|Brett Favre|George Blanda|Vinny Testaverde|Drew Bledsoe|2|any|qbrec",
"Which team drafted Aaron Rodgers in 2005?|Packers|49ers|Bears|Chargers|2|00s|rodgers05",
"Who went first overall in the 2024 NFL Draft?|Caleb Williams|Jayden Daniels|Drake Maye|Marvin Harrison Jr.|2|20s|firstpick",
"Who went first overall in the 2023 NFL Draft?|Bryce Young|C.J. Stroud|Anthony Richardson|Will Levis|2|20s|firstpick",
"Which franchise moved to Las Vegas in 2020?|Raiders|Chargers|Rams|Cardinals|2|20s|raiders",
"Which two teams played the 1967 Ice Bowl?|Packers and Cowboys|Bears and Vikings|Browns and Colts|Lions and Giants|2|70s|icebowl",
"Who is the only Super Bowl MVP from the losing team?|Chuck Howley|Jake Scott|Harvey Martin|Ray Lewis|2|70s|sbmvp",
"Who has the most career rushing touchdowns?|Emmitt Smith|LaDainian Tomlinson|Marcus Allen|Walter Payton|2|any|records",
"Which kicker made a 64-yard field goal for Denver in 2013?|Matt Prater|Justin Tucker|Sebastian Janikowski|Greg Zuerlein|2|10s|prater",
"Which franchise has the most NFL championships all time?|Packers|Bears|Giants|Steelers|2|any|packerstitles",
"Who threw the pass on the Immaculate Reception?|Terry Bradshaw|Franco Harris|Joe Greene|Rocky Bleier|2|70s|immaculate",
"Which running back was nicknamed Sweetness?|Walter Payton|Barry Sanders|Gale Sayers|Earl Campbell|2|any|payton",
"Which Bears lineman was called The Refrigerator?|William Perry|Dan Hampton|Steve McMichael|Richard Dent|2|80s|perry",
"In what year was the first Super Bowl played?|1967|1970|1963|1972|2|70s|sb1",
"Which team won the first Super Bowl?|Packers|Chiefs|Colts|Jets|2|70s|sb1",
"Who has the most career receiving touchdowns?|Jerry Rice|Randy Moss|Terrell Owens|Cris Carter|2|any|records",
"Which head coach has the most career wins?|Don Shula|George Halas|Bill Belichick|Tom Landry|2|any|coachwins",
"Which team did Tom Brady win his seventh ring with?|Buccaneers|Patriots|Falcons|Chiefs|2|20s|sbchamps",
"Who was the last defensive player to win NFL MVP?|Lawrence Taylor|J.J. Watt|Ray Lewis|Alan Page|2|80s|mvp",
"Which quarterback threw seven touchdowns against the Raiders in 2013?|Nick Foles|Peyton Manning|Drew Brees|Tom Brady|2|10s|qbrec",
"The Tuck Rule game was the Patriots against which team?|Raiders|Steelers|Rams|Titans|2|00s|tuck",
"Which fan section is known as the Black Hole?|The Raiders'|The Ravens'|The Jets'|The Bears'|2|any|blackhole",
"The Music City Miracle knocked out which team?|Bills|Colts|Jaguars|Dolphins|2|90s|mcm",
"Which team took Cam Ward first overall in the 2025 draft?|Titans|Browns|Giants|Raiders|2|20s|firstpick",
"Which team had the first overall pick in the 2026 draft?|Raiders|Titans|Browns|Jets|2|20s|firstpick",
"Who holds the single-game rushing record with 296 yards?|Adrian Peterson|Jamal Lewis|Corey Dillon|Walter Payton|3|00s|records",
"Who caught the Immaculate Reception?|Franco Harris|John Fuqua|Lynn Swann|Rocky Bleier|3|70s|immaculate",
"Which player caught a pass in 274 straight games?|Jerry Rice|Tony Gonzalez|Larry Fitzgerald|Marvin Harrison|3|any|records",
"Tom Brady was drafted with which overall pick in 2000?|199th|99th|155th|233rd|3|00s|brady199",
"Who holds the single-game passing yards record with 554?|Norm Van Brocklin|Warren Moon|Ben Roethlisberger|Matt Schaub|3|any|qbrec",
"Who is the only kicker ever named NFL MVP?|Mark Moseley|Jan Stenerud|Garo Yepremian|Lou Groza|3|80s|mvp",
"Which team drafted Dan Marino in 1983?|Dolphins|Steelers|Jets|Bills|3|80s|draft83",
"How many quarterbacks went in the first round of the 1983 draft?|Six|Four|Three|Eight|3|80s|draft83",
"Who set the single-season receptions record with 149?|Michael Thomas|Marvin Harrison|Antonio Brown|Cooper Kupp|3|10s|records",
"Who has the most career interceptions by a defender?|Paul Krause|Emlen Tunnell|Rod Woodson|Dick Lane|3|any|intlead",
"Which team blew a 35-3 lead in a 1993 playoff game?|Oilers|Chargers|Broncos|Raiders|3|90s|comeback",
"Who played the most seasons in NFL history with 26?|George Blanda|Tom Brady|Morten Andersen|Adam Vinatieri|3|any|records",
"Who was the first Black quarterback to win a Super Bowl?|Doug Williams|Warren Moon|Randall Cunningham|Steve McNair|3|80s|sbmvp",
"Who has the most career fumbles?|Brett Favre|Warren Moon|Dave Krieg|Kerry Collins|3|any|qbrec",
"Whose 99-yard run in 1983 is the longest run from scrimmage ever?|Tony Dorsett|Ahman Green|Derrick Henry|Bo Jackson|3|80s|dorsett",
"Which of these franchises has never played in a Super Bowl?|Lions|Bengals|Panthers|Falcons|3|any|sbchamps",
"Who coordinated the 1985 Bears defense?|Buddy Ryan|Mike Ditka|Vince Tobin|Dave Wannstedt|3|80s|buddyryan",
"What is the fewest points a team has scored in a Super Bowl?|3|0|6|7|3|10s|sbchamps",
"Who passed Michael Vick for the most career rushing yards by a quarterback?|Lamar Jackson|Josh Allen|Russell Wilson|Cam Newton|3|20s|qbrec",
"Which quarterback won back-to-back MVPs in 2020 and 2021?|Aaron Rodgers|Patrick Mahomes|Tom Brady|Josh Allen|3|20s|mvp",
"Which coach is nicknamed The Big Tuna?|Bill Parcells|Bill Cowher|Marty Schottenheimer|Jimmy Johnson|3|any|tuna",
"Whose 109-yard return in 2007 tied the longest play in NFL history?|Antonio Cromartie|Devin Hester|Cordarrelle Patterson|Josh Cribbs|3|00s|cromartie",
"Which team won Super Bowl V, the first after the AFL-NFL merger?|Colts|Cowboys|Chiefs|Vikings|3|70s|sbchamps",
"Who was the first player to win three Super Bowl MVP awards?|Joe Montana|Terry Bradshaw|John Elway|Phil Simms|3|80s|montana",
"How many yards deep is an NFL end zone?|10|12|15|8|3|any|rules",
"Which team hosted the first Monday Night Football game in 1970?|Browns|Jets|Chiefs|Cowboys|3|70s|mnf",
"Which quarterback started 297 straight regular season games?|Brett Favre|Peyton Manning|Eli Manning|Philip Rivers|3|any|records",
"Ernie Nevers, Dub Jones, Gale Sayers and Alvin Kamara share which record?|Six touchdowns in a game|Five interceptions in a game|Four field goals in a quarter|Three safeties in a season|3|any|records",
"Who was the first overall pick of the 1998 NFL Draft?|Peyton Manning|Ryan Leaf|Charles Woodson|Randy Moss|3|90s|firstpick",
"Which stadium is nicknamed The Frozen Tundra?|Lambeau Field|Soldier Field|Highmark Stadium|Arrowhead Stadium|3|any|lambeau",
"Which team won Super Bowl I?|Packers|Colts|Dolphins|Cowboys|1|70s|sbchamps",
"Which team won Super Bowl II?|Packers|Raiders|Dolphins|Jets|1|70s|sbchamps",
"Which team won Super Bowl III?|Jets|Steelers|Packers|Dolphins|1|70s|sbchamps",
"Which team won Super Bowl IV?|Chiefs|Cowboys|Steelers|Dolphins|1|70s|sbchamps",
"Which team won Super Bowl V?|Colts|Cowboys|Packers|Dolphins|1|70s|sbchamps",
"Which team won Super Bowl VI?|Cowboys|Steelers|Raiders|Dolphins|1|70s|sbchamps",
"Which team won Super Bowl VII?|Dolphins|Packers|Steelers|Raiders|1|70s|sbchamps",
"Which team won Super Bowl VIII?|Dolphins|Cowboys|Packers|Steelers|1|70s|sbchamps",
"Which team won Super Bowl IX?|Steelers|49ers|Vikings|Raiders|1|70s|sbchamps",
"Which team won Super Bowl X?|Steelers|Colts|Raiders|Jets|1|70s|sbchamps",
"Which team won Super Bowl XI?|Raiders|49ers|Dolphins|Steelers|1|70s|sbchamps",
"Which team won Super Bowl XII?|Cowboys|Chiefs|Raiders|Steelers|1|70s|sbchamps",
"Which team won Super Bowl XIII?|Steelers|Giants|Chiefs|49ers|1|70s|sbchamps",
"Which team won Super Bowl XIV?|Steelers|Raiders|Cowboys|Rams|1|70s|sbchamps",
"Which team won Super Bowl XV?|Raiders|Cowboys|Dolphins|49ers|1|80s|sbchamps",
"Which team won Super Bowl XVI?|49ers|Dolphins|Giants|Cowboys|1|80s|sbchamps",
"Which team won Super Bowl XVII?|Washington|Steelers|49ers|Dolphins|1|80s|sbchamps",
"Which team won Super Bowl XVIII?|Raiders|49ers|Cowboys|Steelers|1|80s|sbchamps",
"Which team won Super Bowl XIX?|49ers|Bears|Raiders|Steelers|1|80s|sbchamps",
"Which team won Super Bowl XX?|Bears|Washington|Raiders|49ers|1|80s|sbchamps",
"Which team won Super Bowl XXI?|Giants|Washington|Cowboys|49ers|1|80s|sbchamps",
"Which team won Super Bowl XXII?|Washington|Raiders|Cowboys|Steelers|1|80s|sbchamps",
"Which team won Super Bowl XXIII?|49ers|Raiders|Washington|Bengals|1|80s|sbchamps",
"Which team won Super Bowl XXIV?|49ers|Washington|Bears|Broncos|1|80s|sbchamps",
"Which team won Super Bowl XXV?|Giants|49ers|Rams|Cowboys|1|90s|sbchamps",
"Which team won Super Bowl XXVI?|Washington|Cowboys|49ers|Giants|1|90s|sbchamps",
"Which team won Super Bowl XXVII?|Cowboys|Washington|Giants|Raiders|1|90s|sbchamps",
"Which team won Super Bowl XXVIII?|Cowboys|Rams|Bears|Giants|1|90s|sbchamps",
"Which team won Super Bowl XXIX?|49ers|Patriots|Chargers|Cowboys|1|90s|sbchamps",
"Which team won Super Bowl XXX?|Cowboys|Broncos|49ers|Giants|1|90s|sbchamps",
"Which team won Super Bowl XXXI?|Packers|Ravens|Patriots|Broncos|1|90s|sbchamps",
"Which team won Super Bowl XXXII?|Broncos|Buccaneers|Colts|49ers|1|90s|sbchamps",
"Which team won Super Bowl XXXIII?|Broncos|Rams|Patriots|Falcons|1|90s|sbchamps",
"Which team won Super Bowl XXXIV?|Rams|Giants|Patriots|Cowboys|1|90s|sbchamps",
"Which team won Super Bowl XXXV?|Ravens|Steelers|49ers|Giants|1|00s|sbchamps",
"Which team won Super Bowl XXXVI?|Patriots|Packers|Ravens|Rams|1|00s|sbchamps",
"Which team won Super Bowl XXXVII?|Buccaneers|Colts|Patriots|Packers|1|00s|sbchamps",
"Which team won Super Bowl XXXVIII?|Patriots|Giants|Broncos|Ravens|1|00s|sbchamps",
"Which team won Super Bowl XXXIX?|Patriots|Giants|Steelers|Ravens|1|00s|sbchamps",
"Which team won Super Bowl XL?|Steelers|Rams|Seahawks|Broncos|1|00s|sbchamps",
"Which team won Super Bowl XLI?|Colts|Broncos|Steelers|Patriots|1|00s|sbchamps",
"Which team won Super Bowl XLII?|Giants|Colts|Seahawks|Patriots|1|00s|sbchamps",
"Which team won Super Bowl XLIII?|Steelers|Ravens|Patriots|Saints|1|00s|sbchamps",
"Which team won Super Bowl XLIV?|Saints|Steelers|Seahawks|Ravens|1|00s|sbchamps",
"Which team won Super Bowl XLV?|Packers|Patriots|Buccaneers|Steelers|1|10s|sbchamps",
"Which team won Super Bowl XLVI?|Giants|Packers|Patriots|Steelers|1|10s|sbchamps",
"Which team won Super Bowl XLVII?|Ravens|Rams|Giants|Broncos|1|10s|sbchamps",
"Which team won Super Bowl XLVIII?|Seahawks|Broncos|Chiefs|Saints|1|10s|sbchamps",
"Which team won Super Bowl XLIX?|Patriots|Seahawks|Eagles|Chiefs|1|10s|sbchamps",
"Which team won Super Bowl 50?|Broncos|Giants|Steelers|Ravens|1|10s|sbchamps",
"Which team won Super Bowl LI?|Patriots|Seahawks|Falcons|Rams|1|10s|sbchamps",
"Which team won Super Bowl LII?|Eagles|Steelers|Buccaneers|Chiefs|1|10s|sbchamps",
"Which team won Super Bowl LIII?|Patriots|Rams|Chiefs|Saints|1|10s|sbchamps",
"Which team won Super Bowl LIV?|Chiefs|Broncos|49ers|Ravens|1|10s|sbchamps",
"Which team won Super Bowl LV?|Buccaneers|Rams|Seahawks|Chiefs|1|20s|sbchamps",
"Which team won Super Bowl LVI?|Rams|Chiefs|Eagles|Seahawks|1|20s|sbchamps",
"Which team won Super Bowl LVII?|Chiefs|Broncos|Seahawks|Patriots|1|20s|sbchamps",
"Which team won Super Bowl LVIII?|Chiefs|Patriots|Seahawks|Eagles|1|20s|sbchamps",
"Which team won Super Bowl LIX?|Eagles|Chiefs|Rams|Broncos|1|20s|sbchamps",
"Which team won Super Bowl LX?|Seahawks|Patriots|Chiefs|Eagles|1|20s|sbchamps",
"Who did the Packers beat in Super Bowl I?|Chiefs|Vikings|Washington|Cowboys|2|70s|sbchamps",
"Who did the Jets beat in Super Bowl III?|Colts|Vikings|Raiders|Washington|2|70s|sbchamps",
"Who did the Colts beat in Super Bowl V?|Cowboys|Broncos|Vikings|Raiders|2|70s|sbchamps",
"Who did the Dolphins beat in Super Bowl VII?|Washington|Vikings|Chiefs|Rams|2|70s|sbchamps",
"Who did the Steelers beat in Super Bowl IX?|Vikings|Colts|Rams|Eagles|2|70s|sbchamps",
"Who did the Raiders beat in Super Bowl XI?|Vikings|Eagles|Cowboys|Washington|2|70s|sbchamps",
"Who did the Steelers beat in Super Bowl XIII?|Cowboys|Washington|Broncos|Dolphins|2|70s|sbchamps",
"Who did the Raiders beat in Super Bowl XV?|Eagles|Dolphins|Vikings|Cowboys|2|80s|sbchamps",
"Who did the Washington beat in Super Bowl XVII?|Dolphins|Broncos|Vikings|Bengals|2|80s|sbchamps",
"Who did the 49ers beat in Super Bowl XIX?|Dolphins|Broncos|Bills|Bengals|2|80s|sbchamps",
"Who did the Giants beat in Super Bowl XXI?|Broncos|Bengals|Washington|Eagles|2|80s|sbchamps",
"Who did the 49ers beat in Super Bowl XXIII?|Bengals|Broncos|Eagles|Patriots|2|80s|sbchamps",
"Who did the Giants beat in Super Bowl XXV?|Bills|Broncos|Bengals|Falcons|2|90s|sbchamps",
"Who did the Cowboys beat in Super Bowl XXVII?|Bills|Giants|Dolphins|Steelers|2|90s|sbchamps",
"Who did the 49ers beat in Super Bowl XXIX?|Chargers|Rams|Broncos|Bills|2|90s|sbchamps",
"Who did the Packers beat in Super Bowl XXXI?|Patriots|Giants|Bills|Eagles|2|90s|sbchamps",
"Who did the Broncos beat in Super Bowl XXXIII?|Falcons|Titans|Patriots|Rams|2|90s|sbchamps",
"Who did the Ravens beat in Super Bowl XXXV?|Giants|Steelers|Eagles|Falcons|2|00s|sbchamps",
"Who did the Buccaneers beat in Super Bowl XXXVII?|Raiders|Chargers|Panthers|Bears|2|00s|sbchamps",
"Who did the Patriots beat in Super Bowl XXXIX?|Eagles|Panthers|Falcons|Raiders|2|00s|sbchamps",
"Who did the Colts beat in Super Bowl XLI?|Bears|Falcons|Eagles|Seahawks|2|00s|sbchamps",
"Who did the Steelers beat in Super Bowl XLIII?|Cardinals|49ers|Patriots|Falcons|2|00s|sbchamps",
"Who did the Packers beat in Super Bowl XLV?|Steelers|49ers|Falcons|Seahawks|2|10s|sbchamps",
"Who did the Ravens beat in Super Bowl XLVII?|49ers|Bears|Panthers|Steelers|2|10s|sbchamps",
"Who did the Patriots beat in Super Bowl XLIX?|Seahawks|Panthers|Broncos|Chiefs|2|10s|sbchamps",
"Who did the Patriots beat in Super Bowl LI?|Falcons|Rams|Chiefs|Eagles|2|10s|sbchamps",
"Who did the Patriots beat in Super Bowl LIII?|Rams|Chiefs|49ers|Falcons|2|10s|sbchamps",
"Who did the Buccaneers beat in Super Bowl LV?|Chiefs|49ers|Rams|Bengals|2|20s|sbchamps",
"Who did the Chiefs beat in Super Bowl LVII?|Eagles|Patriots|49ers|Broncos|2|20s|sbchamps",
"Who did the Eagles beat in Super Bowl LIX?|Chiefs|Patriots|Falcons|49ers|2|20s|sbchamps",
"Who was named MVP of Super Bowl I?|Bart Starr|Fred Biletnikoff|Roger Staubach|Franco Harris|2|70s|sbmvp",
"Who was named MVP of Super Bowl II?|Bart Starr|Joe Namath|Larry Csonka|Roger Staubach|2|70s|sbmvp",
"Who was named MVP of Super Bowl III?|Joe Namath|Larry Csonka|Len Dawson|Roger Staubach|2|70s|sbmvp",
"Who was named MVP of Super Bowl IV?|Len Dawson|Terry Bradshaw|Franco Harris|Lynn Swann|3|70s|sbmvp",
"Who was named MVP of Super Bowl V?|Chuck Howley|Joe Namath|Len Dawson|Terry Bradshaw|3|70s|sbmvp",
"Who was named MVP of Super Bowl VI?|Roger Staubach|Jake Scott|Joe Montana|Larry Csonka|2|70s|sbmvp",
"Who was named MVP of Super Bowl VII?|Jake Scott|Terry Bradshaw|Bart Starr|Chuck Howley|3|70s|sbmvp",
"Who was named MVP of Super Bowl VIII?|Larry Csonka|Lynn Swann|Jim Plunkett|Terry Bradshaw|2|70s|sbmvp",
"Who was named MVP of Super Bowl IX?|Franco Harris|Jim Plunkett|Marcus Allen|Len Dawson|2|70s|sbmvp",
"Who was named MVP of Super Bowl X?|Lynn Swann|Fred Biletnikoff|Jim Plunkett|Marcus Allen|2|70s|sbmvp",
"Who was named MVP of Super Bowl XI?|Fred Biletnikoff|Richard Dent|Bart Starr|Marcus Allen|3|70s|sbmvp",
"Who was named MVP of Super Bowl XIII?|Terry Bradshaw|Doug Williams|Phil Simms|Joe Montana|2|70s|sbmvp",
"Who was named MVP of Super Bowl XIV?|Terry Bradshaw|Len Dawson|Larry Csonka|Jake Scott|2|70s|sbmvp",
"Who was named MVP of Super Bowl XV?|Jim Plunkett|Ottis Anderson|Joe Montana|John Riggins|3|80s|sbmvp",
"Who was named MVP of Super Bowl XVI?|Joe Montana|Marcus Allen|Phil Simms|Fred Biletnikoff|2|80s|sbmvp",
"Who was named MVP of Super Bowl XVII?|John Riggins|Richard Dent|Troy Aikman|Jerry Rice|3|80s|sbmvp",
"Who was named MVP of Super Bowl XVIII?|Marcus Allen|Emmitt Smith|Franco Harris|Terry Bradshaw|2|80s|sbmvp",
"Who was named MVP of Super Bowl XIX?|Joe Montana|Doug Williams|Fred Biletnikoff|Jim Plunkett|2|80s|sbmvp",
"Who was named MVP of Super Bowl XX?|Richard Dent|Jerry Rice|Joe Montana|Lynn Swann|3|80s|sbmvp",
"Who was named MVP of Super Bowl XXI?|Phil Simms|Jerry Rice|Ottis Anderson|Fred Biletnikoff|3|80s|sbmvp",
"Who was named MVP of Super Bowl XXII?|Doug Williams|Joe Montana|Mark Rypien|Troy Aikman|3|80s|sbmvp",
"Who was named MVP of Super Bowl XXIII?|Jerry Rice|Jim Plunkett|Ottis Anderson|Larry Brown|2|80s|sbmvp",
"Who was named MVP of Super Bowl XXIV?|Joe Montana|Marcus Allen|John Riggins|Jim Plunkett|2|80s|sbmvp",
"Who was named MVP of Super Bowl XXV?|Ottis Anderson|John Riggins|Desmond Howard|Doug Williams|3|90s|sbmvp",
"Who was named MVP of Super Bowl XXVI?|Mark Rypien|Emmitt Smith|Ottis Anderson|Larry Brown|3|90s|sbmvp",
"Who was named MVP of Super Bowl XXVII?|Troy Aikman|John Elway|Larry Brown|Kurt Warner|2|90s|sbmvp",
"Who was named MVP of Super Bowl XXVIII?|Emmitt Smith|Mark Rypien|Phil Simms|Dexter Jackson|2|90s|sbmvp",
"Who was named MVP of Super Bowl XXIX?|Steve Young|John Elway|Deion Branch|Dexter Jackson|2|90s|sbmvp",
"Who was named MVP of Super Bowl XXX?|Larry Brown|Desmond Howard|Kurt Warner|Troy Aikman|3|90s|sbmvp",
"Who was named MVP of Super Bowl XXXI?|Desmond Howard|Peyton Manning|Larry Brown|Dexter Jackson|3|90s|sbmvp",
"Who was named MVP of Super Bowl XXXII?|Terrell Davis|Larry Brown|Peyton Manning|Emmitt Smith|3|90s|sbmvp",
"Who was named MVP of Super Bowl XXXIII?|John Elway|Emmitt Smith|Eli Manning|Steve Young|2|90s|sbmvp",
"Who was named MVP of Super Bowl XXXIV?|Kurt Warner|Peyton Manning|Tom Brady|Dexter Jackson|2|90s|sbmvp",
"Who was named MVP of Super Bowl XXXV?|Ray Lewis|John Elway|Emmitt Smith|Steve Young|2|00s|sbmvp",
"Who was named MVP of Super Bowl XXXVI?|Tom Brady|Larry Brown|Desmond Howard|Deion Branch|2|00s|sbmvp",
"Who was named MVP of Super Bowl XXXVII?|Dexter Jackson|Hines Ward|Emmitt Smith|Ray Lewis|3|00s|sbmvp",
"Who was named MVP of Super Bowl XXXVIII?|Tom Brady|Desmond Howard|Aaron Rodgers|Joe Flacco|2|00s|sbmvp",
"Who was named MVP of Super Bowl XXXIX?|Deion Branch|Kurt Warner|Malcolm Smith|Terrell Davis|3|00s|sbmvp",
"Who was named MVP of Super Bowl XL?|Hines Ward|Aaron Rodgers|Kurt Warner|Peyton Manning|3|00s|sbmvp",
"Who was named MVP of Super Bowl XLI?|Peyton Manning|John Elway|Drew Brees|Ray Lewis|2|00s|sbmvp",
"Who was named MVP of Super Bowl XLII?|Eli Manning|Tom Brady|Aaron Rodgers|Drew Brees|2|00s|sbmvp",
"Who was named MVP of Super Bowl XLIII?|Santonio Holmes|Deion Branch|Ray Lewis|Kurt Warner|3|00s|sbmvp",
"Who was named MVP of Super Bowl XLIV?|Drew Brees|Santonio Holmes|Tom Brady|Deion Branch|2|00s|sbmvp",
"Who was named MVP of Super Bowl XLV?|Aaron Rodgers|Santonio Holmes|Tom Brady|Eli Manning|2|10s|sbmvp",
"Who was named MVP of Super Bowl XLVI?|Eli Manning|Von Miller|Aaron Rodgers|Joe Flacco|2|10s|sbmvp",
"Who was named MVP of Super Bowl XLVII?|Joe Flacco|Von Miller|Eli Manning|Patrick Mahomes|3|10s|sbmvp",
"Who was named MVP of Super Bowl XLVIII?|Malcolm Smith|Cooper Kupp|Von Miller|Patrick Mahomes|3|10s|sbmvp",
"Who was named MVP of Super Bowl XLIX?|Tom Brady|Julian Edelman|Cooper Kupp|Malcolm Smith|2|10s|sbmvp",
"Who was named MVP of Super Bowl 50?|Von Miller|Aaron Rodgers|Eli Manning|Tom Brady|2|10s|sbmvp",
"Who was named MVP of Super Bowl LI?|Tom Brady|Peyton Manning|Nick Foles|Joe Flacco|2|10s|sbmvp",
"Who was named MVP of Super Bowl LII?|Nick Foles|Cooper Kupp|Kenneth Walker III|Drew Brees|2|10s|sbmvp",
"Who was named MVP of Super Bowl LIII?|Julian Edelman|Eli Manning|Santonio Holmes|Kenneth Walker III|3|10s|sbmvp",
"Who was named MVP of Super Bowl LIV?|Patrick Mahomes|Joe Flacco|Kenneth Walker III|Julian Edelman|2|10s|sbmvp",
"Who was named MVP of Super Bowl LV?|Tom Brady|Joe Flacco|Eli Manning|Cooper Kupp|2|20s|sbmvp",
"Who was named MVP of Super Bowl LVI?|Cooper Kupp|Kenneth Walker III|Patrick Mahomes|Tom Brady|2|20s|sbmvp",
"Who was named MVP of Super Bowl LVII?|Patrick Mahomes|Tom Brady|Jalen Hurts|Von Miller|2|20s|sbmvp",
"Who was named MVP of Super Bowl LVIII?|Patrick Mahomes|Von Miller|Tom Brady|Kenneth Walker III|2|20s|sbmvp",
"Who was named MVP of Super Bowl LIX?|Jalen Hurts|Patrick Mahomes|Von Miller|Julian Edelman|2|20s|sbmvp",
"Who was named MVP of Super Bowl LX?|Kenneth Walker III|Tom Brady|Julian Edelman|Patrick Mahomes|3|20s|sbmvp",
"Who was named NFL MVP for the 1970 season?|John Brodie|Fran Tarkenton|Larry Brown|Walter Payton|3|70s|mvp",
"Who was named NFL MVP for the 1971 season?|Alan Page|Earl Campbell|Larry Brown|Walter Payton|3|70s|mvp",
"Who was named NFL MVP for the 1972 season?|Larry Brown|Terry Bradshaw|Fran Tarkenton|O.J. Simpson|3|70s|mvp",
"Who was named NFL MVP for the 1973 season?|O.J. Simpson|John Brodie|Earl Campbell|Ken Stabler|2|70s|mvp",
"Who was named NFL MVP for the 1974 season?|Ken Stabler|Larry Brown|Walter Payton|Terry Bradshaw|3|70s|mvp",
"Who was named NFL MVP for the 1975 season?|Fran Tarkenton|Mark Moseley|Brian Sipe|Alan Page|2|70s|mvp",
"Who was named NFL MVP for the 1976 season?|Bert Jones|Larry Brown|Brian Sipe|Alan Page|3|70s|mvp",
"Who was named NFL MVP for the 1977 season?|Walter Payton|Alan Page|John Brodie|Mark Moseley|2|70s|mvp",
"Who was named NFL MVP for the 1978 season?|Terry Bradshaw|Alan Page|Dan Marino|Brian Sipe|2|70s|mvp",
"Who was named NFL MVP for the 1979 season?|Earl Campbell|Lawrence Taylor|Ken Stabler|Fran Tarkenton|2|70s|mvp",
"Who was named NFL MVP for the 1980 season?|Brian Sipe|Joe Theismann|Dan Marino|Ken Stabler|3|80s|mvp",
"Who was named NFL MVP for the 1981 season?|Ken Anderson|Joe Theismann|Bert Jones|Dan Marino|3|80s|mvp",
"Who was named NFL MVP for the 1982 season?|Mark Moseley|Ken Anderson|Boomer Esiason|Marcus Allen|3|80s|mvp",
"Who was named NFL MVP for the 1983 season?|Joe Theismann|Terry Bradshaw|Joe Montana|Mark Moseley|3|80s|mvp",
"Who was named NFL MVP for the 1984 season?|Dan Marino|Joe Montana|Lawrence Taylor|John Elway|2|80s|mvp",
"Who was named NFL MVP for the 1985 season?|Marcus Allen|Mark Moseley|Emmitt Smith|Joe Montana|2|80s|mvp",
"Who was named NFL MVP for the 1986 season?|Lawrence Taylor|Mark Moseley|Boomer Esiason|Dan Marino|2|80s|mvp",
"Who was named NFL MVP for the 1987 season?|John Elway|Thurman Thomas|Joe Montana|Boomer Esiason|2|80s|mvp",
"Who was named NFL MVP for the 1988 season?|Boomer Esiason|Dan Marino|Brian Sipe|Lawrence Taylor|3|80s|mvp",
"Who was named NFL MVP for the 1989 season?|Joe Montana|Emmitt Smith|Dan Marino|Mark Moseley|2|80s|mvp",
"Who was named NFL MVP for the 1990 season?|Joe Montana|Joe Theismann|Mark Moseley|Brett Favre|2|90s|mvp",
"Who was named NFL MVP for the 1991 season?|Thurman Thomas|Joe Theismann|Boomer Esiason|Joe Montana|3|90s|mvp",
"Who was named NFL MVP for the 1992 season?|Steve Young|Boomer Esiason|Terrell Davis|Emmitt Smith|2|90s|mvp",
"Who was named NFL MVP for the 1993 season?|Emmitt Smith|Joe Montana|Thurman Thomas|Lawrence Taylor|2|90s|mvp",
"Who was named NFL MVP for the 1994 season?|Steve Young|Boomer Esiason|John Elway|Rich Gannon|2|90s|mvp",
"Who was named NFL MVP for the 1995 season?|Brett Favre|Boomer Esiason|Rich Gannon|Kurt Warner|2|90s|mvp",
"Who was named NFL MVP for the 1996 season?|Brett Favre|Boomer Esiason|Joe Montana|Steve Young|2|90s|mvp",
"Who was named NFL MVP for the 1998 season?|Terrell Davis|Steve Young|Brett Favre|Emmitt Smith|3|90s|mvp",
"Who was named NFL MVP for the 1999 season?|Kurt Warner|Brett Favre|Rich Gannon|Steve Young|2|90s|mvp",
"Who was named NFL MVP for the 2000 season?|Marshall Faulk|Emmitt Smith|Kurt Warner|Brett Favre|3|00s|mvp",
"Who was named NFL MVP for the 2001 season?|Kurt Warner|Shaun Alexander|Brett Favre|Emmitt Smith|2|00s|mvp",
"Who was named NFL MVP for the 2002 season?|Rich Gannon|Terrell Davis|Peyton Manning|Brett Favre|3|00s|mvp",
"Who was named NFL MVP for the 2004 season?|Peyton Manning|Kurt Warner|Tom Brady|Adrian Peterson|2|00s|mvp",
"Who was named NFL MVP for the 2005 season?|Shaun Alexander|Terrell Davis|Peyton Manning|Marshall Faulk|3|00s|mvp",
"Who was named NFL MVP for the 2006 season?|LaDainian Tomlinson|Peyton Manning|Shaun Alexander|Adrian Peterson|3|00s|mvp",
"Who was named NFL MVP for the 2007 season?|Tom Brady|Aaron Rodgers|Shaun Alexander|Kurt Warner|2|00s|mvp",
"Who was named NFL MVP for the 2008 season?|Peyton Manning|Tom Brady|Cam Newton|Marshall Faulk|2|00s|mvp",
"Who was named NFL MVP for the 2009 season?|Peyton Manning|Tom Brady|Shaun Alexander|Kurt Warner|2|00s|mvp",
"Who was named NFL MVP for the 2010 season?|Tom Brady|Peyton Manning|Adrian Peterson|Patrick Mahomes|2|10s|mvp",
"Who was named NFL MVP for the 2011 season?|Aaron Rodgers|Lamar Jackson|Peyton Manning|LaDainian Tomlinson|2|10s|mvp",
"Who was named NFL MVP for the 2012 season?|Adrian Peterson|Peyton Manning|Tom Brady|Lamar Jackson|2|10s|mvp",
"Who was named NFL MVP for the 2013 season?|Peyton Manning|LaDainian Tomlinson|Tom Brady|Aaron Rodgers|2|10s|mvp",
"Who was named NFL MVP for the 2014 season?|Aaron Rodgers|Matt Ryan|Adrian Peterson|Cam Newton|2|10s|mvp",
"Who was named NFL MVP for the 2015 season?|Cam Newton|Matt Ryan|Lamar Jackson|Aaron Rodgers|2|10s|mvp",
"Who was named NFL MVP for the 2016 season?|Matt Ryan|Aaron Rodgers|Josh Allen|Adrian Peterson|3|10s|mvp",
"Who was named NFL MVP for the 2017 season?|Tom Brady|Aaron Rodgers|Matt Ryan|Josh Allen|2|10s|mvp",
"Who was named NFL MVP for the 2018 season?|Patrick Mahomes|Aaron Rodgers|Josh Allen|Lamar Jackson|2|10s|mvp",
"Who was named NFL MVP for the 2019 season?|Lamar Jackson|Josh Allen|Peyton Manning|Aaron Rodgers|2|10s|mvp",
"Who was named NFL MVP for the 2020 season?|Aaron Rodgers|Lamar Jackson|Cam Newton|Tom Brady|2|20s|mvp",
"Who was named NFL MVP for the 2021 season?|Aaron Rodgers|Josh Allen|Matt Ryan|Tom Brady|2|20s|mvp",
"Who was named NFL MVP for the 2022 season?|Patrick Mahomes|Aaron Rodgers|Matthew Stafford|Tom Brady|2|20s|mvp",
"Who was named NFL MVP for the 2023 season?|Lamar Jackson|Tom Brady|Patrick Mahomes|Aaron Rodgers|2|20s|mvp",
"Who was named NFL MVP for the 2024 season?|Josh Allen|Matthew Stafford|Aaron Rodgers|Matt Ryan|2|20s|mvp",
"Who was named NFL MVP for the 2025 season?|Matthew Stafford|Josh Allen|Tom Brady|Aaron Rodgers|2|20s|mvp",
"Who went first overall in the 1980 NFL Draft?|Billy Sims|Kenneth Sims|George Rogers|Bruce Smith|3|80s|firstpick",
"Who went first overall in the 1981 NFL Draft?|George Rogers|Irving Fryar|John Elway|Billy Sims|3|80s|firstpick",
"Who went first overall in the 1982 NFL Draft?|Kenneth Sims|Billy Sims|George Rogers|Irving Fryar|3|80s|firstpick",
"Who went first overall in the 1983 NFL Draft?|John Elway|Irving Fryar|Bruce Smith|Vinny Testaverde|2|80s|firstpick",
"Who went first overall in the 1984 NFL Draft?|Irving Fryar|Vinny Testaverde|Billy Sims|George Rogers|3|80s|firstpick",
"Who went first overall in the 1985 NFL Draft?|Bruce Smith|Russell Maryland|Aundray Bruce|Irving Fryar|2|80s|firstpick",
"Who went first overall in the 1986 NFL Draft?|Bo Jackson|Steve Emtman|Irving Fryar|Aundray Bruce|2|80s|firstpick",
"Who went first overall in the 1987 NFL Draft?|Vinny Testaverde|Aundray Bruce|John Elway|Russell Maryland|3|80s|firstpick",
"Who went first overall in the 1988 NFL Draft?|Aundray Bruce|Jeff George|Steve Emtman|Dan Wilkinson|3|80s|firstpick",
"Who went first overall in the 1989 NFL Draft?|Troy Aikman|Aundray Bruce|Drew Bledsoe|Steve Emtman|2|80s|firstpick",
"Who went first overall in the 1990 NFL Draft?|Jeff George|Bruce Smith|Bo Jackson|Steve Emtman|3|90s|firstpick",
"Who went first overall in the 1991 NFL Draft?|Russell Maryland|Drew Bledsoe|Dan Wilkinson|Bo Jackson|3|90s|firstpick",
"Who went first overall in the 1992 NFL Draft?|Steve Emtman|Keyshawn Johnson|Bo Jackson|Peyton Manning|3|90s|firstpick",
"Who went first overall in the 1993 NFL Draft?|Drew Bledsoe|Russell Maryland|Aundray Bruce|Vinny Testaverde|3|90s|firstpick",
"Who went first overall in the 1994 NFL Draft?|Dan Wilkinson|Steve Emtman|Aundray Bruce|Jeff George|3|90s|firstpick",
"Who went first overall in the 1995 NFL Draft?|Ki-Jana Carter|Peyton Manning|Tim Couch|Courtney Brown|3|90s|firstpick",
"Who went first overall in the 1996 NFL Draft?|Keyshawn Johnson|Jeff George|Dan Wilkinson|Michael Vick|3|90s|firstpick",
"Who went first overall in the 1997 NFL Draft?|Orlando Pace|Peyton Manning|Tim Couch|Michael Vick|3|90s|firstpick",
"Who went first overall in the 1998 NFL Draft?|Peyton Manning|Drew Bledsoe|Michael Vick|Orlando Pace|2|90s|firstpick",
"Who went first overall in the 1999 NFL Draft?|Tim Couch|David Carr|Alex Smith|Michael Vick|3|90s|firstpick",
"Who went first overall in the 2000 NFL Draft?|Courtney Brown|David Carr|Ki-Jana Carter|Alex Smith|3|00s|firstpick",
"Who went first overall in the 2001 NFL Draft?|Michael Vick|David Carr|Tim Couch|Alex Smith|2|00s|firstpick",
"Who went first overall in the 2002 NFL Draft?|David Carr|Tim Couch|Carson Palmer|Eli Manning|3|00s|firstpick",
"Who went first overall in the 2003 NFL Draft?|Carson Palmer|Eli Manning|Mario Williams|Matthew Stafford|3|00s|firstpick",
"Who went first overall in the 2004 NFL Draft?|Eli Manning|Sam Bradford|David Carr|Mario Williams|2|00s|firstpick",
"Who went first overall in the 2005 NFL Draft?|Alex Smith|Mario Williams|Michael Vick|Eli Manning|3|00s|firstpick",
"Who went first overall in the 2006 NFL Draft?|Mario Williams|Carson Palmer|JaMarcus Russell|David Carr|3|00s|firstpick",
"Who went first overall in the 2007 NFL Draft?|JaMarcus Russell|Carson Palmer|Matthew Stafford|Eric Fisher|3|00s|firstpick",
"Who went first overall in the 2008 NFL Draft?|Jake Long|Jadeveon Clowney|Eli Manning|Sam Bradford|3|00s|firstpick",
"Who went first overall in the 2009 NFL Draft?|Matthew Stafford|JaMarcus Russell|Jameis Winston|Eli Manning|2|00s|firstpick",
"Who went first overall in the 2010 NFL Draft?|Sam Bradford|Mario Williams|Alex Smith|Jameis Winston|3|10s|firstpick",
"Who went first overall in the 2011 NFL Draft?|Cam Newton|Matthew Stafford|Mario Williams|Jake Long|2|10s|firstpick",
"Who went first overall in the 2012 NFL Draft?|Andrew Luck|Sam Bradford|Jadeveon Clowney|Jared Goff|2|10s|firstpick",
"Who went first overall in the 2013 NFL Draft?|Eric Fisher|JaMarcus Russell|Kyler Murray|Jameis Winston|3|10s|firstpick",
"Who went first overall in the 2014 NFL Draft?|Jadeveon Clowney|Sam Bradford|Eric Fisher|Jared Goff|3|10s|firstpick",
"Who went first overall in the 2015 NFL Draft?|Jameis Winston|Matthew Stafford|Andrew Luck|Myles Garrett|3|10s|firstpick",
"Who went first overall in the 2016 NFL Draft?|Jared Goff|Kyler Murray|Baker Mayfield|Andrew Luck|3|10s|firstpick",
"Who went first overall in the 2017 NFL Draft?|Myles Garrett|Travon Walker|Joe Burrow|Kyler Murray|2|10s|firstpick",
"Who went first overall in the 2018 NFL Draft?|Baker Mayfield|Bryce Young|Myles Garrett|Eric Fisher|3|10s|firstpick",
"Who went first overall in the 2019 NFL Draft?|Kyler Murray|Bryce Young|Baker Mayfield|Joe Burrow|3|10s|firstpick",
"Who went first overall in the 2020 NFL Draft?|Joe Burrow|Caleb Williams|Jameis Winston|Baker Mayfield|2|20s|firstpick",
"Who went first overall in the 2021 NFL Draft?|Trevor Lawrence|Baker Mayfield|Bryce Young|Joe Burrow|2|20s|firstpick",
"Who went first overall in the 2022 NFL Draft?|Travon Walker|Caleb Williams|Jared Goff|Joe Burrow|3|20s|firstpick",
"Who went first overall in the 2023 NFL Draft?|Bryce Young|Joe Burrow|Baker Mayfield|Cam Ward|3|20s|firstpick",
"Who went first overall in the 2024 NFL Draft?|Caleb Williams|Kyler Murray|Cam Ward|Baker Mayfield|2|20s|firstpick",
"Who went first overall in the 2025 NFL Draft?|Cam Ward|Caleb Williams|Bryce Young|Travon Walker|3|20s|firstpick",
"Who went first overall in the 2026 NFL Draft?|Fernando Mendoza|Cam Ward|Joe Burrow|Bryce Young|3|20s|firstpick",
"Which team took Billy Sims first overall?|Lions|Falcons|Buccaneers|Patriots|3|80s|firstpick",
"Which team took Kenneth Sims first overall?|Patriots|Colts|Falcons|Buccaneers|3|80s|firstpick",
"Which team took Irving Fryar first overall?|Patriots|Colts|Cowboys|Buccaneers|3|80s|firstpick",
"Which team took Bo Jackson first overall?|Buccaneers|Falcons|Colts|Patriots|3|80s|firstpick",
"Which team took Aundray Bruce first overall?|Falcons|Buccaneers|Colts|Cowboys|3|80s|firstpick",
"Which team took Jeff George first overall?|Colts|Bills|Patriots|Buccaneers|3|90s|firstpick",
"Which team took Steve Emtman first overall?|Colts|Bengals|Jets|Patriots|3|90s|firstpick",
"Which team took Dan Wilkinson first overall?|Bengals|Jets|Cowboys|Falcons|3|90s|firstpick",
"Which team took Keyshawn Johnson first overall?|Jets|Cowboys|Browns|Bengals|3|90s|firstpick",
"Which team took Peyton Manning first overall?|Colts|Bengals|Patriots|Browns|3|90s|firstpick",
"Which team took Courtney Brown first overall?|Browns|Texans|Bengals|Colts|3|00s|firstpick",
"Which team took David Carr first overall?|Texans|Rams|Chargers|Colts|3|00s|firstpick",
"Which team took Eli Manning first overall?|Chargers|Browns|Falcons|Jets|3|00s|firstpick",
"Which team took Mario Williams first overall?|Texans|49ers|Browns|Raiders|3|00s|firstpick",
"Which team took Jake Long first overall?|Dolphins|Lions|Chiefs|Chargers|3|00s|firstpick",
"Which team took Sam Bradford first overall?|Rams|49ers|Buccaneers|Texans|3|10s|firstpick",
"Which team took Andrew Luck first overall?|Colts|Browns|Raiders|Buccaneers|3|10s|firstpick",
"Which team took Jadeveon Clowney first overall?|Texans|Panthers|Dolphins|Rams|3|10s|firstpick",
"Which team took Jared Goff first overall?|Rams|Cardinals|Panthers|Browns|3|10s|firstpick",
"Which team took Baker Mayfield first overall?|Browns|Panthers|Raiders|Rams|3|10s|firstpick",
"Which team took Joe Burrow first overall?|Bengals|Cardinals|Colts|Chiefs|3|20s|firstpick",
"Which team took Travon Walker first overall?|Jaguars|Panthers|Bears|Texans|3|20s|firstpick",
"Which team took Caleb Williams first overall?|Bears|Bengals|Jaguars|Cardinals|3|20s|firstpick",
"Which team took Fernando Mendoza first overall?|Raiders|Panthers|Cardinals|Jaguars|3|20s|firstpick"
];

const ERAS = [
  ['any', 'Evergreen'], ['70s', 'The 70s'], ['80s', 'The 80s'],
  ['90s', 'The 90s'], ['00s', 'The 2000s'], ['10s', 'The 2010s'], ['20s', 'The 2020s']
];
const DIFFS = [[1, 'Easy'], [2, 'Medium'], [3, 'Hard']];

/* ---------------------------------------------------------------
   What shape a question is, so the same shape doesn't come round twice in
   a row. A quarter of the bank is MVP questions, so a straight random draw
   puts two of them together often, and on air that reads as the game being
   out of ideas.

   `misc` is the catch-all and is deliberately never avoided — two unrelated
   questions in a row is just a quiz. Only the shapes that come in bulk are
   worth spacing out.
   --------------------------------------------------------------- */
function kindOf(text){
  const t = String(text);
  if(/\bMVPs?\b/i.test(t)) return 'mvp';
  if(/won Super Bowl/i.test(t)) return 'sbwin';
  if(/beat in Super Bowl/i.test(t)) return 'sbbeat';
  if(/first overall/i.test(t) || /took .+ first\b/i.test(t)) return 'draft';
  return 'misc';
}

function parseRow(row, i){
  const p = String(row).split('|').map(x => x.trim());
  if(p.length < 5 || !p[0] || !p[1]) return null;
  return {
    id:'b' + i, text:p[0], right:p[1], wrong:p.slice(2, 5).filter(Boolean),
    diff:+p[5] || 2, era:p[6] || 'any', src:p[7] || null, kind:kindOf(p[0])
  };
}
/* [label, url] for a question, or null if it came in without one */
function cite(q){
  if(!q || !q.src) return null;
  const s = SOURCES[q.src];
  return s ? { label:s[0], url:s[1] } : { label:String(q.src), url:null };
}

let POOL = [];
function rebuildPool(extra, opts){
  const o = opts || {};
  POOL = [];
  if(!o.customOnly) BANK.forEach((r, i) => { const q = parseRow(r, i); if(q) POOL.push(q); });
  (extra || []).forEach((q, i) => {
    if(!q || !q.text || !q.right) return;
    POOL.push({
      id:'x' + i, text:q.text, right:q.right, wrong:(q.wrong || []).filter(Boolean),
      diff:+q.diff || 2, era:q.era || 'any', src:q.src || null, custom:true, kind:kindOf(q.text)
    });
  });
  return POOL.length;
}
rebuildPool();

/* Rows pasted or typed into the editor use the same shape, with the tier
   number and a free-text citation on the end. */
function parseImport(text){
  const out = [], bad = [];
  String(text).split(/\r?\n/).forEach((line, i) => {
    const raw = line.trim();
    if(!raw || raw.startsWith('#')) return;
    const p = raw.split('|').map(x => x.trim());
    if(p.length < 3 || !p[0] || !p[1]){ bad.push(i + 1); return; }
    const diff = /^[123]$/.test(p[5] || '') ? +p[5] : 2;
    const era = ERAS.some(e => e[0] === (p[6] || '')) ? p[6] : 'any';
    out.push({ text:p[0], right:p[1], wrong:p.slice(2, 5).filter(Boolean), diff:diff, era:era, src:p[7] || null });
  });
  return { rows:out, bad:bad };
}

/* ---------------------------------------------------------------
   Roman numerals are a needless barrier on a game show: nobody should be
   working out what XXXVIII is while a clock runs. Every Super Bowl numeral
   gets the plain number after it wherever a question is served, so custom
   questions written in the editor get it too without anyone remembering.

   Super Bowl 50 was branded with the digits, not an L, and comes through
   untouched. "Super Bowl MVP" is left alone because P is not a numeral, so
   the whole-word match fails rather than turning MV into 1005.
   --------------------------------------------------------------- */
const ROMAN = { I:1, V:5, X:10, L:50, C:100, D:500, M:1000 };
function romanToInt(r){
  let n = 0;
  for(let i = 0; i < r.length; i++){
    const v = ROMAN[r[i]], next = ROMAN[r[i + 1]];
    n += (next && next > v) ? -v : v;
  }
  return n;
}
function sbNumbers(text){
  return String(text).replace(/\bSuper Bowl ([IVXLCDM]+)\b(\s*\()?/g, (all, num, paren) => {
    if(paren) return all;                      /* already spelled out */
    const n = romanToInt(num);
    if(!n || n > 200) return all;              /* not a Super Bowl number */
    return 'Super Bowl ' + num + ' (' + n + ')';
  });
}

function shuffle(a){
  const r = a.slice();
  for(let i = r.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function matches(q, eras){ return !eras || !eras.length || eras.indexOf(q.era) > -1; }

/* how many questions a given filter can still serve — the control page shows
   this live, because a filter that has quietly run dry is something you want
   to find out about before you are on camera, not during */
function count(opts, used){
  const o = opts || {}, seen = used || {};
  return POOL.filter(q => matches(q, o.eras) && (!o.diff || q.diff === o.diff) && !seen[q.id]).length;
}

function makeQ(list){
  const q = list[Math.floor(Math.random() * list.length)];
  const choices = shuffle([q.right].concat(q.wrong).slice(0, 4));
  return {
    id:q.id, diff:q.diff, era:q.era, kind:q.kind, text:sbNumbers(q.text),
    choices:choices.map(sbNumbers), correct:choices.indexOf(q.right), cite:cite(q)
  };
}

/* Serve a question. The era filter is the host's deliberate creative choice,
   so it is the last thing to give: difficulty widens first, then repeats are
   allowed, and only a completely empty era falls back to the whole pool.
   Nothing here may return null mid-show. */
/* Serve a question.

   Four things are in tension and they are not equally bad, so the order
   they get given up in matters:

     1. the era        — the host's deliberate creative choice, given up last
     2. never repeat   — a question already asked is the worst thing to serve
     3. the shape gap  — two MVP questions in a row reads as running out of
                         ideas, but it beats repeating one
     4. the difficulty — the cheapest thing to bend, given up first

   So: walk the difficulties looking for something fresh that isn't the
   shape just served; then allow that shape; and only once nothing fresh is
   left anywhere in the era do repeats come into it, in the same order.
   Nothing here may return null mid-show.
   --------------------------------------------------------------- */
function draw(opts, used){
  const o = opts || {}, seen = used || {};
  const eras = o.eras && o.eras.length ? o.eras : null;
  const d = +o.diff || 0;
  const order = d ? [d].concat([1, 2, 3].filter(x => x !== d).sort((a, b) => Math.abs(a - d) - Math.abs(b - d)))
                  : [2, 1, 3];
  /* `misc` is the catch-all, never a cluster, so it is never avoided */
  const avoid = o.avoidKind && o.avoidKind !== 'misc' ? o.avoidKind : null;

  const tiers = [];
  order.forEach(dd => tiers.push({ fresh:true, diff:dd }));
  tiers.push({ fresh:true, diff:0 });
  order.forEach(dd => tiers.push({ fresh:false, diff:dd }));
  tiers.push({ fresh:false, diff:0 });

  const take = (t, gap) => POOL.filter(q =>
    matches(q, eras) &&
    (!t.diff || q.diff === t.diff) &&
    (!t.fresh || !seen[q.id]) &&
    (!gap || q.kind !== gap));

  /* every fresh tier with the gap, then every fresh tier without it, then
     the same twice over for repeats */
  for(const phase of [{ fresh:true, gap:avoid }, { fresh:true, gap:null },
                      { fresh:false, gap:avoid }, { fresh:false, gap:null }]){
    for(const t of tiers){
      if(t.fresh !== phase.fresh) continue;
      const list = take(t, phase.gap);
      if(list.length) return makeQ(list);
    }
  }
  return POOL.length ? makeQ(POOL) : null;
}

/* In "Ladder" difficulty the field position picks the difficulty, so the
   defence stiffens as you get closer — Millionaire's money ladder wearing a
   helmet. Any explicit Easy/Medium/Hard setting overrides it. */
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
  RELAYS, BANK, SOURCES, ERAS, DIFFS, cite, count, POOL:() => POOL,
  rebuildPool, parseImport, draw, tierFor, shuffle, sbNumbers, kindOf,
  resolve, FORCED, BANDS, MISS,
  drawField, SPR, PAL, teamPal, GEO, geo, xy, drawNum,
  CUES, playCue, initSound, dropFiles, clearClip, listClips, cueFromName,
  mute:v => { muted = !!v; }, isMuted:() => muted, audioCtx:ac,
  spot, ordinal, distText, fgDistance
};
})();
