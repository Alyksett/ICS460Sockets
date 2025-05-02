import { network, Encryption } from 'socket:network'
import { SIGNING_KEY, CLUSTER_ID } from './values.js';
import { setupPeerMessages, _handleMessage } from './utils.js';
import { Peer } from 'socket:latica/index'
import { Client } from './types.js';
import { initializeCallbacks } from './peerUtils.js';
import type EventEmitter from 'socket:events';
import dgram from 'socket:dgram';

// SS uses runtime types
export type ExtendedEventEmitter = EventEmitter & {
  [key: string]: any;
};
async function clusterize(displayName: string, userClusterId: string, peer: Peer): Promise<Client>{
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
  const peer = new Peer({"peerId":id, clusterId: clusterId}, dgram)
  
  // When the peer is initialized this is executed
  await peer.init(() => {console.log("Peer is initialized")})

  // If the peer/socketsupply has any errors internally then we log it to console
  peer._onError = (err: any) => {console.log("_onError: " + err)}; 

  peer.join(userClusterId);
  
  return peer;
}

export async function startClient(displayName: string, userClusterId: string){
  const peer = await peerize(displayName, userClusterId);
  const client = await clusterize(displayName, userClusterId, peer);
  await initializeCallbacks(peer, client);
  return client; 
}
