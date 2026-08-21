use axum::Json;
use axum::extract::rejection::JsonRejection;
use axum::extract::{Path, Query, State};
use sea_orm::prelude::{Date, Uuid};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::activity::{ActivityDay, ActivityTap, GemstoneCorrectionView};
use super::assets::{AssetError, Assets};
use super::trade::{Desk, DeskPickView, Fulfilled, OrderView, PassHolder, SalesItemView};
use super::{Browse, Column, Outcome, Page, Portal, PortalErrBody, PortalError, Script};
use crate::access::{Access, CAPABILITIES, Capability, Level, Role};
use crate::auth::AuthError;
use crate::items::options::{self, Choice, Spec};
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
#[derive(Deserialize, ToSchema)]
pub struct GemstoneCorrectionBody {
    pub target: i64,
    pub reason: String,
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
        .routes(routes!(upload, library, drop_asset))
        .routes(routes!(trade_items))
        .routes(routes!(trade_options))
        .routes(routes!(trade_pass))
        .routes(routes!(trade_orders, trade_buy))
        .routes(routes!(trade_fulfil))
        .routes(routes!(trade_refund))
        .routes(routes!(trade_sales))
        .routes(routes!(user_activity))
        .routes(routes!(user_activity_taps))
        .routes(routes!(move_activity_taps))
        .routes(routes!(set_activity_gemstones, clear_activity_gemstones))
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

#[derive(Deserialize, ToSchema)]
pub struct MoveTapsBody {
    pub tap_ids: Vec<i64>,
    pub day: Date,
}

#[derive(Serialize, ToSchema)]
pub struct MovedTaps {
    pub moved: u64,
}

#[utoipa::path(
    get,
    path = "/portal/activity/{andrew_id}/taps",
    tag = "portal",
    params(
        ("andrew_id" = String, Path, description = "Andrew ID"),
    ),
    responses(
        (status = OK, body = Vec<ActivityTap>),
        (status = FORBIDDEN, body = PortalErrBody),
        (status = NOT_FOUND, body = PortalErrBody),
    ),
)]
async fn user_activity_taps(
    State(console): State<Console>,
    access: Access,
    Path(andrew_id): Path<String>,
) -> Result<Json<Vec<ActivityTap>>, PortalError> {
    access.require(Capability::DataConsole)?;
    access.require_table("users", Level::Read)?;
    access.require_table("tap_events", Level::Read)?;
    access.require_table("challenge", Level::Read)?;
    access.require_table("daily_challenge", Level::Read)?;

    let user = console.portal.user_id(andrew_id.trim()).await?;

    Ok(Json(console.portal.activity_taps(user).await?))
}

#[utoipa::path(
    put,
    path = "/portal/activity/{andrew_id}/days/{day}/gemstones",
    tag = "portal",
    params(
        ("andrew_id" = String, Path, description = "Andrew ID"),
        ("day" = Date, Path, description = "Quest day"),
    ),
    request_body = GemstoneCorrectionBody,
    responses(
        (status = OK, body = GemstoneCorrectionView),
        (status = BAD_REQUEST, body = PortalErrBody),
        (status = CONFLICT, body = PortalErrBody),
        (status = FORBIDDEN, body = PortalErrBody),
        (status = NOT_FOUND, body = PortalErrBody),
    ),
)]
async fn set_activity_gemstones(
    State(console): State<Console>,
    access: Access,
    Path((andrew_id, day)): Path<(String, Date)>,
    payload: Result<Json<GemstoneCorrectionBody>, JsonRejection>,
) -> Result<Json<GemstoneCorrectionView>, PortalError> {
    access.require(Capability::DataConsole)?;
    access.require_table("users", Level::Read)?;
    access.require_table("tap_events", Level::Read)?;
    access.require_table("challenge", Level::Read)?;
    access.require_table("daily_challenge", Level::Read)?;
    access.require_table("gemstone_correction", Level::Edit)?;

    let payload = body(payload)?;
    let user = console.portal.user_id(andrew_id.trim()).await?;

    let correction = console
        .portal
        .set_gemstone_correction(
            user,
            day,
            payload.target,
            &payload.reason,
            &access.user.andrew_id,
        )
        .await?;

    Ok(Json(correction))
}

