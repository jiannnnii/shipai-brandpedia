# 识牌 App icon: dark ink bg + gold frame + serif shi glyph (U+8BC6)
Add-Type -AssemblyName System.Drawing
$size = 512
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'AntiAliasGridFit'
$g.PixelOffsetMode = 'HighQuality'
$g.Clear([System.Drawing.Color]::FromArgb(26, 24, 31))
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(201, 165, 94), 6)
$g.DrawRectangle($pen, 26, 26, 460, 460)
$font = New-Object System.Drawing.Font('SimSun', 260, [System.Drawing.FontStyle]::Bold)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(242, 239, 233))
$fmt = New-Object System.Drawing.StringFormat
$fmt.Alignment = 'Center'
$fmt.LineAlignment = 'Center'
$glyph = [string][char]0x8BC6
$rect = New-Object System.Drawing.RectangleF(0, 10, $size, $size)
$g.DrawString($glyph, $font, $brush, $rect, $fmt)
$g.Dispose()
$bmp.Save('C:\Users\13506\zcode-tools\dl\appicon.png', [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output 'ICON_DONE'
