package quest.provisioner;

import java.util.Arrays;

public final class Keys {
    public static final byte[] K0 = {'K', '0'};
    public static final byte[] K1 = {'K', '1'};
    public static final byte[] K2 = {'K', '2'};

    public final byte[] k0;
    public final byte[] k1Diversified;
    public final byte[] k1Production;
    public final byte[] k2;

    private Keys(byte[] k0, byte[] k1Diversified, byte[] k1Production, byte[] k2) {
        this.k0 = k0;
        this.k1Diversified = k1Diversified;
        this.k1Production = k1Production;
        this.k2 = k2;
    }

    public static byte[] derive(byte[] master, byte[] label, byte[] uid) {
        if (master.length != 32) {
            throw new IllegalArgumentException("master must be 32 bytes");
        }
        if (label.length != 2) {
            throw new IllegalArgumentException("label must be 2 bytes");
        }
        byte[] input;
        if (uid == null) {
            input = label;
        } else {
            if (uid.length != 7) {
                throw new IllegalArgumentException("uid must be 7 bytes");
            }
            input = Crypto.concat(label, uid);
        }
        return Arrays.copyOf(Crypto.hmacSha256(master, input), 16);
    }

    public static Keys forTag(byte[] master, byte[] uid) {
        return new Keys(
                derive(master, K0, uid),
                derive(master, K1, uid),
                derive(master, K1, null),
                derive(master, K2, uid));
    }
}
