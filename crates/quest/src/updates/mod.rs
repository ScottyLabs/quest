pub mod routes;

use std::io;
use std::path::Path;
use std::sync::Arc;

use sha2::{Digest, Sha256};

#[derive(Clone)]
pub struct Updates {
    live: Option<Arc<Bundle>>,
}

pub struct Bundle {
    pub version: String,
    pub checksum: String,
    pub zip: Vec<u8>,
}

impl Updates {
    pub fn disabled() -> Self {
        Self { live: None }
    }

    pub fn load(path: &Path) -> io::Result<Self> {
        let zip = std::fs::read(path)?;

        if zip.first_chunk::<2>() != Some(b"PK") {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                format!("{} is not a zip", path.display()),
            ));
        }

        let checksum = hex::encode(Sha256::digest(&zip));
        let version = checksum[..12].to_owned();

        Ok(Self {
            live: Some(Arc::new(Bundle {
                version,
                checksum,
                zip,
            })),
        })
    }

    pub fn live(&self) -> Option<&Bundle> {
        self.live.as_deref()
    }
}
