#!/usr/bin/env node
"use strict";
/*
 * PanWall timing-math tests.
 * Extracts the CORE block (pure functions) from index.html and verifies it in Node.
 * Run: node tests/run-tests.js
 */
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const m = html.match(/\/\/ === CORE-START ===([\s\S]*?)\/\/ === CORE-END ===/);
assert(m, "CORE block not found in index.html");
const CORE = new Function('"use strict";' + m[1] + "; return CORE;")();

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log("  ok  " + name);
  } catch (e) {
    console.error("  FAIL " + name + "\n      " + (e && e.message));
    process.exitCode = 1;
  }
}

console.log("CORE — seconds()");
test("seconds(h,m,s) sums parts", () => assert.strictEqual(CORE.seconds(1, 2, 3), 3723));
test("seconds handles empty/NaN strings", () => assert.strictEqual(CORE.seconds("", "", ""), 0));
test("seconds ignores fractional input", () => assert.strictEqual(CORE.seconds(0, 1.9, 0), 60));

console.log("CORE — fmtClock()");
test("0 seconds -> 0:00", () => assert.strictEqual(CORE.fmtClock(0), "0:00"));
test("59 -> 0:59", () => assert.strictEqual(CORE.fmtClock(59), "0:59"));
test("60 -> 1:00", () => assert.strictEqual(CORE.fmtClock(60), "1:00"));
test("85 -> 1:25", () => assert.strictEqual(CORE.fmtClock(85), "1:25"));
test("3600 -> 1:00:00", () => assert.strictEqual(CORE.fmtClock(3600), "1:00:00"));
test("3723 -> 1:02:03", () => assert.strictEqual(CORE.fmtClock(3723), "1:02:03"));
test("negative clamps to 0:00", () => assert.strictEqual(CORE.fmtClock(-5), "0:00"));
test("fractional rounds", () => assert.strictEqual(CORE.fmtClock(59.6), "1:00"));
test("Infinity clamps to 0:00", () => assert.strictEqual(CORE.fmtClock(Infinity), "0:00"));

console.log("CORE — validateSteps()");
test("rejects empty chain", () => assert.strictEqual(CORE.validateSteps([]).ok, false));
test("rejects zero-duration step", () =>
  assert.strictEqual(CORE.validateSteps([{ name: "Simmer", secs: 0 }]).ok, false));
test("rejects negative duration step", () =>
  assert.strictEqual(CORE.validateSteps([{ name: "Simmer", secs: -30 }]).ok, false));
test("accepts chain, trims and defaults name", () => {
  const v = CORE.validateSteps([
    { name: "  Simmer  ", secs: 15 },
    { name: "", secs: 300 },
  ]);
  assert.strictEqual(v.ok, true);
  assert.strictEqual(v.steps[0].name, "Simmer");
  assert.strictEqual(v.steps[1].name, "Step 2");
});

