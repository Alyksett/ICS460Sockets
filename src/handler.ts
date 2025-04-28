import { network, Encryption } from 'socket:network'
import { Buffer } from 'socket:buffer'
import { SIGNING_KEY, CLUSTER_ID, PEER_ID_MASK, strangePeers } from './values.js';
import type EventEmitter from 'socket:events';
import { setupPeerMessages, _handleMessage, pid, packetQuery, packetQueryTest } from './utils.js';
import { Packet, Peer, RemotePeer } from 'socket:latica/index'
import * as sock from 'socket:dgram'
import { addMessageToChat } from './index.js';
import { rand64 } from 'socket:crypto';

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
  
  connectedPeers: any[] = []

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
    (this.peer as any).onQuery()
    this.peer.socket.on("util", (msg: any) => {console.log(msg)})
    this.peer.socket.on("newPeer", (newPeer: any) => {
      this.connectedPeers.push(newPeer);
    })
    this.peer.socket.on("directMessage", (message: any) => {
      
      // console.log(`${pid(this.peer.peerId)} direct message`)
      const json = JSON.parse(message)
      console.log("My pid: " + pid(this.peer.peerId));
      
      console.log(json);
      
      const msg = json.message;
      const peer = json.peer
      const finalMessage: string = `(Direct) ${pid(peer.peerId)}: ${msg}`;
      addMessageToChat(finalMessage, true);
    })
  }
  
  public async utility(){
    const _testPacket = await packetQueryTest("test", this.peer)
    strangePeers.push(this.peer)
    const peers = this.peer.getPeers(_testPacket, this.peer.peers, strangePeers);
    if(peers.length === 0){
      console.log("WARNING: Sending to no peers.");
    }
    for(const p of peers){
      const id = p.peerId
      if(id === this.peer.peerId || id === this.peerId){
        continue;
      }
      this.peer.socket.emit("util", {message:"What's up man"});
    }


    console.log("===============================================");
    // console.log("My Peer ID: " + pid(this.peer.peerId));
    // console.log("Safe Peers: " + JSON.stringify(safePeers.map((p: RemotePeer) => p.peerId), null, 2));

  }

  public handleShutdown(){
    this.subcluster.emit("logout", JSON.stringify({ peerId: this.peerId }));
    this.peer.close();
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

  public async getPeers(safe=false): Promise<RemotePeer[]> {
    return this.connectedPeers
  }

  public async getPeersExcept(peer: any){
    const connected = await this.getConnectedPeers();
    const final = []
    for(const p of connected){
      if(p.peerId!=peer.peerId){
        final.push(p)
      }
    }
    return final;
  }

  public async getConnectedPeers(): Promise<RemotePeer[]>{
    const _testPacket = await packetQueryTest("test", this.peer)
    strangePeers.push(this.peer)
    const peers = this.peer.getPeers(_testPacket, this.peer.peers, strangePeers);
    return peers;
  }

  public getPeerbyId(id: string){
    for(const p of this.connectedPeers){
      
      if(p.peerId === id){
        return p
      }
    }
    console.log(`Peer with id ${pid(id)} not found in connected peers.`);
  }

  public async sendDirectMessage(message: any, rec: RemotePeer){
    console.log("Handling sendDirectMessage")
    // const packagedMessage = Buffer.from(JSON.stringify({ message: message, packetId: 123,  type: 8, peer: await this.peer.getInfo() }));
    // this.peer.socket.connect(rec.port, rec.address, (err: any) => {
    //   console.log("Callback esrror: " + err);
    //   this.peer.socket.send("directMessage", packagedMessage);
      
    // })
    const testPacket = await packetQuery("directMessage", this.peer);
    const buf = await Packet.encode(testPacket);
    // const t = Packet.decode(testPacket)
        // const buf: Buffer = (await Packet.encode(t)) as Buffer;
    // const b = Buffer(t, 0, packagedMessage.length);
    

    (this.peer as any).send(buf, rec.port, rec.address);
    

    // this.peer.socket.send(packagedMessage, 0, packagedMessage.length, rec.port, rec.address, (err: any) => {
    //   if(err){
    //     console.log("Error: " + err)
    //   }
    //   console.log("message has been sent.")
    // })
    
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
  
  const peer = new Peer({"peerId":id, clusterId: clusterId}, sock)
  
  // When the peer is initialized this is executed
  await peer.init(() => {console.log("Peer is initialized")})


  // peer.socket.on("message", (msg: any, rinfo: any) => {
  //   try {
  //     const json = msg.toString();
  //     console.log('Parsed JSON:', json);
  //   } catch (err) {
  //     console.error('Failed to parse JSON:', err);
  //   }
  // })
  
  

  // When someone tells us "Send me your display name"
  const _recGetName = async (ignoreList: any[]) => {
    // construct the "message" field in the packet (Note this is the same  structure we're parsing before)
    const message = {"operation":"sendName", "name": displayName, "address":peer.address, "port":peer.port, "id":peer.peerId}

    // construct the actual socketsupply PacketQuery
    const packet = await packetQuery(message, peer)
    console.log("Sending name back");
    
    // send the packet *to the network*. Ideally we'd send it to the person who asked, but that's not working yet.
    peer.mcast(packet);
  }

  // When someone tells us "This is my display name"
  const _recSendName = async (message: any) => {
    // todo: we're not actually mapping the RemotePeer and the name, since we don't have access to the client stuff.
    // probably just need to make the client first and then re-assign these callbacks
    console.log("Mapped pid " + pid(message.id) + " with display name: " + message.name)
  }
  
  // peer._onQuery  = (packet: any, port: any, address: any) => {console.log("kms")};
  
  // When we (as in Peer) receive a PacketQuery
  (peer as any).onQuery = async function (packet: any) {
    console.log("Got packet query");
    const operation = packet.operation;
    console.log("Matching on operation: " + operation);
    
    // const _testPacket = await packetQueryTest("test", this.peer)
    // strangePeers.push(this.peer)
    // const connected = this.peer.getPeers(_testPacket, this.peer.peers, strangePeers);
  
    // const ignoreList = []
    // for(const p of connected){
    //   if(p.peerId!=peer.peerId){
    //     ignoreList.push(p)
    //   }
    // }


    switch (operation) {
      case "getName":
        await _recGetName([]);
        break;
      case "sendName":
        await _recSendName(packet);
        break;
      default:
        console.log("Couldn't match operation: " + operation);
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
