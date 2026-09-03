<#
.SYNOPSIS
    Khoi phuc ten file bi hong trong qua trinh copy tu server Linux xuong Windows.

.DESCRIPTION
    Snapshot nay co 3 kieu hong ten file khac nhau, deu do encoding khi truyen file:

    Kieu 1 - MOJIBAKE: bytes UTF-8 bi doc nhu CP1252.
             'åå­—åº“.xlsx'  ->  '名字库.xlsx'
             Phep sua: name -> encode CP1252 -> bytes -> decode UTF-8

    Kieu 2 - QMARK: ky tu khong map duoc bi thay bang '?' roi URL-encode thanh '%3F'.
             '%3F%3F%3F.xlsx'  ->  khong the suy ra ten goc
             Da kiem chung MD5: moi file kieu nay deu TRUNG NOI DUNG voi mot file
             kieu 1, nen xoa duoc ma khong mat du lieu. Script chi xoa khi tim
             thay ban trung; neu khong co ban trung thi bao dong va giu lai.

    Kieu 3 - PERCENT: ten bi URL-encode (tai qua HTTP / file manager web).
             '%E4%BE%A0%E5%AE%A2...txt'  ->  '侠客道游戏隐私政策.txt'
             '..._s1%202-....wav'        ->  '..._s1 2-....wav'
             Phep sua: URL-decode

    Script mac dinh chay DRY-RUN. Doi ten qua ten tam trung gian de tranh dung do.

.PARAMETER Path
    Thu muc goc can quet (de quy). Mac dinh: thu muc cha cua tools/

.PARAMETER Apply
    Thuc su doi ten. Khong co tham so nay thi chi in ra.

.PARAMETER RemoveDuplicates
    Xoa cac file kieu 2 da xac nhan trung noi dung. Chi tac dung kem -Apply.

.PARAMETER SkipPercent
    Bo qua kieu 3. Dung neu ban muon giu nguyen ten percent-encoded.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File tools/fix-filenames.ps1
    # Xem truoc toan bo thay doi, khong sua gi

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File tools/fix-filenames.ps1 -Apply
    # Doi ten that, giu lai cac ban trung '%3F'

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File tools/fix-filenames.ps1 -Apply -RemoveDuplicates
    # Doi ten + xoa ban trung
#>
[CmdletBinding()]
param(
    [string] $Path,
    [switch] $Apply,
    [switch] $RemoveDuplicates,
    [switch] $SkipPercent
)

$ErrorActionPreference = 'Stop'

if (-not $Path) { $Path = Split-Path -Parent $PSScriptRoot }
if (-not (Test-Path -LiteralPath $Path)) { throw "Khong tim thay: $Path" }
$Path = (Resolve-Path -LiteralPath $Path).Path

# Encoder CP1252 nem exception thay vi thay ky tu khong ma hoa duoc bang '?'.
# Bat buoc phai vay: neu dung encoder mac dinh, mot ten tieng Trung DUNG se bi
# bien thanh '???????' va script se doi ten sai.
$cp1252 = [System.Text.Encoding]::GetEncoding(
              1252,
              (New-Object System.Text.EncoderExceptionFallback),
              (New-Object System.Text.DecoderExceptionFallback))
$utf8   = [System.Text.Encoding]::UTF8
$REPL   = [char]0xFFFD

function Get-FixedName {
    <#  Tra ve @{ Name; Kind } hoac $null neu ten da dung.
        Kind: 'mojibake' | 'percent' | 'qmark'  #>
    param([string] $Name)

    if ($Name -like '*%3F*') { return @{ Name = $null; Kind = 'qmark' } }

    # Kieu 3: percent-encoded. Chi nhan khi decode ra khac va "co nghia"
    # (sinh ra ky tu ngoai ASCII hoac khoang trang) -> tranh pha ten hop le co dau '%'.
    if (-not $SkipPercent -and $Name -match '%[0-9A-Fa-f]{2}') {
        try { $dec = [uri]::UnescapeDataString($Name) } catch { $dec = $Name }
        if ($dec -ne $Name -and -not $dec.Contains($REPL) -and ($dec -match '[^\x00-\x7F]| ')) {
            # Ten sau khi decode van con the bi mojibake -> xu ly tiep o duoi
            $Name = $dec
            $wasPercent = $true
        }
    }

    # Kieu 1: mojibake.
    # Bo qua neu ten DA chua CJK / Hiragana / Katakana -> ten do da dung roi,
    # mojibake qua CP1252 khong bao gio sinh ra ky tu CJK.
    $hasCJK = $Name -match '[⺀-鿿豈-﫿＀-￯]'
    if (-not $hasCJK -and $Name -match '[^\x00-\x7F]') {
        try {
            # GetBytes nem exception neu co ky tu khong nam trong CP1252 -> khong phai mojibake
            $d = $utf8.GetString($cp1252.GetBytes($Name))
            if (-not $d.Contains($REPL) -and $d -ne $Name) {
                $kind = if ($wasPercent) { 'percent+mojibake' } else { 'mojibake' }
                return @{ Name = $d; Kind = $kind }
            }
        } catch { }
    }

    if ($wasPercent) { return @{ Name = $Name; Kind = 'percent' } }
    return $null
}

function Test-InvalidName {
    param([string] $Name)
    $bad = [System.IO.Path]::GetInvalidFileNameChars()
    foreach ($c in $Name.ToCharArray()) { if ($bad -contains $c) { return $true } }
    return $false
}

Write-Host ""
Write-Host "Goc    : $Path"
Write-Host "Che do : $(if ($Apply) { 'APPLY - doi ten that' } else { 'DRY-RUN - chi in ra' })"
Write-Host ""

