<#
.SYNOPSIS
  Builds core/ with Emscripten and writes web/src/wasm/schedlab.mjs.

.DESCRIPTION
  The emsdk location comes from the EMSDK environment variable (default $HOME\emsdk).
  The output is a single ES module with the wasm embedded; it is committed on purpose so
  the web app builds on machines without the SDK. Exits non-zero with a message on failure.
#>
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$buildDir = Join-Path $repoRoot 'build/wasm'
$outputFile = Join-Path $repoRoot 'web/src/wasm/schedlab.mjs'

function Stop-Build([string]$message) {
  [Console]::Error.WriteLine("build-wasm: $message")
  exit 1
}

# Runs a native command and stops the build if it exits non-zero.
function Invoke-Step([string]$description, [scriptblock]$command) {
  & $command
  if ($LASTEXITCODE -ne 0) { Stop-Build "$description failed (exit code $LASTEXITCODE)" }
}

function Import-EmsdkEnvironment {
  $sdk = if ($env:EMSDK) { $env:EMSDK } else { Join-Path $HOME 'emsdk' }
  $envScript = Join-Path $sdk 'emsdk_env.ps1'
  if (-not (Test-Path $envScript)) {
    Stop-Build "Emscripten SDK not found at '$sdk'. Install it and set EMSDK, or use the default $HOME\emsdk."
  }
  . $envScript *> $null
  if (-not (Get-Command emcmake -ErrorAction SilentlyContinue)) {
    Stop-Build "emcmake is not on PATH after loading '$envScript'."
  }
}

# emcmake needs a generator that works on Windows; the Ninja bundled with Visual Studio is
# used when none is on PATH. Returns the extra CMake arguments that select it.
function Get-GeneratorArguments {
  $ninja = Get-Command ninja -ErrorAction SilentlyContinue
  if ($ninja) { return @('-G', 'Ninja') }
  $bundled = Get-ChildItem 'C:\Program Files\Microsoft Visual Studio\*\*\Common7\IDE\CommonExtensions\Microsoft\CMake\Ninja\ninja.exe' -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if (-not $bundled) { Stop-Build 'Ninja not found on PATH or in Visual Studio. Install Ninja.' }
  return @('-G', 'Ninja', "-DCMAKE_MAKE_PROGRAM=$($bundled.FullName)")
}

Import-EmsdkEnvironment
Write-Host (emcc --version | Select-Object -First 1)

$generator = Get-GeneratorArguments
Invoke-Step 'CMake configure' {
  emcmake cmake -S (Join-Path $repoRoot 'core') -B $buildDir @generator `
    -DCMAKE_BUILD_TYPE=Release '-DCMAKE_CXX_FLAGS_RELEASE=-O2 -DNDEBUG'
}
Invoke-Step 'CMake build' { cmake --build $buildDir --target schedlab_wasm }

$built = Join-Path $buildDir 'schedlab.mjs'
if (-not (Test-Path $built)) { Stop-Build "expected output '$built' was not produced." }
New-Item -ItemType Directory -Force (Split-Path $outputFile) | Out-Null
Copy-Item $built $outputFile -Force
Write-Host ("wrote {0} ({1:N0} bytes)" -f $outputFile, (Get-Item $outputFile).Length)
