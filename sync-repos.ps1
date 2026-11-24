<#
.SYNOPSIS
    Clona o actualiza todos los repositorios listados en repos.txt.

.DESCRIPTION
    - Si el directorio no existe, lo clona.
    - Si existe, hace `git pull --ff-only` (nunca crea merges ni pisa cambios locales).
      Se salta los repositorios con cambios sin commitear.
    - Distingue los repositorios que han traído commits nuevos (con el rango y el número de
      commits) de los que ya estaban al día; en pantalla solo se listan los que cambian.
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
$upToDate = [System.Collections.Generic.List[string]]::new()
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
        git clone -q -c core.longpaths=true $url $path
        if ($LASTEXITCODE -eq 0) { $cloned.Add($dir) } else { $failed.Add($dir) }
        continue
    }

    if ($CloneOnly) { continue }

    if (git -C $path status --porcelain) {
        Write-Host "[skip] $dir tiene cambios sin commitear" -ForegroundColor Yellow
        $skipped.Add($dir); continue
    }

    $branch = git -C $path branch --show-current
    $before = git -C $path rev-parse --short HEAD
    git -C $path pull -q --ff-only
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[error] ${dir} (${branch}): falló git pull" -ForegroundColor Red
        $failed.Add($dir); continue
    }
    $after = git -C $path rev-parse --short HEAD

    if ($before -eq $after) {
        $upToDate.Add($dir)
    } else {
        $count = git -C $path rev-list --count "$before..$after"
        $summary = "${dir} (${branch}): $before..$after, $count commit(s)"
        Write-Host "[update] $summary" -ForegroundColor Green
        $updated.Add($summary)
    }
}

Write-Host ''
Write-Host "Clonados: $($cloned.Count)  Actualizados: $($updated.Count)  Al día: $($upToDate.Count)  Saltados: $($skipped.Count)  Fallidos: $($failed.Count)"
$cloned  | ForEach-Object { Write-Host "  clonado:     $_" -ForegroundColor Cyan }
$updated | ForEach-Object { Write-Host "  actualizado: $_" -ForegroundColor Green }
$skipped | ForEach-Object { Write-Host "  saltado:     $_" -ForegroundColor Yellow }
$failed  | ForEach-Object { Write-Host "  fallido:     $_" -ForegroundColor Red }

if ($failed.Count -gt 0) { exit 1 }
exit 0