#[utoipa::path(
    delete,
    path = "/portal/activity/{andrew_id}/days/{day}/gemstones",
    tag = "portal",
    params(
        ("andrew_id" = String, Path, description = "Andrew ID"),
        ("day" = Date, Path, description = "Quest day"),
    ),
    responses(
        (status = OK, body = GemstoneCorrectionView),
        (status = FORBIDDEN, body = PortalErrBody),
        (status = NOT_FOUND, body = PortalErrBody),
    ),
)]
async fn clear_activity_gemstones(
    State(console): State<Console>,
    access: Access,
    Path((andrew_id, day)): Path<(String, Date)>,
) -> Result<Json<GemstoneCorrectionView>, PortalError> {
    access.require(Capability::DataConsole)?;
    access.require_table("users", Level::Read)?;
    access.require_table("tap_events", Level::Read)?;
    access.require_table("challenge", Level::Read)?;
    access.require_table("daily_challenge", Level::Read)?;
    access.require_table("gemstone_correction", Level::Edit)?;

    let user = console.portal.user_id(andrew_id.trim()).await?;

    Ok(Json(
        console.portal.clear_gemstone_correction(user, day).await?,
    ))
}

#[utoipa::path(
    patch,
    path = "/portal/activity/{andrew_id}/taps/day",
    tag = "portal",
    params(
        ("andrew_id" = String, Path, description = "Andrew ID"),
    ),
    request_body = MoveTapsBody,
    responses(
        (status = OK, body = MovedTaps),
        (status = BAD_REQUEST, body = PortalErrBody),
        (status = FORBIDDEN, body = PortalErrBody),
        (status = NOT_FOUND, body = PortalErrBody),
    ),
)]
async fn move_activity_taps(
    State(console): State<Console>,
    access: Access,
    Path(andrew_id): Path<String>,
    payload: Result<Json<MoveTapsBody>, JsonRejection>,
) -> Result<Json<MovedTaps>, PortalError> {
    access.require(Capability::DataConsole)?;
    access.require_table("users", Level::Read)?;
    access.require_table("tap_events", Level::Edit)?;

    let payload = body(payload)?;

    if payload.tap_ids.is_empty() || payload.tap_ids.len() > 200 {
        return Err(PortalError::Auth(AuthError::BadRequest(
            "tap_selection_invalid",
        )));
    }

    let user = console.portal.user_id(andrew_id.trim()).await?;

    let moved = console
        .portal
        .move_taps_to_day(user, &payload.tap_ids, payload.day)
        .await?;

    Ok(Json(MovedTaps { moved }))
}

