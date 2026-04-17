use std::sync::Mutex;

#[derive(Debug, Default)]
pub struct AppStateInner {
    #[allow(dead_code)]
    pub is_streaming: bool,
}

pub type AppState = Mutex<AppStateInner>;
