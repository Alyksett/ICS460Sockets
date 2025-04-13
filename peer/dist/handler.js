import { network, Encryption } from 'socket:network';
import { Peer } from 'socket:latica/index';
import Buffer from 'socket:buffer';
import { Message } from './types.js';
import { addMessageToChat } from './index.js';
export class Client {
    peerId;
    socket;
    clusterId;
    signingKeys;
    sharedKey;
    cats;
    peers = [];
    constructor(peerId, socket, clusterId, signingKeys, sharedKey, peers) {
        this.peerId = peerId;
        this.socket = socket;
        this.clusterId = clusterId;
        this.signingKeys = signingKeys;
        this.sharedKey = sharedKey;
        this.peers = peers;
    }
    getPeers() {
        return this.peers;
    }
}
function onMessage(message, peerId) {
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
    if (senderId === peerId) {
        console.log("Detected message in cluster, but it's from me. Skipping...");
        return;
    }
    addMessageToChat(senderId + content);
}
function onJoin(peer, peers) {
    console.log("New peer joined!");
    console.log("Peer address: ", peer.address, " Port: ", peer.port);
    peers.push(peer);
    addMessageToChat(peer.address + ":" + peer.port + " joined the chat!");
    return peers;
}
//
// A published message on this subcluster has arrived!
//
export async function startClient() {
    console.log("Starting client...");
    //
    // Create (or read from storage) a peer ID and a key-pair for signing.
    //
    const peerId = await Encryption.createId("123");
    const signingKeys = await Encryption.createKeyPair("123");
    //
    // Create (or read from storage) a clusterID and a symmetrical/shared key.
    //
    const clusterId = await Encryption.createClusterId('TEST');
    const sharedKey = await Encryption.createSharedKey('TEST');
    //
    // Create a socket that can send a receive network events. The clusterId
    // helps to find other peers and be found by other peers.
    //
    const socket = await network({ peerId, clusterId, signingKeys });
    //
    // Create a subcluster (a partition within your cluster)
    //
    const cats = await socket.subcluster({ sharedKey });
    let peers = [];
    const client = new Client(peerId, socket, clusterId, signingKeys, sharedKey, peers);
    console.log("Client created: ", client);
    cats.on('message', (message) => {
        onMessage(message, peerId);
    });
    cats.on('#join', (peer) => {
        const updatedPeers = onJoin(peer, peers);
        console.log("Updated peers: ", updatedPeers);
        peers = updatedPeers;
    });
    return client;
}
//
// Another peer from this subcluster has directly connected to you.
//
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
