import { expect, test, type Page } from "@playwright/test";

const run = (page: Page) => page.getByRole("button", { name: "Run simulation" });
const table = (page: Page) => page.getByRole("table", { name: /Results by process/ });
const items = (page: Page) => page.getByRole("list", { name: "The same schedule as text" }).getByRole("listitem");
const stat = (page: Page, label: string) => page.locator("dt", { hasText: label }).locator("xpath=following-sibling::dd");

async function reset(page: Page) {
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByLabel("Number of processes")).toHaveValue("3");
}

async function noPageOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
}

for (const width of [375, 1280]) {
  for (const theme of ["light", "dark"] as const) {
    test(`P0 acceptance: ${width}px ${theme}`, async ({ page, context }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      const problems: string[] = [];
      const external: string[] = [];
      page.on("console", (message) => {
        if (["error", "warning"].includes(message.type())) problems.push(message.text());
      });
      page.on("pageerror", (error) => problems.push(error.message));
      await context.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return route.continue();
        external.push(url.href);
        return route.abort();
      });
      await page.goto("/");
      await expect(run(page)).toBeEnabled();
      const toggle = page.getByRole("button", { name: /Dark theme:/ });
      await expect(toggle).toHaveAttribute("aria-pressed", String(theme === "dark"));
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-pressed", String(theme !== "dark"));
      await toggle.click();
      expect(await page.locator("html").evaluate((element) => getComputedStyle(element).backgroundColor))
        .toBe(theme === "dark" ? "rgb(21, 21, 21)" : "rgb(255, 255, 248)");

      for (const example of ["all-at-zero", "staggered-arrivals"]) {
        await page.getByLabel("Example workload").selectOption(example);
        await page.getByRole("button", { name: "Load example" }).click();
        for (const sjf of [false, true]) {
          await page.getByRole("radio", { name: sjf ? /Shortest job first/ : /First-come/ }).check();
          await run(page).click();
          const staggered = example === "staggered-arrivals";
          const intervals = sjf
            ? staggered ? ["0 to 8: P1", "8 to 10: P3", "10 to 14: P2"] : ["0 to 2: P3", "2 to 6: P2", "6 to 14: P1"]
            : ["0 to 8: P1", "8 to 12: P2", "12 to 14: P3"];
          const starts = sjf ? staggered ? [0, 10, 8] : [6, 2, 0] : [0, 8, 12];
          const ends = sjf ? staggered ? [8, 14, 10] : [14, 6, 2] : [8, 12, 14];
          const arrivals = staggered ? [0, 1, 2] : [0, 0, 0];
          const bursts = [8, 4, 2];
          await expect(items(page)).toHaveText(intervals);
          for (let i = 0; i < 3; i++) {
            const waiting = starts[i]! - arrivals[i]!;
            await expect(table(page).locator("tbody tr").nth(i).locator("td")).toHaveText([
              String(arrivals[i]), String(bursts[i]), String([2, 1, 3][i]), String(starts[i]), String(ends[i]),
              String(waiting), String(ends[i]! - arrivals[i]!), String(waiting),
            ]);
          }
          await expect(stat(page, "Average waiting time")).toHaveText(
            `${sjf ? staggered ? "5.00" : "2.67" : staggered ? "5.67" : "6.67"} ticks`,
          );
          await expect(stat(page, "Average turnaround time")).toHaveText(
            `${sjf ? staggered ? "9.67" : "7.33" : staggered ? "10.33" : "11.33"} ticks`,
          );
          await noPageOverflow(page);
        }
      }
      await page.screenshot({ path: `.ui-check/acceptance-${width}-${theme}.png`, fullPage: true });

      await reset(page);
      await run(page).click();
      const first = page.locator("[data-bar='0']");
      await first.focus();
      await page.keyboard.press("ArrowRight");
      await expect(page.locator("[data-bar='1']")).toBeFocused();
      await expect(page.getByText("P2: begin 8, end 12, duration 4 ticks", { exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByText("P2: begin 8, end 12, duration 4 ticks", { exact: true })).toHaveCount(0);
      await first.hover();
      await expect(page.getByText("P1: begin 0, end 8, duration 8 ticks", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Remove P2" }).click();
      await expect(page.getByRole("button", { name: "Remove P3" })).toBeFocused();
      await page.getByRole("button", { name: "Undo" }).click();
      await expect(page.getByLabel("PID of P2")).toBeFocused();
      await page.getByLabel("Burst of P1").fill("9");
      await expect(table(page)).toHaveCount(0);

      await page.getByLabel("Example workload").selectOption("cpu-idle");
      await page.getByRole("button", { name: "Load example" }).click();
      for (const sjf of [false, true]) {
        await page.getByRole("radio", { name: sjf ? /Shortest job first/ : /First-come/ }).check();
        await run(page).click();
        await expect(items(page)).toHaveText(["0 to 1: P1", "1 to 4: idle", "4 to 6: P2"]);
        const idle = page.locator("[data-idle='true']");
        await expect(idle).toHaveAccessibleName(/idle.*begin 1, end 4/i);
        await expect(idle.locator("text")).toHaveText("idle");
        await expect(idle.locator("rect")).toHaveCSS("stroke-dasharray", "5px, 4px");
      }
      for (const [field, value] of [
        ["arrival", "-1"], ["burst", ""], ["id", "P1"], ["id", "IDLE"], ["burst", "1.5"],
      ]) {
        await reset(page);
        const input = page.locator(`input[name^='${field}-']`).nth(2);
        await input.fill(value!);
        await run(page).click();
        await expect(input).toHaveAttribute("aria-invalid", "true");
        await expect(input).toBeFocused();
        await expect(table(page)).toHaveCount(0);
        await expect(page.getByRole("heading", { name: "1 problem to fix" })).toBeVisible();
        await noPageOverflow(page);
      }
      await reset(page);
      await page.getByLabel("Number of processes").fill("0");
      await page.getByLabel("Number of processes").press("Enter");
      await run(page).click();
      await expect(page.getByText("At least one process is required")).toBeVisible();

      await reset(page);
      await page.getByLabel("PID of P1").fill("LongPid".repeat(100));
      await run(page).click();
      await expect(table(page).getByRole("rowheader").first()).toHaveText("LongPid".repeat(100));
      await noPageOverflow(page);
      await page.getByLabel(/PID of LongPid/).fill("x".repeat(1025));
      await run(page).click();
      await expect(page.getByText(/at most 1024 UTF-16 code units/).first()).toBeVisible();

      await reset(page);
      await page.getByLabel("Number of processes").fill("101");
      await page.getByLabel("Number of processes").press("Enter");
      for (const field of ["arrival", "burst", "priority"]) {
        const inputs = page.locator(`input[name^='${field}-']`);
        for (let i = 0; i < 101; i++) await inputs.nth(i).fill(field === "burst" ? "1000000" : "0");
      }
      await run(page).click();
      await expect(page.getByText(/At most 100 processes are allowed/)).toBeVisible();
      await expect(table(page)).toHaveCount(0);
      await page.getByRole("button", { name: "Remove P101", exact: true }).click();
      for (const sjf of [false, true]) {
        await page.getByRole("radio", { name: sjf ? /Shortest job first/ : /First-come/ }).check();
        await run(page).click();
        await expect(table(page).locator("tbody tr")).toHaveCount(100);
        await expect(items(page)).toHaveCount(100);
        await expect(stat(page, "Makespan")).toHaveText("100,000,000 ticks");
        await expect(stat(page, "Average waiting time")).toHaveText("49,500,000.00 ticks");
        await expect(stat(page, "Average turnaround time")).toHaveText("50,500,000.00 ticks");
        expect(await page.locator("svg[role='group'] > g[aria-hidden='true'] .gantt-text").count()).toBeLessThan(50);
        expect(await page.locator("svg[role='group']").evaluate((svg) => svg.getBoundingClientRect().width)).toBeLessThanOrEqual(3200);
        await noPageOverflow(page);
      }
      expect(problems).toEqual([]);
      expect(external).toEqual([]);
    });
  }
}
