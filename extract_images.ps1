Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('d:\code\HDSD LandBase.docx')
$mediaEntries = $zip.Entries | Where-Object { $_.FullName -like 'word/media/*' }
Write-Host "Media count: $($mediaEntries.Count)"
$imgDir = 'd:\code\docs_images'
if (!(Test-Path $imgDir)) { New-Item -ItemType Directory -Path $imgDir | Out-Null }
foreach ($entry in $mediaEntries) {
    $fileName = [System.IO.Path]::GetFileName($entry.FullName)
    $targetPath = Join-Path $imgDir $fileName
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $targetPath, $true)
    Write-Host "Extracted: $fileName"
}
$zip.Dispose()
