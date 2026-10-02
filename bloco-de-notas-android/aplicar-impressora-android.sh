#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
ANDROID="$ROOT/android"
JAVA_DIR="$ANDROID/app/src/main/java/com/blocodenotas/app"
RES="$ANDROID/app/src/main/res"
PLUGIN_DIR="$ROOT/native/android/com/blocodenotas/app"

if [[ ! -d "$ANDROID" ]]; then
  echo "A pasta android/ não existe. Rode: npx cap add android"
  exit 1
fi

mkdir -p "$JAVA_DIR" "$RES/values" "$RES/drawable-nodpi"

cp "$PLUGIN_DIR/BluetoothPrinterPlugin.java" "$JAVA_DIR/BluetoothPrinterPlugin.java"
cp "$PLUGIN_DIR/PortugaShellPlugin.java" "$JAVA_DIR/PortugaShellPlugin.java"
cp "$PLUGIN_DIR/MainActivity.java" "$JAVA_DIR/MainActivity.java"

python3 - "$ANDROID/app/src/main/AndroidManifest.xml" <<'PY'
from pathlib import Path
import sys
import re

manifest = Path(sys.argv[1])
text = manifest.read_text(encoding="utf-8")

perms = '''
    <uses-feature android:name="android.hardware.bluetooth" android:required="false" />
    <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
'''

if 'android.permission.BLUETOOTH_CONNECT' not in text:
    marker = text.find(">", text.find("<manifest"))
    text = text[:marker + 1] + perms + text[marker + 1:]

if 'android:roundIcon=' in text:
    text = re.sub(
        r'android:roundIcon="[^"]*"',
        'android:roundIcon="@mipmap/ic_launcher_round"',
        text,
        count=1
    )
else:
    text = text.replace(
        "<application ",
        '<application android:roundIcon="@mipmap/ic_launcher_round" ',
        1
    )

manifest.write_text(text, encoding="utf-8")
PY

# Reuse the largest embedded PNG from the original HTML as the Android launcher.
python3 - "$ROOT/www/index.html" "$RES" <<'PY'
from pathlib import Path
import base64
import re
import sys

html = Path(sys.argv[1]).read_text(encoding="utf-8")
res = Path(sys.argv[2])

matches = re.findall(r'data:image/png;base64,([A-Za-z0-9+/=]+)', html)
if not matches:
    raise SystemExit("Logo PNG embutido não encontrado no HTML.")

data = base64.b64decode(max(matches, key=len))

for density in [
    "mipmap-mdpi", "mipmap-hdpi", "mipmap-xhdpi",
    "mipmap-xxhdpi", "mipmap-xxxhdpi"
]:
    out_dir = res / density
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "ic_launcher.png").write_bytes(data)
    (out_dir / "ic_launcher_round.png").write_bytes(data)

(res / "drawable-nodpi" / "portuga_splash_logo.png").write_bytes(data)
PY

echo "Ponte Android POS-58 aplicada."