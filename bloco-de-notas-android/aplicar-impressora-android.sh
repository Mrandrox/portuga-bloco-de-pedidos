#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
ANDROID="$ROOT/android"
JAVA_DIR="$ANDROID/app/src/main/java/com/blocodenotas/app"
MANIFEST="$ANDROID/app/src/main/AndroidManifest.xml"
MAIN="$JAVA_DIR/MainActivity.java"
PLUGIN_SRC="$ROOT/native/android/com/blocodenotas/app/BluetoothPrinterPlugin.java"
SHELL_SRC="$ROOT/native/android/com/blocodenotas/app/PortugaShellPlugin.java"

if [[ ! -d "$ANDROID" ]]; then
  echo "Pasta android/ não existe. Rode: npx cap add android"
  exit 1
fi

mkdir -p "$JAVA_DIR"
cp "$PLUGIN_SRC" "$JAVA_DIR/BluetoothPrinterPlugin.java"
cp "$SHELL_SRC" "$JAVA_DIR/PortugaShellPlugin.java"

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

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    private View recoveryOverlay;
    private boolean pageLoaded = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BluetoothPrinterPlugin.class);
        registerPlugin(PortugaShellPlugin.class);

        // O listener observa o WebView sem substituir o WebViewClient do Capacitor.
        // Assim a ponte JS/Android e a impressão continuam sob controle do Capacitor.
        bridgeBuilder.addWebViewListener(new WebViewListener() {
            @Override
            public void onPageStarted(WebView webView) {
                pageLoaded = false;
                hideRecovery();
            }

            @Override
            public void onPageLoaded(WebView webView) {
                pageLoaded = true;
                hideRecovery();
            }

            @Override
            public void onReceivedError(WebView webView) {
                if (!pageLoaded) {
                    showRecovery();
                }
            }

            @Override
            public boolean onRenderProcessGone(WebView webView, android.webkit.RenderProcessGoneDetail detail) {
                showRecovery();
                return false;
            }
        });

        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setLoadsImagesAutomatically(true);
            settings.setAllowFileAccess(false);
            settings.setAllowContentAccess(false);
            settings.setJavaScriptCanOpenWindowsAutomatically(false);
            settings.setSupportMultipleWindows(false);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);
            webView.setBackgroundColor(Color.rgb(17, 17, 17));
            webView.setVerticalScrollBarEnabled(false);
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        }

        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            if (!pageLoaded) showRecovery();
        }, 5000);
    }

    private void ensureOverlay() {
        if (recoveryOverlay != null) return;

        ViewGroup root = findViewById(android.R.id.content);
        if (root == null) return;

        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER_HORIZONTAL);
        box.setPadding(44, 56, 44, 44);
        box.setBackgroundColor(Color.rgb(17, 17, 17));

        TextView brand = new TextView(this);
        brand.setText("PORTUGA");
        brand.setTextColor(Color.rgb(212, 175, 55));
        brand.setTextSize(30);
        brand.setGravity(Gravity.CENTER);
        brand.setTypeface(null, android.graphics.Typeface.BOLD);

        TextView title = new TextView(this);
        title.setText("Ambiente do aplicativo");
        title.setTextColor(Color.WHITE);
        title.setTextSize(22);
        title.setGravity(Gravity.CENTER);
        title.setPadding(0, 24, 0, 10);

        TextView message = new TextView(this);
        message.setText("A interface interna não respondeu. O aplicativo está protegido e você pode tentar novamente sem sair do ambiente.");
        message.setTextColor(Color.LTGRAY);
        message.setTextSize(16);
        message.setGravity(Gravity.CENTER);
        message.setPadding(0, 0, 0, 28);

        Button retry = makeButton("Tentar novamente");
        retry.setOnClickListener(v -> {
            hideRecovery();
            pageLoaded = false;
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) webView.postDelayed(() -> webView.reload(), 180);
        });

        Button chrome = makeButton("Abrir saída no Chrome");
        chrome.setOnClickListener(v -> openChrome());

        Button webview = makeButton("Atualizar Chrome / WebView");
        webview.setOnClickListener(v -> openWebViewUpdate());

        Button diagnostics = makeButton("Diagnóstico");
        diagnostics.setOnClickListener(v -> showDiagnostics());

        box.addView(brand, new LinearLayout.LayoutParams(-1, -2));
        box.addView(title, new LinearLayout.LayoutParams(-1, -2));
        box.addView(message, new LinearLayout.LayoutParams(-1, -2));
        box.addView(retry, buttonParams());
        box.addView(chrome, buttonParams());
        box.addView(webview, buttonParams());
        box.addView(diagnostics, buttonParams());

        root.addView(box, new ViewGroup.LayoutParams(-1, -1));
        recoveryOverlay = box;
        recoveryOverlay.setVisibility(View.GONE);
    }

    private LinearLayout.LayoutParams buttonParams() {
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2);
        p.setMargins(0, 0, 0, 14);
        return p;
    }

    private Button makeButton(String text) {
        Button b = new Button(this);
        b.setText(text);
        b.setAllCaps(false);
        b.setTextSize(16);
        return b;
    }

    private void showRecovery() {
        runOnUiThread(() -> {
            ensureOverlay();
            if (recoveryOverlay != null) recoveryOverlay.setVisibility(View.VISIBLE);
        });
    }

    private void hideRecovery() {
        runOnUiThread(() -> {
            if (recoveryOverlay != null) recoveryOverlay.setVisibility(View.GONE);
        });
    }

    private void openChrome() {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("https://www.google.com/chrome/"));
            i.setPackage("com.android.chrome");
            startActivity(i);
        } catch (ActivityNotFoundException ex) {
            Intent i = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("https://www.google.com/chrome/"));
            startActivity(i);
        }
    }

    private void openWebViewUpdate() {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("market://details?id=com.google.android.webview"));
            startActivity(i);
        } catch (Exception ex) {
            Intent i = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.webview"));
            startActivity(i);
        }
    }

    private void showDiagnostics() {
        String pkg = "desconhecido";
        String version = "desconhecida";
        try {
            android.content.pm.PackageInfo info = WebView.getCurrentWebViewPackage();
            if (info != null) {
                pkg = info.packageName;
                version = info.versionName;
            }
        } catch (Exception ignored) {}

        TextView info = new TextView(this);
        info.setText("WebView: " + pkg + "\nVersão: " + version + "\nApp: " + (getBridge() != null ? getBridge().getAppUrl() : "indisponível"));
        info.setTextColor(Color.WHITE);
        info.setTextSize(15);
        info.setPadding(30, 30, 30, 30);

        new android.app.AlertDialog.Builder(this)
            .setTitle("Diagnóstico do Portuga")
            .setView(info)
            .setPositiveButton("OK", null)
            .setNeutralButton("Configurações do WebView", (d, w) -> {
                try {
                    startActivity(new Intent("android.settings.WEBVIEW_SETTINGS"));
                } catch (Exception ex) {
                    startActivity(new Intent(Settings.ACTION_SETTINGS));
                }
            })
            .show();
    }
}
JAVA

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

