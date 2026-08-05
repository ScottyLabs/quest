//! Derives a tag's four NTAG 424 DNA keys from the master secret and UID.
//! Prints `key=hex` lines for the provisioning Lua script to parse.

use std::env;
use std::fs;
use std::process;

use quest::crypto::derive_key;

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
    let uid: [u8; 7] = uid
        .try_into()
        .unwrap_or_else(|_| die("uid must be 7 bytes (14 hex chars)"));
    let master: [u8; 32] = master
        .try_into()
        .unwrap_or_else(|_| die("master must decode to 32 bytes"));

    // `k0_old` and `k1_old` are the UID-diversified values a blank tag ships
    // with; `k1_new` is the non-diversified production K1 the reader uses.
    let k0_old = derive_key(&master, b"K0", Some(&uid));
    let k1_old = derive_key(&master, b"K1", Some(&uid));
    let k1_new = derive_key(&master, b"K1", None);
    let k2 = derive_key(&master, b"K2", Some(&uid));

    println!("k0_old={}", hex::encode_upper(k0_old));
    println!("k1_old={}", hex::encode_upper(k1_old));
    println!("k1_new={}", hex::encode_upper(k1_new));
    println!("k2={}", hex::encode_upper(k2));
}
