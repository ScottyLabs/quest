use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use serde::Serialize;
use utoipa::ToSchema;

use crate::auth::AuthError;
use crate::auth::extract::SignedIn;
use crate::auth::session::SessionUser;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, ToSchema)]
#[serde(rename_all = "kebab-case")]
pub enum Role {
    Admins,
    OrientationStaff,
    TradeAdmin,
    ChallengePlacer,
    Member,
}

pub const ROLES: [Role; 5] = [
    Role::Admins,
    Role::OrientationStaff,
    Role::TradeAdmin,
    Role::ChallengePlacer,
    Role::Member,
];

impl Role {
    const fn bit(self) -> u8 {
        1 << self as u8
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum Capability {
    Portal,
    SqlConsole,
    DataConsole,
    CardDesk,
    TradeDesk,
    Assets,
}

pub const CAPABILITIES: [Capability; 6] = [
    Capability::Portal,
    Capability::SqlConsole,
    Capability::DataConsole,
    Capability::CardDesk,
    Capability::TradeDesk,
    Capability::Assets,
];

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum Level {
    None,
    Read,
    Edit,
    Full,
}

enum Tables {
    Every(Level),
    Only(&'static [(&'static str, Level)]),
}

impl Tables {
    fn level(&self, table: &str) -> Level {
        match self {
            Self::Every(level) => *level,
            Self::Only(list) => list
                .iter()
                .find(|(name, _)| *name == table)
                .map_or(Level::None, |(_, level)| *level),
        }
    }
}

struct Grant {
    role: Role,
    group: &'static str,
    capabilities: &'static [Capability],
    tables: Tables,
}

static GRANTS: &[Grant] = &[
    Grant {
        role: Role::Admins,
        group: "/projects/quest/admins",
        capabilities: &[
            Capability::Portal,
            Capability::SqlConsole,
            Capability::DataConsole,
            Capability::CardDesk,
            Capability::TradeDesk,
            Capability::Assets,
        ],
        tables: Tables::Every(Level::Full),
    },
    Grant {
        role: Role::Member,
        group: "/projects/quest",
        capabilities: &[Capability::Portal, Capability::SqlConsole, Capability::DataConsole],
        tables: Tables::Every(Level::Full),
    },
    Grant {
        role: Role::OrientationStaff,
        group: "/projects/quest/orientation-staff",
        capabilities: &[
            Capability::Portal,
            Capability::DataConsole,
            Capability::CardDesk,
            Capability::Assets,
        ],
        tables: Tables::Only(&[
            ("asset", Level::Read),
            ("users", Level::Edit),
            ("challenge", Level::Full),
            ("challenge_card", Level::Full),
            ("daily_challenge", Level::Edit),
            ("devices", Level::Read),
            ("tap_events", Level::Read),
            ("failed_taps", Level::Read),
            ("items", Level::Read),
            ("item_option", Level::Read),
            ("purchases", Level::Read),
            ("purchase_option", Level::Read),
            ("wallet_pass", Level::Read),
        ]),
    },
    Grant {
        role: Role::TradeAdmin,
        group: "/projects/quest/trade-admin",
        capabilities: &[
            Capability::Portal,
            Capability::DataConsole,
            Capability::TradeDesk,
            Capability::Assets,
        ],
        tables: Tables::Only(&[
            ("asset", Level::Read),
            ("items", Level::Full),
            ("item_option", Level::Full),
            ("purchases", Level::Full),
            ("purchase_option", Level::Full),
            ("users", Level::Read),
        ]),
    },
    Grant {
        role: Role::ChallengePlacer,
        group: "/projects/quest/challenge-placer",
        capabilities: &[
            Capability::Portal,
            Capability::DataConsole,
            Capability::CardDesk,
        ],
        tables: Tables::Only(&[("challenge_card", Level::Full), ("challenge", Level::Read)]),
    },
];

pub const HIDDEN_TABLES: &[&str] = &["seaql_migrations", "spatial_ref_sys"];

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct RoleSet(u8);

impl RoleSet {
    pub const fn contains(self, role: Role) -> bool {
        self.0 & role.bit() != 0
    }

    const fn insert(&mut self, role: Role) {
        self.0 |= role.bit();
    }

    pub fn iter(self) -> impl Iterator<Item = Role> {
        ROLES.into_iter().filter(move |role| self.contains(*role))
    }

    fn grants(self) -> impl Iterator<Item = &'static Grant> {
        GRANTS.iter().filter(move |grant| self.contains(grant.role))
    }

    pub fn can(self, capability: Capability) -> bool {
        self.grants()
            .any(|grant| grant.capabilities.contains(&capability))
    }

    pub fn level(self, table: &str) -> Level {
        if HIDDEN_TABLES.contains(&table) {
            return Level::None;
        }

        self.grants()
            .map(|grant| grant.tables.level(table))
            .max()
            .unwrap_or(Level::None)
    }
}

pub fn roles(groups: &[String]) -> RoleSet {
    let mut set = RoleSet::default();

    for grant in GRANTS {
        if groups.iter().any(|group| group == grant.group) {
            set.insert(grant.role);
        }
    }

    set
}

pub fn roles_of(user: &SessionUser) -> RoleSet {
    let mut set = roles(&user.groups);

    if user.admin {
        set.insert(Role::Admins);
    }

    set
}

pub fn allows(user: &SessionUser, capability: Capability) -> bool {
    roles_of(user).can(capability)
}

#[derive(Clone, Debug)]
pub struct Access {
    pub user: SessionUser,
    pub roles: RoleSet,
}

impl Access {
    pub fn can(&self, capability: Capability) -> bool {
        self.roles.can(capability)
    }

    pub fn require(&self, capability: Capability) -> Result<(), AuthError> {
        if self.can(capability) {
            return Ok(());
        }

        Err(AuthError::Forbidden(match capability {
            Capability::Portal => "portal_forbidden",
            Capability::SqlConsole => "sql_console_forbidden",
            Capability::DataConsole => "data_console_forbidden",
            Capability::CardDesk => "card_desk_forbidden",
            Capability::TradeDesk => "trade_desk_forbidden",
            Capability::Assets => "assets_forbidden",
        }))
    }

    pub fn level(&self, table: &str) -> Level {
        self.roles.level(table)
    }

    pub fn require_table(&self, table: &str, needed: Level) -> Result<Level, AuthError> {
        let held = self.level(table);

        if held >= needed && held > Level::None {
            return Ok(held);
        }

        Err(AuthError::Forbidden("table_forbidden"))
    }
}

impl<S> FromRequestParts<S> for Access
where
    S: Send + Sync,
{
    type Rejection = AuthError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let SignedIn(user) = SignedIn::from_request_parts(parts, state).await?;
        let access = Self {
            roles: roles_of(&user),
            user,
        };

        access.require(Capability::Portal)?;
        Ok(access)
    }
}