#[utoipa::path(
    get,
    path = "/portal/activity/{andrew_id}",
    tag = "portal",
    params(
        ("andrew_id" = String, Path, description = "Andrew ID"),
    ),
    responses(
        (status = OK, body = Vec<ActivityDay>),
        (status = FORBIDDEN, body = PortalErrBody),
        (status = NOT_FOUND, body = PortalErrBody),
    ),
)]
async fn user_activity(
    State(console): State<Console>,
    access: Access,
    Path(andrew_id): Path<String>,
) -> Result<Json<Vec<ActivityDay>>, PortalError> {
    access.require(Capability::DataConsole)?;
    access.require_table("users", Level::Read)?;
    access.require_table("tap_events", Level::Read)?;
    access.require_table("challenge", Level::Read)?;
    access.require_table("daily_challenge", Level::Read)?;

    let user = console.portal.user_id(andrew_id.trim()).await?;

    Ok(Json(console.portal.daily_activity(user).await?))
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

#[utoipa::path(
    get,
    path = "/portal/trade/sales",
    tag = "portal",
    responses(
        (status = OK, body = Vec<SalesItemView>),
        (status = FORBIDDEN, body = PortalErrBody),
    ),
)]
async fn trade_sales(
    State(console): State<Console>,
    access: Access,
) -> Result<Json<Vec<SalesItemView>>, PortalError> {
    access.require(Capability::TradeDesk)?;

    Ok(Json(console.desk.sales().await?))
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
pub struct ShopOption {
    pub id: Uuid,
    pub label: String,
    pub kind: String,
    pub choices: Vec<options::ChoiceDef>,
    pub required: bool,
}

impl From<entity::item_option::Model> for ShopOption {
    fn from(row: entity::item_option::Model) -> Self {
        Self {
            id: row.id,
            label: row.label.clone(),
            kind: options::kind_name(row.kind).to_owned(),
            choices: options::choice_defs_of(&row),
            required: row.required,
        }
    }
}

#[derive(Serialize, ToSchema)]
pub struct ShopItem {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub cost: i64,
    pub image_url: Option<String>,
    pub background_url: Option<String>,
    pub icon_shade: Option<String>,
    pub stock: i64,
    pub options: Vec<ShopOption>,
}

impl ShopItem {
    fn build(item: Stocked, options: Vec<ShopOption>) -> Self {
        Self {
            id: item.id,
            name: item.name,
            description: item.description,
            cost: item.cost,
            image_url: item.image_url,
            background_url: item.background_url,
            icon_shade: item.icon_shade,
            stock: item.stock,
            options,
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
    let ids: Vec<Uuid> = items.iter().map(|item| item.id).collect();
    let mut defined = console.items.options_of(&ids).await?;

    Ok(Json(
        items
            .into_iter()
            .map(|item| {
                let mine = defined.remove(&item.id).unwrap_or_default();
                ShopItem::build(item, mine.into_iter().map(ShopOption::from).collect())
            })
            .collect(),
    ))
}

#[derive(Deserialize, ToSchema)]
pub struct OptionBody {
    pub label: String,
    pub kind: String,
    #[serde(default)]
    pub choices: Vec<options::ChoiceDef>,
    #[serde(default = "yes")]
    pub required: bool,
}

fn yes() -> bool {
    true
}

#[derive(Deserialize, ToSchema)]
pub struct OptionsBody {
    pub options: Vec<OptionBody>,
}

#[utoipa::path(
    put,
    path = "/portal/trade/items/{id}/options",
    tag = "portal",
    params(("id" = Uuid, Path, description = "Item id")),
    request_body = OptionsBody,
    responses(
        (status = OK, body = Vec<ShopOption>),
        (status = BAD_REQUEST, body = PortalErrBody),
        (status = FORBIDDEN, body = PortalErrBody),
        (status = NOT_FOUND, body = PortalErrBody),
    ),
)]
async fn trade_options(
    State(console): State<Console>,
    access: Access,
    Path(id): Path<Uuid>,
    payload: Result<Json<OptionsBody>, JsonRejection>,
) -> Result<Json<Vec<ShopOption>>, PortalError> {
    access.require(Capability::TradeDesk)?;
    access.require_table("item_option", Level::Edit)?;

    let payload = body(payload)?;

    let mut specs = Vec::with_capacity(payload.options.len());
    for spec in payload.options {
        let kind = options::kind_from(&spec.kind).ok_or(PortalError::Auth(
            AuthError::BadRequest("option_kind_unknown"),
        ))?;

        specs.push(Spec {
            label: spec.label,
            kind,
            choices: spec.choices,
            required: spec.required,
        });
    }

    let saved = console.items.set_options(id, specs).await?;

    Ok(Json(saved.into_iter().map(ShopOption::from).collect()))
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
    pub name: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct Uploaded {
    pub key: String,
    pub url: String,
}

fn asset_failed(err: AssetError) -> PortalError {
    match err {
        AssetError::Unconfigured => PortalError::Sql(
            "asset uploads are off: the CDN_* Garage credentials are not set".to_owned(),
        ),
        AssetError::Rejected(code) => PortalError::Auth(AuthError::BadRequest(code)),
        AssetError::Upstream(detail) => PortalError::Sql(detail),
    }
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
        .put(
            &query.kind,
            content_type,
            query.name.as_deref(),
            &access.user.andrew_id,
            bytes,
        )
        .await
        .map_err(asset_failed)?;

    Ok(Json(Uploaded {
        key: stored.key,
        url: stored.url,
    }))
}

#[derive(Deserialize, ToSchema, utoipa::IntoParams)]
pub struct AssetQuery {
    pub kind: Option<String>,
    pub limit: Option<u64>,
}

#[derive(Serialize, ToSchema)]
pub struct AssetView {
    pub key: String,
    pub url: String,
    pub kind: String,
    pub content_type: String,
    pub bytes: i64,
    pub filename: Option<String>,
    pub uploaded_by: String,
    pub created_at: chrono::DateTime<chrono::FixedOffset>,
}

#[derive(Serialize, ToSchema)]
pub struct Library {
    pub assets: Vec<AssetView>,
    pub kinds: Vec<String>,
    pub max_bytes: u64,
    pub ready: bool,
}

#[utoipa::path(
    get,
    path = "/portal/assets",
    tag = "portal",
    params(AssetQuery),
    responses(
        (status = OK, body = Library),
        (status = FORBIDDEN, body = PortalErrBody),
    ),
)]
async fn library(
    State(console): State<Console>,
    access: Access,
    Query(query): Query<AssetQuery>,
) -> Result<Json<Library>, PortalError> {
    access.require(Capability::Assets)?;

    let found = console
        .assets
        .listing(query.kind.as_deref(), query.limit.unwrap_or(100))
        .await
        .map_err(asset_failed)?;

    Ok(Json(Library {
        assets: found
            .into_iter()
            .map(|row| AssetView {
                key: row.key,
                url: row.url,
                kind: row.kind,
                content_type: row.content_type,
                bytes: row.bytes,
                filename: row.filename,
                uploaded_by: row.uploaded_by,
                created_at: row.created_at,
            })
            .collect(),
        kinds: crate::portal::assets::KIND_LIST
            .iter()
            .map(|kind| (*kind).to_owned())
            .collect(),
        max_bytes: crate::portal::assets::MAX_BYTES as u64,
        ready: console.assets.configured(),
    }))
}

