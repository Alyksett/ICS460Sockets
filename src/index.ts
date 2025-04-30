import { startClient } from './handler.js';
import { Client, User } from './types.js';

document.getElementById('loginForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  console.log("Login form submitted");

  const displayName = (document.getElementById('displayName') as HTMLInputElement).value;
  const clusterId = (document.getElementById('clusterId') as HTMLInputElement).value;

  document.getElementById('peerListContainer')!.style.display = 'block';

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

  const messageInput = document.getElementById("messageInput") as HTMLInputElement;
  messageInput.addEventListener("keyup", (event) => handleEnterKey(event, client));

  (document.getElementById('nameLabel') as HTMLElement).innerHTML = `Logged in as ${displayName}: ${(client.peer.peerId).substring(0, 8)}`;
  (document.getElementById('loginPage') as HTMLElement).style.display = 'none';
  (document.getElementById('chatBox') as HTMLElement).style.display = 'flex';

  refreshPeerList(client);
 });

function getDirectMessageUser(client: Client): User | null {
  const selectElement = document.getElementById('directMessageSelect') as HTMLSelectElement;
  if (!selectElement) return null;

  const selectedOption = selectElement.options[selectElement.selectedIndex];
  return client.getPeers().find(user => user.displayName === selectedOption.textContent) || null;
}

function handleLogout(client: Client) {
  client.handleShutdown();
  (document.getElementById('chatBox') as HTMLElement).style.display = 'none';
  (document.getElementById('loginPage') as HTMLElement).style.display = 'grid';
}

function sendMessage(client: Client) {
  const inputElement = document.getElementById("messageInput") as HTMLInputElement;
  const messageTypeElement = document.getElementById('sendMessageType') as HTMLSelectElement;

  if (!inputElement || !messageTypeElement) return;

  const inputValue = inputElement.value.trim();
  const isDirectMessage = messageTypeElement.value === "Direct Message";

  if (isDirectMessage) {
    const recipient = getDirectMessageUser(client);
    if (!recipient) return;

    addMessageToChat(`You to ${recipient.displayName}: ${inputValue}`, true);
    client.sendDirectMessage(inputValue, recipient);
  } else {
    if (inputValue) {
      addMessageToChat(`You: ${inputValue}`);
      client.sendMessage(inputValue);
    }
  }

  inputElement.value = "";
}

export function addMessageToChat(message: string, directMessage: boolean = false) {
  const chatBox = document.getElementById("messageBox");
  if (!chatBox) return;

  const newMessage = document.createElement("div");
  newMessage.textContent = message;
  if (directMessage) newMessage.style.fontStyle = "italic";

  chatBox.appendChild(newMessage);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function toggleDirectMessageSelect(client: Client) {
  const messageTypeElement = document.getElementById('sendMessageType') as HTMLSelectElement;
  if (!messageTypeElement) return;

  const isDirectMessage = messageTypeElement.value === "Direct Message";
  const directMessageSelect = document.getElementById('directMessageSelect');
  const wrapper = document.getElementById('directMessageSelectWrapper');

  if (!directMessageSelect || !wrapper) return;

  if (isDirectMessage) {
    directMessageSelect.style.display = 'inline-block';
    wrapper.style.display = 'inline-block';
    populateDirectMessageSelect(client);
  } else {
    directMessageSelect.style.display = 'none';
    wrapper.style.display = 'none';
  }
}

function getDirectMessageOptions(client: Client): string[] {
  const peerNames = client.users.map((u: User) => u.displayName);
  return peerNames.length > 0 ? peerNames : ["No users online"];
}

  
 export function populateDirectMessageSelect(client: Client){
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
  

function handleEnterKey(event: KeyboardEvent, client: Client) {
  if (event.key === "Enter") {
    event.preventDefault();
    sendMessage(client);
  }
}

export function refreshPeerList(client: Client) {
  const container = document.getElementById('peerListContainer');
  if (!container) return;

  container.style.display = 'block';
  container.innerHTML = '';

  const peers = client.getPeersOnline().sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  );

  console.log("///////////////////////////////////");
  console.log("Refreshing peer list", peers);
  console.log("///////////////////////////////////");

  const listElement = document.createElement('ul');
  listElement.style.listStyleType = 'none';

  if (peers.length === 0) {
    listElement.innerHTML = '<li>No peers online</li>';
  } else {
    peers.forEach((user) => {
      const li = document.createElement('li');
      li.textContent = `${user.displayName} (${user.getId().substring(0, 8)})`;
      listElement.appendChild(li);
    });
  }

  container.appendChild(listElement);
}
