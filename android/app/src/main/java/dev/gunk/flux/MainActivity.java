package dev.gunk.flux;

import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

/**
 * Single activity that hosts the WebView. Three <activity-alias> entries in
 * AndroidManifest.xml point here, each carrying an "entry" meta-data value
 * (flux | vibe | balance). We read the alias's component info from the
 * launching intent and inject `window.__entry` so the Preact shell can pick
 * the right initial tab.
 *
 * We inject via evaluateJavascript after the page finishes loading rather than
 * via an addJavascriptInterface or pre-load script tag — Capacitor's WebView
 * runs the bundle synchronously after page-start, and evaluateJavascript on
 * page-finished is the simplest way to land a global before the app reads it
 * on tab-switch. The Preact shell defaults to 'flux' if window.__entry is
 * unset, so a missed injection still produces a working app.
 */
public class MainActivity extends BridgeActivity {

    private String currentEntry = "flux";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        currentEntry = readEntryFromIntent(getIntent());
        injectEntry(currentEntry);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        currentEntry = readEntryFromIntent(intent);
        injectEntry(currentEntry);
    }

    private String readEntryFromIntent(Intent intent) {
        if (intent == null) return "flux";
        ComponentName component = intent.getComponent();
        if (component == null) return "flux";
        try {
            ActivityInfo info = getPackageManager().getActivityInfo(
                    component, PackageManager.GET_META_DATA);
            if (info != null && info.metaData != null) {
                String value = info.metaData.getString("entry");
                if (value != null) return value;
            }
        } catch (PackageManager.NameNotFoundException ignored) {
            // fall through to default
        }
        return "flux";
    }

    private void injectEntry(String entry) {
        if (bridge == null || bridge.getWebView() == null) return;
        final String safe = entry.replace("'", "");
        bridge.getWebView().post(() ->
            bridge.getWebView().evaluateJavascript(
                "window.__entry = '" + safe + "';", null));
    }
}
