# BrandPedia icon v2: ink bg + gold hang-tag graphic (no text)
Add-Type -AssemblyName System.Drawing
$size = 512
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.Clear([System.Drawing.Color]::FromArgb(26, 24, 31))

$gold = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(201, 165, 94))
$ink  = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(26, 24, 31))
$cream = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(242, 239, 233))

# tag body: rounded square built around (cx,cy), then rotated 45deg about (cx,cy)
$cx = 256.0; $cy = 280.0; $half = 130.0; $r = 56.0
$p = New-Object System.Drawing.Drawing2D.GraphicsPath
$d = 2 * $r
$p.AddArc($cx - $half, $cy - $half, $d, $d, 180, 90)
$p.AddArc($cx + $half - $d, $cy - $half, $d, $d, 270, 90)
$p.AddArc($cx + $half - $d, $cy + $half - $d, $d, $d, 0, 90)
$p.AddArc($cx - $half, $cy + $half - $d, $d, $d, 90, 90)
$p.CloseFigure()

$m = New-Object System.Drawing.Drawing2D.Matrix
$m.RotateAt(45, (New-Object System.Drawing.PointF($cx, $cy)))
$g.Transform = $m
$g.FillPath($gold, $p)
$g.ResetTransform()

# hole near the top vertex of the diamond (center + (0, -half*sqrt2) + inset)
$topY = $cy - [Math]::Sqrt(2) * $half + 78
$hr = 34
$g.FillEllipse($ink, $cx - $hr, $topY - $hr, 2 * $hr, 2 * $hr)
$g.FillEllipse($cream, $cx - 11, $topY - 11, 22, 22)

$g.Dispose()
$bmp.Save('C:\Users\13506\zcode-tools\dl\appicon2.png', [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output 'ICON2_DONE'
