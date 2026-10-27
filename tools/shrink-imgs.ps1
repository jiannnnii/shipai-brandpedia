# 压缩超大产品图:>400KB 的缩到最长边 900px,JPEG 质量 72
Add-Type -AssemblyName System.Drawing
$dir = 'C:\Users\13506\.zcode\workspace\draft-9b6b145c-180e-45fd-a57a-907387def70d\data\img'
$files = Get-ChildItem $dir -Filter *.jpg
$shrunk = 0
foreach ($f in $files) {
  if ($f.Length -le 400KB) { continue }
  $img = [System.Drawing.Image]::FromFile($f.FullName)
  $scale = [Math]::Min(1.0, 900.0 / [Math]::Max($img.Width, $img.Height))
  $nw = [int]($img.Width * $scale); $nh = [int]($img.Height * $scale)
  $bmp = New-Object System.Drawing.Bitmap($nw, $nh)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.DrawImage($img, 0, 0, $nw, $nh)
  $g.Dispose()
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]72)
  $img.Dispose()
  $tmp = $f.FullName + '.tmp'
  $bmp.Save($tmp, $codec, $ep)
  $bmp.Dispose()
  Move-Item -Force $tmp $f.FullName
  $shrunk++
}
$total = (Get-ChildItem $dir | Measure-Object Length -Sum).Sum
Write-Output ("SHRUNK {0}  TOTAL {1:N1} MB  FILES {2}" -f $shrunk, ($total/1MB), $files.Count)
