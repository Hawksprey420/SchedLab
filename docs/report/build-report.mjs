// Regenerates every image used by report.html and prints docs/final-report.pdf.
//
// Run from the repository root or from web/:
//   node docs/report/build-report.mjs
//
// It builds nothing in core/. It needs build/core/Release/schedlab-cli.exe (see AGENTS.md),
// web/node_modules (Playwright and the @fontsource packages) and web/dist (built here
// with `npm run build` when missing). Any failed check exits non-zero.
import { createRequire } from "node:module";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const webDir = join(root, "web");
const imgDir = join(here, "img");
const reportHtml = join(here, "report.html");
const pdfPath = join(root, "docs", "final-report.pdf");
const cliPath = join(root, "build", "core", "Release", "schedlab-cli.exe");
const PORT = Number(process.env.REPORT_PORT ?? 4178);
const BASE = `http://127.0.0.1:${PORT}/`;
const SCALE = 2; // device scale factor for every screenshot

const requireFromWeb = createRequire(join(webDir, "package.json"));
const { chromium } = requireFromWeb("@playwright/test");

function fail(message) {
  throw new Error(message);
}
function check(condition, message) {
  if (!condition) fail(message);
}
function same(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) fail(`${label}: expected ${e}, the program produced ${a}`);
}

// ---------------------------------------------------------------- server

function ensureDist() {
  if (existsSync(join(webDir, "dist", "index.html"))) return;
  console.log("web/dist is missing, running npm run build");
  const result = spawnSync("npm run build", { cwd: webDir, shell: true, stdio: "inherit" });
  check(result.status === 0, "npm run build failed");
}

async function startPreview() {
  const viteBin = join(webDir, "node_modules", "vite", "bin", "vite.js");
  check(existsSync(viteBin), "web/node_modules is missing; run npm ci in web/");
  const child = spawn(
    process.execPath,
    [viteBin, "preview", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"],
    { cwd: webDir, stdio: "ignore", windowsHide: true },
  );
  let exited = false;
  child.on("exit", () => {
    exited = true;
  });
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (exited) fail(`vite preview exited early (is port ${PORT} in use? set REPORT_PORT)`);
    try {
      const response = await fetch(BASE);
      if (response.ok) return child;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  stopPreview(child);
  return fail("vite preview did not answer within 30 seconds");
}

function stopPreview(child) {
  if (!child || child.pid === undefined) return;
  spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
}

// ---------------------------------------------------------------- app capture

const runButton = (page) => page.getByRole("button", { name: "Run simulation" });

async function openApp(page) {
  await page.goto(BASE);
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Run simulation");
    return Boolean(button) && !button.disabled;
  });
  await page.evaluate(() => document.fonts.ready);
}

async function stat(page, label) {
  const text = await page
    .locator("dt", { hasText: label })
    .locator("xpath=following-sibling::dd")
    .first()
    .innerText();
  return text.trim();
}

async function scheduleText(page) {
  const items = page.getByRole("list", { name: "The same schedule as text" }).getByRole("listitem");
  return (await items.allInnerTexts()).map((t) => t.trim());
}

async function rectOf(locator) {
  return locator.first().evaluate((element) => {
    const r = element.getBoundingClientRect();
    return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
  });
}

/** Screenshot of the union of the given elements, cropped from the real page. */
async function shoot(page, locators, name, pad = 8) {
  const rects = [];
  for (const locator of locators) rects.push(await rectOf(locator));
  const x0 = Math.max(0, Math.min(...rects.map((r) => r.x)) - pad);
  const y0 = Math.max(0, Math.min(...rects.map((r) => r.y)) - pad);
  const x1 = Math.max(...rects.map((r) => r.x + r.w)) + pad;
  const y1 = Math.max(...rects.map((r) => r.y + r.h)) + pad;
  await page.waitForTimeout(150);
  await page.screenshot({
    path: join(imgDir, name),
    fullPage: true,
    clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 },
  });
  console.log(`  ${name}`);
}

const section = (page, id) => page.locator(`section[aria-labelledby="${id}"]`);

