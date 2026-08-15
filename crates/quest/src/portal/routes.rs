use axum::Json;
use axum::extract::rejection::JsonRejection;
use axum::extract::{Path, Query, State};
use sea_orm::prelude::Uuid;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::assets::{AssetError, Assets};
use super::trade::{Desk, Fulfilled, Order, PassHolder};
use super::{Browse, Column, Outcome, Page, Portal, PortalErrBody, PortalError, Script};
use crate::access::{Access, CAPABILITIES, Capability, Level, Role};
use crate::auth::AuthError;
use crate::items::{Items, Receipt, Refunded, Stocked};
use crate::passes::Passes;

#[derive(Clone)]
pub struct Console {
    portal: Portal,
    items: Items,
    desk: Desk,
    passes: Passes,
    assets: Assets,
}

pub fn router(
    portal: Portal,
    items: Items,
    desk: Desk,
    passes: Passes,
    assets: Assets,
) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(me))
        .routes(routes!(sign_out))
        .routes(routes!(tables))
        .routes(routes!(rows, insert_row))
        .routes(routes!(update_row, delete_row))
        .routes(routes!(sql))
        .routes(routes!(sql_script))
        .routes(routes!(catalog_reload))
        .routes(routes!(upload))
        .routes(routes!(trade_items))
        .routes(routes!(trade_pass))
        .routes(routes!(trade_orders, trade_buy))
        .routes(routes!(trade_fulfil))
        .routes(routes!(trade_refund))
        .layer(axum::extract::DefaultBodyLimit::max(
            crate::portal::assets::MAX_BYTES + 4096,
        ))
        .with_state(Console {
            portal,
            items,
            desk,
            passes,
            assets,
        })
}

#[derive(Serialize, ToSchema)]
pub struct Identity {
    pub name: String,
    pub andrew_id: String,
    pub email: Option<String>,
    pub groups: Vec<String>,
    pub roles: Vec<Role>,
    pub capabilities: Vec<Capability>,
    pub tables: Vec<Grant>,
}

#[derive(Serialize, ToSchema)]
pub struct Grant {
    pub table: String,
    pub level: Level,
}

#[utoipa::path(
    get,
    path = "/portal/me",
    tag = "portal",
    responses(
        (status = OK, body = Identity),
        (status = UNAUTHORIZED, body = PortalErrBody),
        (status = FORBIDDEN, body = PortalErrBody),
    ),
)]
async fn me(State(console): State<Console>, access: Access) -> Result<Json<Identity>, PortalError> {
    let catalog = console.portal.catalog().await?;

    let mut tables: Vec<Grant> = catalog
        .tables()
        .iter()
        .filter_map(|table| match access.level(&table.name) {
            Level::None => None,
            level => Some(Grant {
                table: table.name.clone(),
                level,
            }),
        })
        .collect();
    tables.sort_by(|a, b| a.table.cmp(&b.table));

    Ok(Json(Identity {
        name: access.user.name.clone(),
        andrew_id: access.user.andrew_id.clone(),
        email: access.user.email.clone(),
        groups: access.user.groups.clone(),
        roles: access.roles.iter().collect(),
        capabilities: CAPABILITIES
            .into_iter()
            .filter(|capability| access.can(*capability))
            .collect(),
        tables,
    }))
}

#[derive(Serialize, ToSchema)]
pub struct SignedOut {
    pub signed_out: bool,
}

#[utoipa::path(
    post,
    path = "/portal/sign-out",
    tag = "portal",
    responses(
        (status = OK, body = SignedOut),
        (status = UNAUTHORIZED, body = PortalErrBody),
    ),
)]
async fn sign_out(
    access: Access,
    session: tower_sessions::Session,
) -> Result<Json<SignedOut>, PortalError> {
    let _ = &access;
    session.flush().await.ok();

    Ok(Json(SignedOut { signed_out: true }))
}

#[derive(Serialize, ToSchema)]
pub struct TableView {
    pub name: String,
    pub level: Level,
    pub columns: Vec<Column>,
    pub key: Vec<String>,
}

