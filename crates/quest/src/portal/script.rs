use serde::Serialize;
use utoipa::ToSchema;

use super::Outcome;

#[derive(Debug, Serialize, ToSchema)]
pub struct Step {
    pub statement: String,
    pub outcome: Option<Outcome>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct Script {
    pub steps: Vec<Step>,
    pub statements: usize,
    pub committed: bool,
    pub failed: Option<usize>,
    pub read_only: bool,
    pub elapsed_ms: u64,
}

pub fn split(source: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut current = String::new();
    let bytes: Vec<char> = source.chars().collect();
    let mut at = 0;
    let mut comments = 0usize;

    while at < bytes.len() {
        let here = bytes[at];

        if comments > 0 {
            if here == '*' && bytes.get(at + 1) == Some(&'/') {
                comments -= 1;
                at += 2;
                continue;
            }
            if here == '/' && bytes.get(at + 1) == Some(&'*') {
                comments += 1;
                at += 2;
                continue;
            }
            at += 1;
            continue;
        }

        if here == '-' && bytes.get(at + 1) == Some(&'-') {
            while at < bytes.len() && bytes[at] != '\n' {
                at += 1;
            }
            continue;
        }

        if here == '/' && bytes.get(at + 1) == Some(&'*') {
            comments = 1;
            at += 2;
            continue;
        }

        if here == '\'' {
            let escaped = current
                .chars()
                .last()
                .is_some_and(|previous| previous == 'E' || previous == 'e');

            current.push(here);
            at += 1;

            while at < bytes.len() {
                let inside = bytes[at];

                if escaped && inside == '\\' && at + 1 < bytes.len() {
                    current.push(inside);
                    current.push(bytes[at + 1]);
                    at += 2;
                    continue;
                }

                if inside == '\'' {
                    if bytes.get(at + 1) == Some(&'\'') {
                        current.push('\'');
                        current.push('\'');
                        at += 2;
                        continue;
                    }

                    current.push('\'');
                    at += 1;
                    break;
                }

                current.push(inside);
                at += 1;
            }

            continue;
        }

        if here == '"' {
            current.push(here);
            at += 1;

            while at < bytes.len() {
                let inside = bytes[at];
                current.push(inside);
                at += 1;

                if inside == '"' {
                    if bytes.get(at) == Some(&'"') {
                        current.push('"');
                        at += 1;
                        continue;
                    }
                    break;
                }
            }

            continue;
        }

        if here == '$'
            && let Some(tag) = dollar_tag(&bytes, at)
        {
            {
                current.push_str(&tag);
                at += tag.chars().count();

                while at < bytes.len() {
                    if bytes[at] == '$'
                        && bytes[at..].starts_with(&tag.chars().collect::<Vec<_>>()[..])
                    {
                        current.push_str(&tag);
                        at += tag.chars().count();
                        break;
                    }

                    current.push(bytes[at]);
                    at += 1;
                }

                continue;
            }
        }

        if here == ';' {
            if !current.trim().is_empty() {
                out.push(current.trim().to_owned());
            }
            current.clear();
            at += 1;
            continue;
        }

        current.push(here);
        at += 1;
    }

    if !current.trim().is_empty() {
        out.push(current.trim().to_owned());
    }

    out
}

fn dollar_tag(chars: &[char], at: usize) -> Option<String> {
    let mut end = at + 1;

    while end < chars.len() && chars[end] != '$' {
        let candidate = chars[end];
        let allowed = candidate.is_ascii_alphanumeric() || candidate == '_';

        if !allowed || (end == at + 1 && candidate.is_ascii_digit()) {
            return None;
        }

        end += 1;
    }

    if end >= chars.len() {
        return None;
    }

    Some(chars[at..=end].iter().collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plain_statements_split_on_semicolons() {
        assert_eq!(
            split("SELECT 1; SELECT 2;"),
            vec!["SELECT 1".to_owned(), "SELECT 2".to_owned()]
        );
    }

    #[test]
    fn a_trailing_semicolon_is_optional() {
        assert_eq!(split("SELECT 1"), vec!["SELECT 1".to_owned()]);
        assert_eq!(split("SELECT 1;"), vec!["SELECT 1".to_owned()]);
        assert_eq!(split("  ;;  "), Vec::<String>::new());
    }

    #[test]
    fn semicolons_inside_strings_do_not_split() {
        assert_eq!(
            split("INSERT INTO t VALUES ('a;b'); SELECT 2"),
            vec![
                "INSERT INTO t VALUES ('a;b')".to_owned(),
                "SELECT 2".to_owned()
            ]
        );
    }

    #[test]
    fn doubled_quotes_stay_inside_the_string() {
        assert_eq!(
            split("SELECT 'it''s; fine'; SELECT 2"),
            vec!["SELECT 'it''s; fine'".to_owned(), "SELECT 2".to_owned()]
        );
    }

    #[test]
    fn escape_strings_honour_backslashes() {
        assert_eq!(
            split(r"SELECT E'a\'; b'; SELECT 2"),
            vec![r"SELECT E'a\'; b'".to_owned(), "SELECT 2".to_owned()]
        );
    }

    #[test]
    fn quoted_identifiers_protect_semicolons() {
        assert_eq!(
            split("SELECT \"we;ird\" FROM t; SELECT 2"),
            vec!["SELECT \"we;ird\" FROM t".to_owned(), "SELECT 2".to_owned()]
        );
    }

    #[test]
    fn dollar_quoted_bodies_are_one_statement() {
        let source = "CREATE FUNCTION f() RETURNS int AS $$ BEGIN; RETURN 1; END; $$ LANGUAGE plpgsql; SELECT f()";

        assert_eq!(
            split(source),
            vec![
                "CREATE FUNCTION f() RETURNS int AS $$ BEGIN; RETURN 1; END; $$ LANGUAGE plpgsql"
                    .to_owned(),
                "SELECT f()".to_owned()
            ]
        );
    }

    #[test]
    fn tagged_dollar_quotes_are_matched_by_tag() {
        let source = "SELECT $body$ a; $notbody$ b; $body$; SELECT 2";
        let split = split(source);

        assert_eq!(split.len(), 2);
        assert!(split[0].contains("$notbody$"));
        assert_eq!(split[1], "SELECT 2");
    }

    #[test]
    fn line_comments_are_dropped_and_never_split() {
        assert_eq!(
            split("SELECT 1; -- a note; with a semicolon\nSELECT 2"),
            vec!["SELECT 1".to_owned(), "SELECT 2".to_owned()]
        );
    }

    #[test]
    fn block_comments_nest_like_postgres() {
        assert_eq!(
            split("SELECT 1 /* outer /* inner ; */ still ; */ + 2; SELECT 3"),
            vec!["SELECT 1  + 2".to_owned(), "SELECT 3".to_owned()]
        );
    }

    #[test]
    fn a_lone_dollar_is_not_a_quote() {
        assert_eq!(
            split("SELECT 1 $ 2; SELECT 3"),
            vec!["SELECT 1 $ 2".to_owned(), "SELECT 3".to_owned()]
        );
    }

    #[test]
    fn a_psql_style_script_splits_into_its_parts() {
        let source = r#"
-- seed a couple of items
INSERT INTO items (id, name, description, cost, quantity_available)
VALUES (gen_random_uuid(), 'Sticker', 'A sticker', 5, 100);

UPDATE items SET cost = 6 WHERE name = 'Sticker';

SELECT name, cost FROM items WHERE name = 'Sticker';
"#;

        let split = split(source);

        assert_eq!(split.len(), 3);
        assert!(split[0].starts_with("INSERT INTO items"));
        assert!(split[1].starts_with("UPDATE items"));
        assert!(split[2].starts_with("SELECT name"));
    }
}
