param(
    [string]$ProjectRoot = (Join-Path $PSScriptRoot '../../..'),
    [string]$BaselinePath
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath $ProjectRoot).Path
function Inventory($paths) {
    @($paths | Sort-Object -Unique | ForEach-Object {
        $full = Join-Path $root $_
        if (!(Test-Path -LiteralPath $full -PathType Leaf)) { throw "Inventory file missing: $_" }
        [ordered]@{ path=$_.Replace('\','/'); sha256=(Get-FileHash -LiteralPath $full -Algorithm SHA256).Hash }
    })
}
if (!(Test-Path -LiteralPath (Join-Path $root 'reference/v1')) -or !(Test-Path -LiteralPath (Join-Path $root 'dist'))) { throw 'ProjectRoot must contain reference/v1 and dist.' }
$names = @(git -C $root ls-files --cached --others --exclude-standard)
if ($LASTEXITCODE -ne 0) { throw 'Git inventory unavailable; scope is unverified. No files changed.' }
$protected = @($names | Where-Object { ($_ -split '/')[-1] -cin @('README.md','TODO.md','PRD.md') })
$legacy = @(Inventory @($names | Where-Object { $_ -like 'reference/v1/*' }))
$sources = @(Inventory @($names | Where-Object { $_ -like 'dist/*.js' -and ($_ -split '/').Count -eq 2 }))
$rootSources = @(Inventory @($names | Where-Object { $_ -notlike '*/*' -and $_ -like '*.js' }))
$snapshot = @(Inventory @($names | Where-Object { ($_ -notlike 'docs/*' -and $_ -notlike 'skills/*') -or $_ -in $protected }))
$hits = @($sources | ForEach-Object { $file=$_; Select-String -LiteralPath (Join-Path $root $file.path) -Pattern '\b(localStorage|sessionStorage)\b|\.(getItem|setItem|removeItem|clear)\s*\(' | ForEach-Object { [ordered]@{path=$file.path;line=$_.LineNumber;text=$_.Line.Trim()} } })
$comparison = $null
if ($BaselinePath) {
    $old = Get-Content -LiteralPath $BaselinePath -Raw -Encoding UTF8 | ConvertFrom-Json
    if (!$old.snapshotFiles) { throw 'Baseline needs snapshotFiles from the improved tool; do not infer equality from an old limited inventory.' }
    $before=@{}; $after=@{}
    foreach($f in $old.snapshotFiles){$before[$f.path]=$f.sha256}
    foreach($f in $snapshot){$after[$f.path]=$f.sha256}
    $changes=@( (@($before.Keys)+@($after.Keys)) | Sort-Object -Unique | ForEach-Object {
        if($before[$_] -ne $after[$_]){[ordered]@{path=$_;before=$before[$_];after=$after[$_]}}
    })
    $comparison=[ordered]@{changes=$changes; protectedChanges=@($changes | Where-Object { ($_.path -split '/')[-1] -cin @('README.md','TODO.md','PRD.md') })}
}
[ordered]@{
    schemaVersion=2; scope='Read-only Git-visible source/assets/protected-document inventory; no browser storage access';
    legacyFiles=$legacy;sourceFiles=$sources;rootSourceFiles=$rootSources;protectedFiles=@(Inventory $protected);snapshotFiles=$snapshot;
    storageCandidates=$hits;comparison=$comparison;
    limitations=@('Git-ignored files are outside this inventory.','Hashes and direct-call patterns do not prove runtime preservation, calculation accuracy or visual correctness.','No files, browser storage, caches or deployment assets are modified.')
} | ConvertTo-Json -Depth 9