#[utoipa::path(
    get,
    path = "/portal/tables",
    tag = "portal",
    responses(
        (status = OK, body = Vec<TableView>),
        (status = FORBIDDEN, body = PortalErrBody),
    ),
)]
async fn tables(
    State(console): State<Console>,
    access: Access,
) -> Result<Json<Vec<TableView>>, PortalError> {
    access.require(Capability::DataConsole)?;

    let catalog = console.portal.catalog().await?;
    let mut views: Vec<TableView> = catalog
        .tables()
        .iter()
        .filter_map(|table| match access.level(&table.name) {
            Level::None => None,
            level => Some(TableView {
                name: table.name.clone(),
                level,
                columns: table.columns.clone(),
                key: table.key().iter().map(|c| c.name.clone()).collect(),
            }),
        })
        .collect();
    views.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(Json(views))
}

#[utoipa::path(
    get,
    path = "/portal/tables/{table}/rows",
    tag = "portal",
    params(("table" = String, Path, description = "Table name"), Browse),
    responses(
        (status = OK, body = Page),
        (status = FORBIDDEN, body = PortalErrBody),
        (status = NOT_FOUND, body = PortalErrBody),
    ),
)]
async fn rows(
    State(console): State<Console>,
    access: Access,
    Path(table): Path<String>,
    Query(browse): Query<Browse>,
) -> Result<Json<Page>, PortalError> {
    access.require(Capability::DataConsole)?;
    access.require_table(&table, Level::Read)?;

    let catalog = console.portal.catalog().await?;
    let table = catalog.table(&table)?;

    Ok(Json(console.portal.rows(table, &browse).await?))
}

#[derive(Deserialize, ToSchema)]
pub struct RowBody {
    #[schema(value_type = HashMap<String, serde_json::Value>)]
    pub row: serde_json::Map<String, JsonValue>,
}

#[derive(Deserialize, ToSchema)]
pub struct EditBody {
    #[schema(value_type = HashMap<String, serde_json::Value>)]
    pub key: serde_json::Map<String, JsonValue>,
    #[schema(value_type = HashMap<String, serde_json::Value>)]
    pub set: serde_json::Map<String, JsonValue>,
}

#[derive(Deserialize, ToSchema)]
pub struct KeyBody {
    #[schema(value_type = HashMap<String, serde_json::Value>)]
    pub key: serde_json::Map<String, JsonValue>,
}

#[derive(Serialize, ToSchema)]
pub struct Written {
    pub rows: Vec<JsonValue>,
}

fn body<T>(body: Result<Json<T>, JsonRejection>) -> Result<T, PortalError> {
    body.map(|Json(body)| body)
        .map_err(|_| PortalError::Auth(AuthError::BadRequest("row_body_invalid")))
}

#[utoipa::path(
    post,
    path = "/portal/tables/{table}/rows",
    tag = "portal",
    params(("table" = String, Path, description = "Table name")),
    request_body = RowBody,
    responses(
        (status = OK, body = Written),
        (status = BAD_REQUEST, body = PortalErrBody),
        (status = FORBIDDEN, body = PortalErrBody),
    ),
)]
async fn insert_row(
    State(console): State<Console>,
    access: Access,
    Path(table): Path<String>,
    payload: Result<Json<RowBody>, JsonRejection>,
) -> Result<Json<Written>, PortalError> {
    access.require(Capability::DataConsole)?;
    access.require_table(&table, Level::Full)?;

    let payload = body(payload)?;
    let catalog = console.portal.catalog().await?;
    let table = catalog.table(&table)?;

    Ok(Json(Written {
        rows: console.portal.insert(table, &payload.row).await?,
    }))
}

#[utoipa::path(
    patch,
    path = "/portal/tables/{table}/rows",
    tag = "portal",
    params(("table" = String, Path, description = "Table name")),
    request_body = EditBody,
    responses(
        (status = OK, body = Written),
        (status = BAD_REQUEST, body = PortalErrBody),
        (status = FORBIDDEN, body = PortalErrBody),
    ),
)]
async fn update_row(
    State(console): State<Console>,
    access: Access,
    Path(table): Path<String>,
    payload: Result<Json<EditBody>, JsonRejection>,
) -> Result<Json<Written>, PortalError> {
    access.require(Capability::DataConsole)?;
    access.require_table(&table, Level::Edit)?;

    let payload = body(payload)?;
    let catalog = console.portal.catalog().await?;
    let table = catalog.table(&table)?;

    Ok(Json(Written {
        rows: console
            .portal
            .update(table, &payload.key, &payload.set)
            .await?,
    }))
}

