#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
ANDROID="$ROOT/android"
JAVA_DIR="$ANDROID/app/src/main/java/com/blocodenotas/app"
MANIFEST="$ANDROID/app/src/main/AndroidManifest.xml"
MAIN="$JAVA_DIR/MainActivity.java"
PLUGIN_SRC="$ROOT/native/android/com/blocodenotas/app/BluetoothPrinterPlugin.java"

if [[ ! -d "$ANDROID" ]]; then
  echo "Pasta android/ não existe. Rode: npx cap add android"
  exit 1
fi

mkdir -p "$JAVA_DIR"
cp "$PLUGIN_SRC" "$JAVA_DIR/BluetoothPrinterPlugin.java"

# Tema/splash leve e compatibilidade WebView.
RES="$ANDROID/app/src/main/res"
mkdir -p "$RES/values" "$RES/drawable-nodpi"
cat > "$RES/values/portuga_colors.xml" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="portuga_splash_bg">#111111</color>
    <color name="portuga_gold">#D4AF37</color>
</resources>
XML

# Ícone oficial do app (logo enviada para o projeto).
ICON_SRC="$ROOT/native/assets/ic_launcher.png"
# Se o PNG não estiver no repositório, extrai o logo 512x512 embutido no HTML original.
if [[ ! -f "$ICON_SRC" ]]; then
  ICON_SRC="/tmp/portuga_ic_launcher.png"
  python3 - "$ROOT/www/index.html" "$ICON_SRC" <<'PY'
import base64, re, sys
from pathlib import Path
html=Path(sys.argv[1]).read_text(encoding="utf-8")
out=Path(sys.argv[2])
matches=re.findall(r'data:image/(?:png|jpeg);base64,([A-Za-z0-9+/=]+)', html)
if not matches:
    raise SystemExit("Logo embutido não encontrado no HTML.")
data=base64.b64decode(matches[-1])
out.write_bytes(data)
PY
fi
if [[ -f "$ICON_SRC" ]]; then
  cp "$ICON_SRC" "$RES/drawable-nodpi/portuga_splash_logo.png"
  for d in mipmap-mdpi mipmap-hdpi mipmap-xhdpi mipmap-xxhdpi mipmap-xxxhdpi; do
    mkdir -p "$ANDROID/app/src/main/res/$d"
    cp "$ICON_SRC" "$ANDROID/app/src/main/res/$d/ic_launcher.png"
    cp "$ICON_SRC" "$ANDROID/app/src/main/res/$d/ic_launcher_round.png"
  done
  # O template do Capacitor cria ícones adaptativos em XML que podem
  # sobrescrever os PNGs acima no launcher. Removemos esses recursos para
  # garantir que o logo PNG seja realmente usado como ícone do aplicativo.
  rm -f "$ANDROID/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml"
  rm -f "$ANDROID/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml"
fi

cat > "$MAIN" <<'JAVA'
package com.blocodenotas.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BluetoothPrinterPlugin.class);
        super.onCreate(savedInstanceState);
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setLoadsImagesAutomatically(true);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);
            webView.setBackgroundColor(0xFF111111);
        }
    }
}
JAVA

A

python3 - "$MANIFEST" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1])
s=p.read_text()
perms='''\n    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />
'''
if 'android.permission.BLUETOOTH_CONNECT' not in s:
    i=s.find('<manifest ')
    i=s.find('>', i)+1
    s=s[:i]+perms+s[i:]
# Força o launcher a usar os recursos ic_launcher substituídos acima.
s=s.replace('android:icon="@mipmap/ic_launcher"', 'android:icon="@mipmap/ic_launcher"')
if 'android:roundIcon=' in s:
    import re
    s=re.sub(r'android:roundIcon="[^"]+"', 'android:roundIcon="@mipmap/ic_launcher_round"', s)
elif '<application ' in s:
    s=s.replace('<application ', '<application android:roundIcon="@mipmap/ic_launcher_round" ', 1)
p.write_text(s)
PY
