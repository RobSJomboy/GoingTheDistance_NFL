# Going the Distance

An NFL trivia drive for Jomboy Media, built the same way as the other show tools: a host
page and an overlay page, talking over a public [ntfy](https://ntfy.sh) topic so the laptop
running the show and the machine running OBS never have to be on the same network.

You start on your own 1-yard line and answer your way to the end zone. **How fast you answer
is the play.** Fire back instantly and you take the top off it. Sit on it and you scramble for
two. Miss it and you're eating a sack.

```
index.html     the door
play.html      just play it — no host, works on a phone
control.html   the host panel — keep this off camera
display.html   the 8-bit field — this is the OBS browser source
editor.html    write your own questions

gtd.js         question bank, engine primitives, pixel art, audio
gtdgame.js     the rules — every mode, shared by play and control
gtdview.js     the renderer — the field and the card, shared by play and display
gtdsync.js     the transport — the browser channel and the ntfy relays
gtd.css        styling for all three layouts
```

## Two ways to run it

**On your own** — open `play.html` and go. Pick a game, a difficulty and which eras you want,
tap your answers. Everything happens in the browser; nothing to connect, nothing to install, and
it plays properly on a phone (portrait gets the vertical field). Send anyone the link.

**As a show** — a host drives `control.html` and the field goes out to an OBS browser source over
ntfy, exactly as before.

### Recording a clean output while you play

**SET UP RECORDING** sits on the setup screen, before you kick off — point OBS and copy the URL
first, then play. While you're on that screen the output shows a **holding card** (the title plate
over an empty field, naming the game you've picked) rather than a bare field, so you can see the
source is live before anything has happened. It clears the moment you kick off.

The same panel is on **◉ RECORD** in-game. Either way it opens a second window with
**just the graphic in it** — no buttons, no
setup screen — mirroring the game as you play. Point a screen recorder at that window, or capture
it in OBS as a window capture. It follows this browser automatically over a BroadcastChannel:
no topic, nothing to connect. Open it mid-round and it asks for the current state, so it comes up
where the game is rather than blank.

Three shapes: **16:9 full board** (self-contained on navy — the one to record as-is), **16:9 lower
third** and **9:16 vertical**. The two overlay layouts are built to sit over a shot, so in a window
they come up on white — right for an OBS browser source, where the transparency is real, and wrong
for a plain screen recording.

**⛶ HIDE THIS** does the other version of the same idea: strips the buttons off the play page
itself so you can record that window directly. Escape brings them back.

**For OBS**, a browser source is its own browser and can't hear the channel — so the panel asks
what you're capturing with, and picking OBS takes a topic and publishes to the relays exactly like
the host panel does. It shows you the full URL, with `?topic=` in it, and **CHECK IT LANDED** asks
the relay whether the state is really sitting there so you get a yes or a no instead of a guess.
One person can run the whole bit: play on the laptop, clean graphic in OBS.

**If a display source is blank, it now tells you why.** A URL with no topic in it used to render a
title card over an empty field and simply never update — indistinguishable from working, and the
diagnostic line is hidden in OBS. It now says `THIS URL HAS NO TOPIC IN IT` and where to get the
right one; with a topic but no traffic it says nothing has arrived and what to check. It only ever
shows before the first state arrives — mid-show a warning plate over the graphic would be worse
than a frozen graphic.

Both run **the same rules off the same code**. `gtdgame.js` holds every game rule and touches no
DOM; `gtdview.js` holds the renderer. `gtdsync.js` holds the transport. `play.html` wires all three together,
`control.html` wires the rules to the transport and `display.html` wires the transport to the
renderer. That's the
whole reason for the split: if the rules lived in both pages they would drift, and a fix to the
drive would quietly not apply to the version people actually play.

---

## Running a taping

1. Open **control.html**, pick a topic name (it pre-fills a random one), hit **Connect**.
2. **Copy Display URL**, paste it into an OBS browser source.
   - Lower third → `1920 × 1080`
   - Vertical → `1080 × 1920` (add `&layout=vert`, or just size the source tall and it works it out)
   - Full board → `&layout=full`
3. Press **N**, read the question out, click the answer they gave, press **Enter**.

### Hotkeys

| key | does |
|---|---|
| `N` | serve the next question |
| `A` `B` `C` `D` | lock that answer and stop the clock |
| `Enter` | reveal and run the play |
| `Space` | start / stop the clock |
| `T` | time expired |
| `P` `O` `C` | pass interference (50/50), timeout, coach's challenge |
| `K` | take the field goal |
| `R` | walk the last play back |
| `1` `2` | hand the ball over (head to head) |

---

## Difficulty and era

Two pickers sit above every game.

**Difficulty** is Easy, Medium, Hard, or **Ladder** — where the field position picks it for you,
so the defence stiffens the closer you get to the end zone. That's Millionaire's money ladder
wearing a helmet, and it's the default.

**Eras** are chips: Evergreen, the 70s, 80s, 90s, 2000s, 2010s, 2020s. Tick any combination. A
whole round can be all 1990s, or 80s-and-90s only, or the 2020s for a younger room. *Evergreen* is
the rules, the all-time records, the nicknames and the venues — the questions that don't belong to
a decade.

Difficulty is graded **within its era**, not by how long ago it happened. Someone who picks the
1970s knows who won Super Bowl IX; marking that hard just because it's old would make every era
filter unplayable at the easy setting. Every era × difficulty pair has at least eight questions in
it, and the control page prints a live count of what the current filter can still serve — a filter
that has quietly run dry is something to find out about before you're on camera.

When the bank does run thin, the game **gives up difficulty before it gives up the era**: the era
is your deliberate creative choice, so it widens to the next difficulty first, then allows
repeats, and only a completely empty era falls back to the whole bank. It never comes up empty
mid-show.

## The games

### Going the Distance — the drive

Own 1 to the end zone, four downs to make ten yards, exactly like football. The question tier
climbs with the field position: tier 1 in your own end, tier 2 past midfield, tier 3 in the red
zone. The defense stiffens as you get closer, which is Millionaire's ladder wearing a helmet.

**Right answer, by how fast:**

| answered within | play | yards |
|---|---|---|
| first 15% of the clock | DEEP SHOT | 26–44 |
| 35% | BIG GAIN | 14–24 |
| 60% | GOOD GAIN | 8–13 |
| 85% | SHORT GAIN | 4–7 |
| the rest | SCRAMBLE | 1–3 |

**Wrong answer** inverts it, and stays football-true: firing an answer out fast and missing is an
**incomplete** — you threw it away. Sitting on it and missing is a **sack** — you held the ball
too long. In between is getting **stuffed** in the backfield. Running the clock out is
**delay of game**.

**Millionaire's furniture, translated:**

- **50:50** → *pass interference*, two wrong answers come off the board
- **Phone a friend** → *timeout*, fifteen more seconds on the clock
- **Ask the audience** → *coach's challenge*, clock stops and you poll the room
- **Guaranteed levels** → *safe havens* at the 25, the 50 and the opponent 20. Turn it over on
  downs and the next drive starts at the last one you got past, not back at the goal line.
- **Walking away with the money** → *take the field goal*. Anywhere inside a 57-yard attempt you
  can stop, bank 3, and end the drive rather than risk it.

Touchdown is 7. Getting driven back into your own end zone is a safety and costs you 2.

### Head to Head

Ball on the 50. Every right answer moves it five yards your way and you keep it; every wrong
answer is a turnover on the spot and the other side takes over driving the other way. Reach the
end zone for 7 and it goes back to the 50. The yards-per-answer and an optional
*double it under five seconds* bonus are both on the control page.

### Two-Minute Drill

**One clock for the whole round instead of one per question**, which changes the rhythm
completely — there's no time to deliberate. Questions come back to back; a right answer moves the
ball by how fast it came, a wrong one costs **ten seconds** and no yards. Score and the ball goes
back to the 20 and you keep going. When the clock hits zero the round is whatever you banked. The
overlay runs its own copy of the round clock off the last value it was handed, so a ticking clock
costs no messages.

### Sudden Death

Every question is the whole season. Right and you keep driving, wrong and it's over on the spot —
the run is however far you got and however many you strung together. Best run of the taping is
tracked next to the current one, which is what makes people want another go.

### The Wager

Call the yardage **before** the question goes up — 5 to 40. It goes on the overlay with the
question so the room can see what's at stake. Right answer gains it, wrong answer loses it, and a
wager that would take you past the goal line is trimmed to the distance left. The decision is the
game here, not the clock.

---

## The look

The field is 8-bit but it isn't flat. It's drawn as a **trapezoid slab in forced perspective** —
the far sideline is narrower than the near one, so the yard lines lean, the turf falls into shade
toward the back, and the whole thing sits on an extruded front face with the yard markers on it.
That front face is doing most of the 3-D work; without it the taper just looks like a wonky
rectangle. Sprites get a squashed shadow so they stand *in* the scene rather than on top of it.

Yard markers live on the face rather than the turf, which means a sprite can never sit on top of
a number — the reason a hundred-pixel-tall field can still tell you where the ball is.

## The three layouts

All three are the same components, so nothing is a separate build.

- **`layout=lower`** — the real lower third. Transparent background, anchored to the bottom of
  the frame: **100 pixels of field** plus a compact chyron on top of it, about 160 all in. Turn
  the question card off in **Look** and that's the whole graphic. The play call slams in *above*
  the slab and the card dims out of its way, so nothing ever covers the field while the play is
  running.
- **`layout=vert`** — 9:16. The field stands up and you're looking *down* it, drive running away
  from you toward the far end zone. Question card above. This is the Shorts and Reels cut.
- **`layout=full`** — the whole screen as a game board on navy, slab and all.

The question card is sized independently of the field, because on the wide cut it plays behind
the contestants on a key and doesn't want to be big. **Look → Card: small / medium / large.**

The display page picks the vertical cut on its own if the source is taller than it is wide, so a
1080 × 1920 browser source with no query string still comes up right. The field only ever scales
by whole numbers — 480 × 28 at 4× is exactly 1920 across — so the pixels stay hard at any size,
and the type takes up the slack on its own scale.

---

## Sound

**The Cake record isn't in here and can't be** — it's not ours to ship. What is in here is the
rack it slots into.

Drop audio files onto the control page and the **filename picks the cue**: `touchdown.mp3`,
`sack.wav`, `big-play.m4a`, `first-down.mp3`, `turnover.mp3`, `riff.mp3`, `lockin`, `tick`,
`snap`, `fieldgoal`, `wrong`, `correct`. Aliases are loose — `td.mp3`, `TD 2.wav` and
`touchdown-final.m4a` all land on the same peg. Clips cache in the browser, so they survive a
reload and you only load them once.

Cut your two-second guitar stabs, name them after the moment you want them on, drop them in.
Every cue you don't supply falls back to an original chiptune sting synthesised in the page, so
it's never silent out of the box.

By default the **control page** makes the noise, out of the machine you're hosting on. If you'd
rather the OBS source do it, add `&sound=1` to the display URL and drop the same files on the
box that appears top-right.

---

## Questions

**373 built in, and every one carries a citation.** The control page prints the source under the
question as it serves it, so if a contestant argues the answer is on the screen in front of you.
**Copy the bank with sources** dumps all of them as TSV — question, answer, source, URL — to read
through in a doc before a taping.

The bulk of the era questions are generated straight off four reference tables — every Super Bowl
result, every Super Bowl MVP, every AP MVP season, every first overall pick — so each one is true
by construction of the table it came from, and the table itself was checked against its page.

Every question was checked against its cited page in **August 2026**. The first cut of this bank
was written from memory and the pass turned up two that were wrong:

- *"Who won Super Bowl MVP three times in the 1980s?"* — Joe Montana's three came after Super
  Bowls XVI, XIX and XXIV, and XXIV was played in **January 1990**. Re-cut to "Who was the first
  player to win three Super Bowl MVP awards?", which is the claim the sources actually make.
- *"Who was the first kicker named NFL MVP?"* — Mark Moseley is the **only** special-teams player
  ever to win it, so "first" was quietly misleading. Reworded.

One more was tightened rather than fixed: the six-touchdown-game question now names **Alvin
Kamara** alongside Nevers, Dub Jones and Sayers, since he joined them in 2020 and leaving him out
invites a correction on air.

### Re-check these before a taping

Records move, and a citation is only true as of the day it was checked. The ones most likely to
shift: the single-season and career leaders, *"which of these has never played in a Super Bowl"*,
anything naming a current head coach, and the recent-draft questions.

### Writing your own — `editor.html`

There's a whole page for it. A table with a row per question: the question, the right answer in
its own column, three wrong ones, difficulty, era and a source. It saves to the browser as you
type and the control page picks it up on its next reload — no files to move.

Every row is checked as you write it. An **error** in red (no question, no answer, fewer than
three wrong answers, the same answer twice) keeps that row out of the game entirely. A **warning**
in amber — no source — lets it play but counts it on the control page, so an unchecked question
can't quietly go to air.

A **coverage** panel shows easy / medium / hard for each era against whichever banks are switched
on, so you can see the gap before you find it live. And a switch at the top decides what the game
plays from: **built-in only**, **mine only**, or **both together**.

Paste a batch in with one a line:

```
question | right answer | wrong | wrong | wrong | difficulty 1-3 | era | source
```

Era is one of `any 70s 80s 90s 00s 10s 20s`. **Copy mine out** and **Download as .txt** get a
question set out of one browser and into another.

### Where the answers come from

Every question points at one of these, and the key lives in `SOURCES` at the top of `gtd.js`:

| Cluster | Source |
|---|---|
| Rules, scoring, field dimensions | [American football rules — Wikipedia](https://en.wikipedia.org/wiki/American_football_rules) |
| Super Bowl winners, appearances, scores | [List of Super Bowl champions — Wikipedia](https://en.wikipedia.org/wiki/List_of_Super_Bowl_champions) |
| Super Bowl MVPs | [Super Bowl MVP Award — Wikipedia](https://en.wikipedia.org/wiki/Super_Bowl_Most_Valuable_Player_Award) |
| Career and single-season records | [List of NFL records (individual) — Wikipedia](https://en.wikipedia.org/wiki/List_of_National_Football_League_records_(individual)) |
| Quarterback records | [List of NFL quarterback records — Wikipedia](https://en.wikipedia.org/wiki/List_of_National_Football_League_quarterback_records) |
| Sacks | [NFL career sacks leaders — Wikipedia](https://en.wikipedia.org/wiki/List_of_National_Football_League_career_sacks_leaders) |
| MVP voting | [AP NFL MVP Award — Wikipedia](https://en.wikipedia.org/wiki/Associated_Press_NFL_Most_Valuable_Player_Award) |
| Coaching wins | [NFL head coaches with 50 wins — Wikipedia](https://en.wikipedia.org/wiki/List_of_National_Football_League_head_coaches_with_50_wins) |
| Draft picks | [First overall picks — Wikipedia](https://en.wikipedia.org/wiki/List_of_first_overall_National_Football_League_draft_picks) · [1983 NFL draft](https://en.wikipedia.org/wiki/1983_NFL_draft) |
| Famous plays and games | [Immaculate Reception](https://en.wikipedia.org/wiki/Immaculate_Reception) · [Music City Miracle](https://en.wikipedia.org/wiki/Music_City_Miracle) · [Tuck Rule Game](https://en.wikipedia.org/wiki/Tuck_Rule_Game) · [The Comeback](https://www.history.com/this-day-in-history/january-3/buffalo-bills-pull-off-greatest-comeback-in-nfl-history) · [Helmet Catch](https://www.nfl.com/100/originals/100-greatest/detail.html?slug=plays-3) · [Philly Special](https://www.philadelphiaeagles.com/news/nick-foles-trey-burton-eagles-philly-special-espn-30-documentary) · [Ice Bowl](https://www.packers.com/photos/on-this-day-54th-anniversary-of-the-ice-bowl) |
| Clubs, venues, traditions | [NFL.com club pages](https://www.nfl.com/teams/) · [Pro Football Hall of Fame](https://www.profootballhof.com/) |

---

## How the sync works

Same pattern as the Trade Deadline and Savant pages, with the lessons already applied:

- **Four relays, not one.** Every message goes to ntfy.sh plus three public mirrors at once and
  the overlay subscribes to all of them, first copy wins. ntfy's anonymous budget and its uptime
  are both per host, so this takes all four failing together to stop a show.
- **Clock-based sequence numbers** on every payload, so the duplicate copies collapse, a slow
  relay can't deliver stale state on top of newer state, and reloading the control page doesn't
  restart the sequence below what the overlay has already applied.
- **Nothing publishes on a timer.** The play clock is run locally by the overlay off a sequence
  number, and the real timing is measured on the control page — the host stops the clock by
  clicking the answer that was actually given, so nothing depends on two machines agreeing what
  time it is. A message only goes out when something the overlay is drawing would change.
- **One message a play.** The result and the new down-and-distance travel together; the overlay
  holds the chyron until the runner lands so it never reads 2nd & 4 while the guy is still
  standing on 1st & 10. A full game is well under a hundred messages.
- **Snapshot URL** bakes the whole state into the display URL fragment. Paste it into the OBS
  source and the right picture comes up, frozen — enough to finish a round with every relay down.
- **Animation watchdog.** A browser source that isn't being rendered stops advancing the
  animation clock, which would hold every entrance at opacity 0 and put a blank overlay to air.
  The display watches the timeline and, if it stalls, kills animation outright and paints the end
  states.

Topics are public to anyone who knows the name, so keep the random tail on it.