#[derive(Deserialize, ToSchema)]
pub struct DropBody {
    pub key: String,
}

#[utoipa::path(
    delete,
    path = "/portal/assets",
    tag = "portal",
    request_body = DropBody,
    responses(
        (status = OK, body = Uploaded),
        (status = BAD_REQUEST, body = PortalErrBody),
        (status = FORBIDDEN, body = PortalErrBody),
    ),
)]
async fn drop_asset(
    State(console): State<Console>,
    access: Access,
    payload: Result<Json<DropBody>, JsonRejection>,
) -> Result<Json<Uploaded>, PortalError> {
    access.require(Capability::Assets)?;

    let payload = body(payload)?;
    console
        .assets
        .remove(&payload.key)
        .await
        .map_err(asset_failed)?;

    Ok(Json(Uploaded {
        url: console.assets.url_for(&payload.key),
        key: payload.key,
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
        (status = OK, body = Vec<OrderView>),
        (status = FORBIDDEN, body = PortalErrBody),
    ),
)]
async fn trade_orders(
    State(console): State<Console>,
    access: Access,
    Query(query): Query<OrderQuery>,
) -> Result<Json<Vec<OrderView>>, PortalError> {
    access.require(Capability::TradeDesk)?;

    let orders = console
        .desk
        .orders(query.andrew_id.as_deref(), query.delivered, query.limit)
        .await?;

    let ids: Vec<i64> = orders.iter().map(|order| order.purchase_id).collect();
    let mut picked = console.items.picks_of(&ids).await?;

    Ok(Json(
        orders
            .into_iter()
            .map(|order| {
                let mine = picked.remove(&order.purchase_id).unwrap_or_default();
                OrderView {
                    purchase_id: order.purchase_id,
                    user_id: order.user_id,
                    andrew_id: order.andrew_id,
                    item_id: order.item_id,
                    item: order.item,
                    cost: order.cost,
                    quantity: order.quantity,
                    received_item_date: order.received_item_date,
                    options: mine
                        .into_iter()
                        .map(|pick| DeskPickView {
                            label: pick.label,
                            value: pick.value,
                        })
                        .collect(),
                }
            })
            .collect(),
    ))
}

#[derive(Deserialize, ToSchema)]
pub struct DeskSaleBody {
    pub andrew_id: String,
    pub item_id: Uuid,
    pub quantity: i64,
    #[serde(default)]
    pub options: Vec<DeskPickBody>,
}

#[derive(Deserialize, ToSchema)]
pub struct DeskPickBody {
    pub option_id: Uuid,
    pub value: String,
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
    pub options: Vec<DeskPickView>,
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
            options: receipt
                .chosen
                .into_iter()
                .map(|pick| DeskPickView {
                    label: pick.label,
                    value: pick.value,
                })
                .collect(),
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
    let chosen: Vec<Choice> = payload
        .options
        .into_iter()
        .map(|pick| Choice {
            option_id: pick.option_id,
            value: pick.value,
        })
        .collect();

    let receipt = console
        .items
        .purchase(user, payload.item_id, payload.quantity, &chosen)
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
