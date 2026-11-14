import { expect, test } from "vitest";
import { parseHardwareTrace, MAX_TRACE_BYTES } from "../src/lib/hardwareTrace";

const cpu = {id:1,group:0,logicalProcessorIndex:0,coreIndex:0,efficiencyClass:1,parked:false,allocated:false,allocatedToTargetProcess:false};
const run = {run:1,elapsedMs:12,selectedCpuSetIds:[1],observedLogicalCpus:[{group:0,logicalProcessorIndex:0,samples:382}],affinityRequestSucceeded:true,affinityError:"",requestedClassSamples:382,totalSamples:382,checksum:"50999000000"};
const trace = () => ({schemaVersion:1,mode:"NATIVE_MEASURED",collectedAt:"2026-11-14T03:00:00Z",machine:{cpuName:"test CPU",os:"Windows",topologyDetected:true},powerScheme:"Balanced",cpuSets:[cpu,{...cpu,id:2,logicalProcessorIndex:1,coreIndex:1,efficiencyClass:0}],scenario:{workload:"bounded_compute",requestedClass:"performance",repeats:1,iterations:400000000,warmupRuns:1},measurements:[run],summary:{medianMs:12,minMs:12,maxMs:12},notes:["Previously collected; temperature and background activity affect timing."]});
const parse = (value: unknown) => parseHardwareTrace(JSON.stringify(value));
test("accepts a measured trace and preserves text as data", () => {
  const value=trace(); value.notes=["<img src=x onerror=alert(1)>"];
  expect(parse(value)).toEqual({ok:true,trace:value});
});
test("accepts workload-free detection", () => {
  const value={...trace(),scenario:{workload:"detect",requestedClass:"none",repeats:0,iterations:0,warmupRuns:0},measurements:[],summary:null};
  expect(parse(value).ok).toBe(true);
});
test.each(["", "{", "null", "[]", "42", "\"text\""])("rejects invalid JSON/root %s", text => expect(parseHardwareTrace(text).ok).toBe(false));
test("bounds bytes before parsing", () => expect(parseHardwareTrace(" ".repeat(MAX_TRACE_BYTES+1))).toMatchObject({ok:false,error:expect.stringMatching(/size|large|limit/i)}));
const mutations: [string,(v:ReturnType<typeof trace>)=>void][] = [
 ["schema",v=>{v.schemaVersion=2}], ["mode",v=>{v.mode="SIMULATED"}],
 ["timestamp",v=>{v.collectedAt="yesterday"}], ["CPU name",v=>{v.machine.cpuName=""}],
 ["OS type",v=>{(v.machine as Record<string,unknown>).os=2}], ["detected type",v=>{(v.machine as Record<string,unknown>).topologyDetected="yes"}],
 ["power name",v=>{v.powerScheme=""}], ["missing field",v=>{delete (v as Record<string,unknown>).notes}],
 ["too much text",v=>{v.notes=["x".repeat(4097)]}], ["empty notes",v=>{v.notes=[]}],
 ["no topology",v=>{v.cpuSets=[]}], ["duplicate IDs",v=>{v.cpuSets.push({...cpu})}],
 ["duplicate logical",v=>{v.cpuSets.push({...cpu,id:3})}], ["bad ID",v=>{v.cpuSets[0]!.id=-1}],
 ["bad group",v=>{v.cpuSets[0]!.group=65536}], ["bad index",v=>{v.cpuSets[0]!.logicalProcessorIndex=256}],
 ["bad core",v=>{v.cpuSets[0]!.coreIndex=.5}], ["bad class",v=>{v.cpuSets[0]!.efficiencyClass=256}],
 ["flag",v=>{(v.cpuSets[0] as unknown as Record<string,unknown>).parked=1}],
 ["workload",v=>{v.scenario.workload="fcfs"}], ["class",v=>{v.scenario.requestedClass="P0"}],
 ["repeats",v=>{v.scenario.repeats=21}], ["iteration count",v=>{v.scenario.iterations=1}],
 ["warmup",v=>{v.scenario.warmupRuns=0}], ["run count",v=>{v.measurements=[]}],
 ["run sequence",v=>{v.measurements[0]!.run=2}], ["elapsed type",v=>{(v.measurements[0] as unknown as Record<string,unknown>).elapsedMs="12"}],
 ["elapsed zero",v=>{v.measurements[0]!.elapsedMs=0}], ["elapsed limit",v=>{v.measurements[0]!.elapsedMs=5001}],
 ["unknown selected",v=>{v.measurements[0]!.selectedCpuSetIds=[99]}], ["wrong class selected",v=>{v.measurements[0]!.selectedCpuSetIds=[2]}],
 ["duplicate selected",v=>{v.measurements[0]!.selectedCpuSetIds=[1,1]}], ["empty selected",v=>{v.measurements[0]!.selectedCpuSetIds=[]}],
 ["unknown observed",v=>{v.measurements[0]!.observedLogicalCpus=[{group:3,logicalProcessorIndex:0,samples:382}]}],
 ["sample count",v=>{v.measurements[0]!.totalSamples=1}], ["class samples",v=>{v.measurements[0]!.requestedClassSamples=381}],
 ["sample zero",v=>{v.measurements[0]!.observedLogicalCpus[0]!.samples=0}], ["empty observed",v=>{v.measurements[0]!.observedLogicalCpus=[]}],
 ["checksum",v=>{v.measurements[0]!.checksum="18446744073709551616"}],
 ["affinity flag",v=>{(v.measurements[0] as unknown as Record<string,unknown>).affinityRequestSucceeded=1}],
 ["failure detail",v=>{v.measurements[0]!.affinityRequestSucceeded=false}], ["contradictory success detail",v=>{v.measurements[0]!.affinityError="failed"}],
 ["summary type",v=>{(v as Record<string,unknown>).summary=null}], ["summary negative",v=>{v.summary.minMs=-1}],
 ["summary order",v=>{v.summary.medianMs=15}], ["summary max",v=>{v.summary.maxMs=5001}],
];
test.each(mutations)("rejects malformed %s", (_name,mutate)=>{const value=structuredClone(trace());mutate(value);expect(parse(value)).toMatchObject({ok:false,error:expect.any(String)});});
test("accepts truthful request failure and observations outside selected class",()=>{
 const value=structuredClone(trace());const m=value.measurements[0]!;m.affinityRequestSucceeded=false;m.affinityError="Win32 request failed";m.observedLogicalCpus=[{group:0,logicalProcessorIndex:1,samples:382}];m.requestedClassSamples=0;
 expect(parse(value).ok).toBe(true);
});

