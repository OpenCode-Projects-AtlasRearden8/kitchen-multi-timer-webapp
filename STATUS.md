# STATUS — PanWall (kitchen-multi-timer-webapp)

Built: 2026-11-08

## What was built

`index.html` — a single-file static HTML/CSS/JS app for running several recipe timers in
parallel, each as a *named chain of steps*:

- **Named pans with chained steps.** Each pan ("Left pot — rice") runs its named steps in
  order — e.g. *Simmer 15 min → Rest 5 min* — automatically advancing with a chime at each
  step and a distinct finisher motif when the whole chain completes. Steps support
  h/min/sec durations and are validated (no zero/negative durations, non-empty chain).
- **One-glance wall.** A responsive grid of cards sorted by soonest finish: current step
  name ("Step 1 of 2: Simmer"), large monospaced countdown, progress bar, "then: …" next
  step preview, and total time remaining for the pan. Last 10 seconds glow amber.
- **Distinct gentle sounds.** WebAudio sine "bell" tones with soft decay; each pan is
  assigned one of six pentatonic roots (plus a per-pan rhythm slot on its finisher motif),
  and each pan has a color chip/dot. A "Test sounds" button plays every pan's signature in
  sequence with a visual pulse on its chip, so you can tell pans apart before cooking.
- **Pause everything.** One header button freezes every timer (flag on each card, button
  toggles to "Resume everything"); timing is timestamp-based so pauses/resumes and even a
  backgrounded tab introduce zero drift — no time lost or double-counted.
- **Per-pan controls too:** pause/resume a single pan, restart a finished chain, remove.
- **Local-first:** no network, no storage of secrets (state lives in the page session),
  works from `file://` or any static server. Audio starts only after a user gesture.

## How to run

- Open `index.html` in any modern browser (double-click works; no build step), or
  serve the folder (`python3 -m http.server`) and open the URL.

## Verification results

- `node tests/run-tests.js` — **28/28 assertions pass** (Node 20.19.2). Covers duration
  arithmetic, clock formatting (padding, hour rollover, clamps), chain advancement
  (partial tick, exact completion, multi-step jumps in one tick, overshoot clamp-and-
  stay-finished, zero/negative dt safety, drift-free 0.025 s accumulation), pause
  semantics, and the remaining-time/progress helpers.
- Full inline script passes `node --check` syntax validation.
- **jsdom UI smoke test (external, `/tmp`): 24/24 checks pass**, driving the real page
  with virtual time: pan creation, wall rendering, countdown honesty at 30 s, pause-all
  freezing time exactly, resume, automatic step chaining, chain completion → DONE card,
  restart, per-pan pause/resume, remove, and empty-form validation (alert, no card).
- One real bug was found and fixed during testing: after an overshoot tick past the final
  step, the clamp-back to the last step computed `finished = false`; the core now tracks
  completion explicitly (kernel behavior locked by the two failing tests, which then pass).

## Known gaps

- Pan/step state is session-only: refresh restores the seeded form, not your pans
  (localStorage persistence would be the next step).
- `requestAnimationFrame` pauses in background tabs for wall updates, but time math uses
  real timestamps, so upon return the chain catches up correctly; sounds queued during the
  gap may play close together.
- Sounds differ by pitch and motif, not instrument; cooks who prefer visuals can rely on
  each pan's colored chip (it pulses) plus the wall cards as the primary cue.
- House-rule quirks (e.g. "simmer with lid ajar") belong in step names; there is no
  recipe library/import yet.
- No automated test of the WebAudio layer itself (synthesis parameters are not asserted).
