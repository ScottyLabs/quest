use std::sync::Arc;

use axum::error_handling::HandleErrorLayer;
use axum::extract::{Query, Request, State};
use axum::http::{HeaderValue, StatusCode, header};
use axum::middleware::{Next, from_fn, from_fn_with_state};
use axum::response::{Html, IntoResponse, Response};
use axum::routing::{any, get, post};
use axum::{Extension, Json, Router};
use axum_oidc::error::MiddlewareError;
use axum_oidc::{OidcAuthLayer, OidcClaims, OidcLoginLayer, handle_oidc_redirect};
use serde::{Deserialize, Serialize};
use tower::ServiceBuilder;
use tower_sessions::Session;

use super::extract::CurrentUser;
use super::oidc::{GroupClaims, IdClaims, SessionWrapper, validate_return};
use super::session::{DEVICE_KEY, SESSION_TTL, SessionUser, USER_KEY};
use super::{Auth, AuthError};
use crate::devices::Devices;
use crate::users::Users;

const RETURN_KEY: &str = "quest.return";

pub fn router(auth: Arc<Auth>) -> Router {
    let Some(oidc) = auth.oidc.as_ref() else {
        return unreachable_idp_router(auth.clone());
    };

    let start = ServiceBuilder::new()
        .layer(HandleErrorLayer::new(oidc_failed))
        .layer(OidcLoginLayer::<GroupClaims, SessionWrapper>::new());
    let resume = ServiceBuilder::new()
        .layer(HandleErrorLayer::new(oidc_failed))
        .layer(OidcAuthLayer::<GroupClaims, SessionWrapper>::new(
            oidc.client.clone(),
        ));

    let login = Router::new()
        .route("/auth/login", get(login))
        .layer(start)
        .layer(from_fn_with_state(auth.clone(), guard));

    let callback = Router::new()
        .route(
            "/auth/callback",
            any(handle_oidc_redirect::<GroupClaims, SessionWrapper>),
        )
        .layer(from_fn(relay));

    login
        .merge(callback)
        .layer(resume)
        .merge(session_router())
        .with_state(auth)
}

fn unreachable_idp_router(auth: Arc<Auth>) -> Router {
    async fn undiscovered() -> AuthError {
        AuthError::Upstream("oidc_discovery_failed")
    }

    Router::new()
        .route("/auth/login", get(undiscovered))
        .layer(from_fn_with_state(auth.clone(), guard))
        .route("/auth/callback", any(undiscovered))
        .merge(session_router())
        .with_state(auth)
}

fn session_paths() -> utoipa_axum::router::OpenApiRouter<Arc<Auth>> {
    utoipa_axum::router::OpenApiRouter::new()
        .routes(utoipa_axum::routes!(status))
        .routes(utoipa_axum::routes!(logout))
}

fn session_router() -> Router<Arc<Auth>> {
    session_paths().split_for_parts().0
}

pub fn session_spec() -> utoipa::openapi::OpenApi {
    session_paths().split_for_parts().1
}

pub fn unconfigured_router() -> Router {
    async fn unavailable() -> AuthError {
        AuthError::NotConfigured
    }

    Router::new()
        .route("/auth/login", get(unavailable))
        .route("/auth/callback", get(unavailable))
        .route("/auth/status", get(unavailable))
        .route("/auth/logout", post(unavailable))
}

async fn oidc_failed(err: MiddlewareError) -> AuthError {
    eprintln!("oidc: {err}");
    AuthError::Upstream("oidc_failed")
}

#[derive(Serialize, utoipa::ToSchema)]
pub struct UserView {
    pub email: Option<String>,
    pub name: String,
    pub andrew_id: String,
    pub groups: Vec<String>,
    pub admin: bool,
    pub staff: bool,
}

impl From<SessionUser> for UserView {
    fn from(u: SessionUser) -> Self {
        Self {
            staff: u.staff(),
            email: u.email,
            name: u.name,
            andrew_id: u.andrew_id,
            groups: u.groups,
            admin: u.admin,
        }
    }
}

