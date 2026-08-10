pub mod assets;
pub mod routes;

use std::io::Cursor;

use base64::Engine as _;
use base64::engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD};
use entity::{devices, users, wallet_pass};
use pkpass::sign::{SignConfig, WWDR};
use pkpass::{Package, PassBuilder, PassConfig, barcode, fields, resource, visual_appearance};
use sea_orm::prelude::Uuid;
use sea_orm::{
    ActiveValue, ColumnTrait, DatabaseConnection, DbErr, EntityTrait, QueryFilter, sea_query,
};
use x509_cert::Certificate;
use x509_cert::der::oid::ObjectIdentifier;

use crate::auth::AuthError;
use crate::devices::key::{DeviceKey, decode_base64};

const TOKEN_PREFIX: &str = "Q1";

const ISSUE_SKEW_SECS: i64 = 300;

const ORGANIZATION: &str = "Terrier Ticket";

#[derive(Clone)]
pub struct Passes {
    db: DatabaseConnection,
    signing: Option<Signing>,
}

#[derive(Clone)]
struct Signing {
    config: SignConfig,
    pass_type_identifier: String,
    team_identifier: String,
}

pub struct Issued {
    pub serial: String,
    pub token: String,
    pub fresh: bool,
    pub pkpass: Vec<u8>,
}

pub struct Holder {
    pub andrew_id: String,
    pub name: String,
    pub issued_at: i64,
}

pub struct Signed {
    pub issued_at: i64,
    pub signature: Vec<u8>,
}

pub fn signed_message(andrew_id: &str, issued_at: i64) -> String {
    format!("{TOKEN_PREFIX}.{andrew_id}.{issued_at}")
}

fn encode_token(andrew_id: &str, issued_at: i64, signature: &[u8]) -> String {
    format!(
        "{}.{}",
        signed_message(andrew_id, issued_at),
        URL_SAFE_NO_PAD.encode(signature)
    )
}

pub struct Token {
    pub andrew_id: String,
    pub issued_at: i64,
    pub signature: Vec<u8>,
}

impl Token {
    pub fn parse(raw: &str) -> Option<Self> {
        let mut parts = raw.trim().split('.');
        let (version, andrew_id, issued_at, signature) =
            (parts.next()?, parts.next()?, parts.next()?, parts.next()?);

        if parts.next().is_some() || version != TOKEN_PREFIX || andrew_id.is_empty() {
            return None;
        }

        Some(Self {
            andrew_id: andrew_id.to_owned(),
            issued_at: issued_at.parse().ok()?,
            signature: decode_base64(signature)?,
        })
    }
}

fn pem(name: &'static str) -> Result<Option<String>, String> {
    let Some(raw) = crate::auth::env_opt(name) else {
        return Ok(None);
    };
    let trimmed = raw.trim();

    if trimmed.contains("-----BEGIN") {
        return Ok(Some(trimmed.to_owned()));
    }

    let cleaned: String = trimmed
        .chars()
        .filter(|c| !c.is_ascii_whitespace())
        .collect();
    let decoded = STANDARD
        .decode(cleaned)
        .map_err(|e| format!("{name} is neither PEM nor base64-encoded PEM: {e}"))?;
    let text =
        String::from_utf8(decoded).map_err(|e| format!("{name} base64 is not valid text: {e}"))?;

    if !text.contains("-----BEGIN") {
        return Err(format!("{name} decoded to something that is not PEM"));
    }
    Ok(Some(text))
}

const OID_UID: ObjectIdentifier = ObjectIdentifier::new_unwrap("0.9.2342.19200300.100.1.1");
const OID_OU: ObjectIdentifier = ObjectIdentifier::new_unwrap("2.5.4.11");

fn subject_attribute(cert: &Certificate, oid: ObjectIdentifier) -> Option<&str> {
    cert.tbs_certificate
        .subject
        .0
        .iter()
        .flat_map(|rdn| rdn.0.iter())
        .find(|attribute| attribute.oid == oid)
        .and_then(|attribute| std::str::from_utf8(attribute.value.value()).ok())
}

