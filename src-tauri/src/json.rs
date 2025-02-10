use crate::model::Message;
use serde_json;
use std::fs::{File, OpenOptions};
use std::io::{BufReader, Seek, SeekFrom};

pub fn append_conversation(conversation: Message) -> Result<(), Box<dyn std::error::Error>> {
    let file_path = "C:\\Users\\logan\\bolt5\\conversations\\conversation.json";

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
    serde_json::to_writer_pretty(&file, &conversations)?;

    Ok(())
}

pub fn get_history(prompt: String) -> Result<String, Box<dyn std::error::Error>> {
    let file_path = "C:\\Users\\logan\\bolt5\\conversations\\conversation.json";
    let mut conversations: Vec<Message> = Vec::new();

    if let Ok(file) = File::open(file_path) {
        let reader = BufReader::new(file);
        conversations = serde_json::from_reader(reader).unwrap_or_default();
    }

    let mut conversation_history = String::from("Conversation history so far: ");
    for message in &conversations {
        conversation_history.push_str(&format!("\n{}: {}", message.role, message.content));
    }

    let full_prompt = format!("{}\nUser: {}", conversation_history, prompt);

    Ok(full_prompt)
}
