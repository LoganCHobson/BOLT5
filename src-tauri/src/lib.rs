mod json;
mod model;

use crate::json::{append_conversation, create_conversation, get_conversations};
use crate::model::{ChatRequest, Config, Message};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs::OpenOptions;
use tauri::{Emitter, Manager};

#[tauri::command]
async fn post_chat_completion(
    prompt: String,
    role: String,
    window: tauri::Window,
) -> Result<(), String> {
    let json = Message {
        role: "user".to_string(),
        content: prompt.clone(),
    };

    let client = Client::new();

    // let full_prompt = json::get_history(prompt.as_str()).unwrap();
    println!("Sending: {}", prompt);
    let body = ChatRequest {
        model: Config::default().model,
        messages: vec![Message {
            role: "user".to_string(),
            content: prompt,
        }],
        stream: true,
    };

    let mut response = client
        .post(Config::default().endpoint)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Error with request: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Failed to get a valid response from the API: {}",
            response.status()
        ));
    }

    let mut full_response: String = String::new();

    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|e| format!("Error reading chunk: {}", e))?
    {
        let chunk_str = String::from_utf8_lossy(&chunk);

        let parsed_chunk: Value =
            serde_json::from_str(&chunk_str).map_err(|e| format!("Error parsing JSON: {}", e))?;

        if let Some(content) = parsed_chunk["message"]["content"].as_str() {
            println!("Received chunk: {}", content);
            full_response.push_str(content);
            window
                .emit("response", content.to_string())
                .map_err(|e| format!("Error emitting chunk: {}", e))?;
        }

        if parsed_chunk["done"].as_bool().unwrap_or(false) {
            let json = Message {
                role: "ai".to_string(),
                content: full_response.clone(),
            };

            break;
        }
    }

    Ok(())
}

#[tauri::command]
async fn setup_new_conversation(
    prompt: String,
    role: String,
    window: tauri::Window,
) -> Result<String, String> {
    let client = Client::new();

    let prompt = format!(
        "Respond with only a conversation title for: {}. Keep it succinct",
        prompt
    );
    println!("Sending: {}", prompt);
    let body = ChatRequest {
        model: "llama3.2".to_string(),
        messages: vec![Message {
            role: "system".to_string(),
            content: prompt,
        }],
        stream: true,
    };

    let mut response = client
        .post(Config::default().endpoint)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Error with request: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Failed to get a valid response from the API: {}",
            response.status()
        ));
    }

    let mut full_response: String = String::new();

    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|e| format!("Error reading chunk: {}", e))?
    {
        let chunk_str = String::from_utf8_lossy(&chunk);

        let parsed_chunk: Value =
            serde_json::from_str(&chunk_str).map_err(|e| format!("Error parsing JSON: {}", e))?;

        if let Some(content) = parsed_chunk["message"]["content"].as_str() {
            println!("Received chunk: {}", content);
            full_response.push_str(content);
            window
                .emit("response", content.to_string())
                .map_err(|e| format!("Error emitting chunk: {}", e))?;
        }

        if parsed_chunk["done"].as_bool().unwrap_or(false) {
            return Ok(full_response);
        }
    }

    create_conversation(&*full_response).await;

    Err("Failed to generate conversation title".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            post_chat_completion,
            setup_new_conversation,
            get_conversations,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