# Evita recarregamentos do WebView durante mudanças de densidade/tela.
python3 - "$MANIFEST" <<'PY'
from pathlib import Path
import re, sys
p=Path(sys.argv[1])
s=p.read_text()
s=re.sub(r'android:configChanges="([^"]+)"',
         lambda m: 'android:configChanges="' + (m.group(1) if 'density' in m.group(1) else m.group(1)+'|density') + '"',
         s, count=1)
p.write_text(s)
PY


# Personaliza o splash gerado pelo template do Capacitor sem criar dependências.
STYLES="$ANDROID/app/src/main/res/values/styles.xml"
if [[ -f "$STYLES" ]]; then
python3 - "$STYLES" <<'PY'
from pathlib import Path
import re, sys
p=Path(sys.argv[1])
s=p.read_text()
def patch(name, body):
    pattern=r'<style name="' + re.escape(name) + r'"[^>]*>.*?</style>'
    m=re.search(pattern,s,re.S)
    if not m:
        return
    block=m.group(0)
    additions=[]
    if 'windowSplashScreenBackground' not in block:
        additions.append('        <item name="windowSplashScreenBackground">@color/portuga_splash_bg</item>')
    if 'windowSplashScreenAnimatedIcon' not in block:
        additions.append('        <item name="windowSplashScreenAnimatedIcon">@drawable/portuga_splash_logo</item>')
    if additions:
        block=block.replace('</style>','\n'+'\n'.join(additions)+'\n    </style>')
        globals()['s']=s[:m.start()]+block+s[m.end():]
patch('AppTheme.NoActionBarLaunch',s)
p.write_text(s)
PY
fi
