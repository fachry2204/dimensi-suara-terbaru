$ErrorActionPreference = "Stop"

$launcherDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDirectory = Resolve-Path (Join-Path $launcherDirectory "..\..")
$outputFile = Join-Path $projectDirectory "DimensiSuaraServer.exe"
$sourceFile = Join-Path $launcherDirectory "DimensiSuaraLauncher.cs"
$compiler = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"

if (-not (Test-Path -LiteralPath $compiler)) {
    $compiler = "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
}

if (-not (Test-Path -LiteralPath $compiler)) {
    throw "Compiler C# bawaan Windows tidak ditemukan."
}

& $compiler /nologo /target:exe /platform:anycpu /optimize+ /utf8output /out:$outputFile $sourceFile
if ($LASTEXITCODE -ne 0) {
    throw "Kompilasi launcher gagal dengan exit code $LASTEXITCODE."
}
Write-Host "Launcher berhasil dibuat: $outputFile"
