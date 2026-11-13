// One end-to-end pass over the built app: the plan.md T1 and T2 results, invalid input,
// undo, keyboard use, narrow-screen overflow, and a clean console throughout.
import { expect, test, type Locator, type Page } from "@playwright/test";

const run = (page: Page) => page.getByRole("button", { name: "Run simulation" });
const scheduleItems = (page: Page) => page.getByRole("list", { name: "The same schedule as text" }).getByRole("listitem");
const resultsTable = (page: Page) => page.getByRole("table", { name: /Results by process/ });

/** The Waiting column of each result row, in input order. */
async function waitingTimes(page: Page): Promise<string[]> {
  const rows = resultsTable(page).locator("tbody tr");
  const count = await rows.count();
  const waiting: string[] = [];
  for (let i = 0; i < count; i += 1) waiting.push((await rows.nth(i).locator("td").nth(5).innerText()).trim());
  return waiting;
}

function statistic(page: Page, label: string): Locator {
  return page.locator("dt", { hasText: label }).locator("xpath=following-sibling::dd");
}

test("simulator: results, invalid input, undo, keyboard and layout", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") problems.push(`${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));

  // The page opens with T1 loaded and no result yet.
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "SchedLab" })).toBeVisible();
  await expect(page.getByLabel("Burst of P1")).toHaveValue("8");
  await expect(page.getByLabel("Burst of P2")).toHaveValue("4");
  await expect(page.getByLabel("Burst of P3")).toHaveValue("2");
  await expect(page.getByText("No result yet.")).toBeVisible();
  await expect(run(page)).toBeEnabled();

  // T1 under FCFS.
  await run(page).click();
  await expect(scheduleItems(page)).toHaveText(["0 to 8: P1", "8 to 12: P2", "12 to 14: P3"]);
  expect(await waitingTimes(page)).toEqual(["0", "8", "12"]);
  await expect(statistic(page, "Average waiting time")).toHaveText("6.67 ticks");
  await expect(statistic(page, "Average turnaround time")).toHaveText("11.33 ticks");
  await expect(statistic(page, "Makespan")).toHaveText("14 ticks");
  await expect(page.getByText("Figure 1. FCFS schedule on one core. Time in ticks.")).toBeVisible();
  await expect(page.getByRole("img", { name: "P2: begin 8, end 12, duration 4 ticks" })).toBeVisible();

  // Switching algorithm recomputes at once, from the same workload.
  await page.getByRole("radio", { name: /Shortest job first/ }).check();
  await expect(scheduleItems(page)).toHaveText(["0 to 2: P3", "2 to 6: P2", "6 to 14: P1"]);
  expect(await waitingTimes(page)).toEqual(["6", "2", "0"]);
  await expect(statistic(page, "Average waiting time")).toHaveText("2.67 ticks");
  await expect(statistic(page, "Average turnaround time")).toHaveText("7.33 ticks");
  await expect(page.getByText(/SJF \(non-preemptive\) schedule on one core/)).toBeVisible();

  // Editing a field clears the result instead of leaving stale numbers on screen.
  await page.getByLabel("Burst of P1").fill("9");
  await expect(page.getByText(/The workload changed after the last run/)).toBeVisible();
  await expect(resultsTable(page)).toHaveCount(0);

  // T2: the SJF scheduler must not preempt P1 when P3 arrives.
  await page.getByLabel("Example workload").selectOption({ label: "T2: staggered arrivals" });
  await page.getByRole("button", { name: "Load example" }).click();
  await expect(page.getByLabel("Arrival of P3")).toHaveValue("2");
  await run(page).click();
  await expect(scheduleItems(page)).toHaveText(["0 to 8: P1", "8 to 10: P3", "10 to 14: P2"]);
  expect(await waitingTimes(page)).toEqual(["0", "9", "6"]);
  await expect(statistic(page, "Average waiting time")).toHaveText("5.00 ticks");
  await expect(statistic(page, "Average turnaround time")).toHaveText("9.67 ticks");

  // Invalid input: a negative arrival is reported next to the field and nothing is drawn.
  await page.getByLabel("Arrival of P1").fill("-1");
  await page.getByLabel("Arrival of P1").blur();
  await expect(page.getByText('Arrival "-1" is below 0').first()).toBeVisible();
  await expect(page.getByLabel("Arrival of P1")).toHaveAttribute("aria-invalid", "true");
  await run(page).click();
  await expect(page.getByRole("heading", { name: "1 problem to fix" })).toBeVisible();
  await expect(page.getByLabel("Arrival of P1")).toBeFocused();
  await expect(resultsTable(page)).toHaveCount(0);
  await expect(page.getByText("Figure 1.")).toHaveCount(0);

  // An empty burst is reported as missing, not read as zero.
  await page.getByLabel("Arrival of P1").fill("0");
  await page.getByLabel("Burst of P2").fill("");
  await run(page).click();
  await expect(page.getByText("Burst is empty. Enter a whole number from 1 to 1,000,000 ticks.").first()).toBeVisible();
  await expect(page.getByLabel("Burst of P2")).toBeFocused();
  await expect(resultsTable(page)).toHaveCount(0);

  // A duplicate PID is the core's rule: its message appears next to the PID field.
  await page.getByLabel("Burst of P2").fill("4");
  await page.getByLabel("PID of P3").fill("P1");
  await run(page).click();
  await expect(page.getByText('Duplicate id "P1"').first()).toBeVisible();
  await expect(page.getByLabel("PID of P1").last()).toBeFocused();
  await expect(resultsTable(page)).toHaveCount(0);
  await expect(page.getByText("The simulator rejected this workload")).toBeVisible();

  // Lowering the count removes rows from the end, and Undo brings them back.
  await page.getByLabel("PID of P1").last().fill("P3");
  await page.getByLabel("Number of processes").fill("1");
  await page.getByLabel("Number of processes").press("Enter");
  await expect(page.locator("tbody")).toHaveCount(1);
  await expect(page.getByText("Removed 2 rows (P2, P3).", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator("tbody")).toHaveCount(3);
  await expect(page.getByLabel("Burst of P2")).toHaveValue("4");

  // Removing one row by its button also offers undo.
  await page.getByRole("button", { name: "Remove P2" }).click();
  await expect(page.locator("tbody")).toHaveCount(2);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator("tbody")).toHaveCount(3);

  // Keyboard only: from the checked algorithm radio (SJF), Tab reaches Run and Enter runs.
  await page.getByRole("radio", { name: /Shortest job first/ }).focus();
  await page.keyboard.press("Tab");
  await expect(run(page)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(resultsTable(page)).toBeVisible();
  await expect(scheduleItems(page)).toHaveText(["0 to 8: P1", "8 to 10: P3", "10 to 14: P2"]);

  // Narrow screens: the chart scrolls inside its frame, the page never scrolls sideways.
  for (const width of [375, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `horizontal page overflow at ${width}px`).toBeLessThanOrEqual(0);
  }
  await expect(page.getByRole("region", { name: /Scrolls sideways/ })).toBeVisible();

  expect(problems).toEqual([]);
});

test("an invalid process-count draft cannot run the old table", async ({ page }) => {
  await page.goto("/");
  await expect(run(page)).toBeEnabled();
  await page.getByLabel("Number of processes").fill("100000");
  await run(page).click();
  await expect(page.getByLabel("Number of processes")).toHaveAttribute("aria-invalid", "true");
  await expect(resultsTable(page)).toHaveCount(0);
  await expect(page.getByLabel("Number of processes")).toBeFocused();
});

test("Reset clears an invalid process-count draft", async ({ page }) => {
  await page.goto("/");
  await expect(run(page)).toBeEnabled();
  await page.getByLabel("Number of processes").fill("no");
  await page.getByLabel("Number of processes").press("Enter");
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByLabel("Number of processes")).toHaveValue("3");
  await expect(page.getByLabel("Number of processes")).toHaveAttribute("aria-invalid", "false");
});
