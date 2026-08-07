package quest.provisioner;

import java.io.IOException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.zip.CRC32;

public final class Ntag424 {
    public interface Transceiver {
        byte[] transceive(byte[] apdu) throws IOException;
    }

    public static final byte FILE_NDEF = 0x02;

    private static final byte CLA = (byte) 0x90;
    private static final byte INS_AUTH_EV2_FIRST = 0x71;
    private static final byte INS_ADDITIONAL_FRAME = (byte) 0xAF;
    private static final byte INS_CHANGE_KEY = (byte) 0xC4;
    private static final byte INS_CHANGE_FILE_SETTINGS = 0x5F;
    private static final byte INS_WRITE_DATA = (byte) 0x8D;
    private static final byte INS_GET_FILE_SETTINGS = (byte) 0xF5;

    private final Transceiver link;
    private final SecureRandom random = new SecureRandom();

    private byte[] ti;
    private byte[] sesEnc;
    private byte[] sesMac;
    private int cmdCtr;
    private int authenticatedKey = -1;

    private byte[] fixedRndA;

    public Ntag424(Transceiver link) {
        this.link = link;
    }

    void useFixedRndA(byte[] rndA) {
        this.fixedRndA = rndA;
    }

    public static final class TagError extends IOException {
        public final int sw;

        TagError(String message, int sw) {
            super(message + String.format(" (SW=%04X)", sw));
            this.sw = sw;
        }
    }

    private static final class Reply {
        final byte[] data;
        final int sw;

        Reply(byte[] data, int sw) {
            this.data = data;
            this.sw = sw;
        }
    }

    private Reply exchange(byte[] apdu) throws IOException {
        byte[] response = link.transceive(apdu);
        if (response == null || response.length < 2) {
            throw new IOException("short response from tag");
        }
        int sw = ((response[response.length - 2] & 0xFF) << 8) | (response[response.length - 1] & 0xFF);
        return new Reply(Arrays.copyOf(response, response.length - 2), sw);
    }

    private static byte[] frame(byte ins, byte[] payload) {
        byte[] body = payload == null ? new byte[0] : payload;
        byte[] apdu = new byte[6 + body.length];
        apdu[0] = CLA;
        apdu[1] = ins;
        apdu[2] = 0x00;
        apdu[3] = 0x00;
        apdu[4] = (byte) body.length;
        System.arraycopy(body, 0, apdu, 5, body.length);
        apdu[apdu.length - 1] = 0x00;
        return apdu;
    }

    public void selectApplication() throws IOException {
        Reply reply = exchange(Crypto.hex("00A4000C02E11000"));
        if (reply.sw != 0x9000) {
            throw new TagError("select application failed", reply.sw);
        }
    }

    public byte[] getFileSettings(byte fileNo) throws IOException {
        Reply reply = exchange(frame(INS_GET_FILE_SETTINGS, new byte[]{fileNo}));
        if (reply.sw != 0x9100) {
            throw new TagError("get file settings failed", reply.sw);
        }
        return reply.data;
    }

    public void authenticate(int keyNo, byte[] key) throws IOException {
        Reply first = exchange(frame(INS_AUTH_EV2_FIRST, new byte[]{(byte) keyNo, 0x00}));
        if (first.sw != 0x91AF || first.data.length != 16) {
            throw new TagError("auth leg 1 rejected", first.sw);
        }

        byte[] rndB = Crypto.aesCbcDecrypt(key, Crypto.ZERO_IV, first.data);
        byte[] rndA = fixedRndA;
        if (rndA == null) {
            rndA = new byte[16];
            random.nextBytes(rndA);
        }

        byte[] payload = Crypto.aesCbcEncrypt(
                key, Crypto.ZERO_IV, Crypto.concat(rndA, Crypto.rotateLeft(rndB, 1)));

        Reply second = exchange(frame(INS_ADDITIONAL_FRAME, payload));
        if (second.sw != 0x9100 || second.data.length != 32) {
            throw new TagError("auth leg 2 rejected", second.sw);
        }

        byte[] plain = Crypto.aesCbcDecrypt(key, Crypto.ZERO_IV, second.data);
        byte[] echoed = Arrays.copyOfRange(plain, 4, 20);
        if (!Arrays.equals(rotateRight(echoed), rndA)) {
            throw new IOException("tag failed to echo RndA; wrong key or MITM");
        }

        this.ti = Arrays.copyOfRange(plain, 0, 4);
        this.sesEnc = Crypto.cmac(key, sessionVector((byte) 0xA5, (byte) 0x5A, rndA, rndB));
        this.sesMac = Crypto.cmac(key, sessionVector((byte) 0x5A, (byte) 0xA5, rndA, rndB));
        this.cmdCtr = 0;
        this.authenticatedKey = keyNo;
    }

