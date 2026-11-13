import { expect, test } from "@playwright/test";

type WasmControl = { mode?: "wait" | "fail" | "ready"; release?: () => void };

test("engine loading, failure and retry use the real WASM factory", async ({ page }) => {
  await page.addInitScript(() => {
    const control: WasmControl = { mode: "wait" };
    Object.assign(window, { wasmControl: control });
    const instantiate = WebAssembly.instantiate;
    Object.defineProperty(WebAssembly, "instantiate", {
      value: async (...args: unknown[]) => {
        if (control.mode === "wait") await new Promise<void>((resolve) => { control.release = resolve; });
        if (control.mode === "fail") throw new Error("Injected WASM load failure");
        return Reflect.apply(instantiate, WebAssembly, args);
      },
    });
  });
  await page.goto("/");
  const run = page.getByRole("button", { name: "Run simulation" });
  await expect(page.getByRole("status").filter({ hasText: "Loading the scheduling engine" })).toBeVisible();
  await expect(run).toBeDisabled();
  await page.getByLabel("Burst of P1").fill("9");
  await expect.poll(() => page.evaluate(() => typeof (window as Window & { wasmControl?: WasmControl }).wasmControl?.release)).toBe("function");
  await page.evaluate(() => {
    const control = (window as Window & { wasmControl?: WasmControl }).wasmControl!;
    control.mode = "fail";
    control.release!();
  });
  await expect(page.getByRole("alert")).toContainText("The scheduling engine could not be loaded");
  await expect(run).toBeDisabled();
  await page.evaluate(() => { (window as Window & { wasmControl?: WasmControl }).wasmControl!.mode = "ready"; });
  await page.getByRole("button", { name: "Try loading again" }).click();
  await expect(run).toBeEnabled();
  await expect(page.getByLabel("Burst of P1")).toHaveValue("9");
  await run.click();
  await expect(page.getByRole("list", { name: "The same schedule as text" }).getByRole("listitem"))
    .toHaveText(["0 to 9: P1", "9 to 13: P2", "13 to 15: P3"]);
});

test("touch exposes bar details on a phone", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 900 }, hasTouch: true, colorScheme: "dark" });
  const page = await context.newPage();
  try {
    await page.goto("/");
    await page.getByRole("button", { name: "Run simulation" }).tap();
    await page.locator("[data-bar='1']").tap();
    await expect(page.getByText("P2: begin 8, end 12, duration 4 ticks", { exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});
