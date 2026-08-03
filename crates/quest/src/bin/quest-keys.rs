//! Derive the four NTAG 424 DNA keys for an eval/production tag from the
//! master secret and the tag's UID. Output is `key=hex` lines on stdout, one
//! per line, suitable for parsing by the provisioning Lua script.

use std::env;
use std::fs;
use std::process;

use hmac::{Hmac, KeyInit, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

fn hmac16(master: &[u8], data: &[u8]) -> [u8; 16] {
    let mut mac = <HmacSha256 as KeyInit>::new_from_slice(master).expect("hmac key length");
    mac.update(data);
    let out = mac.finalize().into_bytes();
    let mut buf = [0u8; 16];
    buf.copy_from_slice(&out[..16]);
    buf
}

fn die(msg: &str) -> ! {
    eprintln!("{msg}");
    process::exit(2);
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let mut master_path: Option<String> = None;
    let mut uid_hex: Option<String> = None;

    let mut iter = args.iter().skip(1);
    while let Some(arg) = iter.next() {
        match arg.as_str() {
            "--master" => master_path = iter.next().cloned(),
            "--uid" => uid_hex = iter.next().cloned(),
            "-h" | "--help" => {
                println!("Usage: quest-keys --master <path> --uid <hex14>");
                process::exit(0);
            }
            other => die(&format!("unknown argument: {other}")),
        }
    }

    let master_path = master_path.unwrap_or_else(|| die("--master <path> required"));
    let uid_hex = uid_hex.unwrap_or_else(|| die("--uid <hex> required"));

    let raw = fs::read_to_string(&master_path)
        .unwrap_or_else(|e| die(&format!("read {master_path}: {e}")));
    let master =
        hex::decode(raw.trim()).unwrap_or_else(|e| die(&format!("master.key not hex: {e}")));
    if master.len() != 32 {
        die("master must decode to 32 bytes");
    }

    let uid = hex::decode(uid_hex.trim()).unwrap_or_else(|e| die(&format!("uid not hex: {e}")));
    if uid.len() != 7 {
        die("uid must be 7 bytes (14 hex chars)");
    }

    let mut k0_input = b"K0".to_vec();
    k0_input.extend_from_slice(&uid);
    let mut k1_old_input = b"K1".to_vec();
    k1_old_input.extend_from_slice(&uid);
    let mut k2_input = b"K2".to_vec();
    k2_input.extend_from_slice(&uid);

    let k0_old = hmac16(&master, &k0_input);
    let k1_old = hmac16(&master, &k1_old_input);
    let k1_new = hmac16(&master, b"K1");
    let k2 = hmac16(&master, &k2_input);

    println!("k0_old={}", hex::encode_upper(k0_old));
    println!("k1_old={}", hex::encode_upper(k1_old));
    println!("k1_new={}", hex::encode_upper(k1_new));
    println!("k2={}", hex::encode_upper(k2));
}
