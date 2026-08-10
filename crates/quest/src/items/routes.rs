use axum::extract::rejection::JsonRejection;
use axum::extract::{Path, State};
use axum::{Extension, Json};
use sea_orm::prelude::Uuid;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::{Items, Ledger, Receipt, Stocked};
use crate::auth::extract::CurrentUser;
use crate::auth::{AuthErrBody, AuthError};
use crate::users::Users;

pub fn router(items: Items) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(list))
        .routes(routes!(buy))
        .routes(routes!(mine))
        .routes(routes!(give_back))
        .with_state(items)
}

#[derive(Serialize, ToSchema)]
pub struct ItemView {
    id: String,
    name: String,
    description: String,
    cost: i64,
    image_url: Option<String>,
    stock: i64,
}

impl From<Stocked> for ItemView {
    fn from(row: Stocked) -> Self {
        Self {
            id: row.id.to_string(),
            name: row.name,
            description: row.description,
            cost: row.cost,
            image_url: row.image_url,
            stock: row.stock,
        }
    }
}

#[derive(Serialize, ToSchema)]
struct Shelf {
    items: Vec<ItemView>,
    total: usize,
}

#[utoipa::path(
    get,
    path = "/items",
    operation_id = "list_items",
    tag = "items",
    responses(
        (status = OK, body = Shelf),
        (status = UNAUTHORIZED, body = AuthErrBody),
        (status = BAD_GATEWAY, body = AuthErrBody),
    ),
)]
async fn list(
    State(items): State<Items>,
    CurrentUser(_user): CurrentUser,
) -> Result<Json<Shelf>, AuthError> {
    let views: Vec<ItemView> = items
        .list()
        .await?
        .into_iter()
        .map(ItemView::from)
        .collect();

    Ok(Json(Shelf {
        total: views.len(),
        items: views,
    }))
}

#[derive(Deserialize, ToSchema)]
struct BuyBody {
    #[serde(default = "one")]
    quantity: i64,
}

fn one() -> i64 {
    1
}

#[derive(Serialize, ToSchema)]
struct Purchased {
    purchase_id: i64,
    item_id: String,
    name: String,
    cost: i64,
    quantity: i64,
    spent: i64,
    stock: i64,
    scottycoins: i64,
}

impl From<Receipt> for Purchased {
    fn from(receipt: Receipt) -> Self {
        Self {
            purchase_id: receipt.purchase_id,
            item_id: receipt.item.to_string(),
            name: receipt.name,
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
    path = "/items/{id}/purchase",
    tag = "items",
    params(("id" = String, Path, description = "Item id")),
    request_body = BuyBody,
    responses(
        (status = OK, body = Purchased),
        (status = BAD_REQUEST, body = AuthErrBody),
        (status = NOT_FOUND, body = AuthErrBody),
        (status = CONFLICT, body = AuthErrBody),
        (status = UNAUTHORIZED, body = AuthErrBody),
        (status = BAD_GATEWAY, body = AuthErrBody),
    ),
)]
async fn buy(
    State(items): State<Items>,
    Extension(users): Extension<Users>,
    CurrentUser(user): CurrentUser,
    Path(id): Path<String>,
    body: Result<Json<BuyBody>, JsonRejection>,
) -> Result<Json<Purchased>, AuthError> {
    let id = Uuid::parse_str(&id).map_err(|_| AuthError::BadRequest("item_id_invalid"))?;
    let quantity = match body {
        Ok(Json(body)) => body.quantity,
        Err(JsonRejection::MissingJsonContentType(_)) => 1,
        Err(_) => return Err(AuthError::BadRequest("purchase_body_invalid")),
    };

    let row = users.row(&user).await?;

    Ok(Json(items.purchase(row.id, id, quantity).await?.into()))
}

#[derive(Serialize, ToSchema)]
struct PurchaseView {
    purchase_id: i64,
    item_id: String,
    name: String,
    quantity: i64,
    cost: i64,
    delivered: bool,
}

impl From<Ledger> for PurchaseView {
    fn from(row: Ledger) -> Self {
        Self {
            purchase_id: row.purchase_id,
            item_id: row.item_id.to_string(),
            name: row.name,
            quantity: row.quantity,
            cost: row.cost,
            delivered: row.delivered,
        }
    }
}

#[derive(Serialize, ToSchema)]
struct Wallet {
    purchases: Vec<PurchaseView>,
}

#[utoipa::path(
    get,
    path = "/users/me/purchases",
    tag = "items",
    responses(
        (status = OK, body = Wallet),
        (status = UNAUTHORIZED, body = AuthErrBody),
        (status = BAD_GATEWAY, body = AuthErrBody),
    ),
)]
async fn mine(
    State(items): State<Items>,
    Extension(users): Extension<Users>,
    CurrentUser(user): CurrentUser,
) -> Result<Json<Wallet>, AuthError> {
    let row = users.row(&user).await?;

    Ok(Json(Wallet {
        purchases: items
            .purchases(row.id)
            .await?
            .into_iter()
            .map(PurchaseView::from)
            .collect(),
    }))
}

#[derive(Deserialize, ToSchema)]
struct RefundBody {
    #[serde(default = "one")]
    quantity: i64,
}

#[derive(Serialize, ToSchema)]
struct RefundView {
    refunded: i64,
    scottycoins: i64,
}

#[utoipa::path(
    post,
    path = "/purchases/{id}/refund",
    tag = "items",
    params(("id" = i64, Path, description = "Purchase id")),
    request_body = RefundBody,
    responses(
        (status = OK, body = RefundView),
        (status = BAD_REQUEST, body = AuthErrBody),
        (status = NOT_FOUND, body = AuthErrBody),
        (status = CONFLICT, body = AuthErrBody),
        (status = UNAUTHORIZED, body = AuthErrBody),
        (status = BAD_GATEWAY, body = AuthErrBody),
    ),
)]
async fn give_back(
    State(items): State<Items>,
    Extension(users): Extension<Users>,
    CurrentUser(user): CurrentUser,
    Path(id): Path<String>,
    body: Result<Json<RefundBody>, JsonRejection>,
) -> Result<Json<RefundView>, AuthError> {
    let id = id
        .parse::<i64>()
        .map_err(|_| AuthError::BadRequest("purchase_id_invalid"))?;
    let quantity = match body {
        Ok(Json(body)) => body.quantity,
        Err(JsonRejection::MissingJsonContentType(_)) => 1,
        Err(_) => return Err(AuthError::BadRequest("refund_body_invalid")),
    };

    let row = users.row(&user).await?;
    let done = items.refund(row.id, id, quantity).await?;

    Ok(Json(RefundView {
        refunded: done.refunded,
        scottycoins: done.scottycoins,
    }))
}
