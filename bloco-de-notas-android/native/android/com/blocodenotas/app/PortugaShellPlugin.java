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
        String url = call.getString("url", "https://www.google.com/");
        openBrowser(call, url, true);
    }

    @PluginMethod
    public void openBrowser(PluginCall call) {
        String url = call.getString("url", "https://www.google.com/");
        openBrowser(call, url, false);
    }

    @PluginMethod
    public void openWebViewSettings(PluginCall call) {
        try {
            Intent intent = new Intent("android.settings.WEBVIEW_SETTINGS");
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception ignored) {
            try {
                Intent intent = new Intent(Settings.ACTION_SETTINGS);
                getActivity().startActivity(intent);
                call.resolve();
            } catch (Exception ex) {
                call.reject("Não foi possível abrir as configurações do WebView.", ex);
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
        webView.post(() -> webView.reload());
        call.resolve();
    }

    @PluginMethod
    public void diagnostics(PluginCall call) {
        JSObject ret = new JSObject();
        WebView webView = bridge.getWebView();
        ret.put("appUrl", bridge.getAppUrl());
        ret.put("hostname", bridge.getHost());
        ret.put("scheme", bridge.getScheme());
        ret.put("webViewPackage", android.webkit.WebView.getCurrentWebViewPackage() != null
            ? android.webkit.WebView.getCurrentWebViewPackage().packageName : "desconhecido");
        ret.put("webViewVersion", android.webkit.WebView.getCurrentWebViewPackage() != null
            ? android.webkit.WebView.getCurrentWebViewPackage().versionName : "desconhecida");
        ret.put("currentUrl", webView != null ? webView.getUrl() : "");
        call.resolve(ret);
    }

    private void openBrowser(PluginCall call, String url, boolean preferChrome) {
        try {
            Uri uri = Uri.parse(url);
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
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
        } catch (Exception ex) {
            call.reject("Não foi possível abrir o navegador.", ex);
        }
    }
}