$files = Get-ChildItem -LiteralPath $Path -Recurse -Force -File -ErrorAction SilentlyContinue |
         Where-Object { $_.Name -match '[^\x00-\x7F]|%[0-9A-Fa-f]{2}' }

if ($files.Count -eq 0) {
    Write-Host "Khong tim thay ten file nao bi hong. Khong co gi phai lam." -ForegroundColor Green
    Write-Host ""
    return
}

Write-Host "Tim thay $($files.Count) file co ten kha nghi. Dang tinh MD5 de doi chieu ban trung..."

$index = foreach ($f in $files) {
    $fix = Get-FixedName $f.Name
    [pscustomobject]@{
        File   = $f
        Name   = $f.Name
        Dir    = $f.Directory.FullName
        Target = $fix.Name
        Kind   = $fix.Kind
        Hash   = (Get-FileHash -LiteralPath $f.FullName -Algorithm MD5).Hash
    }
}

$renames = @()
$dupes   = @()
$orphans = @()
$noop    = @()

foreach ($e in $index) {
    if ($e.Kind -eq 'qmark') {
        $twin = $index | Where-Object { $_.Hash -eq $e.Hash -and $_.Name -ne $e.Name -and $_.Kind -ne 'qmark' } | Select-Object -First 1
        if ($twin) { $dupes   += [pscustomobject]@{ E = $e; TwinName = $twin.Target } }
        else       { $orphans += $e }
        continue
    }
    if (-not $e.Target -or $e.Target -eq $e.Name) { $noop += $e; continue }
    if (Test-InvalidName $e.Target) {
        Write-Warning "Bo qua '$($e.Name)': ten sau khi sua chua ky tu khong hop le tren Windows."
        continue
    }
    $renames += $e
}

# --- Bao cao ---
$byKind = $renames | Group-Object Kind | Sort-Object Name
Write-Host ""
Write-Host "=== $($renames.Count) file se doi ten ===" -ForegroundColor Cyan
foreach ($g in $byKind) { "   {0,-18} {1} file" -f $g.Name, $g.Count }
Write-Host ""
foreach ($g in $byKind) {
    Write-Host "-- $($g.Name) --" -ForegroundColor DarkCyan
    foreach ($e in $g.Group) {
        $rel = $e.Dir.Substring($Path.Length).TrimStart('\')
        "   [{0}] {1}`n        -> {2}" -f $(if ($rel) { $rel } else { '.' }), $e.Name, $e.Target
    }
}

if ($dupes.Count -gt 0) {
    Write-Host ""
    Write-Host "=== $($dupes.Count) file '%3F' la ban trung (xoa duoc) ===" -ForegroundColor Cyan
    foreach ($d in $dupes) { "   {0}`n        trung noi dung voi: {1}" -f $d.E.Name, $d.TwinName }
}

if ($orphans.Count -gt 0) {
    Write-Host ""
    Write-Host "=== $($orphans.Count) file '%3F' KHONG co ban trung — CAN LAY LAI TU SERVER ===" -ForegroundColor Red
    foreach ($o in $orphans) { "   {0}  ({1} bytes)" -f $o.Name, $o.File.Length }
}

if ($noop.Count -gt 0) {
    Write-Host ""
    Write-Host "($($noop.Count) file co ten non-ASCII nhung da dung, bo qua)" -ForegroundColor DarkGray
}

if (-not $Apply) {
    Write-Host ""
    Write-Host "DRY-RUN: khong co gi bi thay doi." -ForegroundColor Green
    Write-Host "  -Apply                      doi ten that"
    Write-Host "  -Apply -RemoveDuplicates    doi ten + xoa $($dupes.Count) ban trung"
    Write-Host ""
    return
}

# --- Thuc thi: doi ten qua ten tam de tranh dung do ---
$ok = 0; $fail = 0
foreach ($e in $renames) {
    $dest = Join-Path $e.Dir $e.Target
    if (Test-Path -LiteralPath $dest) {
        Write-Warning "Bo qua '$($e.Name)': '$($e.Target)' da ton tai."
        $fail++; continue
    }
    try {
        $tmpLeaf = "__fixtmp_{0}__" -f [guid]::NewGuid().ToString('N')
        Rename-Item -LiteralPath $e.File.FullName -NewName $tmpLeaf
        Rename-Item -LiteralPath (Join-Path $e.Dir $tmpLeaf) -NewName $e.Target
        $ok++
    } catch {
        Write-Warning "Loi khi doi '$($e.Name)': $_"
        $fail++
    }
}
Write-Host ""
$failNote = if ($fail) { " ($fail that bai)" } else { '' }
Write-Host "Da doi ten $ok file$failNote." -ForegroundColor Green

if ($RemoveDuplicates -and $dupes.Count -gt 0) {
    $del = 0
    foreach ($d in $dupes) {
        if (Test-Path -LiteralPath $d.E.File.FullName) {
            Remove-Item -LiteralPath $d.E.File.FullName -Force -Confirm:$false
            $del++
        }
    }
    Write-Host "Da xoa $del ban trung '%3F'." -ForegroundColor Green
} elseif ($dupes.Count -gt 0) {
    Write-Host "Con $($dupes.Count) ban trung '%3F' chua xoa (them -RemoveDuplicates)." -ForegroundColor Yellow
}

# --- Kiem tra lai ---
$left = (Get-ChildItem -LiteralPath $Path -Recurse -Force -File -ErrorAction SilentlyContinue |
         Where-Object { $_.Name -match '%[0-9A-Fa-f]{2}' -or ($_.Name -match '[^\x00-\x7F]' -and (Get-FixedName $_.Name)) }).Count
Write-Host ""
Write-Host "Con $left file co ten con kha nghi." -ForegroundColor $(if ($left -eq 0) { 'Green' } else { 'Yellow' })
Write-Host ""
