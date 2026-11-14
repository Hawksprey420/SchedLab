import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";
import { parseHardwareTrace } from "../src/lib/hardwareTrace";

test.each(["topology","trace-performance","trace-efficient"])("imports the real committed native %s sample",name=>{
 const text=readFileSync(resolve(import.meta.dirname,`../../examples/sample-native-${name}.json`),"utf8");
 const outcome=parseHardwareTrace(text);expect(outcome.ok).toBe(true);
 if(!outcome.ok)return;
 expect(outcome.trace.mode).toBe("NATIVE_MEASURED");
 expect(outcome.trace.machine.cpuName).toContain("i7-12650H");
 expect(outcome.trace.notes.some(n=>n.includes("Previously collected"))).toBe(true);
 expect(outcome.trace.measurements).toHaveLength(name==="topology"?0:3);
});
