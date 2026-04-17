mod commands;
mod db;
mod models;
mod providers;
mod state;

use commands::{
    chat, conversations, global_settings as global_settings_cmds, messages, models as model_cmds,
};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            let db_path = handle
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir")
                .join("agora.db");

            let pool = tauri::async_runtime::block_on(db::init(&db_path))
                .expect("failed to initialise SQLite database");

            app.manage(pool);
            app.manage(state::AppState::default());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            conversations::load_conversations,
            conversations::create_conversation,
            conversations::delete_conversation,
            conversations::rename_conversation,
            messages::load_messages,
            messages::save_message,
            model_cmds::load_model_configs,
            model_cmds::save_model_configs,
            global_settings_cmds::load_global_settings,
            global_settings_cmds::save_global_settings,
            chat::stream_chat,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