async function runCase(page, spec) {
  await openApp(page);
  if (spec.example) {
    await page.getByLabel("Example workload").selectOption({ label: spec.example });
    await page.getByRole("button", { name: "Load example" }).click();
  }
  if (spec.algorithm === "SJF") await page.getByRole("radio", { name: /Shortest job first/ }).check();
  await runButton(page).click();
  await page.waitForSelector("figcaption");
  same(await scheduleText(page), spec.segments, `${spec.name} schedule`);
  same(await stat(page, "Average waiting time"), spec.waiting, `${spec.name} average waiting`);
  same(await stat(page, "Average turnaround time"), spec.turnaround, `${spec.name} average turnaround`);
  same(await stat(page, "Makespan"), spec.makespan, `${spec.name} makespan`);
  console.log(`checked ${spec.name}`);
}

async function captureApp(browser) {
  const newPage = async (width) => {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      colorScheme: "light",
      reducedMotion: "reduce",
      deviceScaleFactor: SCALE,
    });
    // The report must come from a fully local app: block everything but the preview server.
    const external = [];
    await context.route("**/*", (route) => {
      const host = new URL(route.request().url()).hostname;
      if (host === "127.0.0.1" || host === "localhost") return route.continue();
      external.push(route.request().url());
      return route.abort();
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    return { context, page, external, errors };
  };

  const desktop = await newPage(1280);
  const { page } = desktop;

  const cases = [
    { name: "T1 FCFS", file: "out-t1-fcfs.png", workload: "workload-t1.png", algorithm: "FCFS",
      segments: ["0 to 8: P1", "8 to 12: P2", "12 to 14: P3"], waiting: "6.67 ticks", turnaround: "11.33 ticks", makespan: "14 ticks" },
    { name: "T1 SJF", file: "out-t1-sjf.png", algorithm: "SJF",
      segments: ["0 to 2: P3", "2 to 6: P2", "6 to 14: P1"], waiting: "2.67 ticks", turnaround: "7.33 ticks", makespan: "14 ticks" },
    { name: "T2 FCFS", file: "out-t2-fcfs.png", workload: "workload-t2.png", example: "T2: staggered arrivals", algorithm: "FCFS",
      segments: ["0 to 8: P1", "8 to 12: P2", "12 to 14: P3"], waiting: "5.67 ticks", turnaround: "10.33 ticks", makespan: "14 ticks" },
    { name: "T2 SJF", file: "out-t2-sjf.png", example: "T2: staggered arrivals", algorithm: "SJF",
      segments: ["0 to 8: P1", "8 to 10: P3", "10 to 14: P2"], waiting: "5.00 ticks", turnaround: "9.67 ticks", makespan: "14 ticks" },
    { name: "idle FCFS", file: "out-idle-fcfs.png", workload: "workload-idle.png", example: "CPU idle: a gap between two jobs", algorithm: "FCFS",
      segments: ["0 to 1: P1", "1 to 4: idle", "4 to 6: P2"], waiting: "0.00 ticks", turnaround: "1.50 ticks", makespan: "6 ticks" },
  ];

  console.log("output screenshots");
  for (const spec of cases) {
    await runCase(page, spec);
    if (spec.workload) await shoot(page, [section(page, "workload-heading").locator("table")], spec.workload, 6);
    // Two crops of the real page: the chart down to its caption, then the results. The
    // "same schedule as text" list between them repeats the chart and is left out.
    const chart = section(page, "figure-heading");
    await shoot(page, [chart.locator("h2"), chart.locator("figcaption")], spec.file.replace(".png", "-chart.png"));
    await shoot(page, [section(page, "results-heading")], spec.file.replace(".png", "-results.png"));
  }
  // The idle gap must not depend on the algorithm; the report says so, so check it.
  await runCase(page, { ...cases[4], name: "idle SJF", algorithm: "SJF" });

  console.log("invalid input");
  await openApp(page);
  await page.getByLabel("Arrival of P1").fill("-1");
  await page.getByLabel("Arrival of P1").blur();
  await page.getByLabel("Burst of P2").fill("2.5");
  await runButton(page).click();
  await page.getByRole("heading", { name: "2 problems to fix" }).waitFor();
  await shoot(page, [section(page, "workload-heading").locator("table")], "invalid-table.png", 6);
  await shoot(page, [section(page, "problems-heading")], "invalid-summary.png", 6);
  await page.getByLabel("Arrival of P1").fill("0");
  await page.getByLabel("Burst of P2").fill("4");
  await page.getByLabel("PID of P3").fill("P1");
  await runButton(page).click();
  await page.getByText('Duplicate id "P1"').first().waitFor();
  await shoot(page, [section(page, "problems-heading")], "invalid-core.png", 6);

  console.log("simulated Intel-style lanes");
  await openApp(page);
  await runButton(page).click();
  await page.waitForSelector("figcaption");
  await page.getByLabel("Topology", { exact: true }).selectOption("INTEL_6P_4E");
  await page.waitForSelector("[data-lane]");
  same(await page.locator("[data-lane]").count(), 10, "Intel lane count");
  same(await stat(page, "Energy index"), "14", "Intel FIRST_AVAILABLE energy index");
  same(await stat(page, "Makespan"), "8 ticks", "Intel FIRST_AVAILABLE makespan");
  await page.getByLabel("Placement heuristic").selectOption("FASTEST_AVAILABLE");
  await page.waitForTimeout(200);
  same(await stat(page, "Energy index"), "21", "Intel FASTEST_AVAILABLE energy index");
  same(await stat(page, "Makespan"), "4 ticks", "Intel FASTEST_AVAILABLE makespan");
  const lanes = section(page, "figure-heading");
  await shoot(page, [lanes.locator("h2"), lanes.locator("figcaption")], "hybrid-intel.png");

  check(desktop.errors.length === 0, `page errors: ${desktop.errors.join("; ")}`);
  check(desktop.external.length === 0, `external requests: ${desktop.external.join(", ")}`);
  await desktop.context.close();

  console.log("native measured panel");
  const narrow = await newPage(800);
  const samples = {
    performance: JSON.parse(readFileSync(join(root, "examples", "sample-native-trace-performance.json"), "utf8")),
    efficient: JSON.parse(readFileSync(join(root, "examples", "sample-native-trace-efficient.json"), "utf8")),
  };
  const heading = narrow.page.getByRole("heading", { name: "Native measured", exact: true });
  await openApp(narrow.page);
  for (const kind of ["performance", "efficient"]) {
    await narrow.page.getByRole("button", { name: `Load ${kind} sample` }).click();
    await heading.waitFor();
    const median = `${samples[kind].summary.medianMs.toFixed(2)} ms`;
    const panel = heading.locator("xpath=..");
    const text = await panel.innerText();
    check(text.includes(median), `native ${kind} panel does not show median ${median}`);
    check(text.includes("No Intel Thread Director"), "native panel is missing its Thread Director caveat");
    check(/Requested class: /.test(text), "native panel is missing the requested class");
    if (kind === "efficient") {
      check(text.includes("not an isolated class comparison"), "efficient panel lost its off-class warning");
      await shoot(narrow.page, [panel], "native-measured.png", 6);
    }
  }
  check(narrow.errors.length === 0, `page errors: ${narrow.errors.join("; ")}`);
  check(narrow.external.length === 0, `external requests: ${narrow.external.join(", ")}`);
  await narrow.context.close();
}

