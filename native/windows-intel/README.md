# Windows CPU Sets experiment

This optional C++20 console program detects Windows CPU Sets and measures one
deterministic integer workload. It is a separate CMake project: it does not link
the scheduling core, compute FCFS/SJF results, or connect to the browser.

Build on Windows 10 or newer with a recent Windows SDK, CMake, PowerShell 7, and
Visual Studio C++ tools. No third-party libraries or elevation are required.
From the repository root, in PowerShell:

```powershell
cmake -S native/windows-intel -B build/intel
cmake --build build/intel --config Release
ctest --test-dir build/intel --output-on-failure -C Release

build/intel/Release/schedlab-intel.exe --help
build/intel/Release/schedlab-intel.exe detect --output topology.json
# Explicit opt-in: close other heavy workloads and let the machine cool first.
build/intel/Release/schedlab-intel.exe bench --class performance --repeats 3 --output performance.json
build/intel/Release/schedlab-intel.exe bench --class efficient --repeats 3 --output efficient.json
```

`detect` only reads topology and metadata. It never creates a worker or runs the
compute workload. `bench` requests CPU Sets on one worker thread, performs one
warmup, then 1–20 measured runs. Both classes use the same executable, compiler
flags, thread count, xorshift seed, and 400,000,000 iterations. The uint64 checksum
is retained as decimal text in JSON, avoiding JavaScript integer precision loss.
Measured checksums must match the consumed warmup checksum.

The helper groups eligible sets by their runtime `EfficiencyClass`, choosing the
highest value for `performance` and the lowest for `efficient`. These labels are
relative to the OS classification, not universal P/E hardware identification.
Sets allocated exclusively to another process remain visible in topology but
are excluded from requests. Fewer than two eligible classes produces a clear
skip, exit code 3, and no workload or new trace.

Each run samples `GetCurrentProcessorNumberEx` at iteration 0 and every 1,048,576
iterations thereafter (382 samples for a completed run). Observations identify
both processor group and group-local logical CPU index. `requestedClassSamples`
counts observations in the requested efficiency class from the entire detected
topology; this is distinct from membership in the requested eligible CPU Set IDs.
It is sampling evidence, not continuous execution tracking. Elapsed wall time
uses QueryPerformanceCounter; summaries report median, minimum, and maximum.

Ctrl+C and Ctrl+Break request cooperative cancellation. Each checkpoint checks
cancellation, a 5-second per-run limit, and a 30-second total limit including the
warmup. Checks also run at completion. A descheduled worker can observe a deadline
late; the program does not forcibly terminate threads or claim a hard real-time
wall-clock guarantee. Interrupted or over-limit work is not emitted as a complete
measurement. The main thread joins the worker before returning.

Exit codes are 0 for success, 1 for invalid input, I/O, metadata, cancellation or
deadline failure, 2 for a failed CPU Set request with a truthful completed trace,
and 3 for the unsupported-class skip. Read the exit code: on failure or skip an
older destination file may remain. Successful output is written as UTF-8 to a
new temporary sibling and replaced only after the full write succeeds.

All trace strings are JSON-escaped, all control bytes are escaped, and numeric
formatting is independent of the user's locale. CPU name comes from the registry;
the active power scheme's friendly name is read through the Windows power APIs.
API failures report the operation and Win32 error. Registry/power metadata failure
is an error rather than an invented machine label. This program changes neither
process affinity nor system power settings.

The three `examples/sample-native*.json` files are previously collected on the
named machine and timestamp. They are empirical examples, not portable timing
guarantees. Compare results with their recorded power plan and caveats. Temperature,
power limits, core parking, SMT siblings and background activity remain uncontrolled.
CPU Sets constrain scheduling; they do not provide hardware isolation. This helper
does not read or reimplement Intel Thread Director and never converts milliseconds
to simulated ticks.

CTest covers malformed/overflowing CLI input, fake heterogeneous/single-class sets,
exclusive allocations, processor groups, finite statistics, JSON controls and UTF-8,
locale handling, deterministic work, cancellation/deadlines, variable-sized topology
records, a real workload-free detect run, and the saved measurement fixtures.
Tests never require the current machine to have two efficiency classes and do not
automatically benchmark it.

API references: [CPU Set enumeration](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getsystemcpusetinformation),
[variable-sized records](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-system_cpu_set_information),
[thread CPU Set requests](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-setthreadselectedcpusets),
and [power scheme names](https://learn.microsoft.com/en-us/windows/win32/api/powrprof/nf-powrprof-powerreadfriendlyname).