console.log("CORE — tickPan() basic");
test("partial step: dt less than remaining", () => {
  const steps = [{ name: "A", secs: 100 }, { name: "B", secs: 50 }];
  const r = CORE.tickPan(steps, CORE.initialState(), 40);
  assert.strictEqual(r.state.step, 0);
  assert(r.state.elapsedInStep === 40);
  assert.deepStrictEqual(r.events, []);
  assert.strictEqual(CORE.stepRemaining(steps, r.state), 60);
});
test("exact completion emits one step event", () => {
  const steps = [{ name: "A", secs: 100 }, { name: "B", secs: 50 }];
  const r = CORE.tickPan(steps, CORE.initialState(), 100);
  assert.strictEqual(r.state.step, 1);
  assert.strictEqual(r.state.elapsedInStep, 0);
  assert.strictEqual(r.events.length, 1);
  assert.strictEqual(r.events[0].kind, "step");
  assert.strictEqual(r.events[0].name, "A");
});
test("chain finishes exactly; done event, no step event for last", () => {
  const steps = [{ name: "A", secs: 100 }, { name: "B", secs: 50 }];
  let r = CORE.tickPan(steps, CORE.initialState(), 100);
  r = CORE.tickPan(steps, r.state, 50);
  assert.strictEqual(r.state.finished, true);
  assert.strictEqual(r.events.length, 1);
  assert.strictEqual(r.events[0].kind, "done");
  assert.strictEqual(CORE.totalRemaining(steps, r.state), 0);
});
test("multi-step jump in one dt fires each event in order", () => {
  const steps = [{ name: "A", secs: 10 }, { name: "B", secs: 10 }, { name: "C", secs: 10 }];
  const r = CORE.tickPan(steps, CORE.initialState(), 15);
  assert.strictEqual(r.state.step, 1);
  assert.strictEqual(r.state.elapsedInStep, 5);
  assert.deepStrictEqual(r.events.map(e => e.name), ["A"]);
  const r2 = CORE.tickPan(steps, r.state, 20);
  // dt 20 clears the rest of B (5s) and all of C (10s) -> B step event + C done event
  assert.deepStrictEqual(r2.events.map(e => e.name), ["B", "C"]);
  assert.strictEqual(r2.events[0].kind, "step");
  assert.strictEqual(r2.events[1].kind, "done");
  assert.strictEqual(r2.state.finished, true);
  const r3 = CORE.tickPan(steps, r2.state, 60);
  assert.strictEqual(r3.state.finished, true);
  assert.deepStrictEqual(r3.events, []);
});
test("overshoot past finish clamps and stays finished", () => {
  const steps = [{ name: "A", secs: 10 }];
  const r = CORE.tickPan(steps, CORE.initialState(), 999);
  assert.strictEqual(r.state.finished, true);
  assert.strictEqual(CORE.stepRemaining(steps, r.state), 0);
  const again = CORE.tickPan(steps, r.state, 999);
  assert.strictEqual(again.state.finished, true);
  assert.deepStrictEqual(again.events, []);
});
test("zero dt emits nothing and pauses cleanly", () => {
  const steps = [{ name: "A", secs: 10 }];
  const r = CORE.tickPan(steps, CORE.initialState(), 0);
  assert.strictEqual(r.state.step, 0);
  assert.strictEqual(r.state.elapsedInStep, 0);
  assert.deepStrictEqual(r.events, []);
});
test("negative dt is clamped to zero (safety)", () => {
  const steps = [{ name: "A", secs: 10 }];
  const r = CORE.tickPan(steps, CORE.initialState(), -5);
  assert.strictEqual(r.state.elapsedInStep, 0);
  assert.deepStrictEqual(r.events, []);
});
test("tiny accumulated dts sum without drift", () => {
  const steps = [{ name: "A", secs: 1 }];
  let state = CORE.initialState();
  for (let i = 0; i < 40; i++) state = CORE.tickPan(steps, state, 0.025).state;
  assert.strictEqual(state.finished, true);
});

console.log("CORE — paused semantics (elapsedInStep is the pause-aware accumulator)");
test("stopping ticking leaves the chain where it was", () => {
  const steps = [{ name: "A", secs: 100 }, { name: "B", secs: 100 }];
  let state = CORE.tickPan(steps, CORE.initialState(), 30).state;
  // "pause": caller simply does not tick; then resumes with same remaining math
  const r = CORE.tickPan(steps, state, 25);
  assert.strictEqual(CORE.stepRemaining(steps, r.state), 45);
  assert.strictEqual(CORE.totalRemaining(steps, r.state), 145);
});
test("stepRemaining never negative mid-step", () => {
  const steps = [{ name: "A", secs: 10 }];
  const r = CORE.tickPan(steps, CORE.initialState(), 3);
  assert(CORE.stepRemaining(steps, r.state) >= 0);
});

console.log("CORE — remaining/progress helpers");
test("totalRemaining sums current remainder + later steps", () => {
  const steps = [{ name: "A", secs: 100 }, { name: "B", secs: 50 }];
  const state = { step: 0, elapsedInStep: 25, finished: false };
  assert.strictEqual(CORE.totalRemaining(steps, state), 125);
});
test("stepProgress bounds", () => {
  const steps = [{ name: "A", secs: 10 }];
  assert.strictEqual(CORE.stepProgress(steps, CORE.initialState()), 0);
  const mid = CORE.tickPan(steps, CORE.initialState(), 5);
  assert.strictEqual(CORE.stepProgress(steps, mid.state), 0.5);
  const fin = CORE.tickPan(steps, mid.state, 20).state;
  assert.strictEqual(CORE.stepProgress(steps, fin), 1);
});

console.log(`\n${passed} assertions passed${process.exitCode ? " — WITH FAILURES" : ""}, node ${process.version}`);
