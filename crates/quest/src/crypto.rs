use aes::Aes128;
use cbc::Decryptor;
use cbc::cipher::{Array, BlockModeDecrypt, KeyIvInit};
use cmac::{Cmac, KeyInit as CmacKeyInit, Mac as CmacMac};
use hmac::{Hmac, KeyInit as HmacKeyInit};
use sha2::Sha256;
use subtle::ConstantTimeEq;

type HmacSha256 = Hmac<Sha256>;
type Aes128CbcDec = Decryptor<Aes128>;
type CmacAes128 = Cmac<Aes128>;

#[derive(Debug)]
pub enum VerifyError {
    InvalidSignature,
}

pub struct Verified {
    pub uid: [u8; 7],
    pub counter: u32,
}

fn hmac_sha256(key: &[u8], data: &[u8]) -> [u8; 32] {
    let mut mac =
        <HmacSha256 as HmacKeyInit>::new_from_slice(key).expect("HMAC accepts any key length");
    mac.update(data);
    let out = mac.finalize().into_bytes();
    let mut buf = [0u8; 32];
    buf.copy_from_slice(&out);
    buf
}

fn derive_k_meta(master: &[u8; 32]) -> [u8; 16] {
    let full = hmac_sha256(master, b"K1");
    let mut k = [0u8; 16];
    k.copy_from_slice(&full[..16]);
    k
}

fn derive_k_file(master: &[u8; 32], uid: &[u8; 7]) -> [u8; 16] {
    let mut input = [0u8; 9];
    input[..2].copy_from_slice(b"K2");
    input[2..].copy_from_slice(uid);
    let full = hmac_sha256(master, &input);
    let mut k = [0u8; 16];
    k.copy_from_slice(&full[..16]);
    k
}

fn aes_cbc_decrypt_block(key: &[u8; 16], ciphertext: &[u8; 16]) -> [u8; 16] {
    let iv = [0u8; 16];
    let mut dec = Aes128CbcDec::new(key.into(), (&iv).into());
    let mut block: Array<u8, _> = Array(*ciphertext);
    dec.decrypt_block(&mut block);
    block.0
}

fn aes_cmac(key: &[u8; 16], data: &[u8]) -> [u8; 16] {
    let mut mac = <CmacAes128 as CmacKeyInit>::new_from_slice(key).expect("AES-128 key length");
    mac.update(data);
    let out = mac.finalize().into_bytes();
    let mut buf = [0u8; 16];
    buf.copy_from_slice(&out);
    buf
}

pub fn verify_tap(
    master: &[u8; 32],
    picc_enc: &[u8; 16],
    mac_recv: &[u8; 8],
) -> Result<Verified, VerifyError> {
    let k_meta = derive_k_meta(master);
    let picc_plain = aes_cbc_decrypt_block(&k_meta, picc_enc);

    let tag_byte = picc_plain[0];
    let uid_mirrored = tag_byte & 0x80 != 0;
    let ctr_mirrored = tag_byte & 0x40 != 0;
    let uid_len = (tag_byte & 0x0F) as usize;
    if !uid_mirrored || !ctr_mirrored || uid_len != 7 {
        return Err(VerifyError::InvalidSignature);
    }

    let mut uid = [0u8; 7];
    uid.copy_from_slice(&picc_plain[1..8]);
    let ctr_bytes = &picc_plain[8..11];
    let counter = u32::from_le_bytes([ctr_bytes[0], ctr_bytes[1], ctr_bytes[2], 0]);

    let k_file = derive_k_file(master, &uid);

    // SV2 per AN12196 section 3.4.4.2 is a 16-byte session-vector that mixes a fixed
    // protocol prefix with this tap's UID and counter. CMAC-ing it with the
    // file key yields a per-tap session key that's then used to MAC the file.
    let mut sv2 = [0u8; 16];
    sv2[..6].copy_from_slice(&[0x3C, 0xC3, 0x00, 0x01, 0x00, 0x80]);
    sv2[6..13].copy_from_slice(&uid);
    sv2[13..16].copy_from_slice(ctr_bytes);

    let session_key = aes_cmac(&k_file, &sv2);
    let full_mac = aes_cmac(&session_key, &[]);

    let mut mac_expected = [0u8; 8];
    for (i, idx) in [1, 3, 5, 7, 9, 11, 13, 15].iter().enumerate() {
        mac_expected[i] = full_mac[*idx];
    }

    if mac_expected.ct_eq(mac_recv).into() {
        Ok(Verified { uid, counter })
    } else {
        Err(VerifyError::InvalidSignature)
    }
}
