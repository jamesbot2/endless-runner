param(
    [string]$OutDir = "apps/desktop/build"
)

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class NativeIcon {
    [DllImport("user32.dll", SetLastError=true)]
    public static extern bool DestroyIcon(IntPtr hIcon);
}
"@

function New-RoundedRectPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    return $path
}

function New-Pen([int]$a, [int]$r, [int]$g, [int]$b, [float]$w) {
    return New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb($a, $r, $g, $b)), $w
}

function Draw-GlowLine($g, [System.Drawing.PointF]$a, [System.Drawing.PointF]$b, [int]$r, [int]$gr, [int]$bl) {
    foreach ($spec in @(@(44, 42), @(66, 26), @(100, 14), @(230, 6))) {
        $pen = New-Pen $spec[0] $r $gr $bl $spec[1]
        $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
        $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
        $g.DrawLine($pen, $a, $b)
        $pen.Dispose()
    }
}

function Draw-GlowEllipse($g, [System.Drawing.RectangleF]$rect, [int]$r, [int]$gr, [int]$bl) {
    foreach ($spec in @(@(36, 34), @(72, 20), @(210, 7))) {
        $pen = New-Pen $spec[0] $r $gr $bl $spec[1]
        $g.DrawEllipse($pen, $rect)
        $pen.Dispose()
    }
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$size = 1024
$bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$bounds = [System.Drawing.RectangleF]::new(0, 0, $size, $size)
$bgPath = New-RoundedRectPath 18 18 988 988 190
$clipPath = $bgPath.Clone()
$g.SetClip($clipPath)

$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $bounds, ([System.Drawing.Color]::FromArgb(255, 7, 9, 22)), ([System.Drawing.Color]::FromArgb(255, 21, 6, 35)), 90
$g.FillRectangle($bgBrush, $bounds)
$bgBrush.Dispose()

$vignette = New-Object System.Drawing.Drawing2D.PathGradientBrush $bgPath
$vignette.CenterColor = [System.Drawing.Color]::FromArgb(255, 35, 15, 62)
$vignette.SurroundColors = @([System.Drawing.Color]::FromArgb(255, 0, 0, 0))
$g.FillPath($vignette, $bgPath)
$vignette.Dispose()

# Futuristic skyline and hologram panels.
$rng = New-Object System.Random 37
for ($side = 0; $side -lt 2; $side++) {
    $xStart = if ($side -eq 0) { 40 } else { 720 }
    for ($i = 0; $i -lt 8; $i++) {
        $w = 42 + $rng.Next(58)
        $h = 130 + $rng.Next(250)
        $x = $xStart + $rng.Next(210)
        if ($side -eq 1) { $x = 700 + $rng.Next(210) }
        $y = 270 + $rng.Next(130)
        $rect = [System.Drawing.RectangleF]::new($x, $y, $w, $h)
        $building = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(150, 9, 17, 35))
        $g.FillRectangle($building, $rect)
        $building.Dispose()
        $lineColor = if ($i % 2 -eq 0) { [System.Drawing.Color]::FromArgb(170, 0, 235, 255) } else { [System.Drawing.Color]::FromArgb(170, 255, 37, 211) }
        $pen = New-Object System.Drawing.Pen $lineColor, 3
        for ($yy = $y + 22; $yy -lt $y + $h; $yy += 38) {
            $g.DrawLine($pen, $x + 8, $yy, $x + $w - 8, $yy)
        }
        $pen.Dispose()
    }
}

# Black glass track in perspective.
$track = New-Object System.Drawing.Drawing2D.GraphicsPath
$track.AddPolygon(@(
    [System.Drawing.PointF]::new(318, 1024),
    [System.Drawing.PointF]::new(706, 1024),
    [System.Drawing.PointF]::new(595, 322),
    [System.Drawing.PointF]::new(429, 322)
))
$trackBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush ([System.Drawing.RectangleF]::new(310, 320, 404, 704)), ([System.Drawing.Color]::FromArgb(255, 5, 9, 18)), ([System.Drawing.Color]::FromArgb(255, 24, 29, 42)), 90
$g.FillPath($trackBrush, $track)
$trackBrush.Dispose()

