import { network, Encryption } from 'socket:network'
import { Peer } from 'socket:latica/index';
import Buffer from 'socket:buffer';
import { Message } from './types.js';
import { addMessageToChat } from './index.js';
import { PEER_ID, SIGNING_KEY, CLUSTER_ID, SHARED_KEY } from './values.js';
import type EventEmitter from 'socket:events';
import { resolve } from 'socket:url';

export class Client{
  displayName: string;
  peerId: any;
  socket: any;
  clusterId: any;
  signingKeys: any;
  sharedKey: any;
  peers: Peer[] = [];
  subcluster: any;

  constructor(displayName: string, peerId: any, socket: any, clusterId: any, signingKeys: any, sharedKey: any, peers: Peer[], subcluster: any){
    this.displayName = displayName;
    this.peerId = peerId;
    this.socket = socket;
    this.clusterId = clusterId;
    this.signingKeys = signingKeys;
    this.sharedKey = sharedKey;
    this.peers = peers;
    this.subcluster = subcluster;
  }
  public getPeers(){
    return this.peers;
  }

  public sendMessage(message: any){
    const buf = Buffer.from(JSON.stringify({ message: message, peer: this.peerId, author: this.displayName }));
    this.subcluster.emit("message", buf);
  }

  public handleMessage(message: any){
    const parsedMessage = JSON.parse(message.toString());
    const messageContent = parsedMessage.message;
    const messagePeer = parsedMessage.peer;
    const messageAuthor = parsedMessage.author;
    if(messagePeer === this.peerId){
      console.log("Message is from self. Ignoring.");
      return;
    }
    const finalMessage = `${messageAuthor}: ${messageContent}`;
    addMessageToChat(finalMessage);
    
  }

}
type ExtendedEventEmitter = EventEmitter & {
  [key: string]: any; // Allows arbitrary properties
};

export async function startClient(displayName: string, userClusterId: string){
  console.log("Starting client...");
  
  const peerId = await Encryption.createId(PEER_ID)
  const signingKeys = await Encryption.createKeyPair(SIGNING_KEY)

  const clusterId = await Encryption.createClusterId(userClusterId)
  const sharedKey = await Encryption.createSharedKey(SHARED_KEY)

  const socket = await network({ peerId, clusterId, signingKeys })
  
  const subcluster: ExtendedEventEmitter = await socket.subcluster({ sharedKey })
  
  subcluster.join();
  let peers: Peer[] = Array.from(subcluster.peers.values()).map((peer: any) => peer.peerId)
  
  const client = new Client(displayName, peerId, socket, clusterId, signingKeys, sharedKey, peers, subcluster);

  subcluster.on("requestName", (requesterMessage: any) => {
    console.log("RequestName====================================")
    const json = JSON.parse(requesterMessage);
    const requesterId = json.peerId;
    subcluster.peers.get(requesterId).emit("resolveName", { peerId: client.peerId, displayName: client.displayName });
  })

  subcluster.on("resolveName", (peer: any) => {
    console.log("====================================")
    console.log("Resolve response: " + peer);
    const json = JSON.parse(peer);
    const peerId = json.peerId;
    const peerName = json.displayName;
    console.log(`Matched peer ${peerId} with name ${peerName}`);
    // const peerIndex = client.peers.findIndex((p: any) => p.peerId === peerId);
    // if (peerIndex === -1) {
    //   client.peers.push({ peerId, displayName: peerName });
    // } else {
    //   client.peers[peerIndex].displayName = peerName;
    // }
    console.log("Current peers: " + client.peers);
    addMessageToChat(`${peerName} has joined the chat.`);
  });

  subcluster.on("message", (message: any) => {
    client.handleMessage(message);
  });

  subcluster.on("#join", (newPeer: any) => {
    console.log("====================================")
    console.log("Peer joined: " + newPeer.peerId);
    console.log(subcluster.peers.get(newPeer.peerId));
    console.log("====================================")
    
    const resolvedPeer = subcluster.peers.get(newPeer.peerId);
    if(resolvedPeer){
      console.log("Found peer that just joined: " + resolvedPeer.peerId);
      resolvedPeer.emit("requestName", { peerId: client.peerId });
    }
    
    // addMessageToChat(`${peer.peerId} has joined the chat.`);
    // console.log("sending a requestName event");
    // subcluster.emit("requestName", { peerId: peer.peerId });
  });
  subcluster.on("#leave", (peer: any) => {
    console.log("Peer left: " + peer.peerId);
    peers = Array.from(subcluster.peers.values()).map((peer: any) => peer.peerId)
    client.peers = peers;
    console.log("Current peers: " + peers);
    addMessageToChat(`${peer.peerId} has left the chat.`);
  });

  return client;
}