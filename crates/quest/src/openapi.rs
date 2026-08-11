use utoipa::Modify;
use utoipa::OpenApi;
use utoipa::openapi::security::{ApiKey, ApiKeyValue, HttpAuthScheme, HttpBuilder, SecurityScheme};
use utoipa_scalar::{Scalar, Servable};

struct Credentials;

impl Modify for Credentials {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        let Some(components) = openapi.components.as_mut() else {
            return;
        };

        components.add_security_scheme(
            "session",
            SecurityScheme::Http(
                HttpBuilder::new()
                    .scheme(HttpAuthScheme::Bearer)
                    .description(Some("Session id issued by /auth/login"))
                    .build(),
            ),
        );

        components.add_security_scheme(
            "device_proof",
            SecurityScheme::ApiKey(ApiKey::Header(ApiKeyValue::with_description(
                "x-device-proof",
                "Signature over the request method and URL by an enrolled device key",
            ))),
        );
    }
}

#[derive(OpenApi)]
#[openapi(
    paths(crate::health),
    security(("session" = [], "device_proof" = [])),
    info(
        title = "CMU Orientation Quest",
        description = "Backend for the Orientation Quest app.",
    ),
    modifiers(&Credentials),
    tags(
        (name = "health", description = "Liveness"),
        (name = "auth", description = "Sign-in and session state"),
        (name = "devices", description = "Device enrolment and revocation"),
        (name = "users", description = "The signed-in user's profile"),
        (name = "challenges", description = "The quest board"),
        (name = "daily", description = "The daily challenge"),
        (name = "taps", description = "Registering NFC taps"),
        (name = "tokens", description = "Scottycoin and thistlestone balances"),
        (name = "items", description = "The shop and a user's purchases"),
        (name = "leaderboard", description = "Standings and the Carnegie Cup"),
        (name = "passes", description = "Apple Wallet passes"),
        (name = "staff", description = "Card placement for orientation staff"),
    )
)]
pub struct ApiDoc;

pub struct Services {
    pub users: crate::users::Users,
    pub challenges: crate::challenges::Challenges,
    pub daily: crate::daily::Daily,
    pub devices: crate::devices::Devices,
    pub items: crate::items::Items,
    pub leaderboard: crate::leaderboard::Leaderboard,
    pub tokens: crate::tokens::Tokens,
    pub taps: crate::taps::Taps,
    pub passes: crate::passes::Passes,
    pub staff: crate::staff::Staff,
}

impl Services {
    pub fn new(
        db: sea_orm::DatabaseConnection,
        valkey: fred::clients::Pool,
        master: [u8; 32],
        passes: crate::passes::Passes,
    ) -> Self {
        Self {
            users: crate::users::Users::new(db.clone()),
            challenges: crate::challenges::Challenges::new(db.clone()),
            daily: crate::daily::Daily::new(db.clone()),
            devices: crate::devices::Devices::new(db.clone(), valkey),
            items: crate::items::Items::new(db.clone()),
            leaderboard: crate::leaderboard::Leaderboard::new(db.clone()),
            tokens: crate::tokens::Tokens::new(db.clone()),
            passes,
            staff: crate::staff::Staff::new(db.clone()),
            taps: crate::taps::Taps::new(db, std::sync::Arc::new(master)),
        }
    }

    // disconnected db + unconnected pool: shape only, never serves a request
    fn offline() -> Self {
        let valkey =
            fred::clients::Pool::new(fred::types::config::Config::default(), None, None, None, 1)
                .expect("a default Valkey pool is always constructible");
        Self::new(
            sea_orm::DatabaseConnection::default(),
            valkey,
            [0u8; 32],
            crate::passes::Passes::unconfigured(sea_orm::DatabaseConnection::default()),
        )
    }
}

pub fn api_router(services: &Services) -> utoipa_axum::router::OpenApiRouter {
    use utoipa_axum::router::OpenApiRouter;

    OpenApiRouter::new()
        .merge(crate::devices::routes::manage(services.devices.clone()))
        .merge(crate::users::routes::router(services.users.clone()))
        .merge(crate::challenges::routes::router(
            services.challenges.clone(),
        ))
        .merge(crate::daily::routes::router(
            services.daily.clone(),
            services.challenges.clone(),
        ))
        .merge(crate::taps::routes::router(
            services.taps.clone(),
            services.tokens.clone(),
        ))
        .merge(crate::tokens::routes::router(services.tokens.clone()))
        .merge(crate::items::routes::router(services.items.clone()))
        .merge(crate::leaderboard::routes::router(
            services.leaderboard.clone(),
        ))
        .merge(crate::passes::routes::router(services.passes.clone()))
        .merge(crate::staff::routes::router(
            services.staff.clone(),
            services.taps.clone(),
        ))
}

pub fn split(services: &Services) -> (axum::Router, utoipa::openapi::OpenApi) {
    let (router, mut spec) = utoipa_axum::router::OpenApiRouter::with_openapi(ApiDoc::openapi())
        .nest("/api", api_router(services))
        .merge(crate::devices::routes::router(services.devices.clone()))
        .split_for_parts();

    spec.merge(crate::auth::routes::session_spec());
    (router, spec)
}

pub fn document() -> utoipa::openapi::OpenApi {
    split(&Services::offline()).1
}

pub fn docs() -> axum::Router {
    let spec = document();

    axum::Router::new()
        .route(
            "/api/openapi.json",
            axum::routing::get({
                let spec = spec.clone();
                move || {
                    let spec = spec.clone();
                    async move { axum::Json(spec) }
                }
            }),
        )
        .merge(Scalar::with_url("/api/scalar", spec))
}
