// The WebAssembly build must behave exactly like the native build: the same text in gives
// the same stdout and exit code out. See docs/web-contract.md ("Parity test").
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import createSchedLabModule from "../src/wasm/schedlab.mjs";

type CliAlgorithm = "fcfs" | "sjf";
const ALGORITHMS: CliAlgorithm[] = ["fcfs", "sjf"];

const repoRoot = resolve(import.meta.dirname, "../..");
const fixtureDir = join(repoRoot, "core/tests/cli");
const wasm = await createSchedLabModule();

// Multi-config generators (Visual Studio) put the executable in Release/, others do not.
const CLI_CANDIDATES = [
  "build/core/Release/schedlab-cli.exe",
  "build/core/schedlab-cli.exe",
  "build/core/schedlab-cli",
];

// Throws (never skips) when the native reference has not been built, so a missing build
// cannot be mistaken for a passing parity check.
function nativeCliPath(): string {
  const found = CLI_CANDIDATES.map((p) => join(repoRoot, p)).find(existsSync);
  if (!found) {
    throw new Error(
      "Native schedlab-cli executable not found. Build it first:\n" +
        "  cmake -S core -B build/core\n" +
        "  cmake --build build/core --config Release\n" +
        `Looked for: ${CLI_CANDIDATES.join(", ")}`,
    );
  }
  return found;
}

interface Output {
  exitCode: number;
  stdout: string;
}

// Only line endings are normalised; any other difference is a real parity failure.
const normalise = (text: string) => text.replaceAll("\r\n", "\n");

function runNative(algorithm: CliAlgorithm, input: string): Output {
  const run = spawnSync(nativeCliPath(), [algorithm], { input, encoding: "utf8" });
  if (run.error) throw run.error;
  return { exitCode: run.status ?? -1, stdout: normalise(run.stdout) };
}

function runWasm(algorithm: CliAlgorithm, input: string): Output {
  const run = wasm.runText(algorithm, input);
  return { exitCode: run.exitCode, stdout: normalise(run.stdout) };
}

// Small seeded PRNG (mulberry32) so every run sees the same workloads.
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Arrival spans of 0, size and 40 * size give all-tied, dense and idle-gap workloads;
// bursts from a small range produce many equal bursts for SJF tie-breaking.
function generateWorkload(seed: number): string {
  const random = seededRandom(seed);
  const between = (low: number, high: number) => low + Math.floor(random() * (high - low + 1));
  const size = seed === 0 ? 1 : seed === 1 ? 100 : between(1, 100);
  const arrivalSpan = [0, size, 40 * size][seed % 3] ?? 0;
  const maxBurst = between(1, 12);
  const lines = [`# generated workload ${seed}`];
  for (let i = 1; i <= size; i++) {
    lines.push(`P${i} ${between(0, arrivalSpan)} ${between(1, maxBurst)} ${between(-5, 5)}`);
  }
  return lines.join("\n") + "\n";
}

const GENERATED_COUNT = 60;
const generated = Array.from({ length: GENERATED_COUNT }, (_, seed) => ({
  name: `generated workload ${seed}`,
  input: generateWorkload(seed),
}));

const fixtures = readdirSync(fixtureDir)
  .filter((file) => file.endsWith(".txt"))
  .map((file) => ({ name: `fixture ${file}`, input: readFileSync(join(fixtureDir, file), "utf8") }));

const cases = [...fixtures, ...generated].flatMap(({ name, input }) =>
  ALGORITHMS.map((algorithm) => ({ label: `${name} (${algorithm})`, algorithm, input })),
);

describe("WASM runText matches native schedlab-cli", () => {
  test("the native executable is built", () => {
    expect(existsSync(nativeCliPath())).toBe(true);
  });

  test("fixtures are found", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(5);
  });

  test.each(cases)("$label", ({ algorithm, input }) => {
    expect(runWasm(algorithm, input)).toEqual(runNative(algorithm, input));
  });

  test("generated workloads include idle gaps and valid schedules", () => {
    const outputs = generated.map(({ input }) => runWasm("fcfs", input));
    expect(outputs.every((output) => output.exitCode === 0)).toBe(true);
    expect(outputs.filter((output) => output.stdout.includes(" IDLE ")).length).toBeGreaterThan(10);
  });

  test("an unknown algorithm name is a usage error on the WASM side", () => {
    expect(wasm.runText("rr" as CliAlgorithm, "P1 0 1 0\n")).toEqual({ exitCode: 2, stdout: "" });
  });
});
