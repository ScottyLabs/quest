use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

// Terrier Trade stock from "ttrade.csv", read tier section by tier section: name,
// the description the sheet supplies, the ScottyCoin cost, and the total expected
// inventory ("TBD" counts as none in stock yet). Rows without a whole-number cost
// are left out -- the unpriced shirt and dorm-memento variants, plus the two "600+"
// umbrella rows whose variants are listed with prices of their own. The sheet has
// no artwork, so "image_url" stays null.
//
// Ids are derived from the name, so a seed lands on the same rows everywhere and
// `down` can tell what this migration wrote. Nothing is written if the table
// already holds items -- an environment that stocked its own shop keeps it.
const SEED: &str = r#"
            INSERT INTO "items"
                ("id", "name", "description", "cost", "image_url", "quantity_available")
            SELECT
                md5('ttrade-2026:' || seed."name")::uuid,
                seed."name",
                seed."description",
                seed."cost",
                NULL,
                seed."quantity_available"
            FROM (VALUES
                    ('Lunch with Gina', '', 4700, 0),
                    ('Free PGH Connections Trip', '', 5800, 10),
                    ('Steam Tunnel Guided Tour', '', 4100, 0),
                    ('Special Collections Guided Tour', '', 4100, 0),
                    ('Free Shake Smart Voucher', '', 3500, 10),
                    ('Custom 3D Printed Model', '', 3200, 10),
                    ('Spring Carnival Ride Ticket', '', 5800, 10),
                    ('Buggy Follow Car Ride',
                     'Go for a ride in a buggy "follow car"! Experience what it''s like to drive on the buggy course during morning practice with a ride in the car that follows buggies around the course. You''ll get a close-up view of all the action and watch the sun rise over Schenley Park as you watch buggies race down the course, all while listening to some awesome music during buggy practice (aka "Rolls")',
                     4100, 20),
                    ('CMU FYO 2026 Shirt', '', 2300, 50),
                    ('CMU Hat', '', 1700, 0),
                    ('CMU Shirt', '', 2300, 0),
                    ('CMU Mug', '', 2000, 0),
                    ('Academic Department Shirt', '', 2300, 0),
                    ('Heinz Backpack', '', 2900, 50),
                    ('TartanConnect Shirt', '', 2300, 0),
                    ('GCS T-Shirt', '', 2300, 10),
                    ('Kiltie Band Legacy T-Shirt', '', 2300, 5),
                    ('AB Tech Laminated Trading Card', '', 1500, 0),
                    ('Laser-Cut Scotty', '', 300, 500),
                    ('Housing Community Memento', '', 900, 1930),
                    ('"A Carnegie Constellation" Sticker', '', 900, 200),
                    ('CMU KGB ReadMe Sticker',
                     '"Keep partying with the party with these awesome stickers! Find more images like these in CMU''s best satire magazine: ReadMe, presented by the CMU KGB. Sticker options include Buggy Manslaughter, Exploring HCI at CMU, CMU Copyright Infringement, and the ReadMe News logo."',
                     900, 200),
                    ('"Spring Carnival" Sticker', '', 900, 50),
                    ('"Spring Carnival 2026" Guitar Pick', '', 600, 150),
                    ('"Scotty''s Playlist 2026" Sticker', '', 900, 50),
                    ('"Scotty''s Playlist 2026" Keychain', '', 1200, 8),
                    ('"Hollywood 2025" Sticker', '', 900, 50),
                    ('"Arcade 2024" Sticker', '', 900, 50),
                    ('"Scotty in Wonderland 2023" Sticker', '', 900, 50),
                    ('Scotty BME Stress Toy', '', 600, 27),
                    ('Scotty BME Pin', '', 900, 19),
                    ('Scotty BME Magnet', '', 1200, 50),
                    ('Plastic Toy',
                     'Various toys',
                     600, 31)
            ) AS seed ("name", "description", "cost", "quantity_available")
            WHERE NOT EXISTS (SELECT 1 FROM "items");
"#;

// Only rows this migration inserted carry a name-derived id, so a shop stocked by
// hand (and anything bought from it) survives a rollback.
const UNSEED: &str = r#"
            CREATE TEMP TABLE "seeded_item" AS
            SELECT "id" FROM "items"
            WHERE "id" = md5('ttrade-2026:' || "name")::uuid;

            DELETE FROM "purchases"
            WHERE "item_id" IN (SELECT "id" FROM "seeded_item");

            DELETE FROM "items"
            WHERE "id" IN (SELECT "id" FROM "seeded_item");

            DROP TABLE "seeded_item";
"#;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(SEED).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(UNSEED).await?;
        Ok(())
    }
}
