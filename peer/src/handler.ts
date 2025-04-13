import { network, Encryption } from 'socket:network'
import { Peer } from 'socket:latica/index';
import Buffer from 'socket:buffer';
import { Message } from './types.js';
import { addMessageToChat } from './index.js';
import { PEER_ID, SIGNING_KEY, CLUSTER_ID, SHARED_KEY } from './values.js';
import type EventEmitter from 'socket:events';

export class Client{
  peerId: any;
  socket: any;
  clusterId: any;
  signingKeys: any;
  sharedKey: any;
  peers: Peer[] = [];
  subcluster: any;

  constructor(peerId: any, socket: any, clusterId: any, signingKeys: any, sharedKey: any, peers: Peer[], subcluster: any){
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
    const buf = Buffer.from(JSON.stringify({ message: message, peer: this.peerId }));
    this.subcluster.emit("message", buf);
  }

  public handleMessage(message: any){
    const parsedMessage = JSON.parse(message.toString());
    const messageContent = parsedMessage.message;
    const messagePeer = parsedMessage.peer;
    if(messagePeer === this.peerId){
      console.log("Message is from self. Ignoring.");
      return;
    }
    addMessageToChat("Received message: " + messageContent);
    
  }

}
type ExtendedEventEmitter = EventEmitter & {
  [key: string]: any; // Allows arbitrary properties
};

export async function startClient(){
  console.log("Starting client...");
  
  const peerId = await Encryption.createId(PEER_ID)
  const signingKeys = await Encryption.createKeyPair(SIGNING_KEY)

  const clusterId = await Encryption.createClusterId(CLUSTER_ID)
  const sharedKey = await Encryption.createSharedKey(SHARED_KEY)

  const socket = await network({ peerId, clusterId, signingKeys })
  
  const subcluster: ExtendedEventEmitter = await socket.subcluster({ sharedKey })
  
  subcluster.join();
  let peers: Peer[] = Array.from(subcluster.peers.values()).map((peer: any) => peer.peerId)
  
  const client = new Client(peerId, socket, clusterId, signingKeys, sharedKey, peers, subcluster);

  subcluster.on("message", (message: any) => {
    client.handleMessage(message);
  });

  return client;
}