#[utoipa::path(
    delete,
    path = "/portal/tables/{table}/rows",
    tag = "portal",
    params(("table" = String, Path, description = "Table name")),
    request_body = KeyBody,
    responses(
        (status = OK, body = Written),
        (status = BAD_REQUEST, body = PortalErrBody),
        (status = FORBIDDEN, body = PortalErrBody),
    ),
)]
async fn delete_row(
    State(console): State<Console>,
    access: Access,
    Path(table): Path<String>,
    payload: Result<Json<KeyBody>, JsonRejection>,
) -> Result<Json<Written>, PortalError> {
    access.require(Capability::DataConsole)?;
    access.require_table(&table, Level::Full)?;

    let payload = body(payload)?;
    let catalog = console.portal.catalog().await?;
    let table = catalog.table(&table)?;

    Ok(Json(Written {
        rows: console.portal.delete(table, &payload.key).await?,
    }))
}

#[derive(Deserialize, ToSchema)]
pub struct SqlBody {
    pub sql: String,
    #[serde(default)]
    pub write: bool,
}

#[utoipa::path(
    post,
    path = "/portal/sql",
    tag = "portal",
    request_body = SqlBody,
    responses(
        (status = OK, body = Outcome),
        (status = BAD_REQUEST, body = PortalErrBody),
        (status = FORBIDDEN, body = PortalErrBody),
    ),
)]
async fn sql(
    State(console): State<Console>,
    access: Access,
    payload: Result<Json<SqlBody>, JsonRejection>,
) -> Result<Json<Outcome>, PortalError> {
    access.require(Capability::SqlConsole)?;

    let payload = body(payload)?;
    Ok(Json(
        console.portal.console(&payload.sql, payload.write).await?,
    ))
}

#[utoipa::path(
    post,
    path = "/portal/sql/script",
    tag = "portal",
    request_body = SqlBody,
    responses(
        (status = OK, body = Script),
        (status = BAD_REQUEST, body = PortalErrBody),
        (status = FORBIDDEN, body = PortalErrBody),
    ),
)]
async fn sql_script(
    State(console): State<Console>,
    access: Access,
    payload: Result<Json<SqlBody>, JsonRejection>,
) -> Result<Json<Script>, PortalError> {
    access.require(Capability::SqlConsole)?;

    let payload = body(payload)?;
    Ok(Json(
        console.portal.script(&payload.sql, payload.write).await?,
    ))
}

#[derive(Serialize, ToSchema)]
pub struct Reloaded {
    pub tables: usize,
}

#[utoipa::path(
    post,
    path = "/portal/catalog/reload",
    tag = "portal",
    responses(
        (status = OK, body = Reloaded),
        (status = FORBIDDEN, body = PortalErrBody),
    ),
)]
async fn catalog_reload(
    State(console): State<Console>,
    access: Access,
) -> Result<Json<Reloaded>, PortalError> {
    access.require(Capability::DataConsole)?;

    let catalog = console.portal.refresh().await?;
    Ok(Json(Reloaded {
        tables: catalog.tables().len(),
    }))
}

#[derive(Serialize, ToSchema)]
pub struct ShopItem {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub cost: i64,
    pub image_url: Option<String>,
    pub stock: i64,
}

impl From<Stocked> for ShopItem {
    fn from(item: Stocked) -> Self {
        Self {
            id: item.id,
            name: item.name,
            description: item.description,
            cost: item.cost,
            image_url: item.image_url,
            stock: item.stock,
        }
    }
}

#[utoipa::path(
    get,
    path = "/portal/trade/items",
    tag = "portal",
    responses(
        (status = OK, body = Vec<ShopItem>),
        (status = FORBIDDEN, body = PortalErrBody),
    ),
)]
async fn trade_items(
    State(console): State<Console>,
    access: Access,
) -> Result<Json<Vec<ShopItem>>, PortalError> {
    access.require(Capability::TradeDesk)?;

    let items = console.items.list().await?;
    Ok(Json(items.into_iter().map(ShopItem::from).collect()))
}

