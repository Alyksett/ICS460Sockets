import { network, Encryption, Packet } from 'socket:network'
// import { Peer } from 'socket:latica/index';
import Buffer from 'socket:buffer';
// import { Message } from './types.js';
// import { addMessageToChat } from './index.js';
import { PEER_ID, SIGNING_KEY, CLUSTER_ID, SHARED_KEY, PEER_ID_MASK } from './values.js';
import type EventEmitter from 'socket:events';
import { setupPeerMessages, listenerKeys, _handleMessage, pid } from './utils.js';
import { Peer, RemotePeer } from 'socket:latica/index'
// import { rand64 } from 'socket:crypto';

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
      if(PEER_ID_MASK.includes(p.peerId) || this.peerId === p.peerId) continue;
      this.users.push(newUser);
    }
    
    // console.log(this.peer.peers);
    // console.log("Client Created with users (Abbr):")
    // console.log(this.users.map((u: User) => u.peer.peerId));
  }

  
  public utility(){
    console.log("===============================================");
    console.log("My Peer ID: " + pid(this.peerId));
    const safePeers = this.peer.peers.filter((p: RemotePeer) => !PEER_ID_MASK.includes(p.peerId));
    console.log("Safe Peers: " + JSON.stringify(safePeers.map((p: RemotePeer) => p.peerId), null, 2));
    console.log("===============================================");

  }

  public handleShutdown(){
    // PEER_MASK.push(this.peerId);
    // console.log("==================================")
    // console.log("My id: " + this.peerId);
    // const peers = this.peer.peers;
    // let peerIds = peers.map((p: RemotePeer) => p.peerId);
    // const final = peerIds.filter((id: string) => !PEER_MASK.includes(id));
    // console.log("Peer IDs: " + JSON.stringify(final, null, 2));
    // console.log("==================================")
    this.subcluster.emit("logout", JSON.stringify({ peerId: this.peerId }));
    // this.peer.close();
  }
  
  public getUserById(peerId: string): User | null {
    PEER_ID_MASK.push(this.peerId);
    
    for(const u of this.users){
      // ignore peers that are stuck in the cluster
      if(PEER_ID_MASK.includes(u.getId())){
        continue;
      }
      if(u.getId() === peerId){
        return u;
      }
    }
    console.log("client.getUserById: Couldn't find peer with id " + pid(peerId));
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
}
async function clusterize(displayName: string, userClusterId: string, peer: Peer){
  console.log("Starting cluster client...");
  
  const peerId = await Encryption.createId(peer.peerId)
  const signingKeys = await Encryption.createKeyPair(SIGNING_KEY)

  const clusterId = await Encryption.createClusterId(userClusterId)
  const sharedKey = await Encryption.createSharedKey(CLUSTER_ID)

  const socket = await network({ peerId, clusterId, signingKeys })
  
  const subcluster: ExtendedEventEmitter = await socket.subcluster({ sharedKey })
  
  
  subcluster.join();
  
  const client = new Client(displayName, peerId, socket, clusterId, [], subcluster, peer);
  
  setupPeerMessages(client, subcluster);

  return client;
}
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function peerize(displayName: string, userClusterId: string){
  const id = await Encryption.createId(displayName);
  const dgram = require('dgram');
  
  // TODO: Undo this string
  const peer = new Peer({"peerId":id, clusterId: userClusterId}, dgram)
  
  peer.init( () => {console.log("Peer is initialized")})
  
  peer.join(userClusterId);
  peer.socket.on("requestName", (message: any) => {console.log("YESYESYSEYESYSEYE HOLY FUUUUUCKKKKKKK")});
  peer.socket.on("#send", (message: any) => {console.log("YESYESYSEYESYSEYE HOLY FUUUUUCKKKKKKK")});
  return peer;
}

export async function startClient(displayName: string, userClusterId: string){
  const peer = await peerize(displayName, userClusterId);
  const client = await clusterize(displayName, userClusterId, peer);
  // const client = new Client(displayName, peer.peerId, peer.socket, userClusterId, [], peer.socket, peer);
  return client; 
}



    /*
    Final topics:
      - routing protocols, bgp etc, how routing works.
      - wireless, link layer. CSMA, CD vs collision avoidancy, differences between them
      - some security.
    */
