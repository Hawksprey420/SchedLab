import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
for (const width of [375,1280]) for (const theme of ["light","dark"] as const) {
 test(`native trace import: ${width}px ${theme}`, async ({page,context}) => {
  await page.setViewportSize({width,height:900});await page.emulateMedia({colorScheme:theme});
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));const external:string[]=[];
  await context.route("**/*",route=>{if(!/^(localhost|127\.0\.0\.1)$/.test(new URL(route.request().url()).hostname)){external.push(route.request().url());return route.abort();}return route.continue();});
  await page.goto("/");const input=page.getByLabel("Import hardware trace");await expect(input).toBeVisible();
  await input.setInputFiles({name:"broken.json",mimeType:"application/json",buffer:Buffer.from("{")});
  await expect(page.getByRole("alert")).toContainText("Could not parse JSON");
  await expect(page.getByRole("table",{name:"Measured native runs"})).toHaveCount(0);
  await input.setInputFiles({name:"huge.json",mimeType:"application/json",buffer:Buffer.alloc(1000001,32)});
  await expect(page.getByRole("alert")).toContainText("1 MB");
  await page.getByRole("button",{name:"Load performance sample"}).click();
  await expect(page.getByRole("heading",{name:"Native measured",exact:true})).toBeVisible();
  await expect(page.getByRole("table",{name:"Measured native runs"}).locator("tbody tr")).toHaveCount(3);
  await expect(page.getByText(/Previously collected/).first()).toBeVisible();
  const sample=JSON.parse(readFileSync(resolve(import.meta.dirname,"../../examples/sample-native-trace-efficient.json"),"utf8"));
  sample.notes.push("<img src=x onerror=alert(1)>");
  await input.setInputFiles({name:"trace.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(sample))});
  await expect(page.getByText("<img src=x onerror=alert(1)>",{exact:true})).toBeVisible();await expect(page.locator("img[src=x]")).toHaveCount(0);
  await expect(page.getByText("Requested class: efficient",{exact:true})).toBeVisible();
  await expect(page.getByText("Some observations were outside the requested class. These timings are not an isolated class comparison.", {exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Run simulation"}).click();await expect(page.locator("figcaption")).toContainText("Time in ticks");
  await expect(page.getByRole("table",{name:"Measured native runs"})).toBeVisible();
  await input.setInputFiles({name:"wrong-mode.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify({...sample,mode:"SIMULATED"}))});
  await expect(page.getByRole("alert")).toContainText("mode");await expect(page.getByRole("table",{name:"Measured native runs"})).toHaveCount(0);
  await page.getByRole("button",{name:"Load efficient sample"}).click();await page.getByRole("button",{name:"Clear imported trace"}).click();
  await expect(page.getByText("No hardware trace loaded.",{exact:false})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBe(0);expect(errors).toEqual([]);expect(external).toEqual([]);
 });
}

test("trace file read failure, pending and stale-read recovery",async({page})=>{
 await page.goto("/");
 await page.evaluate(()=>{
  const original=File.prototype.text;
  File.prototype.text=function(){
   if(this.name==="fail.json")return Promise.reject(new Error("read failure"));
   if(this.name==="pending.json")return new Promise(resolve=>{Object.assign(window,{releaseTrace:()=>resolve("{}")});});
   return original.call(this);
  };
 });
 const input=page.getByLabel("Import hardware trace");
 await input.setInputFiles({name:"fail.json",mimeType:"application/json",buffer:Buffer.from("{}")});
 await expect(page.getByRole("alert")).toContainText("Could not read the file");
 await input.setInputFiles({name:"pending.json",mimeType:"application/json",buffer:Buffer.from("{}")});
 await expect(page.getByRole("status").filter({hasText:"Reading local trace"})).toBeVisible();
 await page.getByRole("button",{name:"Load performance sample"}).click();
 await expect(page.getByRole("table",{name:"Measured native runs"})).toBeVisible();
 await page.evaluate(()=>{(window as unknown as {releaseTrace:()=>void}).releaseTrace();});
 await expect(page.getByRole("table",{name:"Measured native runs"})).toBeVisible();
 await expect(page.getByRole("alert")).toHaveCount(0);
});
