import { network, Encryption } from 'socket:network'
// import { Peer } from 'socket:latica/index';
import Buffer from 'socket:buffer';
import { Message } from './types.js';
import { addMessageToChat } from './index.js';
import { PEER_ID, SIGNING_KEY, CLUSTER_ID, SHARED_KEY } from './values.js';
import type EventEmitter from 'socket:events';
import { setupPeerMessages, listenerKeys, _handleMessage } from './utils.js';
import { Peer } from 'socket:latica/index'
import { rand64 } from 'socket:crypto';

// import { createSocket, Socket } from 'dgram';

// import * as dgram from 'dgram';



// peer.publish("test", {message: Buffer.from("test")})
export class User{
  displayName: string;
  peer: any;
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
    this.subcluster.emit("logout", payload);
    // This handles cutting off the listeners so we can't receive messages (But it doesn't really work...)
    for(const key of listenerKeys){
      console.log("Removing listener for " + key);
      this.subcluster.removeAllListeners(key);
      this.socket.removeAllListeners(key);
    }

    console.log("subcluster listenerCount: " + this.subcluster.listenerCount("message"));
    console.log("subcluster listener for message: " + this.subcluster.listeners("message"));
    
    this.socket.close();
  }
  
  private getPeerById(peerId: string): User | null {2
    return this.users.find(user => user.peer.peerId === peerId) || null;
  }

  public removePeer(peerId: string){
    
    const user: User | null = this.getPeerById(peerId);
    if(!user){
      console.error("Couldn't find user with id: " + peerId);
      return null;
    }    
    this.users = this.users.filter(u => u.peer.peerId !== peerId);

    return user.displayName;
  }
  public getPeers(){
    return this.users;
  }

  public sendDirectMessage(message: any, recipient: User){
    const packagedMessage = JSON.stringify({ message: message, peer: this.peerId, author: this.displayName });
    const recipientId = recipient.peer.peerId;
    const peer = recipient.peer._peer;
    const buf = Buffer.from(packagedMessage);
    
    // console.log("=============================================")
    // console.log("Name: " + peer.constructor.name);
    // console.log("---------------------------------------------")
    // console.log("Properties: " + Object.keys(peer));
    // console.log("---------------------------------------------")
    // console.log("All Properties: " + Object.getOwnPropertyNames(peer));
    // console.log("---------------------------------------------")
    // console.log("Prototype: " + JSON.stringify(Object.getPrototypeOf(peer), null, 2));
    // console.log("=============================================")
    recipient.peer.send(buf, peer.port, peer.address );
  }

  public sendMessage(message: any){
    const buf = Buffer.from(JSON.stringify({ message: message, peer: this.peerId, author: this.displayName }));
    this.subcluster.emit("message", buf);
  }

  public sendTypingDirect(user: User){
    const recipientId = user.peer.peerId;
    const payload = JSON.stringify({ peerId: this.peerId, message: "typing..." });
    this.subcluster.emit("typing", payload);
  }
  public stoppedTypingDirect(message: string, recipient: User){
    const recipientId = recipient.peer.peerId;
    const payload = JSON.stringify({ peerId: this.peerId, message: message });
    this.subcluster.emit("stoppedTyping", payload);
  }
  public sendTyping(message: string){
    const payload = JSON.stringify({ peerId: this.peerId, message: message });
    this.subcluster.emit("typing", payload);
  }
  public stoppedTyping(message: string){
    const payload = JSON.stringify({ peerId: this.peerId, message: message });
    this.subcluster.emit("stoppedTyping", payload);
  }
}
async function clusterize(displayName: string, userClusterId: string){
  console.log("Starting cluster client...");
  
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
async function peerize(displayName: string, userClusterId: string, socket: any){
  console.log("uh")
  // const mySocket: Socket = createSocket('udp4');
  const id = "34dfe76527d30553b8f346655a4c72f478b181709244bfe5395c389af3b70515";
  
  
  const dgram = require('dgram');
  console.log("--------------------------------")
  
  console.log(dgram.createSocket('udp4'));
  const peer = new Peer({"peerId":id, clusterId: userClusterId}, 
    dgram
    
  );
  console.log("Peer created");
  console.log(peer);
  return peer;
}

export async function startClient(displayName: string, userClusterId: string){
  const client = await clusterize(displayName, userClusterId);
  const peer = await peerize(displayName, userClusterId, client.socket);
  return client; 
}