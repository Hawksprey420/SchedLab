import { expect, test } from "@playwright/test";

for (const width of [375, 1280]) {
  for (const theme of ["light", "dark"] as const) {
    test(`hybrid topology and placement: ${width}px ${theme}`, async ({ page, context }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: theme });
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await context.route("**/*", route => new URL(route.request().url()).hostname.match(/^(localhost|127\.0\.0\.1)$/) ? route.continue() : route.abort());
      await page.goto("/");
      const topology = page.getByLabel("Topology", { exact: true });
      await expect(topology).toHaveValue("SINGLE_CORE");
      await expect(page.getByLabel("Placement heuristic")).toHaveCount(0);
      await page.getByRole("button", { name: "Run simulation" }).click();
      await expect(page.getByText("schedule on one core.", { exact: false })).toBeVisible();
      await topology.selectOption("INTEL_6P_4E");
      await expect(page.getByText("Experimental / simplified model", { exact: true })).toBeVisible();
      await expect(page.locator("[data-lane]")).toHaveCount(10);
      await expect(page.getByRole("columnheader", { name: "Work", exact: true })).toBeVisible();
      await expect(page.getByText(/fictional teaching values/)).toBeVisible();
      await expect(page.getByText(/SMT/)).toBeVisible();
      await page.getByLabel("Placement heuristic").selectOption("FASTEST_AVAILABLE");
      await page.locator('[aria-label="Lane P0"] [data-idle="false"]').focus();
      await expect(page.locator('[aria-hidden="true"] .font-mono')).toContainText("P0: P1");
      await expect(page.locator("dt", { hasText: "Energy index" }).locator("+ dd")).toHaveText("21");
      await expect(page.getByRole("table", { name: "Lane assumptions and utilisation" }).locator("tbody tr")).toHaveCount(10);
      await page.getByLabel("Placement heuristic").selectOption("ENERGY_FIRST");
      await expect(page.locator("dt", { hasText: "Energy index" }).locator("+ dd")).toHaveText("14");
      await topology.selectOption("ARM_1_3_4");
      await expect(page.locator("[data-lane]")).toHaveCount(8);
      await page.getByRole("radio", { name: /Shortest job first/ }).check();
      await expect(page.locator("figcaption")).toContainText("SJF (non-preemptive) schedule, ARM_1_3_4");
      await page.getByLabel("Burst of P1").fill("9");
      await expect(page.locator("[data-lane]")).toHaveCount(0);
      await page.getByRole("button", { name: "Run simulation" }).click();
      await expect(page.locator("[data-lane]")).toHaveCount(8);
      await topology.selectOption("SINGLE_CORE");
      await expect(page.locator("[data-lane]")).toHaveCount(0);
      await expect(page.getByText("Experimental / simplified model", { exact: true })).toHaveCount(0);
      await expect(page.getByText("schedule on one core.", { exact: false })).toBeVisible();
      await page.getByRole("button", { name: "Reset", exact: true }).click();
      await expect(topology).toHaveValue("SINGLE_CORE");
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
      expect(errors).toEqual([]);
    });
  }
}
