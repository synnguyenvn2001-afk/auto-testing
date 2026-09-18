param(
    [string]$DocumentPath = (Join-Path $PSScriptRoot 'output\HDSD_LandBase.docx'),
    [string]$ImagesDirectory = (Join-Path $PSScriptRoot 'assets\images')
)

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($DocumentPath)
$mediaEntries = $zip.Entries | Where-Object { $_.FullName -like 'word/media/*' }
Write-Host "Media count: $($mediaEntries.Count)"
if (!(Test-Path $ImagesDirectory)) { New-Item -ItemType Directory -Path $ImagesDirectory | Out-Null }
foreach ($entry in $mediaEntries) {
    $fileName = [System.IO.Path]::GetFileName($entry.FullName)
    $targetPath = Join-Path $ImagesDirectory $fileName
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $targetPath, $true)
    Write-Host "Extracted: $fileName"
}
$zip.Dispose()
