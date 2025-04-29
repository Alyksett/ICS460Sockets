import type { RemotePeer, Peer } from "socket:latica";
import type EventEmitter from "socket:events";
// import { PEER_ID_MASK } from './values.js';
import Buffer from 'socket:buffer';
import { PacketQuery } from 'socket:latica/packets';
import { randomBytes } from 'socket:crypto';
import { Packet } from 'socket:network';

const PEER_ID_MASK: string[] = []

type ExtendedEventEmitter = EventEmitter & {
  [key: string]: any; // Allows arbitrary properties
};

async function packetQuery(query: any){
  // I copied all this from the source code and it works
  // They don't really make it clear what usr1/2/3 are but... it works?
  const packet = new PacketQuery({
    message: query,
    usr1: Buffer.from(String(Date.now())),
    usr3: Buffer.from(randomBytes(32)),
    usr4: Buffer.from(String(1))
  })
  // also don't know why we're encoding and decoding
  const data = await Packet.encode(packet)
  const p = Packet.decode(data)

  return p
}

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

export class Client{
    displayName: string;
    socket: ExtendedEventEmitter;
    clusterId: any;
    subcluster: ExtendedEventEmitter;
    peer: Peer;
    users: User[] = [];
  
    constructor(displayName: string, peerId: any, socket: any, clusterId: any, subcluster: any, peer: Peer){
      this.displayName = displayName;
      this.socket = socket;
      this.clusterId = clusterId;
      this.subcluster = subcluster;
      this.peer = peer;
  
      // Listen for peers leaving
      this.subcluster.on("#leave", (peer: RemotePeer) => {
        const peerId = peer.peerId;
        this.users = this.users.filter(user => user.getId() !== peerId);
        console.log("User left:", peerId);
      });
    }
  
    public addPeer(name: string, remotePeer: any){
      const isPeerAdded: boolean = this.users.reduce((acc: boolean, u:User) => {return u.displayName===name}, false);
      if(isPeerAdded){
        return;
      }
      const newUser = new User(name, remotePeer);
      this.users.push(newUser);
    }

    public utility(){
      console.log("===============================================");
      console.log("My Peer ID: " + (this.peer.peerId.substring(0, 5)));
      const safePeers = this.peer.peers.filter((p: RemotePeer) => !PEER_ID_MASK.includes(p.peerId));
      console.log("Safe Peers: " + JSON.stringify(safePeers.map((p: RemotePeer) => p.peerId), null, 2));
      console.log("===============================================");
    }
  
    public handleShutdown(){
      this.subcluster.emit("logout", JSON.stringify({ peerId: this.peer.peerId }));
    }
    
    public getUserById(peerId: string): User | null {
      const user = this.users.find(user => user.getId() === peerId);
      if (!user) {
        console.log("Couldn't find user with id:", peerId);
        return null;
      }
      return user;
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
  
    public getPeers(): User[] {
      return this.users;
    }
  
    public async sendDirectMessage(message: any, recipient: any){
      console.log("Sending direct message...");
      
      // const recipientId = recipient.peer.peerId;
      // const port = recipient.peer.port;
      // const address = recipient.peer.address;
      // console.log("Sending direct message to peer: " + recipientId.substring(0, 4))
      const msg = {
        "operation":"directMessage",
        "address":this.peer.address,
        "port":this.peer.port,
        "peerId":this.peer.peerId,
        "message":message
      }
      const packet = await packetQuery(msg)
      console.log("Sending now");
      
      this.peer.query(packet);
    }
  
    public sendMessage(message: any){
      const buf = Buffer.from(JSON.stringify({ message: message, peer: this.peer.peerId, author: this.displayName }));
      this.subcluster.emit("message", buf);
  
    }
  }