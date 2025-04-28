import { network, Encryption } from 'socket:network'
import Buffer from 'socket:buffer';
import { SIGNING_KEY, CLUSTER_ID, PEER_ID_MASK } from './values.js';
import type EventEmitter from 'socket:events';
import { setupPeerMessages, _handleMessage, pid, packetQuery } from './utils.js';
import { Peer, RemotePeer } from 'socket:latica/index'
import { randomBytes } from 'socket:crypto';

async function clusterize(displayName: string, userClusterId: string, peer: Peer){
  console.log("Starting cluster client...");
  
  const peerId = await Encryption.createId(peer.peerId)
  const signingKeys = await Encryption.createKeyPair(SIGNING_KEY)

  const clusterId = await Encryption.createClusterId(userClusterId)
  const sharedKey = await Encryption.createSharedKey(CLUSTER_ID)

  const socket = await network({ peerId, clusterId, signingKeys })
  
  const subcluster: ExtendedEventEmitter = await socket.subcluster({ sharedKey })
  
  subcluster.join();
  
  const client = new Client(displayName, peerId, socket, clusterId, subcluster, peer);
  
  setupPeerMessages(client, subcluster);

  return client;
}

async function peerize(displayName: string, userClusterId: string){
  const id = await Encryption.createId(displayName);
  const clusterId = await Encryption.createClusterId(userClusterId)

  // Create a new peer, dgram is the module that has the function to create
  // a new socket (the Peer constructor will do this internally)
  const dgram = require('dgram');
  const peer = new Peer({"peerId":id, clusterId: clusterId}, dgram)
  
  // When the peer is initialized this is executed
  await peer.init(() => {console.log("Peer is initialized")})

  // When someone tells us "Send me your display name"
  const _recGetName = async () => {
    // construct the "message" field in the packet (Note this is the same  structure we're parsing before)
    const message = {"operation":"sendName", "name": displayName, "address":peer.address, "port":peer.port, "id":peer.peerId}
    // construct the actual socketsupply PacketQuery
    const packet = await packetQuery(message)
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
  const sharedKey = await Encryption.createSharedKey(CLUSTER_ID)
  const msg = Buffer.from("HelloWorld!")
  peer.publish(sharedKey, {
    message:msg,
    usr1: Buffer.from(String(Date.now())),
    usr2: Buffer.from(randomBytes(32))
  })
  
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