#[derive(Deserialize, ToSchema)]
pub struct PassLookup {
    pub token: Option<String>,
    pub andrew_id: Option<String>,
}

#[utoipa::path(
    post,
    path = "/portal/trade/pass",
    tag = "portal",
    request_body = PassLookup,
    responses(
        (status = OK, body = PassHolder),
        (status = BAD_REQUEST, body = PortalErrBody),
        (status = UNAUTHORIZED, body = PortalErrBody),
        (status = FORBIDDEN, body = PortalErrBody),
        (status = NOT_FOUND, body = PortalErrBody),
    ),
)]
async fn trade_pass(
    State(console): State<Console>,
    access: Access,
    payload: Result<Json<PassLookup>, JsonRejection>,
) -> Result<Json<PassHolder>, PortalError> {
    access.require(Capability::TradeDesk)?;

    let payload = body(payload)?;
    let scanned = payload
        .token
        .as_deref()
        .map(str::trim)
        .filter(|token| !token.is_empty());
    let typed = payload
        .andrew_id
        .as_deref()
        .map(str::trim)
        .filter(|id| !id.is_empty());

    let (andrew_id, issued_at) = match (scanned, typed) {
        (Some(token), _) => {
            let holder = console
                .passes
                .verify(token)
                .await
                .map_err(PortalError::Auth)?;
            (holder.andrew_id, Some(holder.issued_at))
        }
        (None, Some(id)) => (id.to_ascii_lowercase(), None),
        (None, None) => {
            return Err(PortalError::Auth(AuthError::BadRequest(
                "pass_lookup_empty",
            )));
        }
    };

    Ok(Json(console.desk.holder(&andrew_id, issued_at).await?))
}

#[derive(Deserialize, ToSchema, utoipa::IntoParams)]
pub struct UploadQuery {
    pub kind: String,
}

#[derive(Serialize, ToSchema)]
pub struct Uploaded {
    pub key: String,
    pub url: String,
}

#[utoipa::path(
    post,
    path = "/portal/assets",
    tag = "portal",
    params(UploadQuery),
    request_body(content = Vec<u8>, content_type = "application/octet-stream"),
    responses(
        (status = OK, body = Uploaded),
        (status = BAD_REQUEST, body = PortalErrBody),
        (status = FORBIDDEN, body = PortalErrBody),
        (status = PAYLOAD_TOO_LARGE, body = PortalErrBody),
        (status = SERVICE_UNAVAILABLE, body = PortalErrBody),
        (status = BAD_GATEWAY, body = PortalErrBody),
    ),
)]
async fn upload(
    State(console): State<Console>,
    access: Access,
    Query(query): Query<UploadQuery>,
    headers: axum::http::HeaderMap,
    bytes: axum::body::Bytes,
) -> Result<Json<Uploaded>, PortalError> {
    access.require(Capability::Assets)?;

    let content_type = headers
        .get(axum::http::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default();

    let stored = console
        .assets
        .put(&query.kind, content_type, bytes.to_vec())
        .await
        .map_err(|err| match err {
            AssetError::Unconfigured => PortalError::Sql(
                "asset uploads are off: the CDN_* Garage credentials are not set".to_owned(),
            ),
            AssetError::Rejected(code) => PortalError::Auth(AuthError::BadRequest(code)),
            AssetError::Upstream(detail) => PortalError::Sql(detail),
        })?;

    Ok(Json(Uploaded {
        key: stored.key,
        url: stored.url,
    }))
}

#[derive(Deserialize, ToSchema, utoipa::IntoParams)]
pub struct OrderQuery {
    pub andrew_id: Option<String>,
    pub delivered: Option<bool>,
    pub limit: Option<u64>,
}

#[utoipa::path(
    get,
    path = "/portal/trade/orders",
    tag = "portal",
    params(OrderQuery),
    responses(
        (status = OK, body = Vec<Order>),
        (status = FORBIDDEN, body = PortalErrBody),
    ),
)]
async fn trade_orders(
    State(console): State<Console>,
    access: Access,
    Query(query): Query<OrderQuery>,
) -> Result<Json<Vec<Order>>, PortalError> {
    access.require(Capability::TradeDesk)?;

    Ok(Json(
        console
            .desk
            .orders(query.andrew_id.as_deref(), query.delivered, query.limit)
            .await?,
    ))
}