test.each([
 ["machine.cpuName",null], ["machine.os",null], ["machine.topologyDetected",null],
 ["cpuSets.0.allocated","yes"], ["cpuSets.0.allocatedToTargetProcess",1],
 ["scenario.repeats",1.5], ["measurements.0.elapsedMs",Infinity],
 ["measurements.0.observedLogicalCpus.0.group",65536],
 ["measurements.0.observedLogicalCpus.0.logicalProcessorIndex",256],
 ["measurements.0.observedLogicalCpus.0.samples",1.5],
 ["measurements.0.totalSamples",1.5], ["measurements.0.requestedClassSamples",-1],
 ["measurements.0.affinityError",7], ["measurements.0.checksum",5],
 ["summary.medianMs",null], ["summary.minMs","12"], ["summary.maxMs",Infinity],
 ["notes.0",3],
] as const)("rejects wrong nested field %s",(path,value)=>{
 const source=structuredClone(trace());const keys=path.split(".");let target:Record<string,unknown>=source;
 for(const key of keys.slice(0,-1)) target=target[key] as Record<string,unknown>;
 target[keys.at(-1)!]=value;expect(parse(source).ok).toBe(false);
});
test("allows single-class topology detection without a comparison",()=>{
 const v={...trace(),cpuSets:[cpu],scenario:{workload:"detect",requestedClass:"none",repeats:0,iterations:0,warmupRuns:0},measurements:[],summary:null};expect(parse(v).ok).toBe(true);
});
test("byte cap counts multibyte text",()=>expect(parseHardwareTrace("é".repeat(MAX_TRACE_BYTES/2+1)).ok).toBe(false));