// ---------------------------------------------------------------- text and code frames

const fontData = (relative) =>
  `data:font/woff2;base64,${readFileSync(join(webDir, "node_modules", "@fontsource", relative)).toString("base64")}`;

const FRAME_CSS = `
@font-face{font-family:"Plex Mono";font-weight:400;src:url(${fontData("ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2")})}
@font-face{font-family:"Plex Mono";font-weight:600;src:url(${fontData("ibm-plex-mono/files/ibm-plex-mono-latin-600-normal.woff2")})}
*{box-sizing:border-box}
body{margin:0;padding:12px;background:#fff;font-family:"Plex Mono",Consolas,monospace;font-size:13px;line-height:18px;color:#1b1b1b}
.frame{display:inline-block;min-width:560px;border:1px solid #9a9a8c;background:#fffff8}
.head{padding:4px 12px;background:#efede0;border-bottom:1px solid #9a9a8c;font-weight:600;font-size:12px}
table{border-collapse:collapse}
td{padding:0;vertical-align:top;white-space:pre}
td.n{width:48px;padding-right:12px;text-align:right;color:#6b6b60;background:#f6f4ea;border-right:1px solid #d6d3c2;user-select:none}
td.c{padding:0 16px 0 12px}
.cm{color:#4f6b4a;font-style:normal}.kw{color:#8a3a00;font-weight:600}.st{color:#1a5f8a}
pre{margin:0;padding:8px 14px;font:inherit}
.prompt{color:#6b6b60}.out{color:#1b1b1b}
`;

const escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const KEYWORDS =
  /\b(?:const|constexpr|void|bool|double|auto|for|if|else|return|continue|throw|switch|case|namespace|inline|struct|static_cast|int64_t|uint64_t|size_t|true|false)\b/g;

