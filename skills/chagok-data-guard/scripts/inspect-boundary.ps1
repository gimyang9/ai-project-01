param(
    [string]$ProjectRoot = (Join-Path $PSScriptRoot '../../..')
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath $ProjectRoot).Path
$legacy = Join-Path $root 'reference/v1'
$dist = Join-Path $root 'dist'
if (!(Test-Path -LiteralPath $legacy) -or !(Test-Path -LiteralPath $dist)) {
    throw 'ProjectRoot must contain reference/v1 and dist.'
}
$hashes = @(Get-ChildItem -LiteralPath $legacy -File -Recurse | Sort-Object FullName | ForEach-Object {
    [ordered]@{path=$_.FullName.Substring($root.Length + 1).Replace('\','/'); sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash}
})
$sources = @(Get-ChildItem -LiteralPath $dist -Filter '*.js' -File -Recurse | Sort-Object FullName)
$sourceHashes = @($sources | ForEach-Object {
    [ordered]@{path=$_.FullName.Substring($root.Length + 1).Replace('\','/'); sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash}
})
$hits = @($sources | Select-String -Pattern '\b(localStorage|sessionStorage)\b|\.(getItem|setItem|removeItem|clear)\s*\(' | ForEach-Object {
    [ordered]@{path=$_.Path.Substring($root.Length + 1).Replace('\','/'); line=$_.LineNumber; text=$_.Line.Trim()}
})
[ordered]@{
    scope='Read-only source inventory; no browser storage access'
    legacyFiles=$hashes
    sourceFiles=$sourceHashes
    storageCandidates=$hits
    limitations=@('Pattern search can miss indirect access and include unrelated methods.','Hashes prove file identity only when compared with a trusted baseline.','No runtime, migration, backup round-trip or browser validation is performed.')
} | ConvertTo-Json -Depth 8
