use std::sync::LazyLock;

use axum::Router;
use axum::http::{HeaderValue, header};
use axum::response::{Html, IntoResponse, Response};
use axum::routing::get;

static PRIVACY: LazyLock<String> =
    LazyLock::new(|| page("Privacy Policy", include_str!("privacy-policy.md")));

static TERMS: LazyLock<String> =
    LazyLock::new(|| page("Terms of Service", include_str!("terms-of-service.md")));

static SUPPORT: LazyLock<String> = LazyLock::new(|| page("Support", include_str!("support.md")));

pub fn router() -> Router {
    Router::new()
        .route("/privacy-policy", get(privacy))
        .route("/terms-of-service", get(terms))
        .route("/support", get(support))
}

async fn privacy() -> Response {
    served(&PRIVACY)
}

async fn terms() -> Response {
    served(&TERMS)
}

async fn support() -> Response {
    served(&SUPPORT)
}

fn served(body: &'static str) -> Response {
    (
        [(
            header::CACHE_CONTROL,
            HeaderValue::from_static("public, max-age=3600"),
        )],
        Html(body),
    )
        .into_response()
}

fn page(title: &str, markdown: &str) -> String {
    let parser = pulldown_cmark::Parser::new_ext(markdown, pulldown_cmark::Options::all());
    let mut body = String::new();
    pulldown_cmark::html::push_html(&mut body, parser);

    format!(
        r#"<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} - CMU Orientation Quest</title>
<style>
  :root {{ color-scheme: light dark; }}
  body {{
    max-width: 44rem;
    margin: 0 auto;
    padding: 2rem 1.25rem 6rem;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    line-height: 1.6;
  }}
  h1 {{ font-size: 1.75rem; line-height: 1.25; }}
  li {{ margin: 0.5rem 0; }}
  ol {{ padding-left: 1.5rem; }}
  a {{ color: inherit; }}
  footer {{ margin-top: 3rem; font-size: 0.875rem; opacity: 0.7; }}
</style>
</head>
<body>
<main>
{body}</main>
<footer>
<a href="/support">Support</a> &middot;
<a href="/privacy-policy">Privacy Policy</a> &middot;
<a href="/terms-of-service">Terms of Service</a>
</footer>
</body>
</html>
"#
    )
}
