# 🍳 PanWall — Parallel Kitchen Timers

One glance, every pan. PanWall is a single-file web app for people juggling several
real recipes at once: name each pan ("Left pot — rice", "Skillet"), build its chain of
named steps (*Simmer 15 min → Rest 5 min*), and the wall shows every remaining time at
once. Each pan chims with its own gentle, distinct sound so you know *which* burner
called you over — and one big button pauses everything when there's a knock at the door.

Built by **Asdale Dynamics, LLC** — beginner-friendly, plain-English tools that just work.

## Run it

No install, no build, no network:

- Double-click `index.html` (or open it with any modern browser), or
- `npx serve .` / `python3 -m http.server` and visit the printed URL.

Everything runs locally in your browser. No accounts, no tracking, no data leaves the device.

## Use it

1. Open **“Add a pan”**, give the pan a name.
2. Add its steps in order — each step has a name ("Simmer") and a duration (h/min/sec).
3. Click **Start pan timer →**. The card joins the wall, biggest times biggest.
4. Add more pans the same way. The wall is sorted by what finishes soonest.
5. Sounds: click **🎵 Test sounds** once per kitchen session to learn each pan's chime.
6. When someone knocks: **⏸ Pause everything**. Nothing is lost — times freeze
   (accurately, no drift) and resume where they left off.

Per pan you can also pause/resume, restart the whole chain when done, or remove it.

## Tested timing math

The pure timing engine (durations, clock formatting, step-chain advancement, remaining
time, drift behavior) lives in the `CORE` block of `index.html` and is exercised by
`tests/run-tests.js`:

```
node tests/run-tests.js   # 28 assertions, Node 18+
```

The tests run in Node by extracting the same code the browser runs — one source of truth.

## Files

- `index.html` — the entire app (HTML + CSS + JS)
- `tests/run-tests.js` — timing-math test suite
- `LICENSE` — MIT, © Asdale Dynamics, LLC
- `STATUS.md` — what was built, verification results, known gaps

## License

MIT — see `LICENSE`. © **Asdale Dynamics, LLC**
