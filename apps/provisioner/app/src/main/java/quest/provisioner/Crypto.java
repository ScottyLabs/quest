package quest.provisioner;

import java.security.GeneralSecurityException;
import java.util.Arrays;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;

public final class Crypto {
    public static final byte[] ZERO_IV = new byte[16];

    private Crypto() {
    }

    public static byte[] hmacSha256(byte[] key, byte[] data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac.doFinal(data);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HmacSHA256 unavailable", e);
        }
    }

    public static String fingerprint(byte[] key) {
        try {
            byte[] digest = java.security.MessageDigest.getInstance("SHA-256").digest(key);
            return hex(Arrays.copyOf(digest, 4));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    public static byte[] aesCbcEncrypt(byte[] key, byte[] iv, byte[] data) {
        return aes(Cipher.ENCRYPT_MODE, key, iv, data);
    }

    public static byte[] aesCbcDecrypt(byte[] key, byte[] iv, byte[] data) {
        return aes(Cipher.DECRYPT_MODE, key, iv, data);
    }

    private static byte[] aes(int mode, byte[] key, byte[] iv, byte[] data) {
        try {
            Cipher cipher = Cipher.getInstance("AES/CBC/NoPadding");
            cipher.init(mode, new SecretKeySpec(key, "AES"), new IvParameterSpec(iv));
            return cipher.doFinal(data);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("AES/CBC/NoPadding unavailable", e);
        }
    }

    public static byte[] cmac(byte[] key, byte[] message) {
        byte[] zero = aesCbcEncrypt(key, ZERO_IV, new byte[16]);
        byte[] k1 = shiftLeftXorRb(zero);
        byte[] k2 = shiftLeftXorRb(k1);

        int blocks = (message.length + 15) / 16;
        boolean whole = message.length > 0 && message.length % 16 == 0;
        if (blocks == 0) {
            blocks = 1;
        }

        byte[] last = new byte[16];
        int lastStart = (blocks - 1) * 16;
        if (whole) {
            System.arraycopy(message, lastStart, last, 0, 16);
            xorInto(last, k1);
        } else {
            int remaining = message.length - lastStart;
            System.arraycopy(message, lastStart, last, 0, remaining);
            last[remaining] = (byte) 0x80;
            xorInto(last, k2);
        }

        byte[] state = new byte[16];
        for (int i = 0; i < blocks - 1; i++) {
            byte[] block = Arrays.copyOfRange(message, i * 16, i * 16 + 16);
            xorInto(state, block);
            state = aesCbcEncrypt(key, ZERO_IV, state);
        }
        xorInto(state, last);
        return aesCbcEncrypt(key, ZERO_IV, state);
    }

    private static byte[] shiftLeftXorRb(byte[] input) {
        byte[] out = new byte[16];
        int carry = 0;
        for (int i = 15; i >= 0; i--) {
            int value = (input[i] & 0xFF) << 1 | carry;
            out[i] = (byte) value;
            carry = value >>> 8;
        }
        if ((input[0] & 0x80) != 0) {
            out[15] ^= (byte) 0x87;
        }
        return out;
    }

    private static void xorInto(byte[] target, byte[] other) {
        for (int i = 0; i < target.length; i++) {
            target[i] ^= other[i];
        }
    }

    public static byte[] rotateLeft(byte[] input, int by) {
        byte[] out = new byte[input.length];
        for (int i = 0; i < input.length; i++) {
            out[i] = input[(i + by) % input.length];
        }
        return out;
    }

    public static byte[] concat(byte[]... parts) {
        int total = 0;
        for (byte[] part : parts) {
            total += part.length;
        }
        byte[] out = new byte[total];
        int at = 0;
        for (byte[] part : parts) {
            System.arraycopy(part, 0, out, at, part.length);
            at += part.length;
        }
        return out;
    }

    public static byte[] pad(byte[] data) {
        if (data.length > 0 && data.length % 16 == 0) {
            return data;
        }
        byte[] out = new byte[((data.length / 16) + 1) * 16];
        System.arraycopy(data, 0, out, 0, data.length);
        out[data.length] = (byte) 0x80;
        return out;
    }

    public static byte[] hex(String value) {
        String clean = value.replaceAll("[^0-9A-Fa-f]", "");
        if (clean.length() % 2 != 0) {
            throw new IllegalArgumentException("odd hex length");
        }
        byte[] out = new byte[clean.length() / 2];
        for (int i = 0; i < out.length; i++) {
            out[i] = (byte) Integer.parseInt(clean.substring(i * 2, i * 2 + 2), 16);
        }
        return out;
    }

    public static String hex(byte[] value) {
        StringBuilder out = new StringBuilder(value.length * 2);
        for (byte b : value) {
            out.append(String.format("%02X", b));
        }
        return out.toString();
    }
}
