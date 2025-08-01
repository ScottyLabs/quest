use axum::{extract::Request, middleware::Next, response::Response};
use tower_oauth2_resource_server::{
    layer::OAuth2ResourceServerLayer, server::OAuth2ResourceServer, tenant::TenantConfiguration,
};

use crate::AuthClaims;

pub async fn build_oauth2_resource_server() -> OAuth2ResourceServerLayer<AuthClaims> {
    let oidc_issuer_url =
        dotenvy::var("OIDC_ISSUER_URL").expect("OIDC_ISSUER_URL environment variable must be set");
    let oidc_client_id =
        dotenvy::var("OIDC_CLIENT_ID").expect("OIDC_CLIENT_ID environment variable must be set");

    OAuth2ResourceServer::builder()
        .add_tenant(
            TenantConfiguration::builder(oidc_issuer_url)
                .audiences(&[oidc_client_id])
                .build()
                .await
                .expect("Failed to build tenant configuration"),
        )
        .build()
        .await
        .expect("Failed to build OAuth2 resource server")
        .into_layer()
}

pub async fn dev_auth_middleware(mut request: Request, next: Next) -> Response {
    let oidc_issuer_url =
        dotenvy::var("OIDC_ISSUER_URL").expect("OIDC_ISSUER_URL environment variable must be set");
    let oidc_client_id =
        dotenvy::var("OIDC_CLIENT_ID").expect("OIDC_CLIENT_ID environment variable must be set");

    // Mock the JWT claims that would normally come from the gateway
    request.extensions_mut().insert(AuthClaims {
        iss: oidc_issuer_url,
        sub: "devuser".to_string(),
        aud: oidc_client_id,
        exp: 9999999999,
        iat: 1600000000,
        auth_time: 1600000000,
        acr: "1".to_string(),
        email: "dev@example.com".to_string(),
        email_verified: true,
        name: "Dev User".to_string(),
        given_name: "Dev User".to_string(),
        preferred_username: "devuser".to_string(),
        nickname: "devuser".to_string(),
        groups: vec!["O-Quest Admin".to_string()],
    });

    next.run(request).await
}