fn certified(cert: &Certificate, pass_type: &str, team: &str) -> Result<(), String> {
    for (var, configured, oid, attribute) in [
        ("PASS_TYPE_IDENTIFIER", pass_type, OID_UID, "UID"),
        ("PASS_TEAM_IDENTIFIER", team, OID_OU, "OU"),
    ] {
        match subject_attribute(cert, oid) {
            Some(signed_as) if signed_as == configured => {}
            Some(signed_as) => {
                return Err(format!(
                    "{var} is {configured:?} but the signing certificate is issued to {signed_as:?} \
                     (subject {attribute}); Wallet refuses passes whose identifiers disagree with \
                     the certificate that signed them"
                ));
            }
            None => {
                return Err(format!(
                    "signing certificate subject carries no {attribute}"
                ));
            }
        }
    }
    Ok(())
}

impl Passes {
    pub fn unconfigured(db: DatabaseConnection) -> Self {
        Self { db, signing: None }
    }

    pub fn from_env(db: DatabaseConnection) -> Result<Self, String> {
        let (Some(cert), Some(key)) = (pem("PASS_CERT_PEM")?, pem("PASS_KEY_PEM")?) else {
            return Ok(Self { db, signing: None });
        };

        if key.contains("BEGIN RSA PRIVATE KEY") {
            return Err(
                "PASS_KEY_PEM is PKCS#1; convert with `openssl pkcs8 -topk8 -nocrypt`".into(),
            );
        }
        if key.contains("ENCRYPTED") {
            return Err("PASS_KEY_PEM is encrypted; the signer takes no passphrase".into());
        }

        let config = SignConfig::new(&WWDR::G4, cert.as_bytes(), &key)
            .map_err(|e| format!("pass signing certificate rejected: {e}"))?;

        let pass_type_identifier =
            crate::auth::env_required("PASS_TYPE_IDENTIFIER").map_err(|e| e.to_string())?;
        let team_identifier =
            crate::auth::env_required("PASS_TEAM_IDENTIFIER").map_err(|e| e.to_string())?;

        certified(&config.sign_cert, &pass_type_identifier, &team_identifier)?;

        Ok(Self {
            db,
            signing: Some(Signing {
                config,
                pass_type_identifier,
                team_identifier,
            }),
        })
    }

    async fn signer(
        &self,
        user: Uuid,
        message: &str,
        signature: &[u8],
    ) -> Result<Option<String>, AuthError> {
        let enrolled = devices::Entity::find()
            .filter(devices::Column::UserId.eq(user))
            .all(&self.db)
            .await
            .map_err(db_down)?;

        Ok(enrolled
            .into_iter()
            .find(|device| {
                DeviceKey::parse(&device.public_key)
                    .is_some_and(|key| key.verifies(message.as_bytes(), signature))
            })
            .map(|device| device.public_key))
    }

    pub async fn issue(
        &self,
        user: Uuid,
        andrew_id: &str,
        name: &str,
        offered: Option<Signed>,
    ) -> Result<Issued, AuthError> {
        let signing = self.signing.as_ref().ok_or(AuthError::NotConfigured)?;

        let held = wallet_pass::Entity::find_by_id(user)
            .one(&self.db)
            .await
            .map_err(db_down)?;

        if let Some(row) = held {
            let signature = decode_base64(&row.signature)
                .ok_or(AuthError::Upstream("pass_signature_corrupt"))?;
            let message = signed_message(&row.andrew_id, row.issued_at);

            if self.signer(user, &message, &signature).await?.is_some() {
                return rebuild(signing, row);
            }
        }

        let Signed {
            issued_at,
            signature,
        } = offered.ok_or(AuthError::BadRequest("pass_signature_required"))?;

        if (crate::devices::proof::now() - issued_at).abs() > ISSUE_SKEW_SECS {
            return Err(AuthError::BadRequest("pass_issued_at_skewed"));
        }

        let message = signed_message(andrew_id, issued_at);
        let public_key = self
            .signer(user, &message, &signature)
            .await?
            .ok_or(AuthError::Unauthorized("pass_signature"))?;

        let serial = andrew_id.to_owned();
        let token = encode_token(andrew_id, issued_at, &signature);

        let row = wallet_pass::ActiveModel {
            user_id: ActiveValue::Set(user),
            serial: ActiveValue::Set(serial.clone()),
            andrew_id: ActiveValue::Set(andrew_id.to_owned()),
            name: ActiveValue::Set(name.to_owned()),
            issued_at: ActiveValue::Set(issued_at),
            public_key: ActiveValue::Set(public_key),
            signature: ActiveValue::Set(URL_SAFE_NO_PAD.encode(&signature)),
            ..Default::default()
        };

        wallet_pass::Entity::insert(row)
            .on_conflict(
                sea_query::OnConflict::column(wallet_pass::Column::UserId)
                    .update_columns([
                        wallet_pass::Column::AndrewId,
                        wallet_pass::Column::Name,
                        wallet_pass::Column::IssuedAt,
                        wallet_pass::Column::PublicKey,
                        wallet_pass::Column::Signature,
                    ])
                    .to_owned(),
            )
            .exec_without_returning(&self.db)
            .await
            .map_err(db_down)?;

        let pkpass = build(signing, &serial, andrew_id, name, &token)?;

        Ok(Issued {
            serial,
            token,
            fresh: true,
            pkpass,
        })
    }

