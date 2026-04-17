use futures_util::StreamExt;
use serde::Serialize;
use tauri::ipc::Channel;

use crate::commands::chat::ChatStreamEvent;
use crate::models::{Message, ModelConfig, Role};

const ANTHROPIC_VERSION: &str = "2023-06-01";
const DEFAULT_MAX_TOKENS: u32 = 4096;

#[derive(Serialize)]
struct AnthropicMessage<'a> {
    role: &'a str,
    content: &'a str,
}

#[derive(Serialize)]
struct AnthropicRequest<'a> {
    model: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    system: Option<String>,
    messages: Vec<AnthropicMessage<'a>>,
    max_tokens: u32,
    stream: bool,
}

pub async fn stream(
    messages: Vec<Message>,
    model_config: ModelConfig,
    on_event: Channel<ChatStreamEvent>,
) -> Result<(), String> {
    // Anthropic requires `system` at the top level, not as a message with role:"system".
    let mut system_parts: Vec<String> = Vec::new();
    let chat_messages: Vec<AnthropicMessage<'_>> = messages
        .iter()
        .filter_map(|m| match m.role {
            Role::System => {
                system_parts.push(m.content.clone());
                None
            }
            Role::User => Some(AnthropicMessage {
                role: "user",
                content: &m.content,
            }),
            Role::Assistant => Some(AnthropicMessage {
                role: "assistant",
                content: &m.content,
            }),
        })
        .collect();

    let system = if system_parts.is_empty() {
        None
    } else {
        Some(system_parts.join("\n\n"))
    };

    let request_body = AnthropicRequest {
        model: &model_config.model,
        system,
        messages: chat_messages,
        max_tokens: DEFAULT_MAX_TOKENS,
        stream: true,
    };

    let url = format!("{}/v1/messages", model_config.base_url.trim_end_matches('/'));

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .header("x-api-key", &model_config.api_key)
        .header("anthropic-version", ANTHROPIC_VERSION)
        .header("content-type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        let msg = format!("HTTP {}: {}", status, body);
        let _ = on_event.send(ChatStreamEvent::Error {
            message: msg.clone(),
        });
        return Err(msg);
    }

    let mut byte_stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk_result) = byte_stream.next().await {
        let bytes = chunk_result.map_err(|e| e.to_string())?;
        buffer.push_str(&String::from_utf8_lossy(&bytes));

        loop {
            let Some(newline_pos) = buffer.find('\n') else {
                break;
            };
            let line = buffer[..newline_pos].trim_end_matches('\r').to_string();
            buffer.drain(..=newline_pos);

            if line.is_empty() || line.starts_with(':') || line.starts_with("event:") {
                continue;
            }

            // SSE tolerates both `data: {json}` and `data:{json}` — the Mify
            // gateway omits the space, so trim it ourselves.
            let Some(data) = line.strip_prefix("data:").map(str::trim_start) else {
                continue;
            };

            let Ok(json) = serde_json::from_str::<serde_json::Value>(data) else {
                continue;
            };

            match json["type"].as_str() {
                Some("content_block_delta") => {
                    if let Some(text) = json["delta"]["text"].as_str() {
                        if !text.is_empty() {
                            let _ = on_event.send(ChatStreamEvent::Chunk {
                                content: text.to_string(),
                            });
                        }
                    }
                }
                Some("message_stop") => {
                    let _ = on_event.send(ChatStreamEvent::Done);
                    return Ok(());
                }
                Some("error") => {
                    let msg = json["error"]["message"]
                        .as_str()
                        .unwrap_or("Anthropic stream error")
                        .to_string();
                    let _ = on_event.send(ChatStreamEvent::Error {
                        message: msg.clone(),
                    });
                    return Err(msg);
                }
                _ => {}
            }
        }
    }

    let _ = on_event.send(ChatStreamEvent::Done);
    Ok(())
}
