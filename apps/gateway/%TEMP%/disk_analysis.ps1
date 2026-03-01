$folders = Get-ChildItem C:\ -Directory -ErrorAction SilentlyContinue
$results = @()

foreach ($folder in $folders) {
    try {
        $size = (Get-ChildItem $folder.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        $sizeGB = [math]::Round($size/1GB, 2)
        $results += [PSCustomObject]@{
            Folder = $folder.Name
            SizeGB = $sizeGB
        }
    } catch {
        # Skip folders we can't access
    }
}

$results | Sort-Object SizeGB -Descending | Format-Table -AutoSize
