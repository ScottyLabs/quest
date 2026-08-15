use std::path::{Path, PathBuf};
use std::sync::Arc;

use axum::Router;
use axum::extract::Request;
use axum::http::{HeaderValue, StatusCode, header};
use axum::middleware::Next;
use axum::response::{Html, IntoResponse, Response};
use axum::routing::any;
use tower_http::services::ServeDir;

pub const BASE: &str = "/portal";

const IMMUTABLE: &str = "/_app/immutable/";

const ASSETS: &str = "/_app/";

#[derive(Clone, Debug, Default)]
pub struct Bundle {
    root: Option<Arc<PathBuf>>,
}

impl Bundle {
    pub fn disabled() -> Self {
        Self::default()
    }

    pub fn load(root: &Path) -> std::io::Result<Self> {
        let index = root.join("index.html");

        if !index.is_file() {
            return Err(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!("{} has no index.html", root.display()),
            ));
        }

        Ok(Self {
            root: Some(Arc::new(root.to_owned())),
        })
    }
}

pub fn router(bundle: Bundle) -> Router {
    let Some(root) = bundle.root else {
        return Router::new()
            .route(BASE, any(unbuilt))
            .route(&format!("{BASE}/{{*rest}}"), any(unbuilt));
    };

    let files = ServeDir::new(root.as_ref()).append_index_html_on_directories(true);

    Router::new()
        .nest_service(BASE, files)
        .layer(axum::middleware::from_fn(
            move |request: Request, next: Next| {
                let root = Arc::clone(&root);
                async move { serve(request, next, root).await }
            },
        ))
}

async fn serve(request: Request, next: Next, root: Arc<PathBuf>) -> Response {
    let path = request.uri().path().to_owned();
    let mut response = next.run(request).await;

    if response.status() == StatusCode::NOT_FOUND && !path.contains(ASSETS) {
        return match tokio::fs::read_to_string(root.join("index.html")).await {
            Ok(shell) => (
                [(header::CACHE_CONTROL, HeaderValue::from_static("no-cache"))],
                Html(shell),
            )
                .into_response(),
            Err(err) => {
                eprintln!("portal: {err}");
                StatusCode::SERVICE_UNAVAILABLE.into_response()
            }
        };
    }

    let value = if path.contains(IMMUTABLE) {
        "public, max-age=31536000, immutable"
    } else {
        "no-cache"
    };

    response
        .headers_mut()
        .insert(header::CACHE_CONTROL, HeaderValue::from_static(value));

    response
}

async fn unbuilt() -> Response {
    (
        StatusCode::SERVICE_UNAVAILABLE,
        [(header::CACHE_CONTROL, HeaderValue::from_static("no-store"))],
        Html(include_str!("unbuilt.html")),
    )
        .into_response()
}
