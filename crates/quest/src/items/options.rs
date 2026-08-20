use entity::enums::OptionKind;
use entity::{item_option, purchase_option};
use sea_orm::prelude::Uuid;
use sea_orm::{
    ActiveModelTrait, ActiveValue, ColumnTrait, ConnectionTrait, DatabaseConnection, EntityTrait,
    QueryFilter, QueryOrder, QuerySelect, TransactionTrait,
};

use crate::auth::AuthError;

pub const MAX_PER_ITEM: usize = 8;
pub const MAX_CHOICES: usize = 24;
pub const MAX_LABEL: usize = 60;
pub const MAX_CHOICE: usize = 60;
pub const MAX_ANSWER: usize = 120;

#[derive(Clone, Debug, serde::Deserialize, serde::Serialize, utoipa::ToSchema)]
pub struct ChoiceDef {
    pub value: String,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cost: Option<i64>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub background_url: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon_shade: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stock: Option<i64>,
}

pub struct Spec {
    pub label: String,
    pub kind: OptionKind,
    pub choices: Vec<ChoiceDef>,
    pub required: bool,
}

pub struct Choice {
    pub option_id: Uuid,
    pub value: String,
}

pub struct Picked {
    pub option_id: Uuid,
    pub position: i32,
    pub label: String,
    pub value: String,
    pub cost: Option<i64>,
}

pub fn choice_defs_of(row: &item_option::Model) -> Vec<ChoiceDef> {
    row.choices
        .as_array()
        .map(|list| {
            list.iter()
                .filter_map(|entry| {
                    if let Some(value) = entry.as_str() {
                        return Some(ChoiceDef {
                            value: value.to_owned(),
                            cost: None,
                            stock: None,
                            image_url: None,
                            background_url: None,
                            icon_shade: None,
                        });
                    }

                    serde_json::from_value::<ChoiceDef>(entry.clone()).ok()
                })
                .collect()
        })
        .unwrap_or_default()
}

pub fn managed_stock(defined: &[item_option::Model]) -> Option<i64> {
    defined
        .iter()
        .filter_map(|row| {
            if row.kind == OptionKind::Text {
                return None;
            }

            let choices = choice_defs_of(row);
            if choices.is_empty() {
                return None;
            }

            let mut total = 0_i64;

            for choice in choices {
                let stock = choice.stock?;
                total = total.checked_add(stock)?;
            }

            Some(total)
        })
        .min()
}

pub fn kind_name(kind: OptionKind) -> &'static str {
    match kind {
        OptionKind::Select => "select",
        OptionKind::Dropdown => "dropdown",
        OptionKind::Text => "text",
    }
}

pub fn kind_from(name: &str) -> Option<OptionKind> {
    match name {
        "select" => Some(OptionKind::Select),
        "dropdown" => Some(OptionKind::Dropdown),
        "text" => Some(OptionKind::Text),
        _ => None,
    }
}

pub async fn of_item<C: ConnectionTrait>(
    db: &C,
    item: Uuid,
) -> Result<Vec<item_option::Model>, AuthError> {
    item_option::Entity::find()
        .filter(item_option::Column::ItemId.eq(item))
        .order_by_asc(item_option::Column::Position)
        .all(db)
        .await
        .map_err(down)
}

pub async fn of_items<C: ConnectionTrait>(
    db: &C,
    items: &[Uuid],
) -> Result<Vec<item_option::Model>, AuthError> {
    if items.is_empty() {
        return Ok(Vec::new());
    }

    item_option::Entity::find()
        .filter(item_option::Column::ItemId.is_in(items.iter().copied()))
        .order_by_asc(item_option::Column::ItemId)
        .order_by_asc(item_option::Column::Position)
        .all(db)
        .await
        .map_err(down)
}

pub async fn of_purchases<C: ConnectionTrait>(
    db: &C,
    purchases: &[i64],
) -> Result<Vec<purchase_option::Model>, AuthError> {
    if purchases.is_empty() {
        return Ok(Vec::new());
    }

    purchase_option::Entity::find()
        .filter(purchase_option::Column::PurchaseId.is_in(purchases.iter().copied()))
        .order_by_asc(purchase_option::Column::PurchaseId)
        .order_by_asc(purchase_option::Column::Position)
        .all(db)
        .await
        .map_err(down)
}

