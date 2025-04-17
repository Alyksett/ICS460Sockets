import { Client, startClient, User } from './handler.js'

document.getElementById('loginForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const displayName = (document.getElementById('displayName') as HTMLInputElement).value;
  const clusterId = (document.getElementById('clusterId') as HTMLInputElement).value;
  const messageType = (document.getElementById('sendMessageType') as HTMLInputElement);
  console.log(messageType);

  let client: Client;

  try {
    console.log("Starting client...");
    client = await startClient(displayName, clusterId);
    console.log("Client started successfully");
  } catch (error) {
    console.error("Error starting client:", error);
    return;
  }

  (window as any).sendMessage = () => sendMessage(client);
  (window as any).toggleDirectMessageSelect = () => toggleDirectMessageSelect(client);
  (window as any).handleLogout = () => handleLogout(client);
  console.log("Client initialized");
  
  (document.getElementById('nameLabel') as HTMLElement).innerHTML = `Logged in as ${displayName}`;
  (document.getElementById('loginPage') as HTMLElement).style.display = 'none';
  (document.getElementById('chatBox') as HTMLElement).style.display = 'flex';
  const messageInput = document.getElementById('messageInput') as HTMLInputElement;
  messageInput?.addEventListener('input', () => {
    if (messageInput.value.trim() === '') {
      isTyping(client);
    } else {
      stoppedTyping(client);
    }
  });
});

function getDirectMessageUser(client: Client){
  const selectElement = document.getElementById('directMessageSelect') as HTMLSelectElement ;
  if(!selectElement){
    console.error("Select element not found");
    return null;
  }	
  const selectedOption = selectElement.options[selectElement.selectedIndex];
  let recipient = null;
  for(const u of client.getPeers()){
    if(u.displayName === selectedOption.textContent){
      recipient = u
    }
  }
  if(!recipient){
    return null;
  }
  return recipient;
}

function isTyping(client: Client){
  const isDirectMessage = (document.getElementById('sendMessageType') as HTMLSelectElement).value === "Direct Message";
  if(isDirectMessage){
    const recipient = getDirectMessageUser(client);
    if(recipient){
      // client.sendTypingDirect("is typing...", recipient);
    }
  }else{
    client.sendTyping("is typing...");1
  }
}

function stoppedTyping(client: Client){
  const isDirectMessage = (document.getElementById('sendMessageType') as HTMLSelectElement).value === "Direct Message";
  if(isDirectMessage){
    const recipient = getDirectMessageUser(client);
    if(recipient){
      client.stoppedTypingDirect("stopped typing...", recipient);
    }
  }else{
    client.stoppedTyping("stopped typing...");
  }
}

function handleLogout(client: Client){
  client.handleShutdown();
  (document.getElementById('chatBox') as HTMLElement).style.display = 'none';
  (document.getElementById('loginPage') as HTMLElement).style.display = 'grid';
}

function sendMessage(client: Client) {
  const users: User[] = client.getPeers();
  const inputElement = document.getElementById("messageInput") as HTMLInputElement;
  let inputValue = "";
  if (inputElement) {
    inputValue = inputElement.value.trim();
  } else {
    console.error("Input element not found");
  }
  const messageTypeElement = document.getElementById('sendMessageType') as HTMLSelectElement;
  if(!messageTypeElement){
    console.error("Message type element not found");
    return;
  }
  const currentMessageType = messageTypeElement.value
  
  
  // see other comment for reversal reason
  const isDirectMessage = currentMessageType === "Direct Message";
  console.log("isDirectMessage: " + isDirectMessage);
  if(isDirectMessage){
    const recipient = getDirectMessageUser(client);
    if(!recipient){
      console.error("No recipient found");
      return;
    }
    addMessageToChat(`You to ${recipient.displayName}: ` + inputValue, true);
    client.sendDirectMessage(inputValue, recipient);
    return;
  }
  
  if (inputValue) {
    addMessageToChat("You: " + inputValue);
    client.sendMessage(inputValue);
    inputElement.innerText = "";  // Clear the input field
    console.log("Sent message");
  }
}

export function addMessageToChat(message: string, directMessage: boolean = false) {
  console.log("Adding message to chat: " + message + " directMessage: " + directMessage);
  const chatBox = document.getElementById("messageBox");
  const newMessage = document.createElement("div");
  newMessage.textContent = message;
  if(directMessage){
    newMessage.style.fontStyle = "italic";
  }
  if(!chatBox){
    console.error("messageBox element not found");
    return;
  }
  chatBox.appendChild(newMessage);
  chatBox.scrollTop = chatBox.scrollHeight;  // Scroll to bottom
}

function toggleDirectMessageSelect(client: Client){
  console.log("Toggling direct message select");
  
  const peers = client.getPeers();

  const messageTypeElement = document.getElementById('sendMessageType') as HTMLSelectElement;
  if(!messageTypeElement){
    console.error("Message type element not found");
    return;
  }
  const currentMessageType = messageTypeElement.value
  console.log("Current message type: " + currentMessageType);
  const isDirectMessage = currentMessageType === "Direct Message";
  
  const directMessageSelect = document.getElementById('directMessageSelect');
  const directMessageSelectWrapper = document.getElementById('directMessageSelectWrapper');
  if(!directMessageSelect || !directMessageSelectWrapper){
      console.error("Element not found");
      return;
  }
  
  
  if (isDirectMessage) {
    console.log("Direct message selected");    
    directMessageSelect.style.display = 'inline-block';
    directMessageSelectWrapper.style.display = 'inline-block'
    populateDirectMessageSelect(client);
  } else {
    directMessageSelect.style.display = 'none';
    directMessageSelectWrapper.style.display = 'none';
  }
}

function getDirectMessageOptions(client: Client): string[]{
  const peers = client.getPeers();
  const peerNames = peers.map((p: User) => p.displayName);
  if(peerNames.length === 0){
    peerNames.push("No users online");
  }
  return peerNames
}

function populateDirectMessageSelect(client: Client){
  console.log("Populating direct message select");
  const directMessageSelect = document.getElementById('directMessageSelect');
  const options = getDirectMessageOptions(client);
  if(!directMessageSelect){
    console.error("Element not found");
    return;
  }
  // Clear existing options
  directMessageSelect.innerText = '';
  
  // Populate with new options
  options.forEach((option: any) => {
    const opt = document.createElement('option');
    opt.value = option;
    opt.textContent = option;
    directMessageSelect.appendChild(opt);
  });
}
