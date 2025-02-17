import React, {useState, useEffect} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {listen} from '@tauri-apps/api/event';
import {Button, Input, Space, List} from 'antd';

const {TextArea} = Input;

function Chat() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');

    const handleSend = async () => {
        if (!input.trim()) return;


        setMessages((prevMessages) => [
            ...prevMessages,
            {role: 'user', content: input}
        ]);


        setInput('');


        await postChatCompletion(input);
    };

    const postChatCompletion = async (prompt) => {

        await invoke('post_chat_completion', {
            prompt,
            role: 'user',
            conversation_title: 'current_conversation',
        });
    };


    useEffect(() => {
        const listener = listen('response', (event) => {
            const content = event.payload;


            setMessages((prevMessages) => {
                const lastMessage = prevMessages[prevMessages.length - 1];

                if (lastMessage && lastMessage.role === 'ai') {

                    return [
                        ...prevMessages.slice(0, -1),
                        {...lastMessage, content: lastMessage.content + content}
                    ];
                }


                return [
                    ...prevMessages,
                    {role: 'ai', content}
                ];
            });
        });


        return () => {
            listener.then((unsubscribe) => unsubscribe());
        };
    }, []);

    return (
        <div>
            <div style={{marginBottom: 20}}>
                <List
                    bordered
                    dataSource={messages}
                    renderItem={(item) => (
                        <List.Item>
                            <div style={{textAlign: item.role === 'user' ? 'right' : 'left'}}>
                                <strong>{item.role === 'user' ? 'You' : 'AI'}:</strong>
                                <p>{item.content}</p>
                            </div>
                        </List.Item>
                    )}
                />
            </div>

            <Space style={{width: '100%'}} direction="vertical">
                <TextArea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    rows={3}
                    placeholder="Type your message..."
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <Button type="primary" onClick={handleSend}>Send</Button>
            </Space>
        </div>
    );
}

export default Chat;
