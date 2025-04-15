import { network, Encryption } from 'socket:network'
import { Peer } from 'socket:latica/index';
import Buffer from 'socket:buffer';
import { Message } from './types.js';
import { addMessageToChat } from './index.js';
import { PEER_ID, SIGNING_KEY, CLUSTER_ID, SHARED_KEY } from './values.js';
import type EventEmitter from 'socket:events';
import { setupPeerMessages } from './utils.js';

export class User{
  displayName: string;
  peer: Peer;
  constructor(displayName: string, peer: Peer){
    this.displayName = displayName;
    this.peer = peer;
  }
}

export class Client{
  displayName: string;
  peerId: any;
  socket: any;
  clusterId: any;
  signingKeys: any;
  sharedKey: any;
  users: User[] = [];
  subcluster: any;

  constructor(displayName: string, peerId: any, socket: any, clusterId: any, signingKeys: any, sharedKey: any, users: User[], subcluster: any){
    this.displayName = displayName;
    this.peerId = peerId;
    this.socket = socket;
    this.clusterId = clusterId;
    this.signingKeys = signingKeys;
    this.sharedKey = sharedKey;
    this.users = users;
    this.subcluster = subcluster;
  }
  public getPeers(){
    return this.users;
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
  
  const client = new Client(displayName, peerId, socket, clusterId, signingKeys, sharedKey, [], subcluster);
  
  setupPeerMessages(client, subcluster);

  return client;
}