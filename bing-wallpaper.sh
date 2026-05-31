#!/bin/bash
# Fetch Bing Wallpaper of the Day
# Usage: ./bing-wallpaper.sh [output-dir]

OUTDIR="${1:-/tmp/bing-wallpapers}"
mkdir -p "$OUTDIR"

# Get today's wallpaper metadata
JSON=$(curl -s "https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN")

# Extract info
URLBASE=$(echo "$JSON" | sed 's/.*"urlbase":"\([^"]*\)".*/\1/')
TITLE=$(echo "$JSON" | sed 's/.*"title":"\([^"]*\)".*/\1/')
COPYRIGHT=$(echo "$JSON" | sed 's/.*"copyright":"\([^"]*\)".*/\1/')
ENDDATE=$(echo "$JSON" | sed 's/.*"enddate":"\([^"]*\)".*/\1/')

# Download UHD version
IMAGE_URL="https://www.bing.com${URLBASE}_UHD.jpg"
OUTFILE="${OUTDIR}/bing-${ENDDATE}.jpg"

curl -s -o "$OUTFILE" "$IMAGE_URL"

echo "$OUTFILE"
echo "Title: $TITLE"
echo "Copyright: $COPYRIGHT"
