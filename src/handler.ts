import { network, Encryption } from 'socket:network'
import { Peer } from 'socket:latica/index';
import Buffer from 'socket:buffer';
import { Message } from './types.js';
import { addMessageToChat } from './index.js';
import { PEER_ID, SIGNING_KEY, CLUSTER_ID, SHARED_KEY } from './values.js';
import type EventEmitter from 'socket:events';
import { setupPeerMessages, listenerKeys } from './utils.js';

export class User{
  displayName: string;
  peer: Peer;
  constructor(displayName: string, peer: Peer){
    this.displayName = displayName;
    this.peer = peer;
  }
  sendMessage(){
    console.log("Sending message to " + this.displayName);
  }
}

type ExtendedEventEmitter = EventEmitter & {
  [key: string]: any; // Allows arbitrary properties
};

export class Client{
  displayName: string;
  peerId: any;
  socket: ExtendedEventEmitter;
  clusterId: any;
  signingKeys: any;
  sharedKey: any;
  users: User[] = [];
  subcluster: ExtendedEventEmitter;

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

  public handleShutdown(){
    console.log("Shutting down client...");
    const payload = JSON.stringify({"peerId": this.peerId});
    this.subcluster.emit("end", payload);

    for(const key of listenerKeys){
      console.log("Removing listener for " + key);
      this.subcluster.removeAllListeners(key);
    }
    
    // this.subcluster.removeAllListeners();
    // this.socket.removeAllListeners();
    // this.socket.leave();
    // this.subcluster.leave();
    // this.socket.close();
  }
  
  private getPeerById(peerId: string): User | null {2
    return this.users.find(user => user.peer.peerId === peerId) || null;
  }

  public removePeer(peerId: string){
    console.log("Start removePeer" + peerId);
    console.log("Users before: " + this.users.map((u: User) => u.displayName));
    const user: User | null = this.getPeerById(peerId);
    if(!user){
      console.error("Couldn't find user with id: " + peerId);
      return null;
    }
    
    this.users = this.users.filter(u => u.peer.peerId !== peerId);
    console.log("Removed user " + user.displayName);
  
    console.log("Users after: " + this.users.map((u: User) => u.displayName));
    return user.displayName;
  }
  public getPeers(){
    return this.users;
  }

  public sendDirectMessage(message: any, recipient: User){
    const packagedMessage = JSON.stringify({ message: message, peer: this.peerId, author: this.displayName });
    const recipientId = recipient.peer.peerId;
    this.subcluster.emit("directMessage", packagedMessage);

  }

  public sendMessage(message: any){
    const buf = Buffer.from(JSON.stringify({ message: message, peer: this.peerId, author: this.displayName }));
    this.subcluster.emit("message", buf);
  }

  public handleMessage(message: any){
    
  }
}

export async function startClient(displayName: string, userClusterId: string){
  console.log("Starting client...");
  
  const peerId = await Encryption.createId(PEER_ID)
  const signingKeys = await Encryption.createKeyPair(SIGNING_KEY)

  const clusterId = await Encryption.createClusterId(userClusterId)
  const sharedKey = await Encryption.createSharedKey(SHARED_KEY)

  const socket = await network({ peerId, clusterId, signingKeys })
  
  const subcluster: ExtendedEventEmitter = await socket.subcluster({ sharedKey })
  
  // subcluster.join();
  // subcluster.leave();
  subcluster.join();
  
  const client = new Client(displayName, peerId, socket, clusterId, signingKeys, sharedKey, [], subcluster);
  
  setupPeerMessages(client, subcluster);

  return client;
}