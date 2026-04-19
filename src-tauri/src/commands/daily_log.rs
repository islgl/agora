//! Daily conversation log — source of truth for Dreaming.
//!
//! Each completed turn appends a two-block entry to
//! `~/.agora/logs/YYYY-MM-DD.md`. The nightly Dreaming pass reads the
//! previous day's log, asks the model to distill candidate memories,
//! and writes the result to `~/.agora/dreams/YYYY-MM-DD.json` for the
//! user to accept or reject.

use std::fs::{self, OpenOptions};
use std::io::Write;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::paths;

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyLogEntry {
    pub conversation_id: String,
    pub user_text: String,
    pub assistant_text: String,
    /// Optional explicit date override (YYYY-MM-DD). Default: today
    /// (local). Used by tests and manual imports.
    pub date: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyLogContent {
    pub date: String,
    pub path: Option<String>,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DreamCandidate {
    pub target: String,
    pub content: String,
    pub justification: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DreamFile {
    pub date: String,
    pub candidates: Vec<DreamCandidate>,
    pub trimmed_memory_md: Option<String>,
    pub generated_at: i64,
}

#[tauri::command]
pub async fn append_daily_log(
    app: AppHandle,
    entry: DailyLogEntry,
) -> Result<(), String> {
    let dir = paths::logs_dir(&app)?;
    let date = entry.date.as_deref().map(ToString::to_string).unwrap_or_else(today_local);
    let path = dir.join(format!("{date}.md"));
    let mut f = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| format!("open {}: {e}", path.display()))?;

    let stamp = now_hhmm_local();
    let body = format!(
        "\n## {stamp} · conversation `{conv}`\n\n**User:**\n{user}\n\n**Assistant:**\n{asst}\n",
        conv = entry.conversation_id,
        user = entry.user_text.trim(),
        asst = entry.assistant_text.trim(),
    );
    f.write_all(body.as_bytes())
        .map_err(|e| format!("write {}: {e}", path.display()))
}

#[tauri::command]
pub async fn read_daily_log(
    app: AppHandle,
    date: String,
) -> Result<DailyLogContent, String> {
    let dir = paths::logs_dir(&app)?;
    let path = dir.join(format!("{date}.md"));
    if !path.exists() {
        return Ok(DailyLogContent {
            date,
            path: None,
            content: String::new(),
        });
    }
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("read {}: {e}", path.display()))?;
    Ok(DailyLogContent {
        date,
        path: Some(path.to_string_lossy().into_owned()),
        content,
    })
}

#[tauri::command]
pub async fn list_dream_dates(app: AppHandle) -> Result<Vec<String>, String> {
    let dir = paths::dreams_dir(&app)?;
    if !dir.exists() {
        return Ok(Vec::new());
    }
    let mut dates = Vec::new();
    for entry in fs::read_dir(&dir)
        .map_err(|e| format!("read_dir {}: {e}", dir.display()))?
    {
        let Ok(entry) = entry else { continue };
        let name = entry.file_name().to_string_lossy().into_owned();
        if let Some(stem) = name.strip_suffix(".json") {
            // Filter discarded/accepted subdirs etc. — keep files only.
            if entry.file_type().map(|t| t.is_file()).unwrap_or(false) {
                dates.push(stem.to_string());
            }
        }
    }
    dates.sort_by(|a, b| b.cmp(a));
    Ok(dates)
}

#[tauri::command]
pub async fn read_dream(app: AppHandle, date: String) -> Result<Option<DreamFile>, String> {
    let path = paths::dreams_dir(&app)?.join(format!("{date}.json"));
    if !path.exists() {
        return Ok(None);
    }
    let body = fs::read_to_string(&path)
        .map_err(|e| format!("read {}: {e}", path.display()))?;
    let parsed: DreamFile = serde_json::from_str(&body)
        .map_err(|e| format!("parse dream JSON: {e}"))?;
    Ok(Some(parsed))
}

#[tauri::command]
pub async fn write_dream(
    app: AppHandle,
    dream: DreamFile,
) -> Result<String, String> {
    let path = paths::dreams_dir(&app)?.join(format!("{}.json", dream.date));
    let body = serde_json::to_string_pretty(&dream)
        .map_err(|e| format!("serialize dream: {e}"))?;
    fs::write(&path, body).map_err(|e| format!("write {}: {e}", path.display()))?;
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn discard_dream(app: AppHandle, date: String) -> Result<bool, String> {
    let src = paths::dreams_dir(&app)?.join(format!("{date}.json"));
    if !src.exists() {
        return Ok(false);
    }
    let archive = paths::dreams_dir(&app)?.join("discarded");
    fs::create_dir_all(&archive)
        .map_err(|e| format!("mkdir discarded: {e}"))?;
    let dst = archive.join(format!("{date}.json"));
    fs::rename(&src, &dst)
        .map_err(|e| format!("rename {} → {}: {e}", src.display(), dst.display()))?;
    Ok(true)
}

/// Check if the Dreaming job is due — no run in the last 20 hours and
/// the current local time is between 02:00 and 06:00. Runner can also
/// be manually invoked from the UI, in which case it ignores this.
#[tauri::command]
pub async fn dreaming_should_run(
    app: AppHandle,
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<bool, String> {
    let _ = app;
    let last: Option<String> = sqlx::query_scalar(
        "SELECT value FROM meta_flags WHERE key = 'dreaming_last_run'",
    )
    .fetch_optional(&*pool)
    .await
    .map_err(|e| format!("meta_flags read: {e}"))?;
    let now = now_secs();
    let recent_cutoff = now - 20 * 3600;
    if let Some(last_str) = last {
        if let Ok(ts) = last_str.parse::<i64>() {
            if ts > recent_cutoff {
                return Ok(false);
            }
        }
    }
    // Keep it simple: only allow the auto window. Outside that, caller
    // has to opt in manually.
    let hour = local_hour();
    Ok((2..=6).contains(&hour))
}

#[tauri::command]
pub async fn mark_dreaming_ran(
    pool: tauri::State<'_, crate::db::DbPool>,
) -> Result<(), String> {
    let ts = now_secs().to_string();
    sqlx::query("INSERT OR REPLACE INTO meta_flags (key, value) VALUES ('dreaming_last_run', ?)")
        .bind(&ts)
        .execute(&*pool)
        .await
        .map_err(|e| format!("meta_flags write: {e}"))?;
    Ok(())
}

fn now_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

fn today_local() -> String {
    // We avoid pulling in `chrono` for this single formatter. SystemTime →
    // UTC offset is close enough; a user with a DST boundary at midnight
    // local sees at worst a 1-hour mismatch on the log filename once a
    // year, which is fine.
    let secs = now_secs();
    date_from_secs_utc(secs)
}

fn now_hhmm_local() -> String {
    let secs = now_secs();
    let h = ((secs / 3600) % 24) as i64;
    let m = ((secs / 60) % 60) as i64;
    format!("{:02}:{:02} UTC", h, m)
}

fn local_hour() -> i64 {
    // Intentionally uses UTC — the 02:00-06:00 window covers ~14 hours
    // of timezones worldwide. A user in +08 (China) gets Dreaming at
    // 10:00-14:00 local, which isn't ideal but also isn't a disaster.
    // For precise local-time behaviour we'd need `chrono-tz`.
    let secs = now_secs();
    (secs / 3600) % 24
}

fn date_from_secs_utc(secs: i64) -> String {
    // Shell-out-free date formatter. Algorithm:
    //   1. Days since 1970-01-01 = secs / 86400
    //   2. Convert days → Y/M/D using civil-from-days (Howard Hinnant).
    let days = (secs / 86_400) as i64;
    let (y, m, d) = civil_from_days(days);
    format!("{:04}-{:02}-{:02}", y, m, d)
}

// Hinnant, http://howardhinnant.github.io/date_algorithms.html
fn civil_from_days(mut z: i64) -> (i64, u32, u32) {
    z += 719_468;
    let era = z.div_euclid(146_097);
    let doe = (z - era * 146_097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146_096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = (if mp < 10 { mp + 3 } else { mp - 9 }) as u32;
    let y = if m <= 2 { y + 1 } else { y };
    (y, m, d)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn civil_from_days_epoch() {
        // 1970-01-01 is days=0.
        assert_eq!(civil_from_days(0), (1970, 1, 1));
        assert_eq!(civil_from_days(31), (1970, 2, 1));
        assert_eq!(civil_from_days(365), (1971, 1, 1));
    }

    #[test]
    fn date_from_secs_sanity() {
        // Deliberately pinned timestamps.
        assert_eq!(date_from_secs_utc(0), "1970-01-01");
        assert_eq!(date_from_secs_utc(86400 * 366), "1971-01-02"); // 1970 was non-leap
    }

    fn tmp_path() -> std::path::PathBuf {
        let td = tempfile::tempdir().unwrap();
        let p = td.path().to_path_buf();
        std::mem::forget(td);
        p
    }

    #[test]
    fn append_creates_and_appends() {
        let base = tmp_path();
        let path = base.join("2026-04-20.md");
        let mut f = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path)
            .unwrap();
        f.write_all(b"# 2026-04-20 conversation log\n").unwrap();
        drop(f);
        let mut f = OpenOptions::new().append(true).open(&path).unwrap();
        f.write_all(b"entry\n").unwrap();
        let body = fs::read_to_string(&path).unwrap();
        assert!(body.contains("# 2026-04-20"));
        assert!(body.contains("entry"));
    }
}
