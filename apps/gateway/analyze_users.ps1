Write-Host "Analyzing Users folder..." -ForegroundColor Cyan
Write-Host ""

$folders = Get-ChildItem C:\Users -Directory -Force -ErrorAction SilentlyContinue
$results = @()

foreach($folder in $folders) {
    Write-Host "Scanning: $($folder.Name)..." -NoNewline
    try {
        $size = (Get-ChildItem -Path $folder.FullName -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
        if ($null -eq $size) { $size = 0 }
        $sizeGB = [math]::Round($size/1GB, 2)
        
        $results += [PSCustomObject]@{
            Folder = $folder.Name
            'Size_GB' = $sizeGB
        }
        Write-Host " $sizeGB GB" -ForegroundColor Green
    } catch {
        Write-Host " [Access Denied]" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== Storage in C:\Users ===" -ForegroundColor Cyan
Write-Host ""

$results | Sort-Object Size_GB -Descending | Format-Table @{Label="User/Folder"; Expression={$_.Folder}; Width=30}, @{Label="Size (GB)"; Expression={$_.Size_GB}; Width=15; Align="Right"} -AutoSize
