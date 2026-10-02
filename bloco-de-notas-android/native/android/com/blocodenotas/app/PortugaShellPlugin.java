package com.blocodenotas.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import android.webkit.WebView;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PortugaShell")
public class PortugaShellPlugin extends Plugin {
    @PluginMethod
    public void openChrome(PluginCall call) {
        openBrowser(call, call.getString("url", "https://www.google.com/"), true);
    }

    @PluginMethod
    public void openBrowser(PluginCall call) {
        openBrowser(call, call.getString("url", "https://www.google.com/"), false);
    }

    @PluginMethod
    public void openWebViewSettings(PluginCall call) {
        try {
            getActivity().startActivity(new Intent("android.settings.WEBVIEW_SETTINGS"));
            call.resolve();
        } catch (Exception ignored) {
            try {
                getActivity().startActivity(new Intent(Settings.ACTION_SETTINGS));
                call.resolve();
            } catch (Exception e) {
                call.reject("Não foi possível abrir as configurações do WebView.", e);
            }
        }
    }

    @PluginMethod
    public void reload(PluginCall call) {
        WebView webView = bridge.getWebView();
        if (webView == null) {
            call.reject("WebView indisponível.");
            return;
        }
        webView.post(webView::reload);
        call.resolve();
    }

    @PluginMethod
    public void diagnostics(PluginCall call) {
        JSObject result = new JSObject();
        WebView webView = bridge.getWebView();
        android.content.pm.PackageInfo info = WebView.getCurrentWebViewPackage();

        result.put("appUrl", bridge.getAppUrl());
        result.put("hostname", bridge.getHost());
        result.put("scheme", bridge.getScheme());
        result.put("webViewPackage", info != null ? info.packageName : "desconhecido");
        result.put("webViewVersion", info != null ? info.versionName : "desconhecida");
        result.put("currentUrl", webView != null ? String.valueOf(webView.getUrl()) : "");
        call.resolve(result);
    }

    private void openBrowser(PluginCall call, String url, boolean preferChrome) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));

            if (preferChrome) {
                intent.setPackage("com.android.chrome");
                try {
                    getActivity().startActivity(intent);
                    call.resolve();
                    return;
                } catch (ActivityNotFoundException ignored) {
                    intent.setPackage(null);
                }
            }

            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Não foi possível abrir o navegador.", e);
        }
    }
}