param(
    [string]$DocumentPath = (Join-Path $PSScriptRoot 'output\HDSD_LandBase.docx'),
    [string]$OutputPath = (Join-Path $PSScriptRoot 'output\hdsd_extracted.txt')
)

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($DocumentPath)
$entry = $zip.GetEntry("word/document.xml")
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$xml = [xml]$reader.ReadToEnd()
$stream.Close()
$zip.Dispose()

$paragraphs = $xml.document.body.p | ForEach-Object { $_.InnerText }
$paragraphs | Out-File -FilePath $OutputPath -Encoding utf8
Write-Host "Extracted paragraphs count: $($paragraphs.Count)"