pub fn vet(specs: &[Spec]) -> Result<(), AuthError> {
    if specs.len() > MAX_PER_ITEM {
        return Err(AuthError::BadRequest("options_too_many"));
    }

    let mut seen: Vec<String> = Vec::with_capacity(specs.len());

    for spec in specs {
        let label = spec.label.trim();
        if label.is_empty() {
            return Err(AuthError::BadRequest("option_label_empty"));
        }
        if label.chars().count() > MAX_LABEL {
            return Err(AuthError::BadRequest("option_label_too_long"));
        }

        let folded = label.to_lowercase();
        if seen.contains(&folded) {
            return Err(AuthError::BadRequest("option_label_repeated"));
        }
        seen.push(folded);

        if spec.kind == OptionKind::Text {
            if !spec.choices.is_empty() {
                return Err(AuthError::BadRequest("option_text_has_choices"));
            }
            continue;
        }

        if spec.choices.is_empty() {
            return Err(AuthError::BadRequest("option_choices_empty"));
        }
        if spec.choices.len() > MAX_CHOICES {
            return Err(AuthError::BadRequest("option_choices_too_many"));
        }

        let mut picks: Vec<String> = Vec::with_capacity(spec.choices.len());
        for choice in &spec.choices {
            let value = choice.value.trim();
            if value.is_empty() {
                return Err(AuthError::BadRequest("option_choice_empty"));
            }
            if value.chars().count() > MAX_CHOICE {
                return Err(AuthError::BadRequest("option_choice_too_long"));
            }

            let folded = value.to_lowercase();
            if picks.contains(&folded) {
                return Err(AuthError::BadRequest("option_choice_repeated"));
            }
            if choice.cost.is_some_and(|cost| cost < 0) {
                return Err(AuthError::BadRequest("option_price_invalid"));
            }
            if choice.stock.is_some_and(|stock| stock < 0) {
                return Err(AuthError::BadRequest("option_stock_invalid"));
            }
            picks.push(folded);
        }
    }

    Ok(())
}

pub async fn replace(
    db: &DatabaseConnection,
    item: Uuid,
    specs: Vec<Spec>,
) -> Result<Vec<item_option::Model>, AuthError> {
    vet(&specs)?;

    let txn = db.begin().await.map_err(down)?;

    let known = entity::items::Entity::find_by_id(item)
        .lock_exclusive()
        .one(&txn)
        .await
        .map_err(down)?;

    if known.is_none() {
        txn.rollback().await.ok();
        return Err(AuthError::NotFound("item_unknown"));
    }

    item_option::Entity::delete_many()
        .filter(item_option::Column::ItemId.eq(item))
        .exec(&txn)
        .await
        .map_err(down)?;

    for (index, spec) in specs.into_iter().enumerate() {
        let choices: Vec<ChoiceDef> = if spec.kind == OptionKind::Text {
            Vec::new()
        } else {
            spec.choices
                .into_iter()
                .map(|mut choice| {
                    choice.value = choice.value.trim().to_owned();
                    choice
                })
                .collect()
        };

        item_option::ActiveModel {
            id: ActiveValue::Set(Uuid::new_v4()),
            item_id: ActiveValue::Set(item),
            label: ActiveValue::Set(spec.label.trim().to_owned()),
            kind: ActiveValue::Set(spec.kind),
            choices: ActiveValue::Set(serde_json::json!(choices)),
            required: ActiveValue::Set(spec.required),
            position: ActiveValue::Set(index as i32),
        }
        .insert(&txn)
        .await
        .map_err(down)?;
    }

    let saved = of_item(&txn, item).await?;

    txn.commit().await.map_err(down)?;

    Ok(saved)
}

