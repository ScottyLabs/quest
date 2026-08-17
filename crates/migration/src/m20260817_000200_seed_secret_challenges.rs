use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const UP: &str = r#"
    ALTER TABLE "challenge"
        DROP CONSTRAINT "challenge_category_check";

    ALTER TABLE "challenge"
        ADD CONSTRAINT "challenge_category_check"
        CHECK ("category" IN (
            'essentials',
            'cool_corners',
            'bridges',
            'lets_eat',
            'minor_major_general',
            'residence_relaxation',
            'secrets'
        ));

    INSERT INTO "challenge"
        (
            "id",
            "name",
            "tagline",
            "description",
            "category",
            "location",
            "secret",
            "coin_value",
            "open_from"
        )
    SELECT
        md5('secret-challenge-2026:' || seed."name")::uuid,
        seed."name",
        seed."tagline",
        seed."description",
        'secrets',
        NULL,
        TRUE,
        0,
        TIMESTAMPTZ '2026-08-16 18:00:00-04'
    FROM (VALUES
        (
            'Andrew Greenwald',
            'An Assistant O-Director...',
            'Wow, you found a secret challenge! How many more can you get?'
        ),
        (
            'Lauren Moran',
            'An Assistant O-Director...',
            'Wow, you found a secret challenge! How many more can you get?'
        ),
        (
            'Lexie Elliot',
            'The O-Director...',
            'Wow, you found a secret challenge! How many more can you get?'
        ),
        (
            'Gina Casalegno',
            'All things Student Affairs...',
            'Wow, you found a secret challenge! How many more can you get?'
        ),
        (
            'Meg Richards',
            'Senior SWE of Eberly...',
            'Wow, you found a secret challenge! How many more can you get?'
        ),
        (
            'Elizabeth Koch',
            'The Director of Student Involvement and Traditions...',
            'Wow, you found a secret challenge! How many more can you get?'
        ),
        (
            'Kenechukwu Echezona',
            'The Project Lead...',
            'Wow, you found a secret challenge! How many more can you get?'
        ),
        (
            'John Cao',
            'A magpie developer and RA...',
            'Wow, you found a secret challenge! How many more can you get?'
        ),
        (
            'Anish Pallati',
            'The ScottyLabs Tech Lead...',
            'Wow, you found a secret challenge! How many more can you get?'
        ),
        (
            'Andrew Luo',
            'One of the ScottyLabs Developers and puzzle hunter extraordinaire...',
            'Wow, you found a secret challenge! How many more can you get?'
        ),
        (
            'Adrian Zhuang',
            'One of the Game Designers...',
            'Wow, you found a secret challenge! How many more can you get?'
        ),
        (
            'Lee Rodriguez',
            'One of the ScottyLabs Developers and MacOS loyalist...',
            'Wow, you found a secret challenge! How many more can you get?'
        ),
        (
            'Bright Zheng',
            'One of the ScottyLabs Developers and AB Techie...',
            'Wow, you found a secret challenge! How many more can you get?'
        ),
        (
            'Austin An',
            'Brrr... it''s cold in here...',
            'Wow, you found a secret challenge! How many more can you get?'
        ),
        (
            'Zoe Botta',
            'The first penguin...?',
            'Wow, you found a secret challenge! How many more can you get?'
        ),
        (
            'Sara Christie',
            'This is how we grow, grow, grow!',
            'Wow, you found a secret challenge! How many more can you get?'
        ),
        (
            'Nathan Cottrell',
            'BAM! BAM! BAM!',
            'Wow, you found a secret challenge! How many more can you get?'
        ),
        (
            'Sam Curry',
            'Yee-Haw!',
            'Wow, you found a secret challenge! How many more can you get?'
        ),
        (
            'Samantha Ledford',
            'Hamer time!',
            'Wow, you found a secret challenge! How many more can you get?'
        ),
        (
            'Roy Park',
            'Who''s got the power?!',
            'Wow, you found a secret challenge! How many more can you get?'
        ),
        (
            'Rachael Pratt',
            'All the way to victory!',
            'Wow, you found a secret challenge! How many more can you get?'
        ),
        (
            'Beck Wagner',
            'You can hear a blue commotion...',
            'Wow, you found a secret challenge! How many more can you get?'
        )
    ) AS seed ("name", "tagline", "description")
    ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "tagline" = EXCLUDED."tagline",
        "description" = EXCLUDED."description",
        "category" = 'secrets',
        "location" = NULL,
        "secret" = TRUE,
        "coin_value" = 0,
        "open_from" = EXCLUDED."open_from";
"#;

const DOWN: &str = r#"
    DELETE FROM "challenge"
    WHERE "id" = md5('secret-challenge-2026:' || "name")::uuid;

    ALTER TABLE "challenge"
        DROP CONSTRAINT "challenge_category_check";

    ALTER TABLE "challenge"
        ADD CONSTRAINT "challenge_category_check"
        CHECK ("category" IN (
            'essentials',
            'cool_corners',
            'bridges',
            'lets_eat',
            'minor_major_general',
            'residence_relaxation'
        ));
"#;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(UP).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(DOWN).await?;
        Ok(())
    }
}
