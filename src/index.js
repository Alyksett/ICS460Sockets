import { network, Encryption } from 'socket:network'

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
cats.on('mew', value => addMessage(value))

//
// A message will be published into this subcluster
//
cats.emit('mew', { food: true })

//
// Another peer from this subcluster has directly connected to you.
//
cats.on('#join', peer => {
  console.log("Another cat has joined:")
  console.log(peer)
  peer.on('mew', value => {
    console.log("Another cat said:", value)
    console.log(value)
  })
})

function sendMessage() {
  const input = document.getElementById("messageInput");
  const message = input.value.trim();

  if (message) {
    addMessage("You: " + message);  // Display the message from the user
    input.value = "";  // Clear the input field

    // Simulate bot response
    setTimeout(() => {
      addMessage("Bot: Received: " + message);  // Display the bot's response
    }, 1000);
  }
}
window.sendMessage = sendMessage;

function addMessage(message) {
  const chatBox = document.getElementById("chatBox");
  const newMessage = document.createElement("div");
  newMessage.textContent = message;
  chatBox.appendChild(newMessage);
  chatBox.scrollTop = chatBox.scrollHeight;  // Scroll to bottom
}
/*

peer:

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