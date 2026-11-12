# Mord Hive

A mobile-first PWA for managing warbands and campaigns in **Mord Hive** — a fan-made
Necromunda/40K-on-Mordheim crossover ruleset (v0.5 WIP). Sibling app to
[Mordheim Manager](../MordheimManager): the same engine, a different skin (the **Codex**),
different content, and its own deployment.

Full product spec lives with the owner; this app implements it. Mord Hive is deliberately a
**content-and-design problem, not a rules-engine problem** — it shares Mordheim's statline
(`M WS BS S T W I A Ld`), rating shape, and post-battle sequence, and differs in content,
terminology, design language, and deployment.

## Status — build order (spec §9)

The chosen strategy is **fresh standalone first** (copy/vendor the shared code from Mordheim
Manager now; defer the true `/packages` monorepo split to later).

- ✅ **App shell standing** — Vite + React + TS + Tailwind, boots with no backend. Type-checks,
  builds, runs. Landing + `/design` routes.
- ✅ **Codex theme + sandbox (step 3)** — both themes as `data-theme` token sets: **Paper** (light,
  default — the printed page) and **Plated** (dark — the metal). The signature **datasheet**
  reskin (black banner + black-ruled statline + wargear line in a riveted plate) and every §2.5
  structural device (riveted plate, slim chevron rail, black banner header, designer's-note
  boxout, page chip). The `/design` sandbox proves them all in both themes; contrast pairs are
  computed in `src/index.css`, not eyeballed.
- ✅ **Label layer (§4)** — the Mord Hive terminology, sourced from v0.5, in `src/strings.ts`
  (warband, Diamantine, Archaeotech, Hired Guns, Exploration Phase, Thrones…).
- ✅ **Rating delta (§3)** — `computeWarbandRating()` = thrones-spent + XP×2, the v0.5 recommended
  equation (Mordheim keeps models×5 + XP); hire cost is looked up from the warband definition.
- ✅ **All 12 v0.5 warbands converted (§3, step 5)** — from the ruleset PDF (`MordHiveReleaseV0.5.pdf`,
  extracted with pypdf) into Mordheim Manager's exact JSON schema under `src/data/warbands/`:
  Imperial Guard Remnants, Ordo Hereticus Retainers, Order of the Black Sepulchre, Forsaken
  Astartes, Squat Strip Miners, The Pox Cult, The Lost and the Damned, Ork Mob, Cult of the
  Four-Armed Emperor, Dark Eldar Coterie, Eldar Wayward Host, T'au Pathfinder Cadre. Every
  statline, cost, unit limit, equipment list and special rule is transcribed from the book;
  anything ambiguous in the PDF text layer (skill-table checkmarks, variable/monster profiles,
  a few not-yet-transcribed sub-lists) is flagged with a visible `TODO` per the §8 sourcing line,
  never guessed. Shared data alongside them: the five core skill lists, per-warband skill lists,
  the wargear price chart, racial maximums (Human only — the others weren't in the text layer),
  shared special rules, and every psyker/prayer list (Imperial Prayers, Nurgle/Cult/Waaagh!/
  Craftworld rituals). A cross-reference validator confirms no dead equipment/skill/spell ids.
- ✅ **Warband build (structure copied from Mordheim Manager)** — `NewWarband` → `Roster` →
  `AddHero` / `AddHenchmen`, the shared `warbandFactory` / `warbandLimits` / `rating` engine, and
  Codex-styled form primitives, all reskinned and wired to a local persisted store
  (`src/store/warbands.tsx`) instead of Supabase. Create a warband of any of the 12 types, recruit
  Heroes and Henchmen (respecting per-type/size/gold limits), and see the roster as Codex
  datasheets with a live v0.5 rating. Data lives in `localStorage`.
- ✅ **Model management** — click any roster datasheet into a **Hero detail** or **Henchmen detail**
  screen: edit name/nickname/status/XP, correct stats in place (editable `ProfileBlock`), add
  skills from the model's own lists (the picker hard-blocks duplicates and leader-only skills and
  warns on prerequisites it can't verify), and manage wargear — buy from the unit's equipment
  lists against gold, enforcing the two-close-combat / two-missile weapon-slot limits, then
  sell (½) or stash to the treasury. Auto-saves to the store on every change.
- ✅ **Trading Post** — buy Common and warband-exclusive gear into the treasury and sell it back
  at half price, laid out under the price chart's own headings. No weapon-slot limits here (the
  rules cap what a warrior carries, not what the warband owns).