Draw-GlowLine $g ([System.Drawing.PointF]::new(318, 1015)) ([System.Drawing.PointF]::new(429, 322)) 255 38 210
Draw-GlowLine $g ([System.Drawing.PointF]::new(706, 1015)) ([System.Drawing.PointF]::new(595, 322)) 120 78 255
Draw-GlowLine $g ([System.Drawing.PointF]::new(512, 1018)) ([System.Drawing.PointF]::new(512, 350)) 0 225 255

for ($z = 0; $z -lt 8; $z++) {
    $t = $z / 8.0
    $y = 955 - [Math]::Pow($t, 1.6) * 560
    $half = 190 - $t * 118
    $pen = New-Pen 100 0 230 255 (5 - $t * 3)
    $g.DrawLine($pen, 512 - $half, $y, 512 + $half, $y)
    $pen.Dispose()
}

# Runner silhouette with cyan rim light and magenta speed shadow.
$shadowPen = New-Pen 95 255 30 205 42
$shadowPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$shadowPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$g.DrawLine($shadowPen, 472, 484, 396, 558)
$g.DrawLine($shadowPen, 548, 496, 635, 552)
$g.DrawLine($shadowPen, 506, 585, 438, 734)
$g.DrawLine($shadowPen, 526, 594, 626, 724)
$shadowPen.Dispose()

$bodyPen = New-Pen 255 225 246 255 28
$bodyPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$bodyPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$rimPen = New-Pen 255 0 238 255 10
$rimPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$rimPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

Draw-GlowEllipse $g ([System.Drawing.RectangleF]::new(462, 324, 104, 104)) 0 230 255
$headBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 230, 246, 255))
$g.FillEllipse($headBrush, 475, 337, 78, 78)
$headBrush.Dispose()

$g.DrawLine($bodyPen, 514, 431, 505, 570)
$g.DrawLine($rimPen, 514, 431, 505, 570)
$g.DrawLine($bodyPen, 500, 470, 406, 548)
$g.DrawLine($rimPen, 500, 470, 406, 548)
$g.DrawLine($bodyPen, 524, 476, 630, 535)
$g.DrawLine($rimPen, 524, 476, 630, 535)
$g.DrawLine($bodyPen, 506, 570, 432, 730)
$g.DrawLine($rimPen, 506, 570, 432, 730)
$g.DrawLine($bodyPen, 522, 580, 628, 708)
$g.DrawLine($rimPen, 522, 580, 628, 708)
$bodyPen.Dispose()
$rimPen.Dispose()

foreach ($line in @(
    @(160, 470, 330, 430, 255, 40, 210),
    @(660, 390, 880, 332, 0, 220, 255),
    @(130, 670, 365, 650, 120, 78, 255),
    @(650, 710, 920, 760, 255, 40, 210)
)) {
    $pen = New-Pen 150 $line[4] $line[5] $line[6] 9
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($pen, $line[0], $line[1], $line[2], $line[3])
    $pen.Dispose()
}

$g.ResetClip()
$borderPen = New-Pen 210 0 230 255 8
$g.DrawPath($borderPen, $bgPath)
$borderPen.Dispose()

$pngPath = Join-Path $OutDir "icon.png"
$icoPath = Join-Path $OutDir "icon.ico"
$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

$icoBmp = New-Object System.Drawing.Bitmap 256, 256, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$ig = [System.Drawing.Graphics]::FromImage($icoBmp)
$ig.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$ig.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$ig.DrawImage($bmp, 0, 0, 256, 256)
$ig.Dispose()
$hIcon = $icoBmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = [System.IO.File]::Open($icoPath, [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
$icon.Dispose()
[NativeIcon]::DestroyIcon($hIcon) | Out-Null

$g.Dispose()
$bmp.Dispose()
$icoBmp.Dispose()
$bgPath.Dispose()
$clipPath.Dispose()

Write-Host "Wrote $pngPath and $icoPath"