pub fn resolve(
    defined: &[item_option::Model],
    chosen: &[Choice],
) -> Result<Vec<Picked>, AuthError> {
    for pick in chosen {
        if !defined.iter().any(|row| row.id == pick.option_id) {
            return Err(AuthError::BadRequest("option_unknown"));
        }
    }

    let mut picked = Vec::new();

    for row in defined {
        let given = chosen
            .iter()
            .find(|pick| pick.option_id == row.id)
            .map(|pick| pick.value.trim())
            .unwrap_or_default();

        if given.is_empty() {
            if row.required {
                return Err(AuthError::BadRequest("option_missing"));
            }
            continue;
        }

        match row.kind {
            OptionKind::Text => {
                if given.chars().count() > MAX_ANSWER {
                    return Err(AuthError::BadRequest("option_answer_too_long"));
                }

                picked.push(Picked {
                    option_id: row.id,
                    position: row.position,
                    label: row.label.clone(),
                    value: given.to_owned(),
                    cost: None,
                });
            }

            OptionKind::Select | OptionKind::Dropdown => {
                let choice = choice_defs_of(row)
                    .into_iter()
                    .find(|choice| choice.value == given)
                    .ok_or(AuthError::BadRequest("option_answer_invalid"))?;

                picked.push(Picked {
                    option_id: row.id,
                    position: row.position,
                    label: row.label.clone(),
                    value: choice.value,
                    cost: choice.cost,
                });
            }
        }
    }

    Ok(picked)
}
pub async fn take_stock<C: ConnectionTrait>(
    db: &C,
    defined: &[item_option::Model],
    picked: &[Picked],
    quantity: i64,
) -> Result<(), AuthError> {
    for pick in picked {
        let Some(row) = defined.iter().find(|row| row.id == pick.option_id) else {
            return Err(AuthError::BadRequest("option_unknown"));
        };

        let mut choices = choice_defs_of(row);

        let Some(choice) = choices.iter_mut().find(|choice| choice.value == pick.value) else {
            // Text options do not have a choice list.
            continue;
        };

        let Some(stock) = choice.stock else {
            // No variant-specific stock configured:
            // continue using the parent item's stock only.
            continue;
        };

        if stock < quantity {
            return Err(AuthError::Conflict("out_of_stock"));
        }

        choice.stock = Some(stock - quantity);

        let mut active: item_option::ActiveModel = row.clone().into();
        active.choices = ActiveValue::Set(serde_json::json!(choices));

        active.update(db).await.map_err(down)?;
    }

    Ok(())
}

pub async fn restore_stock<C: ConnectionTrait>(
    db: &C,
    item: Uuid,
    purchase: i64,
    quantity: i64,
) -> Result<(), AuthError> {
    let saved = of_purchases(db, &[purchase]).await?;

    if saved.is_empty() {
        return Ok(());
    }

    let defined = of_item(db, item).await?;

    for pick in saved {
        let Some(row) = defined.iter().find(|row| row.position == pick.position) else {
            continue;
        };

        let mut choices = choice_defs_of(row);

        let Some(choice) = choices.iter_mut().find(|choice| choice.value == pick.value) else {
            continue;
        };

        let Some(stock) = choice.stock else {
            continue;
        };

        choice.stock = Some(
            stock
                .checked_add(quantity)
                .ok_or(AuthError::BadRequest("refund_quantity_invalid"))?,
        );

        let mut active: item_option::ActiveModel = row.clone().into();
        active.choices = ActiveValue::Set(serde_json::json!(choices));

        active.update(db).await.map_err(down)?;
    }

    Ok(())
}

pub async fn attach<C: ConnectionTrait>(
    db: &C,
    purchase: i64,
    picked: Vec<Picked>,
) -> Result<(), AuthError> {
    if picked.is_empty() {
        return Ok(());
    }

    let rows = picked.into_iter().map(|pick| purchase_option::ActiveModel {
        purchase_id: ActiveValue::Set(purchase),
        position: ActiveValue::Set(pick.position),
        label: ActiveValue::Set(pick.label),
        value: ActiveValue::Set(pick.value),
    });

    purchase_option::Entity::insert_many(rows)
        .exec(db)
        .await
        .map_err(down)?;

    Ok(())
}

fn down(err: sea_orm::DbErr) -> AuthError {
    eprintln!("item options: {err}");
    AuthError::Upstream("database_unavailable")
}