    static byte[] sessionVector(byte label0, byte label1, byte[] rndA, byte[] rndB) {
        byte[] sv = new byte[32];
        sv[0] = label0;
        sv[1] = label1;
        sv[2] = 0x00;
        sv[3] = 0x01;
        sv[4] = 0x00;
        sv[5] = (byte) 0x80;
        sv[6] = rndA[0];
        sv[7] = rndA[1];
        for (int i = 0; i < 6; i++) {
            sv[8 + i] = (byte) (rndA[2 + i] ^ rndB[i]);
        }
        System.arraycopy(rndB, 6, sv, 14, 10);
        System.arraycopy(rndA, 8, sv, 24, 8);
        return sv;
    }

    private static byte[] rotateRight(byte[] input) {
        byte[] out = new byte[input.length];
        out[0] = input[input.length - 1];
        System.arraycopy(input, 0, out, 1, input.length - 1);
        return out;
    }

    private byte[] counterLe() {
        return new byte[]{(byte) (cmdCtr & 0xFF), (byte) ((cmdCtr >>> 8) & 0xFF)};
    }

    byte[] commandIv() {
        return Crypto.aesCbcEncrypt(sesEnc, Crypto.ZERO_IV, Crypto.concat(
                new byte[]{(byte) 0xA5, 0x5A}, ti, counterLe(), new byte[8]));
    }

    byte[] macTruncated(byte ins, byte[] header, byte[] encrypted) {
        byte[] input = Crypto.concat(
                new byte[]{ins}, counterLe(), ti,
                header == null ? new byte[0] : header,
                encrypted == null ? new byte[0] : encrypted);
        byte[] full = Crypto.cmac(sesMac, input);
        byte[] out = new byte[8];
        for (int i = 0; i < 8; i++) {
            out[i] = full[i * 2 + 1];
        }
        return out;
    }

    private Reply fullCommand(byte ins, byte[] header, byte[] plaintext) throws IOException {
        byte[] encrypted = Crypto.aesCbcEncrypt(sesEnc, commandIv(), Crypto.pad(plaintext));
        byte[] mac = macTruncated(ins, header, encrypted);
        Reply reply = exchange(frame(ins, Crypto.concat(
                header == null ? new byte[0] : header, encrypted, mac)));
        cmdCtr++;
        return reply;
    }

    static byte[] jamCrc32(byte[] data) {
        CRC32 crc = new CRC32();
        crc.update(data);
        long value = ~crc.getValue() & 0xFFFFFFFFL;
        return new byte[]{
                (byte) (value & 0xFF),
                (byte) ((value >>> 8) & 0xFF),
                (byte) ((value >>> 16) & 0xFF),
                (byte) ((value >>> 24) & 0xFF)};
    }

    static byte[] changeKeyPlaintext(int keyNo, int authenticatedKey,
                                     byte[] oldKey, byte[] newKey, int version) {
        if (keyNo == authenticatedKey) {
            return Crypto.concat(newKey, new byte[]{(byte) version});
        }
        byte[] xored = new byte[16];
        for (int i = 0; i < 16; i++) {
            xored[i] = (byte) (oldKey[i] ^ newKey[i]);
        }
        return Crypto.concat(xored, new byte[]{(byte) version}, jamCrc32(newKey));
    }

    public void changeKey(int keyNo, byte[] oldKey, byte[] newKey, int version) throws IOException {
        if (authenticatedKey != 0) {
            throw new IOException("ChangeKey requires an active key 0 session");
        }
        byte[] plaintext = changeKeyPlaintext(keyNo, authenticatedKey, oldKey, newKey, version);
        Reply reply = fullCommand(INS_CHANGE_KEY, new byte[]{(byte) keyNo}, plaintext);
        if (reply.sw != 0x9100) {
            throw new TagError("change key " + keyNo + " failed", reply.sw);
        }
        if (keyNo == 0) {
            authenticatedKey = -1;
        }
    }

    public void changeFileSettings(byte fileNo, byte[] settings) throws IOException {
        Reply reply = fullCommand(INS_CHANGE_FILE_SETTINGS, new byte[]{fileNo}, settings);
        if (reply.sw != 0x9100) {
            throw new TagError("change file settings failed", reply.sw);
        }
    }

    public void writeDataPlain(byte fileNo, int offset, byte[] data) throws IOException {
        int written = 0;
        while (written < data.length) {
            int chunk = Math.min(data.length - written, 200);
            int at = offset + written;
            byte[] header = new byte[]{
                    fileNo,
                    (byte) (at & 0xFF), (byte) ((at >>> 8) & 0xFF), (byte) ((at >>> 16) & 0xFF),
                    (byte) (chunk & 0xFF), (byte) ((chunk >>> 8) & 0xFF), (byte) ((chunk >>> 16) & 0xFF)};

            Reply reply = exchange(frame(INS_WRITE_DATA, Crypto.concat(
                    header, Arrays.copyOfRange(data, written, written + chunk))));
            if (reply.sw != 0x9100) {
                throw new TagError("write data at " + at + " failed", reply.sw);
            }
            if (isSessionOpen()) {
                cmdCtr++;
            }
            written += chunk;
        }
    }

    public boolean isSessionOpen() {
        return sesMac != null;
    }

    public int authenticatedKey() {
        return authenticatedKey;
    }
}