    pub async fn verify(&self, raw: &str) -> Result<Holder, AuthError> {
        let token = Token::parse(raw).ok_or(AuthError::BadRequest("pass_token_malformed"))?;

        let holder = users::Entity::find()
            .filter(users::Column::AndrewId.eq(&token.andrew_id))
            .one(&self.db)
            .await
            .map_err(db_down)?
            .ok_or(AuthError::NotFound("pass_holder_unknown"))?;

        let message = signed_message(&token.andrew_id, token.issued_at);
        self.signer(holder.id, &message, &token.signature)
            .await?
            .ok_or(AuthError::Unauthorized("pass_signature"))?;

        let name = wallet_pass::Entity::find_by_id(holder.id)
            .one(&self.db)
            .await
            .map_err(db_down)?
            .map(|row| row.name)
            .unwrap_or_default();

        Ok(Holder {
            andrew_id: holder.andrew_id,
            name,
            issued_at: token.issued_at,
        })
    }
}

fn rebuild(signing: &Signing, row: wallet_pass::Model) -> Result<Issued, AuthError> {
    let signature =
        decode_base64(&row.signature).ok_or(AuthError::Upstream("pass_signature_corrupt"))?;
    let token = encode_token(&row.andrew_id, row.issued_at, &signature);
    let pkpass = build(signing, &row.serial, &row.andrew_id, &row.name, &token)?;

    Ok(Issued {
        serial: row.serial,
        token,
        fresh: false,
        pkpass,
    })
}

fn build(
    signing: &Signing,
    serial: &str,
    andrew_id: &str,
    name: &str,
    token: &str,
) -> Result<Vec<u8>, AuthError> {
    assemble(signing, serial, andrew_id, name, token).map_err(|e| {
        eprintln!("passes: {e}");
        AuthError::Upstream("pass_build_failed")
    })
}

