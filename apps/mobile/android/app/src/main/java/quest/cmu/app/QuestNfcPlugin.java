package quest.cmu.app;

import android.app.Activity;
import android.nfc.FormatException;
import android.nfc.NdefMessage;
import android.nfc.NdefRecord;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.nfc.tech.IsoDep;
import android.os.Bundle;
import android.util.Log;
import android.os.Build;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;
import java.util.Arrays;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "QuestNfc")
public class QuestNfcPlugin extends Plugin {
    private static final String TAG = "QuestNfc";

    /*
     * Quest posters are NTAG 424 DNA tags:
     *   NFC-A -> ISO-DEP -> Type 4 NDEF
     *
     * SKIP_NDEF_CHECK is intentional. Android's platform NDEF detection
     * is the part we are bypassing.
     */
    private static final int READER_FLAGS =
        NfcAdapter.FLAG_READER_NFC_A |
        NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK;

    /*
     * Select NTAG 424's pre-installed application:
     * ISO file ID E110.
     *
     * This is the same SELECT already used by Quest's provisioner.
     */
    private static final byte[] SELECT_APPLICATION =
        hex("00A4000C02E11000");

    /*
     * Select the NDEF elementary file:
     * file 02 / ISO file ID E104.
     */
    private static final byte[] SELECT_NDEF =
        hex("00A4020C02E10400");

    private static JSObject deviceInfo() {
    JSObject result = new JSObject();

    result.put("manufacturer", Build.MANUFACTURER);
    result.put("model", Build.MODEL);
    result.put("osVersion", Build.VERSION.RELEASE);
    result.put("sdkInt", Build.VERSION.SDK_INT);

    return result;
}

@PluginMethod
public void getDeviceInfo(PluginCall call) {
    call.resolve(deviceInfo());
}
    private final ExecutorService executor =
        Executors.newSingleThreadExecutor();

    private NfcAdapter adapter;

    private volatile boolean readerModeRequested = false;
    private volatile boolean readerModeActive = false;

    private final NfcAdapter.ReaderCallback readerCallback =
        tag -> executor.execute(() -> readTag(tag));

    @Override
    public void load() {
        adapter = NfcAdapter.getDefaultAdapter(getContext());
    }

@Override
protected void handleOnPause() {
    super.handleOnPause();
    disableReaderMode();
}

@Override
protected void handleOnResume() {
    super.handleOnResume();

    if (readerModeRequested) {
        enableReaderMode();
    }
}

@Override
protected void handleOnDestroy() {
    readerModeRequested = false;
    disableReaderMode();
    executor.shutdownNow();

    super.handleOnDestroy();
}

@PluginMethod
public void startScanning(PluginCall call) {
    if (adapter == null) {
        call.reject("NFC hardware not available on this device.");
        return;
    }

    if (!adapter.isEnabled()) {
        call.reject("NFC is currently disabled.");
        return;
    }

    readerModeRequested = true;
    enableReaderMode(call);
}

@PluginMethod
public void stopScanning(PluginCall call) {
    readerModeRequested = false;
    disableReaderMode(call);
}

private void enableReaderMode() {
    enableReaderMode(null);
}

private void enableReaderMode(PluginCall call) {
    Activity activity = getActivity();

    if (activity == null || adapter == null) {
        if (call != null) {
            call.reject("NFC reader is unavailable.");
        }
        return;
    }

    Bundle extras = new Bundle();
    extras.putInt(
        NfcAdapter.EXTRA_READER_PRESENCE_CHECK_DELAY,
        100
    );

    activity.runOnUiThread(() -> {
        /*
         * startScanning() may have been cancelled while this
         * runnable was waiting for the UI thread.
         */
        if (!readerModeRequested) {
            if (call != null) {
                call.reject("NFC scan was cancelled.");
            }
            return;
        }

        if (readerModeActive) {
            if (call != null) {
                call.resolve();
            }
            return;
        }

        try {
            adapter.enableReaderMode(
                activity,
                readerCallback,
                READER_FLAGS,
                extras
            );

            readerModeActive = true;

            if (call != null) {
                call.resolve();
            }
        } catch (IllegalStateException exception) {
            Log.w(
                TAG,
                "Failed to enable NFC reader mode",
                exception
            );

            if (call != null) {
                call.reject(
                    "Failed to enable NFC reader mode."
                );
            }
        }
    });
}

private void disableReaderMode() {
    disableReaderMode(null);
}

private void disableReaderMode(PluginCall call) {
    Activity activity = getActivity();

    if (activity == null || adapter == null) {
        readerModeActive = false;

        if (call != null) {
            call.resolve();
        }

        return;
    }

    /*
     * Do NOT check readerModeActive before posting this runnable.
     *
     * An enable operation may currently be queued/running. We want
     * this UI-thread operation to disable it afterward if necessary.
     */
    activity.runOnUiThread(() -> {
        if (readerModeActive) {
            try {
                adapter.disableReaderMode(activity);
            } catch (IllegalStateException exception) {
                Log.w(
                    TAG,
                    "Failed to disable NFC reader mode",
                    exception
                );
            } finally {
                readerModeActive = false;
            }
        }

        if (call != null) {
            call.resolve();
        }
    });
}
private void emitReadFailure(
    String stage,
    Exception exception
) {
    JSObject event = deviceInfo();

    event.put("stage", stage);
    event.put(
        "error",
        exception.getClass().getSimpleName()
    );

    Activity activity = getActivity();

    if (activity == null) {
        return;
    }

    activity.runOnUiThread(
        () -> notifyListeners("readFailure", event)
    );
}

