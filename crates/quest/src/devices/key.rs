use base64::Engine as _;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use p256::PublicKey;
use p256::ecdsa::signature::Verifier as _;
use p256::ecdsa::{Signature, VerifyingKey};
use p256::elliptic_curve::sec1::ToEncodedPoint as _;
use p256::pkcs8::DecodePublicKey as _;

pub struct DeviceKey {
    canonical: String,
    key: VerifyingKey,
}

impl DeviceKey {
    pub fn parse(wire: &str) -> Option<Self> {
        let wire = wire.trim();

        let key = if wire.starts_with('{') {
            PublicKey::from_jwk_str(wire).ok()?
        } else {
            from_bytes(&decode(wire)?)?
        };

        Some(Self {
            canonical: hex::encode(key.to_encoded_point(false).as_bytes()),
            key: key.into(),
        })
    }

    pub fn hex(&self) -> &str {
        &self.canonical
    }

    pub fn verifies(&self, message: &[u8], signature: &[u8]) -> bool {
        let parsed = match signature.len() {
            64 => Signature::from_slice(signature),
            _ if signature.first() == Some(&0x30) => Signature::from_der(signature),
            _ => return false,
        };

        parsed.is_ok_and(|signature| self.key.verify(message, &signature).is_ok())
    }
}

pub fn decode(encoded: &str) -> Option<Vec<u8>> {
    if encoded.len().is_multiple_of(2) && encoded.bytes().all(|b| b.is_ascii_hexdigit()) {
        return hex::decode(encoded).ok();
    }

    decode_base64(encoded)
}

pub fn decode_base64(encoded: &str) -> Option<Vec<u8>> {
    let mut cleaned = String::with_capacity(encoded.len());
    for byte in encoded.bytes() {
        match byte {
            b'+' => cleaned.push('-'),
            b'/' => cleaned.push('_'),
            b'=' => {}
            b if b.is_ascii_whitespace() => {}
            b => cleaned.push(char::from(b)),
        }
    }

    URL_SAFE_NO_PAD.decode(cleaned).ok()
}

fn from_bytes(bytes: &[u8]) -> Option<PublicKey> {
    match bytes {
        [0x30, ..] => PublicKey::from_public_key_der(bytes).ok(),
        [0x04, ..] if bytes.len() == 65 => PublicKey::from_sec1_bytes(bytes).ok(),
        [0x02 | 0x03, ..] if bytes.len() == 33 => PublicKey::from_sec1_bytes(bytes).ok(),
        _ if bytes.len() == 64 => {
            let mut sec1 = [0u8; 65];
            sec1[0] = 0x04;
            sec1[1..].copy_from_slice(bytes);
            PublicKey::from_sec1_bytes(&sec1).ok()
        }
        _ => None,
    }
}