fn assemble(
    signing: &Signing,
    serial: &str,
    andrew_id: &str,
    name: &str,
    token: &str,
) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let card = fields::Type::StoreCard {
        pass_fields: fields::Fields::default(),
    }
    .add_secondary_field(fields::Content::new(
        "name",
        name,
        fields::ContentOptions {
            label: Some("NAME".into()),
            ..Default::default()
        },
    ))
    .add_secondary_field(fields::Content::new(
        "andrewId",
        andrew_id,
        fields::ContentOptions {
            label: Some("ANDREW ID".into()),
            text_alignment: Some(fields::TextAlignment::Right),
            ..Default::default()
        },
    ));

    let pass = PassBuilder::new(PassConfig {
        organization_name: ORGANIZATION.into(),
        description: ORGANIZATION.into(),
        pass_type_identifier: signing.pass_type_identifier.clone(),
        team_identifier: signing.team_identifier.clone(),
        serial_number: serial.to_owned(),
    })
    .logo_text(ORGANIZATION.into())
    .appearance(visual_appearance::VisualAppearance {
        background_color: visual_appearance::Color::new(217, 217, 217),
        foreground_color: visual_appearance::Color::new(0, 0, 0),
        label_color: visual_appearance::Color::new(0, 0, 0),
    })
    .set_sharing_prohibited(true)
    .add_barcode(barcode::Barcode {
        message: token.to_owned(),
        format: barcode::BarcodeFormat::QR,
        alt_text: None,
        message_encoding: "iso-8859-1".into(),
    })
    .fields(card)
    .build();

    let mut package = Package::new(pass);

    for (kind, bytes) in [
        (
            resource::Type::Icon(resource::Version::Standard),
            assets::ICON,
        ),
        (
            resource::Type::Icon(resource::Version::Size2X),
            assets::ICON_2X,
        ),
        (
            resource::Type::Icon(resource::Version::Size3X),
            assets::ICON_3X,
        ),
        (
            resource::Type::Logo(resource::Version::Standard),
            assets::LOGO,
        ),
        (
            resource::Type::Logo(resource::Version::Size2X),
            assets::LOGO_2X,
        ),
        (
            resource::Type::Logo(resource::Version::Size3X),
            assets::LOGO_3X,
        ),
        (
            resource::Type::Strip(resource::Version::Standard),
            assets::STRIP,
        ),
        (
            resource::Type::Strip(resource::Version::Size2X),
            assets::STRIP_2X,
        ),
        (
            resource::Type::Strip(resource::Version::Size3X),
            assets::STRIP_3X,
        ),
    ] {
        package.add_resource(kind, bytes)?;
    }

    package.add_certificates(signing.config.clone());

    let mut out = Vec::new();
    package.write(Cursor::new(&mut out))?;

    Ok(out)
}

fn db_down(err: DbErr) -> AuthError {
    eprintln!("passes: {err}");
    AuthError::Upstream("database_unavailable")
}

#[cfg(test)]
mod token_tests {
    use super::*;
    use p256::ecdsa::signature::Signer as _;
    use p256::elliptic_curve::rand_core::OsRng;
    use p256::elliptic_curve::sec1::ToEncodedPoint as _;

    #[test]
    fn device_signature_round_trips() {
        let key = p256::ecdsa::SigningKey::random(&mut OsRng);
        let public = hex::encode(
            p256::PublicKey::from(*key.verifying_key())
                .to_encoded_point(false)
                .as_bytes(),
        );

        let message = signed_message("jw8", 1786400000);
        let signature: p256::ecdsa::Signature = key.sign(message.as_bytes());
        let token = encode_token("jw8", 1786400000, &signature.to_bytes());

        let parsed = Token::parse(&token).expect("token parses");
        assert_eq!(parsed.andrew_id, "jw8");
        assert_eq!(parsed.issued_at, 1786400000);

        let device = DeviceKey::parse(&public).expect("key parses");
        assert!(device.verifies(
            signed_message(&parsed.andrew_id, parsed.issued_at).as_bytes(),
            &parsed.signature,
        ));

        let tampered = encode_token("abc", 1786400000, &signature.to_bytes());
        let other = Token::parse(&tampered).unwrap();
        assert!(!device.verifies(
            signed_message(&other.andrew_id, other.issued_at).as_bytes(),
            &other.signature,
        ));
    }
}

#[cfg(test)]
mod certificate_tests {
    use super::*;
    use x509_cert::der::DecodePem as _;

