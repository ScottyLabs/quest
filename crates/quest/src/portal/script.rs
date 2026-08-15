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
