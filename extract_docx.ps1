Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("d:\code\HDSD LandBase.docx")
$entry = $zip.GetEntry("word/document.xml")
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$xml = [xml]$reader.ReadToEnd()
$stream.Close()
$zip.Dispose()

$paragraphs = $xml.document.body.p | ForEach-Object { $_.InnerText }
$paragraphs | Out-File -FilePath "d:\code\hdsd_extracted.txt" -Encoding utf8
Write-Host "Extracted paragraphs count: $($paragraphs.Count)"
