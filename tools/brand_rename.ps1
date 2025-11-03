Param(
  [string]$Root = 'E:\BidWin'
)

$excludePattern = '\\node_modules\\|\.git\\|\.next\\|\\dist\\|\\build\\|\\out\\|\\coverage\\|\\.cache\\|\\.turbo\\|\\tmp\\|\\vendor\\'
$extensions = @('*.ts','*.tsx','*.js','*.jsx','*.json','*.css','*.scss','*.md','*.mdx','*.html','*.yml','*.yaml','*.env','*.cjs','*.mjs')

$files = Get-ChildItem -Path $Root -Recurse -File -Include $extensions -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch $excludePattern }
$targets = $files | Select-String -Pattern 'singbid' -SimpleMatch -List | Select-Object -ExpandProperty Path
$changed = 0
foreach ($p in $targets) {
  try {
    $c = Get-Content -LiteralPath $p -Raw
    $n = $c -creplace 'SingBid','BidWin'
    $n = $n -creplace 'SINGBID','BIDWIN'
    $n = $n -creplace 'singbid','bidwin'
    if ($n -ne $c) {
      [System.IO.File]::WriteAllText($p, $n, [System.Text.UTF8Encoding]::new($false))
      $changed++
    }
  } catch {
    Write-Verbose "Failed: $p $_" -Verbose
  }
}
Write-Output "Files scanned: $($files.Count)"
Write-Output "Files with matches: $($targets.Count)"
Write-Output "Files changed: $changed"
