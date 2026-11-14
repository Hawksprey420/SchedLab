param([Parameter(Mandatory)][string]$Examples)
$ErrorActionPreference = 'Stop'
function Check($Condition, [string]$Message) { if (-not $Condition) { throw $Message } }
$checksum = $null
foreach ($class in @('performance', 'efficient')) {
  $path = Join-Path $Examples "sample-native-trace-$class.json"
  $trace = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
  Check ($trace.mode -ceq 'NATIVE_MEASURED' -and $trace.schemaVersion -eq 1) 'bad trace version'
  Check ($trace.scenario.workload -ceq 'bounded_compute' -and $trace.scenario.requestedClass -ceq $class) 'wrong workload/class'
  Check ($trace.scenario.repeats -eq 3 -and $trace.scenario.iterations -eq 400000000 -and $trace.scenario.warmupRuns -eq 1) 'wrong fixed-work scenario'
  Check ($trace.measurements.Count -eq 3) 'missing measured runs'
  $eligible = @($trace.cpuSets | Where-Object { -not $_.allocated -or $_.allocatedToTargetProcess })
  $classes = @($eligible.efficiencyClass | Sort-Object -Unique)
  Check ($classes.Count -ge 2) 'samples need real heterogeneous topology'
  $selectedClass = if ($class -eq 'performance') { $classes[-1] } else { $classes[0] }
  $expectedSets = @($eligible | Where-Object efficiencyClass -eq $selectedClass)
  $classTopology = @($trace.cpuSets | Where-Object efficiencyClass -eq $selectedClass)
  $durations = @()
  $runNumber = 0
  foreach ($run in $trace.measurements) {
    ++$runNumber
    Check ($run.run -eq $runNumber) 'run numbering incorrect'
    Check ($run.elapsedMs -gt 0 -and $run.elapsedMs -le 5000) 'invalid duration'
    Check ($run.affinityRequestSucceeded -is [bool] -and $run.affinityError -is [string]) 'missing request outcome'
    Check ($run.selectedCpuSetIds.Count -eq $expectedSets.Count) 'incomplete class request'
    foreach ($id in $run.selectedCpuSetIds) { Check ($expectedSets.id -contains $id) 'wrong requested CPU Set' }
    $total = 0
    $inClass = 0
    $seen = @{}
    foreach ($cpu in $run.observedLogicalCpus) {
      $key = "$($cpu.group):$($cpu.logicalProcessorIndex)"
      Check (-not $seen.ContainsKey($key)) 'duplicate observed logical CPU'
      $seen[$key] = $true
      Check ($cpu.samples -gt 0) 'empty observation'
      $total += $cpu.samples
      if (@($classTopology | Where-Object { $_.group -eq $cpu.group -and $_.logicalProcessorIndex -eq $cpu.logicalProcessorIndex }).Count -gt 0) {
        $inClass += $cpu.samples
      }
    }
    Check ($total -eq 382 -and $total -eq $run.totalSamples -and $inClass -eq $run.requestedClassSamples) 'incorrect observation counts'
    Check ($run.checksum -is [string] -and $run.checksum -match '^\d+$') 'checksum must be decimal text'
    if ($null -eq $checksum) { $checksum = $run.checksum }
    Check ($checksum -ceq $run.checksum) 'fixed work checksum mismatch'
    $durations += $run.elapsedMs
  }
  $sorted = @($durations | Sort-Object)
  Check ($trace.summary.minMs -eq $sorted[0] -and $trace.summary.medianMs -eq $sorted[1] -and $trace.summary.maxMs -eq $sorted[2]) 'summary does not match observations'
  Check ($trace.powerScheme -and $trace.notes.Count -gt 0) 'missing power/caveats'
}
$detect = Get-Content -LiteralPath (Join-Path $Examples 'sample-native-topology.json') -Raw | ConvertFrom-Json
Check ($detect.scenario.workload -ceq 'detect' -and $detect.measurements.Count -eq 0 -and $null -eq $detect.summary) 'topology sample contains measurements'
Write-Output "Previously collected sample self-check passed; checksum $checksum"
