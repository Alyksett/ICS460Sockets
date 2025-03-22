import { network, Encryption } from 'socket:network'
import { Message } from './message.js'
//
// Create (or read from storage) a peer ID and a key-pair for signing.
//
const peerId = await Encryption.createId()
const signingKeys = await Encryption.createKeyPair()

//
// Create (or read from storage) a clusterID and a symmetrical/shared key.
//
const clusterId = await Encryption.createClusterId('TEST')
const sharedKey = await Encryption.createSharedKey('TEST')

//
// Create a socket that can send a receive network events. The clusterId
// helps to find other peers and be found by other peers.
//
const socket = await network({ peerId, clusterId, signingKeys })

//
// Create a subcluster (a partition within your cluster)
//
const cats = await socket.subcluster({ sharedKey })

//
// A published message on this subcluster has arrived!
//
cats.on('message', (message) => {
  console.log("Got message");
  const buffer = Buffer.from(message);
  const jsonString = buffer.toString('utf8');
  console.log("String: ", jsonString);
  const value = JSON.parse(jsonString);
  console.log("Parsed value: ", value);
  
  const msg = value.message;
  console.log("Message object: ", msg);
  const final = JSON.parse(msg);
  console.log("Author: ", final.author);
  console.log("Content: ", final.content);
  const senderId = final.author;
  const content = final.content;
  
  if(senderId === peerId){
    console.log("Detected message in cluster, but it's from me. Skipping...");
    return;
  }
  addMessageToChat(senderId.substring(0,5) + ": " + content);
});

//
// Another peer from this subcluster has directly connected to you.
//
cats.on('#join', peer => {
  console.log("New peer joined!");

  console.log("Peer address: ", peer.address, " Port: ", peer.port);
  addMessageToChat(peer.address + ":" + peer.port + " joined the chat!"); 
})

function sendMessage() {
  const input = document.getElementById("messageInput");
  const message = input.value.trim();

  let recipient = "broadcast"
  const isDirectMessage = document.getElementById('messageType').value === "Direct Message";

  if(isDirectMessage){
    recipient = document.getElementById('directMessageSelect').value;
  }
  
  
  if (message) {
    addMessageToChat("You: " + message);
    input.value = "";  // Clear the input field
    console.log("Sending message: " + message);
    const messageObj = new Message(message, peerId, socket.address, socket.port);
    cats.emit("message", {"message": JSON.stringify(messageObj)});  // Send the message to the other peers
    console.log("Sent message");
  }
}
window.sendMessage = sendMessage;

function addMessageToChat(message) {
  console.log("Adding message to chat: " + message);
  const chatBox = document.getElementById("chatBox");
  const newMessage = document.createElement("div");
  newMessage.textContent = message;
  chatBox.appendChild(newMessage);
  chatBox.scrollTop = chatBox.scrollHeight;  // Scroll to bottom

}

function toggleDirectMessageSelect(){
  const messageType = document.getElementById('messageType').value;
  const directMessageSelect = document.getElementById('directMessageSelect');
  const directMessageSelectWrapper = document.getElementById('directMessageSelectWrapper');

  
  if (messageType === 'Direct Message') {
    directMessageSelect.style.display = 'inline-block';
    directMessageSelectWrapper.style.display = 'inline-block'
    populateDirectMessageSelect();
  } else {
    directMessageSelect.style.display = 'none';
    directMessageSelectWrapper.style.display = 'none';
  }
}
function getDirectMessageOptions(){
  // Return a hard-coded list of values
  return ['User1', 'User2', 'User3'];
}
function populateDirectMessageSelect(){
  const directMessageSelect = document.getElementById('directMessageSelect');
  const options = getDirectMessageOptions();
  
  // Clear existing options
  directMessageSelect.innerHTML = '';
  
  // Populate with new options
  options.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option;
    opt.textContent = option;
    directMessageSelect.appendChild(opt);
  });
}

window.toggleDirectMessageSelect = toggleDirectMessageSelect
/*

peer:
Peer own properties:
[
  '_events',
  '_eventsCount',
  '_contexts',
  '_maxListeners',
  '_on',
  '_emit',
  'peerId',
  'port',
  'address',
  'emit',
  '_peer'
]
  'on',
EventEmitter {
  _events: {},
  _eventsCount: 0,
  _contexts: Map(0) {},
  _maxListeners: undefined,
  _on: [Function: on],
  _emit: [Function: emit],
  peerId: '5f89ec7200997fb0c6f3161f6c14b1ed5138258e4aac9ebca8bf0310b4d78592',
  address: '174.20.45.137',
  emit: [AsyncFunction],
  on: [AsyncFunction],
  port: 50732,
  _peer:
    {
      address: '174.20.45.137',
      clusters: { lO4FkzXlh+UBzEv5BhPggU8Ap7CLx8ZI/YZaKvaiLMI=: [Object] },
      connected: true,
      lastRequest: 0,
      lastUpdate: 1741720363283,
      natType: 7,
      peerId: '5f89ec7200997fb0c6f3161f6c14b1ed5138258e4aac9ebca8bf0310b4d78592',
      port: 50732
    }
}

*/