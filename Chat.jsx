import React, { useEffect, useState, useRef } from 'react';

import { Message } from './message.js';

import "./app.css";

const Chat = () => {
    const [messages, setMessages] = useState([]);

    const inputRef = useRef(null);
    let peerId, signingKeys, clusterId, sharedKey, socket, cats;
    const initSocket = () => {
        if (window.socket && window.socket.network && window.socket.network.Encryption) {
            const message = 'Hello, encrypted world!';
            const encryptedMessage = window.socket.network.Encryption.encrypt(message, 'your-secret-key');
            console.log('Encrypted:', encryptedMessage);
            // ... your socket logic ...
        } else {
            console.error('Encryption is not available.');
        }
    };
    useEffect(() => {
        const initSocket = async () => {
            peerId = await Encryption.createId();
            signingKeys = await Encryption.createKeyPair();
            clusterId = await Encryption.createClusterId('TEST');
            sharedKey = await Encryption.createSharedKey('TEST');

            socket = await network({ peerId, clusterId, signingKeys });
            cats = await socket.subcluster({ sharedKey });

            cats.on('message', (message) => {
                console.log('Got message');
                const buffer = Buffer.from(message);
                const jsonString = buffer.toString('utf8');
                const value = JSON.parse(jsonString);
                const msg = JSON.parse(value.message);

                if (msg.author === peerId) {
                    console.log("Detected message in cluster, but it's from me. Skipping...");
                    return;
                }
                addMessageToChat(msg.author.substring(0, 5) + ': ' + msg.content);
            });

            cats.on('#join', (peer) => {
                console.log('New peer joined!', peer);
                addMessageToChat(`${peer.address}:${peer.port} joined the chat!`);
            });
        };

        initSocket();
    }, []);

    const addMessageToChat = (message) => {
        setMessages((prevMessages) => [...prevMessages, message]);
    };

    const sendMessage = () => {
        const message = inputRef.current.value.trim();
        if (!message) return;

        addMessageToChat('You: ' + message);
        inputRef.current.value = '';

        const messageObj = new Message(message, peerId, socket.address, socket.port);
        cats.emit('message', { message: JSON.stringify(messageObj) });
    };

    return (
        <div>
            <div id="chatBox" style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid black', padding: '10px' }}>
                {messages.map((msg, index) => (
                    <div key={index}>{msg}</div>
                ))}
            </div>
            <input type="text" id="messageInput" ref={inputRef} placeholder="Type a message..." />
            <button onClick={sendMessage}>Send</button>
        </div>
    );
};

export default Chat;
