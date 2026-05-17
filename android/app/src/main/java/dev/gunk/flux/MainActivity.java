package dev.gunk.flux;

import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

/**
 * Single activity that hosts the WebView. Three <activity-alias> entries in
 * AndroidManifest.xml point here, each carrying an "entry" meta-data value
 * (flux | vibe | balance). We read the alias's component info from the
 * launching intent and expose the result to the Preact shell.
 *
 * Two channels:
 *  - `window.AppEntry.getEntry()` — synchronous JS interface, safe to call at
 *    document-start. The Preact shell calls this to pick the initial tab,
 *    avoiding the evaluateJavascript race where the global may be unset when
 *    the bundle first executes.
 *  - `window` event `app-entry-changed` — dispatched after onNewIntent updates
 *    the entry (user re-launched a different alias while the app is already
 *    running). The App component listens for this and switches tabs.
 */
public class MainActivity extends BridgeActivity {

    private volatile String currentEntry = "flux";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        currentEntry = readEntryFromIntent(getIntent());
        WebView webView = bridge != null ? bridge.getWebView() : null;
        if (webView != null) {
            webView.addJavascriptInterface(new AppEntryBridge(), "AppEntry");
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        currentEntry = readEntryFromIntent(intent);
        notifyEntryChanged(currentEntry);
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

    private void notifyEntryChanged(String entry) {
        if (bridge == null || bridge.getWebView() == null) return;
        // entry comes from a hard-coded manifest meta-data string, but we still
        // restrict to a known whitelist before splicing into JS.
        if (!entry.equals("flux") && !entry.equals("vibe") && !entry.equals("balance")) {
            entry = "flux";
        }
        final String safe = entry;
        bridge.getWebView().post(() ->
            bridge.getWebView().evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('app-entry-changed', { detail: '"
                    + safe + "' }));", null));
    }

    /**
     * Synchronous bridge that the Preact shell calls to read the entry at
     * startup. Must remain side-effect free.
     */
    public class AppEntryBridge {
        @JavascriptInterface
        public String getEntry() {
            return currentEntry;
        }
    }
}