#[derive(Deserialize, ToSchema)]
pub struct DeskSaleBody {
    pub andrew_id: String,
    pub item_id: Uuid,
    pub quantity: i64,
}

#[derive(Serialize, ToSchema)]
pub struct Bought {
    pub purchase_id: i64,
    pub item_id: Uuid,
    pub item: String,
    pub cost: i64,
    pub quantity: i64,
    pub spent: i64,
    pub stock: i64,
    pub scottycoins: i64,
}

impl From<Receipt> for Bought {
    fn from(receipt: Receipt) -> Self {
        Self {
            purchase_id: receipt.purchase_id,
            item_id: receipt.item,
            item: receipt.name,
            cost: receipt.cost,
            quantity: receipt.quantity,
            spent: receipt.spent,
            stock: receipt.stock,
            scottycoins: receipt.scottycoins,
        }
    }
}

#[utoipa::path(
    post,
    path = "/portal/trade/orders",
    tag = "portal",
    request_body = DeskSaleBody,
    responses(
        (status = OK, body = Bought),
        (status = CONFLICT, body = PortalErrBody),
        (status = FORBIDDEN, body = PortalErrBody),
        (status = NOT_FOUND, body = PortalErrBody),
    ),
)]
async fn trade_buy(
    State(console): State<Console>,
    access: Access,
    payload: Result<Json<DeskSaleBody>, JsonRejection>,
) -> Result<Json<Bought>, PortalError> {
    access.require(Capability::TradeDesk)?;

    let payload = body(payload)?;
    let user = console.portal.user_id(&payload.andrew_id).await?;
    let receipt = console
        .items
        .purchase(user, payload.item_id, payload.quantity)
        .await?;

    Ok(Json(receipt.into()))
}

#[derive(Deserialize, ToSchema)]
pub struct FulfilBody {
    pub delivered: bool,
}

#[utoipa::path(
    put,
    path = "/portal/trade/orders/{purchase_id}/delivery",
    tag = "portal",
    params(("purchase_id" = i64, Path, description = "Purchase id")),
    request_body = FulfilBody,
    responses(
        (status = OK, body = Fulfilled),
        (status = FORBIDDEN, body = PortalErrBody),
        (status = NOT_FOUND, body = PortalErrBody),
    ),
)]
async fn trade_fulfil(
    State(console): State<Console>,
    access: Access,
    Path(purchase_id): Path<i64>,
    payload: Result<Json<FulfilBody>, JsonRejection>,
) -> Result<Json<Fulfilled>, PortalError> {
    access.require(Capability::TradeDesk)?;

    let payload = body(payload)?;
    Ok(Json(
        console.desk.fulfil(purchase_id, payload.delivered).await?,
    ))
}

#[derive(Deserialize, ToSchema)]
pub struct DeskRefundBody {
    pub andrew_id: String,
    pub quantity: i64,
}

#[derive(Serialize, ToSchema)]
pub struct GaveBack {
    pub refunded: i64,
    pub scottycoins: i64,
}

impl From<Refunded> for GaveBack {
    fn from(refund: Refunded) -> Self {
        Self {
            refunded: refund.refunded,
            scottycoins: refund.scottycoins,
        }
    }
}

#[utoipa::path(
    post,
    path = "/portal/trade/orders/{purchase_id}/refund",
    tag = "portal",
    params(("purchase_id" = i64, Path, description = "Purchase id")),
    request_body = DeskRefundBody,
    responses(
        (status = OK, body = GaveBack),
        (status = CONFLICT, body = PortalErrBody),
        (status = FORBIDDEN, body = PortalErrBody),
        (status = NOT_FOUND, body = PortalErrBody),
    ),
)]
async fn trade_refund(
    State(console): State<Console>,
    access: Access,
    Path(purchase_id): Path<i64>,
    payload: Result<Json<DeskRefundBody>, JsonRejection>,
) -> Result<Json<GaveBack>, PortalError> {
    access.require(Capability::TradeDesk)?;

    let payload = body(payload)?;
    let user = console.portal.user_id(&payload.andrew_id).await?;
    let refund = console
        .items
        .refund(user, purchase_id, payload.quantity)
        .await?;

    Ok(Json(refund.into()))
}
