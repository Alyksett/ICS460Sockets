import { network, Encryption } from 'socket:network'
// import { Peer } from 'socket:latica/index';
import Buffer from 'socket:buffer';
import { Message } from './types.js';
import { addMessageToChat } from './index.js';
import { PEER_ID, SIGNING_KEY, CLUSTER_ID, SHARED_KEY } from './values.js';
import type EventEmitter from 'socket:events';
import { setupPeerMessages, listenerKeys, _handleMessage, pid } from './utils.js';
import { Peer, RemotePeer } from 'socket:latica/index'
import { rand64 } from 'socket:crypto';

// import { createSocket, Socket } from 'dgram';

// import * as dgram from 'dgram';



// peer.publish("test", {message: Buffer.from("test")})
export class User{
  displayName: string;
  peer: RemotePeer;
  constructor(displayName: string, peer: RemotePeer){
    this.displayName = displayName;
    this.peer = peer;
  }
  public getId(): string{
    return this.peer.peerId;
  }
  public setName(name: string){
    this.displayName = name;
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
  subcluster: ExtendedEventEmitter;
  peer: Peer;
  users: User[] = [];

  constructor(displayName: string, peerId: any, socket: any, clusterId: any, users: User[], subcluster: any, peer: Peer){
    this.displayName = displayName;
    this.peerId = peerId;
    this.socket = socket;
    this.clusterId = clusterId;
    this.subcluster = subcluster;
    this.peer = peer;
    for(const p of this.peer.peers){
      const newUser = new User("", p);
      this.users.push(newUser);
    }
  }

  public handleShutdown(){
    console.log("Shutting down client...");
    const payload = JSON.stringify({"peerId": this.peerId});
    this.subcluster.emit("logout", payload);
    // This handles cutting off the listeners so we can't receive messages (But it doesn't really work...)
    for(const key of listenerKeys){
      this.subcluster.removeAllListeners(key);
      this.socket.removeAllListeners(key);
    }
    this.peer.peers = [];
    this.users = [];
    console.log("subcluster listenerCount: " + this.subcluster.listenerCount("message"));
    console.log("subcluster listener for message: " + this.subcluster.listeners("message"));
    this.peer.disconnect();
    this.peer.close();
    this.socket.close();
  }
  
  public getUserById(peerId: string): User | null {
    for(const u of this.users){
      if(u.getId() === peerId){
        return u;
      }
    }
    console.log("Couldn't find peer with id: " + peerId);
    return null;
  }

  public removePeer(peerId: string): string | null{
    let removedPeerName: string | null = null;
    // TODO: Does this work...?
    for(const p of this.peer.peers){
      if(p.peerId === peerId){
        this.peer.peers.splice(this.peer.peers.indexOf(p), 1);
        break;
      }
    }
    // Right now we have two arrays to keep track of peers for.
    // this is just for resolving names but we can skip alll that by encrypting their name
    // for their peerId, and decrypting it.
    for(const u of this.users){
      if(u.getId() === peerId){
        removedPeerName = u.displayName;
        this.users.splice(this.users.indexOf(u), 1);
        console.log("Removed peer with id: " + peerId);
      }
    }
    return removedPeerName;
  }

  public getPeers(): RemotePeer[] {
    return this.peer.peers;
  }

  public sendDirectMessage(message: any, recipient: User){
    const packagedMessage = Buffer.from(JSON.stringify({ message: message, peer: this.peerId, author: this.displayName }));
    const recipientId = recipient.peer.peerId;
    const recipientUser: User | null = this.getUserById(recipientId);
    if(!recipientUser){
      console.error("Couldn't find peer with id: " + recipientId);
      return;
    }
    const recipientPeer: RemotePeer | null = this.peer.getPeer(recipientId);
    if(!recipientPeer){
      console.error("Couldn't find peer with id: " + recipientId);
      return;
    }
    const addr: string | null = recipientPeer.address;
    const port: number | null = recipientPeer.port;
    if(!addr || !port){
      console.error("Couldn't find address or port for peer with id: " + recipientId + "\nPort: " + port + "\nAddr: " + addr);
      return;
    }
    console.log(`Sending message to ${pid(recipientId)} at ${addr}:${port}`);
    this.peer.send(packagedMessage, port, addr);
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
async function clusterize(displayName: string, userClusterId: string, peer: Peer){
  console.log("Starting cluster client...");
  
  const peerId = await Encryption.createId(PEER_ID)
  const signingKeys = await Encryption.createKeyPair(SIGNING_KEY)

  const clusterId = await Encryption.createClusterId(userClusterId)
  const sharedKey = await Encryption.createSharedKey(SHARED_KEY)

  const socket = await network({ peerId, clusterId, signingKeys })
  
  const subcluster: ExtendedEventEmitter = await socket.subcluster({ sharedKey })
  
  
  subcluster.join();
  
  const client = new Client(displayName, peerId, socket, clusterId, [], subcluster, peer);
  
  setupPeerMessages(client, subcluster);

  return client;
}
async function peerize(displayName: string, userClusterId: string){
  // TODO: Get real key- hash userId?
  const id = "34dfe76527d30553b8f346655a4c72f478b181709244bfe5395c389af3b70515";
  const dgram = require('dgram');
  const peer = new Peer({"peerId":id, clusterId: userClusterId}, dgram);
  return peer;
}

export async function startClient(displayName: string, userClusterId: string){
  const peer = await peerize(displayName, userClusterId);
  const client = await clusterize(displayName, userClusterId, peer);
  return client; 
}