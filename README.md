# Palmera Bay — an open-world crime game

An original 2D top-down open-world game, built for make.fun's gta6-01 bounty.
It runs offline in a desktop browser from static files: open `game/index.html`
through any static server, no build step, no network request.

**The city.** Palmera Bay is a sun-soaked coastal city: streets, traffic,
pedestrians, a park, a beach, a pier and a lighthouse. Walk it on foot or
steal a car and drive it.

**The story.** Rio Casta owes the fixer Sal Marlow $5,000. Three jobs pay it
off: steal a car for the garage, shake a two-star wanted level, then run a
package from the pier to the lighthouse with the whole police department
behind you. Progress saves in the browser.

**The systems.** Wanted level (0–5 stars) with cruisers and foot cops who
chase, ram, shoot and arrest; traffic that drives the streets; pedestrians
who flee gunfire; combat on foot (punch, pistol); a HUD with cash, health,
stars and a live minimap; synthesised WebAudio sound (engine, sirens,
gunshots) with no audio files.

**Controls.** WASD/arrows move · Shift run · E steal/exit car · Space punch ·
click shoot · M mute · Enter start · R retry · T title.

**Files.** `main.ts` hands the entry in (copies `game/` and `screenshots/`
to the output and writes the dossier). The game is plain JavaScript under
`game/src/`, one file per system. `vendor/makefun-game.ts` is the kit's
dossier library, unchanged. Screenshots are real renders of the game, staged
with `?shot=cover|foot|mission|title&seed=1` (see `shots.json`).

MIT licensed. Every name, character, vehicle and street is invented; nothing
here comes from any commercial game.