    const CERT: &str = "-----BEGIN CERTIFICATE-----
MIID4zCCAsugAwIBAgIUN09nVG9Sp7jLcTL1/G0+ksXZlO0wDQYJKoZIhvcNAQEL
BQAwgYAxIjAgBgoJkiaJk/IsZAEBDBJwYXNzLnF1ZXN0LmNtdS5hcHAxKTAnBgNV
BAMMIFBhc3MgVHlwZSBJRDogcGFzcy5xdWVzdC5jbXUuYXBwMRMwEQYDVQQLDApD
NkxKM0ZCNUIzMQ0wCwYDVQQKDARUZXN0MQswCQYDVQQGEwJVUzAeFw0yNjA4MTEw
MTMyMzhaFw0yNjA5MTAwMTMyMzhaMIGAMSIwIAYKCZImiZPyLGQBAQwScGFzcy5x
dWVzdC5jbXUuYXBwMSkwJwYDVQQDDCBQYXNzIFR5cGUgSUQ6IHBhc3MucXVlc3Qu
Y211LmFwcDETMBEGA1UECwwKQzZMSjNGQjVCMzENMAsGA1UECgwEVGVzdDELMAkG
A1UEBhMCVVMwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCr9f6yHqAS
GId7F5FBPE+2+SDSds74UWeDFsLgHkAspASuPaExfLf3TK1CQeKxVkuSU0HdSKTZ
1UL37zjrDEleRweQpif8b/rU/Szae8rJvrUfDllPo/Xi5qdzgsy6PZDBph4YomnZ
t+ZtUNzu0L2xJr6EAGFFYCAXRwFZHxhpcfQLqITBslIgmyHcou6FHzU5vMiKPyIO
6V+GTugzOzi9vJ/fDh/WDGebK7+rZxdb5j8dPL+B1pFyNtVmpntr4RMEPgPG/wDp
ZQps1TAxnNkZq3mlzKKj4H8gcU9i9Flwrq1XXKHzs1zbKsrBzfxr6ahB3vIOCrmj
+1ZlQz0IZL4BAgMBAAGjUzBRMB0GA1UdDgQWBBRP1b1ro7Gi3R4ZHXza9Mnb/Kd4
hzAfBgNVHSMEGDAWgBRP1b1ro7Gi3R4ZHXza9Mnb/Kd4hzAPBgNVHRMBAf8EBTAD
AQH/MA0GCSqGSIb3DQEBCwUAA4IBAQBnoPMotuRh+UVzGYC7H5zV96CmwTf6xJnq
vcZDbcPiaMmahSxlONEmAUSXSD4cMgCnTVj18Kw6XCsUQ6nuKonE1SF1kUPIPIu7
RvBfj6hFEFcPEqBYGMSNGFB0AowwS7GwCW9/oa+tWTIkr3XtElGKB0CAXZz+Q2bU
+XoxJysg9ESdMrXQ8rpZSR9/s9lFAEzM8YP8J679FXmYC4jkpMES8pC66WeiXxaW
Ld7eCQt1VSpAb6Hk518pqBjUFVtZIx00yGWOXsW6ueq7y3BET7NOY//PdNuqoq0C
AMRNPFr6YEpRTtgVWsWcBiAraSKejFgrcfN1sEAG26nlY0tIdrMq
-----END CERTIFICATE-----";

    fn cert() -> Certificate {
        Certificate::from_pem(CERT).expect("fixture certificate parses")
    }

    #[test]
    fn subject_reads_pass_type_and_team() {
        let cert = cert();
        assert_eq!(
            subject_attribute(&cert, OID_UID),
            Some("pass.quest.cmu.app")
        );
        assert_eq!(subject_attribute(&cert, OID_OU), Some("C6LJ3FB5B3"));
    }

    #[test]
    fn matching_identifiers_are_accepted() {
        assert_eq!(
            certified(&cert(), "pass.quest.cmu.app", "C6LJ3FB5B3"),
            Ok(())
        );
    }

    #[test]
    fn wrong_pass_type_identifier_is_refused() {
        let err = certified(&cert(), "pass.quest.cmu.dev", "C6LJ3FB5B3")
            .expect_err("mismatched pass type identifier is refused");
        assert!(err.contains("PASS_TYPE_IDENTIFIER"), "{err}");
        assert!(err.contains("pass.quest.cmu.app"), "{err}");
    }

    #[test]
    fn wrong_team_identifier_is_refused() {
        let err = certified(&cert(), "pass.quest.cmu.app", "XXXXXXXXXX")
            .expect_err("mismatched team identifier is refused");
        assert!(err.contains("PASS_TEAM_IDENTIFIER"), "{err}");
        assert!(err.contains("C6LJ3FB5B3"), "{err}");
    }
}
