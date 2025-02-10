use crate::model::Message;
use serde_json;
use serde_json::to_writer_pretty;
use std::error::Error;
use std::fs;
use std::fs::{File, OpenOptions};
use std::io::{BufReader, Seek, SeekFrom};
use std::path::Path;
use tauri::ipc::InvokeError;

pub async fn create_conversation(
    conversation_title: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let sanitized_title = sanitize_filename(&conversation_title);
    let file_path = format!(
        "C:\\Users\\logan\\bolt5\\conversations\\{}.json",
        sanitized_title
    );

    let path = Path::new("C:\\Users\\logan\\bolt5\\conversations");
    if !path.exists() {
        std::fs::create_dir_all(path)?;
    }

    if !Path::new(&file_path).exists() {
        let file = File::create(file_path)?;
        to_writer_pretty(file, &Vec::<Message>::new())?;
    }

    Ok(())
}

pub fn append_conversation(
    conversation: Message,
    conversation_title: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let sanitized_title = sanitize_filename(&conversation_title);
    let file_path = format!(
        "C:\\Users\\logan\\bolt5\\conversations\\{}.json",
        sanitized_title
    );

    let mut file = OpenOptions::new()
        .create(true)
        .read(true)
        .write(true)
        .open(file_path)?;

    let mut conversations: Vec<Message> = if file.metadata()?.len() > 0 {
        let reader = BufReader::new(&file);
        serde_json::from_reader(reader).unwrap_or_default()
    } else {
        Vec::new()
    };

    conversations.push(conversation);

    file.set_len(0)?;
    file.seek(SeekFrom::Start(0))?;
    to_writer_pretty(&file, &conversations)?;

    Ok(())
}

pub fn get_history(conversation_title: &str) -> Result<String, Box<dyn std::error::Error>> {
    let sanitized_title = sanitize_filename(&conversation_title);
    let file_path = format!(
        "C:\\Users\\logan\\bolt5\\conversations\\{}.json",
        sanitized_title
    );

    let mut conversations: Vec<Message> = Vec::new();

    if let Ok(file) = File::open(file_path) {
        let reader = BufReader::new(file);
        conversations = serde_json::from_reader(reader).unwrap_or_default();
    }

    let mut conversation_history =
        String::from("Use this conversation history to add context to your response. If there is no history, just respond to the prompt: ");
    for message in &conversations {
        conversation_history.push_str(&format!("\n{}: {}", message.role, message.content));
    }

    Ok(conversation_history)
}

#[tauri::command]
pub async fn get_conversations() -> Result<Vec<String>, InvokeError> {
    let path = "C:\\Users\\logan\\bolt5\\conversations";
    let mut conversations = Vec::new();

    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries {
            if let Ok(entry) = entry {
                let file_name = entry.file_name().to_string_lossy().into_owned();
                if file_name.ends_with(".json") {
                    conversations.push(file_name);
                }
            }
        }
    }

    Ok(conversations)
}
fn sanitize_filename(filename: &str) -> String {
    filename.replace(|c: char| !c.is_alphanumeric() && c != '-', "_")
}