function highlight(line) {
  const at = line.indexOf("//");
  const code = at >= 0 ? line.slice(0, at) : line;
  const comment = at >= 0 ? line.slice(at) : "";
  const html = code
    .split(/("(?:[^"\\]|\\.)*")/)
    .map((part, i) =>
      i % 2 === 1 ? `<span class="st">${escapeHtml(part)}</span>` : escapeHtml(part).replace(KEYWORDS, (k) => `<span class="kw">${k}</span>`),
    )
    .join("");
  return html + (comment ? `<span class="cm">${escapeHtml(comment)}</span>` : "");
}

/** Index of the line holding the closing brace that matches the first `{` at or after `from`. */
function matchingEnd(lines, from) {
  let depth = 0;
  let opened = false;
  for (let i = from; i < lines.length; i += 1) {
    const code = lines[i].replace(/"(?:[^"\\]|\\.)*"/g, "").replace(/\/\/.*$/, "");
    for (const ch of code) {
      if (ch === "{") {
        depth += 1;
        opened = true;
      } else if (ch === "}") {
        depth -= 1;
        if (opened && depth === 0) return i;
      }
    }
  }
  return fail(`no closing brace after line ${from + 1}`);
}

function findLine(lines, marker, file) {
  const hits = lines.map((l, i) => (l.includes(marker) ? i : -1)).filter((i) => i >= 0);
  check(hits.length === 1, `${file}: marker "${marker}" matched ${hits.length} lines, expected 1`);
  return hits[0];
}

const CODE_BLOCKS = [
  { id: "code-pipeline", file: "core/src/scheduler.cpp", start: "std::vector<Segment> run_algorithm(", through: "Schedule simulate_single_core(" },
  { id: "code-validate", file: "core/src/validate.cpp", start: "std::vector<ValidationError> validate(", through: "std::vector<ValidationError> validate(" },
  { id: "code-fcfs-order", file: "core/src/fcfs.cpp", start: "std::vector<std::size_t> indices_by_arrival(", through: "std::vector<std::size_t> indices_by_arrival(" },
  { id: "code-fcfs", file: "core/src/fcfs.cpp", start: "std::vector<Segment> fcfs_segments(", through: "std::vector<Segment> fcfs_segments(" },
  { id: "code-sjf-pick", file: "core/src/sjf.cpp", start: "bool is_shorter_job(", through: "std::int64_t earliest_unfinished_arrival(" },
  { id: "code-sjf", file: "core/src/sjf.cpp", start: "std::vector<Segment> sjf_segments(", through: "std::vector<Segment> sjf_segments(" },
  { id: "code-metrics-derive", file: "core/src/metrics.cpp", start: "void record_start_and_completion(", through: "void derive_waiting_turnaround_response(" },
  { id: "code-metrics", file: "core/src/metrics.cpp", start: "Schedule compute_schedule_metrics(", through: "Schedule compute_schedule_metrics(" },
];

/** Reads the source from disk, selects whole functions, returns the real line range and text. */
function selectCode(block) {
  const lines = readFileSync(join(root, block.file), "utf8").replace(/^﻿/, "").split(/\r?\n/);
  let first = findLine(lines, block.start, block.file);
  while (first > 0 && lines[first - 1].trimStart().startsWith("//")) first -= 1; // the comment that explains the function
  const last = matchingEnd(lines, findLine(lines, block.through, block.file));
  check(lines[last].startsWith("}"), `${block.file}: selection for ${block.id} does not end on a closing brace`);
  const text = lines.slice(first, last + 1);
  const longest = Math.max(...text.map((l) => l.length));
  check(longest <= 105, `${block.id}: line of ${longest} characters would not stay readable`);
  return { first: first + 1, last: last + 1, lines: text };
}