#[derive(Deserialize)]
struct LoginQuery {
    #[serde(rename = "return")]
    return_to: Option<String>,
    ticket: Option<String>,
    /// Set by the browser portal, which has no enrolled device to bind.
    portal: Option<String>,
}

impl LoginQuery {
    fn portal(&self) -> bool {
        self.portal
            .as_deref()
            .is_some_and(|flag| !matches!(flag, "" | "0" | "false"))
    }
}

async fn guard(
    State(auth): State<Arc<Auth>>,
    session: Session,
    request: Request,
    next: Next,
) -> Response {
    let target = Query::<LoginQuery>::try_from_uri(request.uri())
        .map_err(|_| AuthError::BadRequest("invalid_return"))
        .and_then(|Query(query)| validate_return(query.return_to.as_deref(), auth.app_url()));

    let target = match target {
        Ok(target) => target,
        Err(err) => return err.into_response(),
    };

    if session.insert(RETURN_KEY, target).await.is_err() {
        return AuthError::Upstream("session_store_unavailable").into_response();
    }

    next.run(request).await
}

async fn login(
    State(auth): State<Arc<Auth>>,
    Extension(users): Extension<Users>,
    Extension(devices): Extension<Devices>,
    claims: OidcClaims<GroupClaims>,
    session: Session,
    Query(query): Query<LoginQuery>,
) -> Result<Response, AuthError> {
    let target = validate_return(query.return_to.as_deref(), auth.app_url())?;
    let claims = IdClaims::from(&claims);

    let Some(andrew_id) = claims.andrew_id() else {
        return Ok(failed(Some(&target), "no_andrew_id"));
    };

    eprintln!(
        "auth: claims andrew={andrew_id} class={:?} first_year={}",
        claims.class,
        claims.first_year()
    );

    let user = SessionUser {
        name: claims.display_name(),
        andrew_id,
        admin: auth.is_admin(&claims.groups),
        first_year: claims.first_year(),
        email: claims.email,
        groups: claims.groups,
    };

    let row = users.upsert(&user).await?;

    let device = if query.portal() {
        None
    } else {
        match devices.claim(query.ticket.as_deref(), row.id).await {
            Ok(device) => Some(device),
            Err(AuthError::Conflict(code) | AuthError::Unauthorized(code)) => {
                session.flush().await.ok();
                return Ok(failed(Some(&target), code));
            }
            Err(err) => return Err(err),
        }
    };

    session.flush().await.ok();
    let andrew_id = user.andrew_id.clone();
    let store_down = || AuthError::Upstream("session_store_unavailable");
    session
        .insert(USER_KEY, user)
        .await
        .map_err(|_| store_down())?;

    if let Some(device) = device.as_deref() {
        session
            .insert(DEVICE_KEY, device)
            .await
            .map_err(|_| store_down())?;
    }

    session.save().await.map_err(|_| store_down())?;

    let id = session
        .id()
        .ok_or(AuthError::Upstream("session_no_id"))?
        .to_string();

    if let Some(device) = device.as_deref() {
        auth.sessions.bind(&andrew_id, device, &id).await?;
    }

    eprintln!(
        "auth: signed in andrew={andrew_id} session={} device={} portal={}",
        &id[..id.len().min(6)],
        device.is_some(),
        query.portal()
    );

    Ok(handoff(
        &format!(
            "{target}#session={id}&expires_in={}",
            SESSION_TTL.whole_seconds()
        ),
        "Signed in.",
    ))
}

#[derive(Deserialize)]
struct CallbackQuery {
    error: Option<String>,
}

async fn relay(
    session: Session,
    Query(query): Query<CallbackQuery>,
    request: Request,
    next: Next,
) -> Response {
    let target = session.get::<String>(RETURN_KEY).await.ok().flatten();

    if let Some(error) = query.error.as_deref() {
        return failed(target.as_deref(), idp_error(error));
    }

    let response = next.run(request).await;
    if !response.status().is_client_error() && !response.status().is_server_error() {
        return response;
    }

    failed(target.as_deref(), "sign_in_failed")
}

fn failed(target: Option<&str>, code: &str) -> Response {
    match target {
        Some(target) => handoff(&format!("{target}#error={code}"), "Sign-in failed."),
        None => error_page("This sign-in link has expired or was already used."),
    }
}

