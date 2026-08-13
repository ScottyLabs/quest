#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

android=../android/app/src/main/res
ios=../ios/App/App/Assets.xcassets
static=../static
app_html=../src/app.html

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

logo_w=147
logo_h=157.881
logo_frac=0.6125
safe=0.6667
backing=#1D0303
splash_bg=#FFFFFF
tile_base=#480106
tile_rx_ios=145
tile_rx_android=256

svg_logo() { printf '<g transform="translate(%s,%s) scale(%s)">%s</g>' "$2" "$3" "$1" "$logo_body"; }

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

icon_tile() {
  printf '<clipPath id="splash-ios"><rect width="1024" height="1024" rx="%s"/></clipPath>' "$tile_rx_ios"
  printf '<clipPath id="splash-android"><rect width="1024" height="1024" rx="%s"/></clipPath>' "$tile_rx_android"
  printf '<g clip-path="url(#splash-%s)"><rect width="1024" height="1024" fill="%s"/><image width="1024" height="1024" href="%s"/>%s</g>' \
    "$1" "$tile_base" "$2" "$(svg_logo $(centred 1024 "$logo_frac"))"
}

splash() {
  local short=$(( $1 < $2 ? $1 : $2 ))
  local scale x y
  read -r scale x y <<<"$(awk -v w="$1" -v h="$2" -v s="$short" -v f="$3" \
    'BEGIN { sc = s * f / 1024; printf "%.6f %.4f %.4f", sc, (w - 1024 * sc) / 2, (h - 1024 * sc) / 2 }')"
  cat <<EOF
<svg xmlns="http://www.w3.org/2000/svg" width="$1" height="$2" viewBox="0 0 $1 $2">
<rect width="$1" height="$2" fill="$splash_bg"/>
<g transform="translate($x,$y) scale($scale)">
$(icon_tile "$4" "$5")
</g>
</svg>
EOF
}

splash_tile_ios=0.20
splash_tile_android=0.42
splash 2732 2732 "$splash_tile_ios" ios tartan.png >splash.svg

render() { inkscape "$1" -w "$2" -h "$3" -o "$4" >/dev/null 2>&1; }

magick tartan.png -resize 512x512 "$work/plaid-native.png"
magick tartan.png -resize 384x384 -quality 88 "$work/plaid-web.webp"
plaid_native="data:image/png;base64,$(base64 -w0 "$work/plaid-native.png")"
plaid_web="data:image/webp;base64,$(base64 -w0 "$work/plaid-web.webp")"

echo "==> ios"
render icon.svg 1024 1024 "$work/icon.png"
magick "$work/icon.png" -background "$backing" -alpha remove -alpha off \
  "$ios/AppIcon.appiconset/AppIcon-512@2x.png"
render splash.svg 2732 2732 "$ios/Splash.imageset/splash-2732x2732.png"

echo "==> android"
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

splashes="port-mdpi:320:480 port-hdpi:480:800 port-xhdpi:720:1280 port-xxhdpi:960:1600
          port-xxxhdpi:1280:1920 land-mdpi:480:320 land-hdpi:800:480 land-xhdpi:1280:720
          land-xxhdpi:1600:960 land-xxxhdpi:1920:1280"
for entry in $splashes; do
  IFS=: read -r name width height <<<"$entry"
  splash "$width" "$height" "$splash_tile_android" android "$plaid_native" >"$work/splash.svg"
  render "$work/splash.svg" "$width" "$height" "$android/drawable-$name/splash.png"
done
cp "$android/drawable-land-mdpi/splash.png" "$android/drawable/splash.png"

echo "==> web"
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
magick "$work/icon.png" -resize 180x180 -background "$backing" -alpha remove -alpha off \
  "$static/apple-touch-icon.png"

mark=$(printf '<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">%s</svg>' \
  "$(icon_tile ios "$plaid_web")")
MARK="$mark" python3 - "$app_html" <<'PY'
import os, pathlib, re, sys

page = pathlib.Path(sys.argv[1])
start, end = "<!-- splash:start -->", "<!-- splash:end -->"
body = page.read_text()
block = re.search(rf"( *){re.escape(start)}.*?{re.escape(end)}", body, re.S)
if block is None:
    raise SystemExit(f"{page}: missing {start} .. {end} markers")

pad = block.group(1)
page.write_text(body[: block.start()] + f"{pad}{start}\n{pad}{os.environ['MARK']}\n{pad}{end}" + body[block.end() :])
print(f"    app.html mark: {len(os.environ['MARK'])} bytes inlined")
PY

echo "done"
