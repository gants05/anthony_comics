# Function to create an SVG file
function New-SvgImage {
    param (
        [string]$Path,
        [string]$Text,
        [string]$BgColor,
        [string]$TextColor,
        [int]$Width,
        [int]$Height
    )

    $svgContent = @"
<svg width="$Width" height="$Height" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="$BgColor" />
  <text x="50%" y="50%" font-family="Arial" font-size="24" fill="$TextColor" dominant-baseline="middle" text-anchor="middle">$Text</text>
  <rect x="5%" y="5%" width="90%" height="90%" fill="none" stroke="$TextColor" stroke-width="5" />
</svg>
"@
    Set-Content -Path $Path -Value $svgContent
}

# Create Assets Directory if not exists
$assetsDir = "assets"
if (-not (Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir
}

# Generate Covers (Portrait 2:3 ratio)
New-SvgImage -Path "$assetsDir\cover_hero.svg" -Text "ECHOES OF THE VOID" -BgColor "#1a1a1a" -TextColor "#FF3B30" -Width 400 -Height 600
New-SvgImage -Path "$assetsDir\cover_1.svg" -Text "SOUL REAVER" -BgColor "#222" -TextColor "#3498db" -Width 300 -Height 450
New-SvgImage -Path "$assetsDir\cover_2.svg" -Text "CYBER DRIFTER" -BgColor "#222" -TextColor "#9b59b6" -Width 300 -Height 450
New-SvgImage -Path "$assetsDir\cover_3.svg" -Text "MIDNIGHT RONIN" -BgColor "#222" -TextColor "#2ecc71" -Width 300 -Height 450

# Generate Pages (Portrait)
New-SvgImage -Path "$assetsDir\page_1.svg" -Text "PAGE 1 - SAMPLE" -BgColor "#fff" -TextColor "#000" -Width 600 -Height 900
New-SvgImage -Path "$assetsDir\page_2.svg" -Text "PAGE 2 - ACTION" -BgColor "#fff" -TextColor "#000" -Width 600 -Height 900
New-SvgImage -Path "$assetsDir\page_3.svg" -Text "PAGE 3 - END" -BgColor "#fff" -TextColor "#000" -Width 600 -Height 900

Write-Host "Assets generated successfully!"
