# Safe Storage Cleanup Script
# Cleans npm-cache, Temp, node-gyp, and SquirrelTemp folders

$ErrorActionPreference = "Continue"
$localAppData = "$env:LOCALAPPDATA"

# Define folders to clean
$foldersToClean = @(
    @{Name="npm-cache"; Path="$localAppData\npm-cache"},
    @{Name="Temp"; Path="$localAppData\Temp"},
    @{Name="node-gyp"; Path="$localAppData\node-gyp"},
    @{Name="SquirrelTemp"; Path="$localAppData\SquirrelTemp"}
)

$totalFreed = 0
$results = @()

Write-Host "Starting safe cleanup..." -ForegroundColor Cyan
Write-Host ""

foreach ($folder in $foldersToClean) {
    $name = $folder.Name
    $path = $folder.Path
    
    if (Test-Path $path) {
        try {
            # Get size before deletion
            $sizeBefore = (Get-ChildItem -Path $path -Recurse -Force -ErrorAction SilentlyContinue | 
                          Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum / 1GB
            
            Write-Host "Cleaning $name..." -ForegroundColor Yellow
            Write-Host "  Path: $path"
            Write-Host "  Size: $([math]::Round($sizeBefore, 2)) GB"
            
            # Remove the folder
            Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
            
            $totalFreed += $sizeBefore
            $results += "[OK] $name - Freed $([math]::Round($sizeBefore, 2)) GB"
            Write-Host "  Status: [OK] Cleaned" -ForegroundColor Green
        }
        catch {
            $results += "[ERROR] $name - Error: $($_.Exception.Message)"
            Write-Host "  Status: [ERROR] $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    else {
        $results += "[SKIP] $name - Folder not found"
        Write-Host "$name - Folder not found (already clean)" -ForegroundColor Gray
    }
    Write-Host ""
}

Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "Cleanup Complete!" -ForegroundColor Green
Write-Host "Total Space Freed: $([math]::Round($totalFreed, 2)) GB" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:"
foreach ($result in $results) {
    Write-Host "  $result"
}
