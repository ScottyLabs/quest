use axum::http::HeaderMap;
use axum::http::header::USER_AGENT;

const MAX_CHARS: usize = 64;

pub fn resolve(client: Option<&str>, headers: &HeaderMap) -> Option<String> {
    client.and_then(sanitise).or_else(|| {
        from_user_agent(user_agent(headers)?)
            .as_deref()
            .and_then(sanitise)
    })
}

fn user_agent(headers: &HeaderMap) -> Option<&str> {
    headers.get(USER_AGENT)?.to_str().ok()
}

fn sanitise(raw: &str) -> Option<String> {
    let mut out = String::with_capacity(raw.len().min(MAX_CHARS * 4));
    let mut length = 0;
    let mut pending_space = false;

    for c in raw.chars() {
        if c.is_control() || c.is_whitespace() {
            pending_space = length > 0;
            continue;
        }

        let width = 1 + usize::from(pending_space);
        if length + width > MAX_CHARS {
            break;
        }
        if pending_space {
            out.push(' ');
            pending_space = false;
        }

        out.push(c);
        length += width;
    }

    (!out.is_empty()).then_some(out)
}

fn from_user_agent(ua: &str) -> Option<String> {
    apple(ua).or_else(|| android(ua)).or_else(|| desktop(ua))
}

fn version(rest: &str) -> Option<String> {
    let digits: String = rest
        .chars()
        .take_while(|c| c.is_ascii_digit() || *c == '.' || *c == '_')
        .map(|c| if c == '_' { '.' } else { c })
        .collect();

    digits
        .starts_with(|c: char| c.is_ascii_digit())
        .then_some(digits)
}

fn apple(ua: &str) -> Option<String> {
    let (device, os) = if ua.contains("iPhone") {
        ("iPhone", "iOS")
    } else if ua.contains("iPad") {
        ("iPad", "iPadOS")
    } else if ua.contains("iPod") {
        ("iPod touch", "iOS")
    } else {
        return None;
    };

    let after = ua
        .split_once("iPhone OS ")
        .or_else(|| ua.split_once("CPU OS "))
        .or_else(|| ua.split_once("OS "));

    Some(match after.and_then(|(_, rest)| version(rest)) {
        Some(release) => format!("{device} · {os} {release}"),
        None => device.to_owned(),
    })
}

fn android(ua: &str) -> Option<String> {
    let (_, rest) = ua.split_once("Android ")?;
    let release = version(rest)?;

    let model = rest[release.len()..]
        .strip_prefix("; ")
        .map(|tail| {
            let end = ["Build/", "; wv", ")", ";"]
                .iter()
                .filter_map(|mark| tail.find(mark))
                .min()
                .unwrap_or(tail.len());
            tail[..end].trim()
        })
        .filter(|model| {
            !model.is_empty() && *model != "K" && !model.contains('/') && model.len() <= 32
        });

    Some(match model {
        Some(model) => format!("{model} · Android {release}"),
        None => format!("Android {release}"),
    })
}

fn desktop(ua: &str) -> Option<String> {
    let platform = [
        ("Macintosh", "macOS"),
        ("Windows NT", "Windows"),
        ("CrOS", "ChromeOS"),
        ("X11", "Linux"),
        ("Linux", "Linux"),
    ]
    .into_iter()
    .find_map(|(needle, name)| ua.contains(needle).then_some(name));

    let browser = [
        ("Edg/", "Edge"),
        ("OPR/", "Opera"),
        ("Chrome/", "Chrome"),
        ("Firefox/", "Firefox"),
        ("Safari/", "Safari"),
    ]
    .into_iter()
    .find_map(|(needle, name)| ua.contains(needle).then_some(name));

    match (browser, platform) {
        (Some(browser), Some(platform)) => Some(format!("{browser} · {platform}")),
        (Some(one), None) | (None, Some(one)) => Some(one.to_owned()),
        (None, None) => None,
    }
}