- ✅ **Rules Reference** — a searchable, offline browser generated live from the app's own data
  (so a datasheet and the reference can't disagree): the skill lists, the wargear chart, every
  psyker/prayer list, and each warband's special rules.
- ✅ **Battle flow** — **Pre-Battle** setup (pick or roll a scenario off the sourced 2D6 Scenario
  Table, note the opponent by name or by picking another of your warbands, jot notes) → **live
  Battle tracker** (turn counter with a confirmed step-back, a turn-stamped event log, and a
  casualty tally — Heroes toggle out-of-action, Henchmen groups get a counter — plus a read-only
  roster reference). The whole session persists to `localStorage` per warband, so a refresh at the
  table doesn't lose it, and the roster's Battle button resumes an in-progress game. The recorded
  out-of-action tally is shaped to seed the post-battle wizard. Scenarios are converted from the
  v0.5 book (`src/data/scenarios.json`).
- ✅ **Solo mode (§6)** — a full solo table-side kit:
  - **App-built AI opponent** — generate an enemy warband from any sourced list at a chosen
    strength (`src/lib/npc.ts` → `buildNpcWarband`). During the fight the tracker shows its roster
    with a **separate casualty tally** and per-model **activation suggestions** that are role-,
    turn-, and temperament-aware.
  - **Temperament & hidden agenda** — each opponent rolls a temperament (Aggressive / Cautious /
    Cunning / Frenzied) that shades every suggestion, and a **secret objective** hidden until you
    reveal it at the battle's end.
  - **The Oracle** (`src/lib/oracle.ts`) — a solo dice helper: a yes/no with likelihood (with the
    classic "and/but" twists), a 2D6 reaction roll, and a D66 hive-event table. Results drop
    straight into the battle log.
  - **Generated SVG battlefield** (`src/lib/battlefield.ts`, `BattlefieldMap`) — a seeded,
    re-rollable terrain layout shaped to the scenario (ruins with rivets, deployment zones, a
    central objective or scattered diamantine), drawn in the Codex palette in both Pre-Battle and
    the tracker.

  The opponent's rosters draw on sourced data, but all AI behaviour, the oracle, and the map are
  **app-original and badged in-app as not part of the ruleset**. Still to come: a solo *campaign*
  with an agenda that carries across linked games.
- ✅ **Landing page live** — `landing/` on `hive.mordheimmanager.net` (Worker `mordhivemanager`).
- ✅ **Supabase backend (built, not yet switched on)** — accounts and multi-device sync on Mordheim
  Manager's Supabase project, in Mord Hive's **own `mordhive` schema** so MM's tables are never
  touched (`supabase/migrations/mh_0001_mordhive_schema.sql`; RLS matrix: `npm run db:test`). One
  account works in both apps. Warbands and solo campaigns are Supabase-backed behind the same store
  interface the screens already used (`src/store/remoteCollection.ts`); the battle session stays in
  `localStorage` per device. Sign in / create account / reset password screens; warbands built
  before accounts existed are offered for import once after sign-in. To switch on: apply the
  migration, add `mordhive` to *Settings → API → Exposed schemas*, and allow
  `https://hive.mordheimmanager.net/**` as an Auth redirect URL.
- ◻️ **Deploy the app** — `wrangler.jsonc` at the root serves `dist/` as an SPA. The live Worker
  `mordhivemanager` still builds `landing/` (the landing page on `hive.mordheimmanager.net`); switch
  its root directory to `/` and build command to `npm run build` when the app should replace it.
- ✅ **Post-battle wizard** — the guided end-of-game sequence (Battle Info → Injuries → Experience
  → Advances → Income → Confirm), consuming the battle tracker's out-of-action tally. Heroes out of
  action roll the **D66 Serious Injury chart** (converted from v0.5, `src/data/injuries.json`);
  henchmen are removed on a D6; Experience auto-awards +1 Survives and the winning-leader bonus;
  models crossing an **XP threshold** roll a **2D6 advance** (characteristic increases applied
  automatically, "New Skill" left to pick on the model's card); Income records diamantine and
  thrones. It's a **staged draft** — nothing changes until Confirm, which applies injuries/deaths,
  XP, stat advances, henchmen losses and income to the warband and clears the battle session
  (`src/lib/postBattle.ts`). The advance tables and XP thresholds are the shared Mordheim mechanic
  the v0.5 book reuses. (Income is a totals entry for now; the full Exploration chart is a later
  addition.)
- ◻️ **Campaigns** — standings, shared battle log, game nights — from Mordheim Manager, reskinned.
- ◻️ **Remaining data TODOs** — verify skill-table access per warband; source the non-Human racial
  maximums; transcribe the Lost and the Damned ritual sub-lists and Weapons & Armour profiles;
  reconcile the handful of per-warband price differences the shared chart can't hold.
- ◻️ **Solo mode (step 6)**, **print sheet + rules browser codex layouts (step 7)**.

## The two hard lines (spec §8)

- **Sourcing** — never fabricate a stat, cost, or rule from memory. Everything comes from the
  Mord Hive v0.5 ruleset or verified converter output; unverified values stay a visible `TODO`.
  (`src/data/sampleDatasheet.ts` is placeholder-only and loudly flagged; it is not real content.)
- **IP** — codex-*influenced*, never codex-*copied*. No GW logos, iconography (no skulls/aquila),
  proprietary fonts, or artwork. Original ornaments only.

## Develop

```bash
npm install
npm run dev      # http://localhost:5174  (see /design for the component sandbox)
npm run build    # tsc -b && vite build
npm run lint     # tsc --noEmit
npm run db:test  # RLS matrix for the mordhive schema (in-process Postgres)
```

## Layout

```
src/
  lib/         engine primitives — statLine, rating, theme (shared shape, mordhive values)
  components/  Codex kit — Plate, BannerHeader, ChevronRail, DesignerNote, PageChip,
               ProfileBlock (statline), Datasheet, ThemeToggle
  screens/     Landing, DesignSandbox
  data/        content (sampleDatasheet.ts is placeholder only, pending v0.5 sourcedata)
  strings.ts   §4 per-system label table
  index.css    Codex theme tokens (Paper / Plated) + §2.5 device classes
```
