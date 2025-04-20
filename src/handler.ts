import { network, Encryption } from 'socket:network'
import Buffer from 'socket:buffer';
import { SIGNING_KEY, CLUSTER_ID, PEER_ID_MASK, strangePeers } from './values.js';
import type EventEmitter from 'socket:events';
import { setupPeerMessages, _handleMessage, pid, packetQuery, packetQueryTest } from './utils.js';
import { Peer, RemotePeer } from 'socket:latica/index'

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
    // todo: we're not actually mapping the RemotePeer and the name, since we don't have access to the client stuff.
    // probably just need to make the client first and then re-assign these callbacks. ATM this is broken
    for(const p of this.peer.peers){
      const newUser = new User("", p);
      if(PEER_ID_MASK.includes(p.peerId) || this.peerId === p.peerId) continue;
      this.users.push(newUser);
    }

    this.peer.socket.on("util", () => {console.log("000000000000000000")})
  }

  
  public async utility(){
    const _testPacket = await packetQueryTest("test", this.peer)
    const peers = this.peer.getPeers(_testPacket, this.peer.peers, strangePeers);

    for(const p of peers){
      const id = p.peerId
      if(id === this.peer.peerId || id === this.peerId){
        continue;
      }
      const port = p.port
      const address = p.address
      const data = "util";
      this.peer.socket.emit("util");
    }






    console.log("===============================================");
    // console.log("My Peer ID: " + pid(this.peer.peerId));
    // console.log("Safe Peers: " + JSON.stringify(safePeers.map((p: RemotePeer) => p.peerId), null, 2));

  }

  public handleShutdown(){
    this.subcluster.emit("logout", JSON.stringify({ peerId: this.peerId }));
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
    this.subcluster.emit("directMessage", packagedMessage);
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
  
  // I read this is important, not sure what it does
  subcluster.join();
  
  const client = new Client(displayName, peerId, socket, clusterId, [], subcluster, peer);
  
  // connect callbacks for messages
  setupPeerMessages(client, subcluster);

  return client;
}
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function peerize(displayName: string, userClusterId: string){
  const id = await Encryption.createId(displayName);
  const clusterId = await Encryption.createClusterId(userClusterId)

  // Create a new peer, dgram is the module that has the function to create
  // a new socket (the Peer constructor will do this internally)
  await delay(500);
  const dgram = require('dgram');
  const peer = new Peer({"peerId":id, clusterId: clusterId}, dgram)
  
  // When the peer is initialized this is executed
  await peer.init(() => {console.log("Peer is initialized")})

  // When someone tells us "Send me your display name"
  const _recGetName = async () => {
    // construct the "message" field in the packet (Note this is the same  structure we're parsing before)
    const message = {"operation":"sendName", "name": displayName, "address":peer.address, "port":peer.port, "id":peer.peerId}
    // construct the actual socketsupply PacketQuery
    const packet = await packetQuery(message, peer)
    console.log("Sending name back");
    // send the packet *to the network*. Ideally we'd send it to the person who asked, but that's not working yet.
    peer.query(packet);
  }

  // When someone tells us "This is my display name"
  const _recSendName = async (message: any) => {
    // todo: we're not actually mapping the RemotePeer and the name, since we don't have access to the client stuff.
    // probably just need to make the client first and then re-assign these callbacks
    console.log("Mapped pid " + pid(message.id) + " with display name: " + message.name)
  }

  // When we (as in Peer) receive a PacketQuery
  (peer as any).onQuery = async (packet: any ) => {
    // get the "message" field of the packet
    // When we construct the PacketQuery in utils/_handleLogin, WE set this message field with some 
    // information (ex: login)
    const json = packet.message
    const operation = json.operation
    // Match the operation someone else using our program sent
    switch (operation){
      case "getName": await _recGetName();break; // They told us "Send me your display name"
      case "sendName": await _recSendName(json);break; // They told us "Here's my display name"
      default: console.log("Couldn't match operation: " + operation);
    }
  }

  // If the peer/socketsupply has any errors internally then we log it to console
  peer._onError = (err: any) => {console.log("_onError: " + err)}; 
  
  // I read that this is important, still not sure what it does lol
  peer.join(userClusterId);
  
  return peer;
}

export async function startClient(displayName: string, userClusterId: string){
  const peer = await peerize(displayName, userClusterId);
  const client = await clusterize(displayName, userClusterId, peer);
  return client; 
}

/*
Final topics:
  - routing protocols, bgp etc, how routing works.
  - wireless, link layer. CSMA, CD vs collision avoidancy, differences between them
  - some security.
*/
