#!/usr/bin/env bash
# Regenerates every launcher icon, splash screen and favicon from the two
# Figma exports checked in beside this script:
#
#   logo.svg    the O-quest mark  (O-quest file, node 1840:47634)
#   tartan.png  the plaid fill    (same node, 285x285 - the original upload,
#                                  so anything larger than that is upscaled)
#
# Everything else under resources/, plus the android/ios/static assets, is
# derived output - edit the two sources above and re-run, never the outputs.
#
# Requires inkscape (vector -> png) and ImageMagick 7 (`magick`).
set -euo pipefail
cd "$(dirname "$0")"

android=../android/app/src/main/res
ios=../ios/App/App/Assets.xcassets
static=../static

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

# The mark's own box, and how it sits inside the icon: 61.25% of the icon's
# width, centred - lifted from the Figma composition (147 of 240).
logo_w=147
logo_h=157.881
logo_frac=0.6125
# Adaptive icons draw a 108dp canvas but only the middle 72dp always survives
# the launcher's mask, so the mark shrinks by 72/108 to keep the same size on
# screen as it has on iOS.
safe=0.6667
backing=#1D0303

# svg_logo <scale> <x> <y> -> the mark placed on an existing canvas
svg_logo() { printf '<g transform="translate(%s,%s) scale(%s)">%s</g>' "$2" "$3" "$1" "$logo_body"; }

# centred <canvas> <fraction> -> "scale x y" placing the mark in the canvas
centred() {
  awk -v c="$1" -v f="$2" -v lw="$logo_w" -v lh="$logo_h" \
    'BEGIN { s = c * f / lw; printf "%.6f %.4f %.4f", s, (c - lw * s) / 2, (c - lh * s) / 2 }'
}

logo_body=$(sed '1d;$d' logo.svg)

echo "==> masters"

cat >icon.svg <<EOF
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<image href="tartan.png" width="1024" height="1024"/>
$(svg_logo $(centred 1024 "$logo_frac"))
</svg>
EOF

cat >icon-background.svg <<EOF
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<image href="tartan.png" width="1024" height="1024"/>
</svg>
EOF

cat >icon-foreground.svg <<EOF
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
$(svg_logo $(centred 1024 "$(awk -v f="$logo_frac" -v s="$safe" 'BEGIN { print f * s }')"))
</svg>
EOF

# splash <width> <height> <mark fraction of the short side>
splash() {
  local short=$(( $1 < $2 ? $1 : $2 ))
  local place
  place=$(awk -v w="$1" -v h="$2" -v s="$short" -v f="$3" -v lw="$logo_w" -v lh="$logo_h" \
    'BEGIN { sc = s * f / lw; printf "%.6f %.4f %.4f", sc, (w - lw * sc) / 2, (h - lh * sc) / 2 }')
  cat <<EOF
<svg xmlns="http://www.w3.org/2000/svg" width="$1" height="$2" viewBox="0 0 $1 $2">
<rect width="$1" height="$2" fill="$backing"/>
$(svg_logo $place)
</svg>
EOF
}

# iOS shows one square launch image cropped to aspect-fill, so the mark has to
# start small enough to survive losing ~55% of the square's width on a phone.
splash 2732 2732 0.155 >splash.svg

render() { inkscape "$1" -w "$2" -h "$3" -o "$4" >/dev/null 2>&1; }

echo "==> ios"
render icon.svg 1024 1024 "$work/icon.png"
# App Store rejects an icon with an alpha channel, even a fully opaque one.
magick "$work/icon.png" -background "$backing" -alpha remove -alpha off \
  "$ios/AppIcon.appiconset/AppIcon-512@2x.png"
# One single-scale image, not Capacitor's identical 1x/2x/3x triple: iOS
# aspect-fills it either way, and actool re-compresses every copy it is given.
render splash.svg 2732 2732 "$ios/Splash.imageset/splash-2732x2732.png"

echo "==> android"
# Legacy (pre-adaptive, minSdk 24) launchers draw the bitmap unmasked, so bake
# the shapes in: the design's own 34/240 corner radius, and a full circle.
magick "$work/icon.png" \
  \( +clone -alpha transparent -fill white -draw 'roundrectangle 0,0,1023,1023,145,145' \) \
  -alpha off -compose CopyOpacity -composite "$work/icon-rounded.png"
magick "$work/icon.png" \
  \( +clone -alpha transparent -fill white -draw 'circle 511.5,511.5 511.5,0' \) \
  -alpha off -compose CopyOpacity -composite "$work/icon-circle.png"
render icon-foreground.svg 1024 1024 "$work/foreground.png"
render icon-background.svg 1024 1024 "$work/background.png"

densities="mdpi:48:108 hdpi:72:162 xhdpi:96:216 xxhdpi:144:324 xxxhdpi:192:432"
for density in $densities; do
  IFS=: read -r name legacy adaptive <<<"$density"
  dir="$android/mipmap-$name"
  magick "$work/icon-rounded.png" -resize "${legacy}x${legacy}" "$dir/ic_launcher.png"
  magick "$work/icon-circle.png" -resize "${legacy}x${legacy}" "$dir/ic_launcher_round.png"
  magick "$work/foreground.png" -resize "${adaptive}x${adaptive}" "$dir/ic_launcher_foreground.png"
  magick "$work/background.png" -resize "${adaptive}x${adaptive}" "$dir/ic_launcher_background.png"
done

# The launch theme stretches the bitmap over the whole window, so every
# orientation/density gets its own correctly-proportioned copy.
splashes="port-mdpi:320:480 port-hdpi:480:800 port-xhdpi:720:1280 port-xxhdpi:960:1600
          port-xxxhdpi:1280:1920 land-mdpi:480:320 land-hdpi:800:480 land-xhdpi:1280:720
          land-xxhdpi:1600:960 land-xxxhdpi:1920:1280"
for entry in $splashes; do
  IFS=: read -r name width height <<<"$entry"
  splash "$width" "$height" 0.30 >"$work/splash.svg"
  render "$work/splash.svg" "$width" "$height" "$android/drawable-$name/splash.png"
done
cp "$android/drawable-land-mdpi/splash.png" "$android/drawable/splash.png"

echo "==> web"
# Self-contained (no sibling fetch) and small: the plaid never renders above a
# few dozen pixels in a tab strip.
magick tartan.png -resize 96x96 "$work/tartan-web.png"
cat >"$static/favicon.svg" <<EOF
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<clipPath id="corners"><rect width="1024" height="1024" rx="145"/></clipPath>
<g clip-path="url(#corners)">
<image width="1024" height="1024" href="data:image/png;base64,$(base64 -w0 "$work/tartan-web.png")"/>
$(svg_logo $(centred 1024 "$logo_frac"))
</g>
</svg>
EOF
# iOS rounds and composites the home-screen icon itself, so hand it the same
# opaque full-bleed square the app bundle uses - never the pre-rounded one.
magick "$work/icon.png" -resize 180x180 -background "$backing" -alpha remove -alpha off \
  "$static/apple-touch-icon.png"

echo "done"
