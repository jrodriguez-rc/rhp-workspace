<#
.SYNOPSIS
    Clona o actualiza todos los repositorios listados en repos.txt.

.DESCRIPTION
    - Si el directorio no existe, lo clona.
    - Si existe, hace `git pull --ff-only` (nunca crea merges ni pisa cambios locales).
      Se salta los repositorios con cambios sin commitear.
    - Añade al .gitignore cualquier repositorio que todavía no esté.

.PARAMETER CloneOnly
    Solo clona los repositorios que falten, sin actualizar los existentes.

.EXAMPLE
    .\sync-repos.ps1
    .\sync-repos.ps1 -CloneOnly
#>
[CmdletBinding()]
param(
    [switch]$CloneOnly
)

$ErrorActionPreference = 'Stop'

$Root      = $PSScriptRoot
$Master    = Join-Path $Root 'repos.txt'
$GitIgnore = Join-Path $Root '.gitignore'

$cloned  = [System.Collections.Generic.List[string]]::new()
$updated = [System.Collections.Generic.List[string]]::new()
$skipped = [System.Collections.Generic.List[string]]::new()
$failed  = [System.Collections.Generic.List[string]]::new()

$ignored = @()
if (Test-Path $GitIgnore) {
    $ignored = Get-Content $GitIgnore | ForEach-Object { $_.Trim() }
}

foreach ($line in Get-Content $Master) {
    $line = $line.Trim()
    if ($line -eq '' -or $line.StartsWith('#')) { continue }

    $dir, $url = $line -split '\s+', 3
    if (-not $url) {
        Write-Host "[error] línea sin URL: $line" -ForegroundColor Red
        $failed.Add($line); continue
    }
    $path = Join-Path $Root $dir

    $entry = "$dir/"
    if ($ignored -notcontains $entry) {
        Add-Content -Path $GitIgnore -Value $entry
        $ignored += $entry
        Write-Host "[gitignore] añadido $entry" -ForegroundColor Yellow
    }

    if (-not (Test-Path (Join-Path $path '.git'))) {
        if (Test-Path $path) {
            Write-Host "[error] $dir existe pero no es un repositorio git" -ForegroundColor Red
            $failed.Add($dir); continue
        }
        Write-Host "[clone] $dir" -ForegroundColor Cyan
        git clone -q $url $path
        if ($LASTEXITCODE -eq 0) { $cloned.Add($dir) } else { $failed.Add($dir) }
        continue
    }

    if ($CloneOnly) { continue }

    if (git -C $path status --porcelain) {
        Write-Host "[skip] $dir tiene cambios sin commitear" -ForegroundColor Yellow
        $skipped.Add($dir); continue
    }

    $branch = git -C $path branch --show-current
    Write-Host "[pull] $dir ($branch)"
    git -C $path pull -q --ff-only
    if ($LASTEXITCODE -eq 0) { $updated.Add($dir) } else { $failed.Add($dir) }
}

Write-Host ''
Write-Host "Clonados: $($cloned.Count)  Actualizados: $($updated.Count)  Saltados: $($skipped.Count)  Fallidos: $($failed.Count)"
$skipped | ForEach-Object { Write-Host "  saltado: $_" -ForegroundColor Yellow }
$failed  | ForEach-Object { Write-Host "  fallido: $_" -ForegroundColor Red }

if ($failed.Count -gt 0) { exit 1 }
exit 0
