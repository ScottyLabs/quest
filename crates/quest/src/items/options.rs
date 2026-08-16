use entity::enums::OptionKind;
use entity::{item_option, purchase_option};
use sea_orm::prelude::Uuid;
use sea_orm::{
    ActiveModelTrait, ActiveValue, ColumnTrait, ConnectionTrait, DatabaseConnection, EntityTrait,
    QueryFilter, QueryOrder, TransactionTrait,
};

use crate::auth::AuthError;

pub const MAX_PER_ITEM: usize = 8;
pub const MAX_CHOICES: usize = 24;
pub const MAX_LABEL: usize = 60;
pub const MAX_CHOICE: usize = 60;
pub const MAX_ANSWER: usize = 120;

pub struct Spec {
    pub label: String,
    pub kind: OptionKind,
    pub choices: Vec<String>,
    pub required: bool,
}

pub struct Choice {
    pub option_id: Uuid,
    pub value: String,
}

pub struct Picked {
    pub position: i32,
    pub label: String,
    pub value: String,
}

pub fn choices_of(row: &item_option::Model) -> Vec<String> {
    row.choices
        .as_array()
        .map(|list| {
            list.iter()
                .filter_map(|entry| entry.as_str().map(str::to_owned))
                .collect()
        })
        .unwrap_or_default()
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
            let value = choice.trim();
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
        let choices: Vec<String> = if spec.kind == OptionKind::Text {
            Vec::new()
        } else {
            spec.choices
                .iter()
                .map(|choice| choice.trim().to_owned())
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
            }
            OptionKind::Select | OptionKind::Dropdown => {
                if !choices_of(row).iter().any(|choice| choice == given) {
                    return Err(AuthError::BadRequest("option_answer_invalid"));
                }
            }
        }

        picked.push(Picked {
            position: row.position,
            label: row.label.clone(),
            value: given.to_owned(),
        });
    }

    Ok(picked)
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