    private void readTag(Tag tag) {
    if (!readerModeRequested) {
        return;
    }

    IsoDep iso = IsoDep.get(tag);

    if (iso == null) {
        return;
    }

    String stage = "connect";

    try {
        iso.connect();
        iso.setTimeout(3000);

        stage = "select_application";
        exchange(iso, SELECT_APPLICATION);

        stage = "select_ndef";
        exchange(iso, SELECT_NDEF);

        stage = "read_nlen";
        byte[] lengthBytes = readBinary(iso, 0, 2);

        if (lengthBytes.length != 2) {
            throw new IOException(
                "NDEF length read returned " +
                lengthBytes.length +
                " bytes"
            );
        }

        int ndefLength =
            ((lengthBytes[0] & 0xff) << 8) |
            (lengthBytes[1] & 0xff);

        if (ndefLength <= 0 || ndefLength > 254) {
            throw new IOException(
                "Invalid NDEF length: " + ndefLength
            );
        }

        stage = "read_ndef";
        byte[] rawNdef =
            readBinary(iso, 2, ndefLength);

        stage = "parse_ndef";
        NdefMessage message =
            new NdefMessage(rawNdef);

        if (readerModeRequested) {
            emit(message);
        }
    } catch (
        IOException |
        FormatException |
        SecurityException exception
    ) {
        Log.w(
            TAG,
            "Failed to read Quest NFC tag",
            exception
        );

        emitReadFailure(stage, exception);
    } finally {
        try {
            iso.close();
        } catch (IOException ignored) {
        }
    }
}

    private static byte[] readBinary(
        IsoDep iso,
        int offset,
        int length
    ) throws IOException {
        if (
            offset < 0 ||
            offset > 255 ||
            length <= 0 ||
            length > 255
        ) {
            throw new IllegalArgumentException(
                "Invalid ISOReadBinary range"
            );
        }

        byte[] command = new byte[] {
            0x00,
            (byte) 0xB0,
            (byte) ((offset >> 8) & 0x7f),
            (byte) (offset & 0xff),
            (byte) (length & 0xff),
        };

        return exchange(iso, command);
    }

    private static byte[] exchange(
        IsoDep iso,
        byte[] command
    ) throws IOException {
        byte[] response = iso.transceive(command);

        if (response == null || response.length < 2) {
            throw new IOException(
                "APDU response was too short"
            );
        }

        int sw1 =
            response[response.length - 2] & 0xff;

        int sw2 =
            response[response.length - 1] & 0xff;

        if (sw1 != 0x90 || sw2 != 0x00) {
            throw new IOException(
                String.format(
                    "APDU failed with %02X%02X",
                    sw1,
                    sw2
                )
            );
        }

        return Arrays.copyOf(
            response,
            response.length - 2
        );
    }

    private void emit(NdefMessage message) {
        JSArray records = new JSArray();

        for (NdefRecord record : message.getRecords()) {
            JSObject json = new JSObject();

            json.put("tnf", (int) record.getTnf());
            json.put("type", bytes(record.getType()));
            json.put("id", bytes(record.getId()));
            json.put(
                "payload",
                bytes(record.getPayload())
            );

            records.put(json);
        }

        JSObject event = new JSObject();
        event.put("ndefMessage", records);

        Activity activity = getActivity();

        if (activity == null) {
            return;
        }

        activity.runOnUiThread(
            () -> notifyListeners("ndef", event)
        );
    }

    private static JSArray bytes(byte[] input) {
        JSArray result = new JSArray();

        for (byte value : input) {
            result.put(value & 0xff);
        }

        return result;
    }

    private static byte[] hex(String input) {
        byte[] result =
            new byte[input.length() / 2];

        for (int i = 0; i < result.length; i++) {
            int position = i * 2;

            result[i] = (byte) Integer.parseInt(
                input.substring(
                    position,
                    position + 2
                ),
                16
            );
        }

        return result;
    }
}