$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'dist-extension'
$release = Join-Path $root 'release-artifacts'
$archive = Join-Path $release 'wesst-calculator-chrome-extension.zip'

if (-not (Test-Path -LiteralPath $source)) {
  throw 'dist-extension was not found. Run npm run extension:build first.'
}

New-Item -ItemType Directory -Path $release -Force | Out-Null
if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive -Force }
Compress-Archive -Path (Join-Path $source '*') -DestinationPath $archive -CompressionLevel Optimal
Write-Output $archive
