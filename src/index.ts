import { Client, startClient, User } from './handler.js'
import { pid } from './utils.js';

const SKIP_LOGIN = true;
if(SKIP_LOGIN){
  const displayName = String(Math.floor(Math.random() * 1000));
  const clusterId = "999";

  let client: Client;

  try {
    console.log("Starting client...");
    client = await startClient(displayName, clusterId);
    console.log("Client started successfully");
  } catch (error) {
    console.error("Error starting client:", error);
  }

  (window as any).sendMessage = () => sendMessage(client);
  (window as any).sendMessageEnter = () => sendMessageEnter(client);
  

  (window as any).toggleDirectMessageSelect = () => toggleDirectMessageSelect(client);
  (window as any).handleLogout = () => handleLogout(client);
  (window as any).utilityButton = async () => await utilityButton(client);
  console.log("Client initialized");
  
  (document.getElementById('nameLabel') as HTMLElement).innerHTML = `Logged in as ${displayName}: ${pid(client!.peer.peerId)}`;
  (document.getElementById('loginPage') as HTMLElement).style.display = 'none';
  (document.getElementById('chatBox') as HTMLElement).style.display = 'flex';
}else{

  document.getElementById('loginForm')?.addEventListener('submit', async (event) => {
    console.log("Login form submitted");
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
    (window as any).sendMessageEnter = () => sendMessageEnter(client);
    
  
    (window as any).toggleDirectMessageSelect = () => toggleDirectMessageSelect(client);
    (window as any).handleLogout = () => handleLogout(client);
    // (window as any).utilityButton = () => utilityButton(client);
    console.log("Client initialized");
    
    (document.getElementById('nameLabel') as HTMLElement).innerHTML = `Logged in as ${displayName}: ${pid(client.peer.peerId)}`;
    (document.getElementById('loginPage') as HTMLElement).style.display = 'none';
    (document.getElementById('chatBox') as HTMLElement).style.display = 'flex';
  
  });
}

function getDirectMessageUser(client: Client): User | null{
  const selectElement = document.getElementById('directMessageSelect') as HTMLSelectElement ;
  if(!selectElement){
    console.error("Select element not found");
    return null;
  }	
  const selectedOption = selectElement.options[selectElement.selectedIndex];
  let recipient = null;
  for(const remotePeer of client.getPeers()){
    const resolvedUser: User | null = client.getUserById(remotePeer.peerId);
    if(!resolvedUser){
      console.error("Couldn't find user with id: " + remotePeer.peerId);
      continue;
    }
    if(resolvedUser.displayName === selectedOption.textContent){
      recipient = resolvedUser
    }
  }
  if(!recipient){
    return null;
  }
  return recipient;
}

async function utilityButton(client: Client){
  await client.utility();
  // TODO: REMOVE THIS
  // (document.getElementById('chatBox') as HTMLElement).style.display = 'none';
  // (document.getElementById('loginPage') as HTMLElement).style.display = 'grid';
}
function handleLogout(client: Client){
  client.handleShutdown();
  // TODO: REMOVE THIS
  // (document.getElementById('chatBox') as HTMLElement).style.display = 'none';
  // (document.getElementById('loginPage') as HTMLElement).style.display = 'grid';
}

function sendMessage(client: Client) {
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
  inputElement.value = "";  // Clear the input field
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
  const users = client.users;
  const peerNames = users.map((u: User) => u.displayName);
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
 
function sendMessageEnter( client: Client) { 
  const inputElement = document.getElementById("messageInput") as HTMLInputElement;
  inputElement.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent the default action (e.g., form submission)
      console.log("Enter key pressed!");
      // Call your sendMessage function here
      sendMessage(client);
    }
  });
   
 }