async function renderFrame(page, bodyHtml, outName, headLabel) {
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>${FRAME_CSS}</style><div class="frame"><div class="head">${escapeHtml(headLabel)}</div>${bodyHtml}</div>`);
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".frame").screenshot({ path: join(imgDir, outName) });
  console.log(`  ${outName}`);
}

async function captureCode(browser, ranges) {
  const context = await browser.newContext({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: SCALE });
  const page = await context.newPage();
  console.log("code screenshots");
  for (const block of CODE_BLOCKS) {
    const { first, last, lines } = selectCode(block);
    const rows = lines
      .map((line, i) => `<tr><td class="n">${first + i}</td><td class="c">${highlight(line)}</td></tr>`)
      .join("");
    await renderFrame(page, `<table>${rows}</table>`, `${block.id}.png`, block.file);
    ranges.push(`${block.file}, lines ${first} to ${last}`);
  }

  // The console program, run for real. Input is piped, as with `schedlab-cli sjf < t2.txt`.
  console.log("console program");
  check(existsSync(cliPath), `${cliPath} is missing; build it with the commands in AGENTS.md`);
  const inputFile = join(root, "core", "tests", "cli", "t2.txt");
  const input = readFileSync(inputFile, "utf8");
  const run = spawnSync(cliPath, ["sjf"], { input, encoding: "utf8" });
  check(run.status === 0, `schedlab-cli exited ${run.status}: ${run.stderr}`);
  const expected = readFileSync(join(root, "core", "tests", "cli", "t2_sjf.expected"), "utf8");
  same(run.stdout.replace(/\r\n/g, "\n"), expected.replace(/\r\n/g, "\n"), "schedlab-cli sjf output for t2.txt");
  const lines = run.stdout.replace(/\r\n/g, "\n").trimEnd().split("\n");
  check(lines.includes("AVERAGE waiting=5.0000 turnaround=9.6667"), "CLI averages differ from the expected T2 SJF values");
  const body =
    `<pre><span class="prompt">&gt; type core\\tests\\cli\\t2.txt</span>\n${escapeHtml(input.replace(/\r\n/g, "\n").trimEnd())}\n\n` +
    `<span class="prompt">&gt; build\\core\\Release\\schedlab-cli.exe sjf &lt; core\\tests\\cli\\t2.txt</span>\n` +
    `${escapeHtml(lines.join("\n"))}</pre>`;
  await renderFrame(page, body, "cli-t2-sjf.png", "schedlab-cli, shortest job first, workload T2");
  await context.close();
}

// ---------------------------------------------------------------- report checks and PDF

function textOf(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function checkReport(ranges) {
  const html = readFileSync(reportHtml, "utf8");
  const text = textOf(html);
  const flat = html.replace(/<[^>]+>/g, "");
  for (const range of ranges) check(flat.includes(range), `report.html has no caption containing "${range}"`);
  const must = [
    "[GROUP MEMBER NAMES]", "22 November 2026", "6.67", "11.33", "2.67", "7.33", "5.67", "10.33", "5.00", "9.67",
    "678.46", "828.32", "15 of 15", "772",
  ];
  for (const needle of must) check(text.includes(needle), `report text is missing "${needle}"`);
  check(!/Lawrence/i.test(html), "report must not name Lawrence");
  check(!/[–—]/.test(text), "report text contains an em or en dash");
  check(!/\bAI\b|drafted|language model/i.test(text), "report text mentions AI or drafting");
  check(/<!--[^>]*revise[\s\S]*?-->/i.test(html), "the conclusion section lacks its HTML comment for the group");
  for (let n = 1; n <= 5; n += 1) {
    const match = html.match(new RegExp(`<div class="answer" id="q${n}">([\\s\\S]*?)</div>`));
    check(match, `answer q${n} not found`);
    const words = textOf(match[1]).trim().split(/\s+/).length;
    check(words >= 120 && words <= 220, `answer q${n} has ${words} words, expected 120 to 220`);
    console.log(`  answer ${n}: ${words} words`);
  }
}

async function printPdf(browser) {
  const context = await browser.newContext({ viewport: { width: 794, height: 1123 } });
  const page = await context.newPage();
  const external = [];
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith("file:")) return route.continue();
    external.push(url);
    return route.abort();
  });
  await page.goto(pathToFileURL(reportHtml).href);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
  await page.emulateMedia({ media: "print" });
  check(external.length === 0, `report requested network resources: ${external.join(", ")}`);
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate:
      '<div style="width:100%;text-align:center;font-size:8pt;font-family:Georgia,serif;color:#555"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    margin: { top: "16mm", bottom: "18mm", left: "18mm", right: "18mm" },
  });
  await context.close();
  const pdf = readFileSync(pdfPath);
  const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  console.log(`wrote ${pdfPath}: ${pages} pages, ${pdf.length} bytes`);
}

// ---------------------------------------------------------------- main

let server;
let browser;
try {
  ensureDist();
  mkdirSync(imgDir, { recursive: true });
  server = await startPreview();
  browser = await chromium.launch();
  await captureApp(browser);
  const ranges = [];
  await captureCode(browser, ranges);
  checkReport(ranges);
  await printPdf(browser);
  console.log("done");
} catch (error) {
  console.error(`build-report failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  stopPreview(server);
}
