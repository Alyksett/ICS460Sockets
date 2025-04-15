import { network, Encryption } from 'socket:network';
import { Peer } from 'socket:latica/index';
import Buffer from 'socket:buffer';
import { Message } from './types.js';
import { addMessageToChat } from './index.js';
import { PEER_ID, SIGNING_KEY, CLUSTER_ID, SHARED_KEY } from './values.js';
export class Client {
    displayName;
    peerId;
    socket;
    clusterId;
    signingKeys;
    sharedKey;
    peers = [];
    subcluster;
    constructor(displayName, peerId, socket, clusterId, signingKeys, sharedKey, peers, subcluster) {
        this.displayName = displayName;
        this.peerId = peerId;
        this.socket = socket;
        this.clusterId = clusterId;
        this.signingKeys = signingKeys;
        this.sharedKey = sharedKey;
        this.peers = peers;
        this.subcluster = subcluster;
    }
    getPeers() {
        return this.peers;
    }
    sendMessage(message) {
        const buf = Buffer.from(JSON.stringify({ message: message, peer: this.peerId, author: this.displayName }));
        this.subcluster.emit("message", buf);
    }
    handleMessage(message) {
        const parsedMessage = JSON.parse(message.toString());
        const messageContent = parsedMessage.message;
        const messagePeer = parsedMessage.peer;
        const messageAuthor = parsedMessage.author;
        if (messagePeer === this.peerId) {
            console.log("Message is from self. Ignoring.");
            return;
        }
        const finalMessage = `${messageAuthor}: ${messageContent}`;
        addMessageToChat(finalMessage);
    }
}
export async function startClient(displayName, userClusterId) {
    console.log("Starting client...");
    const peerId = await Encryption.createId(PEER_ID);
    const signingKeys = await Encryption.createKeyPair(SIGNING_KEY);
    const clusterId = await Encryption.createClusterId(userClusterId);
    const sharedKey = await Encryption.createSharedKey(SHARED_KEY);
    const socket = await network({ peerId, clusterId, signingKeys });
    const subcluster = await socket.subcluster({ sharedKey });
    subcluster.join();
    let peers = Array.from(subcluster.peers.values()).map((peer) => peer.peerId);
    const client = new Client(displayName, peerId, socket, clusterId, signingKeys, sharedKey, peers, subcluster);
    subcluster.on("message", (message) => {
        client.handleMessage(message);
    });
    return client;
}
