// Must import from *.js... for some reason...
import { Message } from './types.js';
import { Client, startClient } from './handler.js';
import { EventEmitter } from 'socket:events';
(async () => {
    const client = await startClient();
    window.sendMessage = () => sendMessage(client.peerId, client.socket, client.subcluster, client);
    window.toggleDirectMessageSelect = () => toggleDirectMessageSelect(client);
    console.log("Client initialized");
})();
function sendMessage(peerId, socket, subcluster, client) {
    console.log("Triggered sendMessage");
    const peers = client.getPeers();
    const inputElement = document.getElementById("messageInput");
    let inputValue = "";
    if (inputElement) {
        inputValue = inputElement.value.trim();
        console.log("Input value:", inputValue);
    }
    else {
        console.error("Input element not found");
    }
    console.log("Message: " + inputValue);
    let recipientKey = "broadcast";
    const element = document.getElementById('messageType');
    if (!element) {
        console.error("Element not found");
        return;
    }
    // const isDirectMessage = element.value === "Direct Message";
    // if(isDirectMessage){
    //   console.log("Currently online users:")
    //   console.log(peers)
    //   const element = document.getElementById('directMessageSelect');
    //   if(!element){
    //     console.error("Element not found");
    //     return;
    //   }	
    //   recipientKey = element.innerText;
    //   let recipient = null
    //   for(const p of peers){
    //     if(p.address === recipientKey){
    //       recipient = p
    //     }
    //     }
    //   console.log("Found recipient in logged in users. Sending direct message")
    //   addMessageToChat("You: " + inputValue);
    //   recipient.send(inputValue, recipient.port, recipient.address);
    //   return;
    // }
    if (inputValue) {
        addMessageToChat("You: " + inputValue);
        client.sendMessage(inputValue);
        inputElement.innerText = ""; // Clear the input field
        console.log("Sent message");
    }
}
export function addMessageToChat(message) {
    console.log("Adding message to chat: " + message);
    const chatBox = document.getElementById("chatBox");
    const newMessage = document.createElement("div");
    newMessage.textContent = message;
    if (!chatBox) {
        console.error("ChatBox element not found");
        return;
    }
    chatBox.appendChild(newMessage);
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to bottom
}
function toggleDirectMessageSelect(client) {
    console.log("Toggling direct message select");
    const peers = client.getPeers();
    const element = document.getElementById('messageType');
    if (!element) {
        console.error("Element not found");
        return;
    }
    const messageType = element.innerText;
    const directMessageSelect = document.getElementById('directMessageSelect');
    const directMessageSelectWrapper = document.getElementById('directMessageSelectWrapper');
    if (!directMessageSelect || !directMessageSelectWrapper) {
        console.error("Element not found");
        return;
    }
    if (messageType === 'Direct Message') {
        console.log("Direct message selected");
        directMessageSelect.style.display = 'inline-block';
        directMessageSelectWrapper.style.display = 'inline-block';
        populateDirectMessageSelect(client);
    }
    else {
        directMessageSelect.style.display = 'none';
        directMessageSelectWrapper.style.display = 'none';
    }
}
function getDirectMessageOptions(client) {
    const peers = client.getPeers();
    return peers.map((p) => p.peerId);
}
function populateDirectMessageSelect(client) {
    console.log("Populating direct message select");
    const directMessageSelect = document.getElementById('directMessageSelect');
    const options = getDirectMessageOptions(client);
    if (!directMessageSelect) {
        console.error("Element not found");
        return;
    }
    // Clear existing options
    directMessageSelect.innerText = '';
    // Populate with new options
    options.forEach((option) => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        directMessageSelect.appendChild(opt);
    });
}
