param([Parameter(Mandatory)][string]$Executable, [Parameter(Mandatory)][string]$Output)
$ErrorActionPreference = 'Stop'
function Check($Condition, [string]$Message) { if (-not $Condition) { throw $Message } }

$start = [Diagnostics.ProcessStartInfo]::new($Executable)
$start.UseShellExecute = $false
$start.CreateNoWindow = $true
$start.RedirectStandardError = $true
$start.RedirectStandardOutput = $true
foreach ($arg in @('detect', '--output', $Output)) { $start.ArgumentList.Add($arg) }
$process = [Diagnostics.Process]::Start($start)
try {
  if (-not $process.WaitForExit(10000)) { $process.Kill(); throw 'detect exceeded 10 seconds' }
  $failure = $process.StandardError.ReadToEnd()
  Check ($process.ExitCode -eq 0) "detect failed: $failure"
} finally { $process.Dispose() }
$raw = Get-Content -LiteralPath $Output -Raw
$trace = $raw | ConvertFrom-Json
Check ($trace.schemaVersion -eq 1 -and $trace.mode -ceq 'NATIVE_MEASURED') 'wrong version/mode'
Check ($raw -match '"collectedAt":"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z"') 'missing UTC timestamp'
Check ($trace.machine.cpuName -and $trace.machine.os -and $trace.powerScheme) 'missing machine/power metadata'
Check ($trace.machine.topologyDetected -is [bool]) 'missing topologyDetected'
Check ($trace.scenario.workload -ceq 'detect' -and $trace.scenario.requestedClass -ceq 'none') 'detect ran workload'
Check ($trace.scenario.repeats -eq 0 -and $trace.scenario.iterations -eq 0 -and $trace.scenario.warmupRuns -eq 0) 'detect scenario contains work'
Check ($trace.measurements.Count -eq 0 -and $null -eq $trace.summary) 'detect fabricated measurements'
Check ($trace.notes.Count -gt 0) 'missing caveats'
$ids = @{}
foreach ($set in $trace.cpuSets) {
  Check (-not $ids.ContainsKey($set.id)) 'duplicate CPU Set ID'
  $ids[$set.id] = $true
  Check ($set.id -ge 0 -and $set.id -le [uint32]::MaxValue) 'bad CPU Set ID'
  Check ($set.group -ge 0 -and $set.group -le 65535) 'bad group'
  Check ($set.logicalProcessorIndex -ge 0 -and $set.logicalProcessorIndex -le 255) 'bad logical CPU'
  Check ($set.coreIndex -ge 0 -and $set.coreIndex -le 255) 'bad core'
  Check ($set.efficiencyClass -ge 0 -and $set.efficiencyClass -le 255) 'bad class'
  Check ($set.parked -is [bool] -and $set.allocated -is [bool] -and $set.allocatedToTargetProcess -is [bool]) 'missing flags'
}
& $Executable --help | Out-Null
Check ($LASTEXITCODE -eq 0) '--help failed'
& $Executable detect --output $Output --output other.json 2>$null | Out-Null
Check ($LASTEXITCODE -ne 0) 'duplicate argument accepted'
& $Executable detect --output (Join-Path $Output 'missing.json') 2>$null | Out-Null
Check ($LASTEXITCODE -ne 0) 'bad output path accepted'
Write-Output "detect JSON self-check passed: $($trace.cpuSets.Count) CPU Sets"