fn idp_error(error: &str) -> &'static str {
    match error {
        "access_denied" => "access_denied",
        "login_required" | "interaction_required" => "login_required",
        _ => "idp_error",
    }
}

fn handoff(target: &str, outcome: &str) -> Response {
    if target.contains(|c: char| c.is_control()) {
        return error_page("Could not hand the session back to the app.");
    }

    if target.starts_with("http://") || target.starts_with("https://") {
        return found(target);
    }

    let body = Html(format!(
        "<!doctype html><meta charset=utf-8>\
         <meta name=viewport content=\"width=device-width,initial-scale=1\">\
         <title>Orientation Quest</title>\
         <body style=\"font:16px/1.5 system-ui;margin:0;display:grid;place-items:center;\
         min-height:100vh;text-align:center;padding:2rem\">\
         <main><p>{outcome} Returning to Orientation Quest&hellip;</p>\
         <p><a id=go href=\"{href}\">Return to Orientation Quest</a></p></main>\
         <script>location.replace(document.getElementById('go').href)</script>",
        href = escape_attr(target)
    ));

    (StatusCode::OK, [(header::CACHE_CONTROL, "no-store")], body).into_response()
}

fn escape_attr(raw: &str) -> String {
    let mut out = String::with_capacity(raw.len());
    for c in raw.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&#39;"),
            c => out.push(c),
        }
    }
    out
}

fn found(location: &str) -> Response {
    match HeaderValue::from_str(location) {
        Ok(location) => (StatusCode::FOUND, [(header::LOCATION, location)]).into_response(),
        Err(_) => error_page("Could not hand the session back to the app."),
    }
}

fn error_page(detail: &str) -> Response {
    let body = Html(format!(
        "<!doctype html><meta charset=utf-8>\
         <meta name=viewport content=\"width=device-width,initial-scale=1\">\
         <title>Orientation Quest</title>\
         <body style=\"font:16px/1.5 system-ui;margin:0;display:grid;place-items:center;\
         min-height:100vh;text-align:center;padding:2rem\">\
         <main><h1 style=\"font-size:1.25rem\">Sign-in failed</h1><p>{detail}</p></main>"
    ));

    (StatusCode::BAD_REQUEST, body).into_response()
}

#[utoipa::path(
    get,
    path = "/auth/status",
    tag = "auth",
    responses(
        (status = OK, body = UserView),
        (status = UNAUTHORIZED, body = crate::auth::AuthErrBody),
        (status = BAD_GATEWAY, body = crate::auth::AuthErrBody),
    ),
)]
async fn status(CurrentUser(user): CurrentUser) -> Json<UserView> {
    Json(user.into())
}

#[derive(Serialize, utoipa::ToSchema)]
struct LogoutResponse {
    end_session_url: Option<String>,
}

#[utoipa::path(
    post,
    path = "/auth/logout",
    tag = "auth",
    responses(
        (status = OK, body = LogoutResponse),
        (status = UNAUTHORIZED, body = crate::auth::AuthErrBody),
        (status = BAD_GATEWAY, body = crate::auth::AuthErrBody),
    ),
)]
async fn logout(
    State(auth): State<Arc<Auth>>,
    session: Session,
    CurrentUser(user): CurrentUser,
) -> Result<Json<LogoutResponse>, AuthError> {
    let device = session.get::<String>(DEVICE_KEY).await.ok().flatten();

    session
        .flush()
        .await
        .map_err(|_| AuthError::Upstream("session_store_unavailable"))?;

    if let Some(device) = device.as_deref() {
        auth.sessions.release(&user.andrew_id, device).await?;
    }

    Ok(Json(LogoutResponse {
        end_session_url: auth
            .oidc
            .as_ref()
            .and_then(|oidc| oidc.end_session_url.clone()),
    }))
}

pub const ALLOWED_HEADERS: [header::HeaderName; 5] = [
    header::AUTHORIZATION,
    header::CONTENT_TYPE,
    header::ACCEPT,
    header::COOKIE,
    crate::devices::proof::PROOF_HEADER,
];
