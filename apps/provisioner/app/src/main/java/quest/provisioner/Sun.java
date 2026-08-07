package quest.provisioner;

public final class Sun {
    private static final byte TAG_BYTE = (byte) (0x80 | 0x40 | 0x07);

    public final String picc;
    public final String mac;

    private Sun(String picc, String mac) {
        this.picc = picc;
        this.mac = mac;
    }

    public String url(String base) {
        return base + "?e=" + picc + "&c=" + mac;
    }

    public static Sun simulate(byte[] master, byte[] uid, int counter) {
        byte[] plain = new byte[16];
        plain[0] = TAG_BYTE;
        System.arraycopy(uid, 0, plain, 1, 7);
        plain[8] = (byte) (counter & 0xFF);
        plain[9] = (byte) ((counter >>> 8) & 0xFF);
        plain[10] = (byte) ((counter >>> 16) & 0xFF);

        byte[] encrypted = Crypto.aesCbcEncrypt(
                Keys.derive(master, Keys.K1, null), Crypto.ZERO_IV, plain);

        byte[] sv2 = new byte[16];
        System.arraycopy(new byte[]{0x3C, (byte) 0xC3, 0x00, 0x01, 0x00, (byte) 0x80}, 0, sv2, 0, 6);
        System.arraycopy(uid, 0, sv2, 6, 7);
        System.arraycopy(plain, 8, sv2, 13, 3);

        byte[] session = Crypto.cmac(Keys.derive(master, Keys.K2, uid), sv2);
        byte[] full = Crypto.cmac(session, new byte[0]);

        byte[] truncated = new byte[8];
        for (int i = 0; i < 8; i++) {
            truncated[i] = full[i * 2 + 1];
        }

        return new Sun(Crypto.hex(encrypted), Crypto.hex(truncated));
    }
}
