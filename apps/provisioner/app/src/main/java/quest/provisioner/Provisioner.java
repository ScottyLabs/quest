package quest.provisioner;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public final class Provisioner {
    public static final byte[] SDM_SETTINGS = Crypto.hex("4000E0C1F0121700003A00003A0000");

    public static final byte[] NDEF = Crypto.hex(
            "0048D101445504636D752E71756573742F7461703F653D"
                    + "30303030303030303030303030303030"
                    + "30303030303030303030303030303030"
                    + "26633D"
                    + "30303030303030303030303030303030"
                    + "FE");

    private static final int KEY_VERSION = 1;

    public static final class Result {
        public final String uid;
        public final boolean wasBlank;
        public final List<String> log;
        public final String verifyUrl;

        Result(String uid, boolean wasBlank, List<String> log, String verifyUrl) {
            this.uid = uid;
            this.wasBlank = wasBlank;
            this.log = log;
            this.verifyUrl = verifyUrl;
        }
    }

    public static final class Inspection {
        public final String uid;
        public final String settings;
        public final boolean sdm;
        public final boolean questConfig;
        public final String note;

        Inspection(String uid, String settings, boolean sdm, boolean questConfig, String note) {
            this.uid = uid;
            this.settings = settings;
            this.sdm = sdm;
            this.questConfig = questConfig;
            this.note = note;
        }
    }

    static byte[] asChangeFileSettings(byte[] getFileSettings) {
        if (getFileSettings.length < 7) {
            return new byte[0];
        }
        return Crypto.concat(
                Arrays.copyOfRange(getFileSettings, 1, 4),
                Arrays.copyOfRange(getFileSettings, 7, getFileSettings.length));
    }

    public static Inspection inspect(Ntag424 tag, byte[] uid) {
        try {
            tag.selectApplication();
            byte[] raw = tag.getFileSettings(Ntag424.FILE_NDEF);
            boolean sdm = raw.length > 1 && (raw[1] & 0x40) != 0;
            boolean quest = Arrays.equals(asChangeFileSettings(raw), SDM_SETTINGS);

            String note;
            if (quest) {
                note = "provisioned for cmu.quest";
            } else if (sdm) {
                note = "SDM on, but not the cmu.quest config";
            } else {
                note = "no SDM -- blank or unprovisioned";
            }

            return new Inspection(Crypto.hex(uid), Crypto.hex(raw), sdm, quest, note);
        } catch (IOException unreadable) {
            return new Inspection(Crypto.hex(uid), null, false, false, unreadable.getMessage());
        }
    }

    private Provisioner() {
    }

    public static Result run(Ntag424 tag, byte[] master, byte[] uid) throws IOException {
        List<String> log = new ArrayList<>();
        Keys keys = Keys.forTag(master, uid);

        tag.selectApplication();
        log.add("selected NDEF application");

        boolean blank = authenticateAsMaster(tag, keys, log);

        tag.writeDataPlain(Ntag424.FILE_NDEF, 0, NDEF);
        log.add("wrote " + NDEF.length + " byte NDEF template");

        if (blank) {
            tag.changeKey(2, new byte[16], keys.k2, KEY_VERSION);
            log.add("K2 set to UID-diversified value");

            tag.changeKey(1, new byte[16], keys.k1Production, KEY_VERSION);
            log.add("K1 set to production value");
        } else {
            rotateK1(tag, keys, log);
        }

        tag.changeFileSettings(Ntag424.FILE_NDEF, SDM_SETTINGS);
        log.add("SDM enabled: PICC@0x17, MAC@0x3A, meta=K1, file=K2");

        if (blank) {
            tag.changeKey(0, new byte[16], keys.k0, KEY_VERSION);
            log.add("K0 set to UID-diversified value");
        }

        return new Result(
                Crypto.hex(uid),
                blank,
                log,
                Sun.simulate(master, uid, 0).url("https://cmu.quest/tap"));
    }

    private static boolean authenticateAsMaster(Ntag424 tag, Keys keys, List<String> log)
            throws IOException {
        try {
            tag.authenticate(0, new byte[16]);
            log.add("authenticated K0 (factory) -- blank tag");
            return true;
        } catch (Ntag424.TagError blankFailed) {
            tag.authenticate(0, keys.k0);
            log.add("authenticated K0 (diversified) -- already personalised");
            return false;
        }
    }

    private static void rotateK1(Ntag424 tag, Keys keys, List<String> log) throws IOException {
        try {
            tag.changeKey(1, keys.k1Diversified, keys.k1Production, KEY_VERSION);
            log.add("K1 rotated diversified -> production");
        } catch (Ntag424.TagError alreadyRotated) {
            log.add("K1 already at production value, left alone");
        }
    }
}
