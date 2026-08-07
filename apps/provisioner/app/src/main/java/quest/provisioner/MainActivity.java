package quest.provisioner;

import android.app.Activity;
import android.graphics.Insets;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.nfc.tech.IsoDep;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ScrollView;
import android.widget.Switch;
import android.widget.TextView;
import java.io.IOException;
import java.util.Arrays;

public class MainActivity extends Activity implements NfcAdapter.ReaderCallback {
    private static final int READER_FLAGS =
            NfcAdapter.FLAG_READER_NFC_A | NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK;

    private NfcAdapter adapter;
    private EditText masterField;
    private TextView status;
    private TextView log;
    private ScrollView scroll;
    private Switch readonlyToggle;

    private byte[] master;
    private int provisioned = 0;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(R.layout.activity_main);

        masterField = findViewById(R.id.master);
        status = findViewById(R.id.status);
        log = findViewById(R.id.log);
        scroll = findViewById(R.id.scroll);
        adapter = NfcAdapter.getDefaultAdapter(this);
        readonlyToggle = findViewById(R.id.readonly);

        ((Button) findViewById(R.id.arm)).setOnClickListener(v -> arm());
        ((Button) findViewById(R.id.clear)).setOnClickListener(v -> forget());
        applyInsets(findViewById(R.id.root));

        if (adapter == null) {
            status.setText("This device has no NFC adapter.");
        }
    }

    @SuppressWarnings("deprecation")
    private void applyInsets(View root) {
        int pad = Math.round(16 * getResources().getDisplayMetrics().density);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            int left;
            int top;
            int right;
            int bottom;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Insets bars = insets.getInsets(
                        WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
                left = bars.left;
                top = bars.top;
                right = bars.right;
                bottom = bars.bottom;
            } else {
                left = insets.getSystemWindowInsetLeft();
                top = insets.getSystemWindowInsetTop();
                right = insets.getSystemWindowInsetRight();
                bottom = insets.getSystemWindowInsetBottom();
            }
            view.setPadding(left + pad, top + pad, right + pad, bottom + pad);
            return insets;
        });
        root.requestApplyInsets();
    }

    private void arm() {
        byte[] parsed;
        try {
            parsed = Crypto.hex(masterField.getText().toString());
        } catch (RuntimeException malformed) {
            status.setText("Master key is not valid hex.");
            return;
        }
        if (parsed.length != 32) {
            status.setText("Master key must be 32 bytes (64 hex chars), got " + parsed.length + ".");
            return;
        }

        master = parsed;
        masterField.setText("");
        masterField.setEnabled(false);
        status.setText("Armed. Hold a tag against the phone.");
        append("armed, key fingerprint " + Crypto.fingerprint(master) + " (not stored)");
    }

    private void forget() {
        if (master != null) {
            Arrays.fill(master, (byte) 0);
            master = null;
        }
        masterField.setEnabled(true);
        masterField.setText("");
        status.setText("Key forgotten. Paste it again to continue.");
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (adapter != null) {
            adapter.enableReaderMode(this, this, READER_FLAGS, null);
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (adapter != null) {
            adapter.disableReaderMode(this);
        }
    }

    @Override
    protected void onDestroy() {
        forget();
        super.onDestroy();
    }

    @Override
    public void onTagDiscovered(Tag discovered) {
        boolean readOnly = readonlyToggle.isChecked();
        byte[] key = master;
        if (key == null && !readOnly) {
            show("Not armed -- paste the master key first.", null);
            return;
        }

        byte[] uid = discovered.getId();
        if (uid.length != 7) {
            show("Not an NTAG 424 DNA (UID is " + uid.length + " bytes).", null);
            return;
        }

        IsoDep link = IsoDep.get(discovered);
        if (link == null) {
            show("Tag does not speak ISO-DEP.", null);
            return;
        }

        try {
            link.connect();
            link.setTimeout(3000);

            if (readOnly) {
                Provisioner.Inspection seen =
                        Provisioner.inspect(new Ntag424(link::transceive), uid);

                StringBuilder detail = new StringBuilder();
                detail.append("--- card id ").append(seen.uid).append("  [read]\n");
                detail.append("    ").append(seen.note).append('\n');
                if (seen.settings != null) {
                    detail.append("    file 2 settings: ").append(seen.settings);
                }
                if (key != null) {
                    detail.append("\n    expect: ")
                            .append(Sun.simulate(key, uid, 0).url("https://cmu.quest/tap"));
                }

                show(seen.uid + "  --  " + seen.note, detail.toString());
                return;
            }

            Provisioner.Result result = Provisioner.run(new Ntag424(link::transceive), key, uid);
            provisioned++;

            StringBuilder detail = new StringBuilder();
            detail.append("--- ").append(result.uid)
                    .append(result.wasBlank ? "  [blank -> personalised]" : "  [re-provisioned]")
                    .append('\n');
            for (String line : result.log) {
                detail.append("    ").append(line).append('\n');
            }
            detail.append("    expect: ").append(result.verifyUrl);

            show("Provisioned " + result.uid + "  (" + provisioned + " this session)",
                    detail.toString());
        } catch (IOException failed) {
            show("FAILED " + Crypto.hex(uid) + ": " + failed.getMessage(),
                    "--- " + Crypto.hex(uid) + "  FAILED\n    " + failed.getMessage());
        } finally {
            try {
                link.close();
            } catch (IOException ignored) {
            }
        }
    }

    private void show(String headline, String detail) {
        runOnUiThread(() -> {
            status.setText(headline);
            if (detail != null) {
                append(detail);
            }
        });
    }

    private void append(String text) {
        runOnUiThread(() -> {
            log.append(text + "\n");
            scroll.post(() -> scroll.fullScroll(ScrollView.FOCUS_DOWN));
        });
    }
}
