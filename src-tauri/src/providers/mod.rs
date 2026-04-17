pub mod anthropic;
pub mod gemini;
pub mod openai;

use crate::models::Role;

pub(crate) fn role_str(role: &Role) -> &'static str {
    match role {
        Role::User => "user",
        Role::Assistant => "assistant",
        Role::System => "system",
    }
}
