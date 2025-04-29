import { network, Encryption } from 'socket:network';
import { SIGNING_KEY, CLUSTER_ID } from './values.js';
import { setupPeerMessages } from './utils.js';
import { Peer } from 'socket:latica/index';
import { Client } from './types.js';
import { initializeCallbacks } from './peerUtils.js';
import type EventEmitter from 'socket:events';

export type ExtendedEventEmitter = EventEmitter & {
  [key: string]: any; // Allows dynamic properties (Socket Supply's subcluster appears to use this)
};

/**
 * Sets up a Socket Supply Peer and returns it.
 */
async function peerize(displayName: string, userClusterId: string): Promise<Peer> {
  const id = await Encryption.createId(displayName);
  const clusterId = await Encryption.createClusterId(userClusterId);

  const dgram = require('dgram'); // socket backend
  const peer = new Peer({ peerId: id, clusterId }, dgram);

  await peer.init(() => console.log("Peer initialized"));
  peer._onError = (err: any) => console.error("_onError:", err);

  peer.join(userClusterId); // unclear internals, but required

  return peer;
}

/**
 * Initializes the cluster socket and subcluster connection using a Peer.
 */
async function clusterize(
  displayName: string,
  userClusterId: string,
  peer: Peer
): Promise<Client> {
  console.log("Starting cluster client...");

  const peerId = await Encryption.createId(peer.peerId);
  const signingKeys = await Encryption.createKeyPair(SIGNING_KEY);
  const clusterId = await Encryption.createClusterId(userClusterId);
  const sharedKey = await Encryption.createSharedKey(CLUSTER_ID);

  const socket = await network({ peerId, clusterId, signingKeys });
  const subcluster: ExtendedEventEmitter = await socket.subcluster({ sharedKey });

  subcluster.join(); // Important step for peer discovery
  const client = new Client(displayName, peerId, socket, clusterId, subcluster, peer);

  setupPeerMessages(client, subcluster);
  return client;
}

/**
 * Bootstraps the full peer-to-peer client and returns the Client object.
 */
export async function startClient(displayName: string, userClusterId: string): Promise<Client> {
  const peer = await peerize(displayName, userClusterId);
  const client = await clusterize(displayName, userClusterId, peer);

  // Broadcast display name to other peers
  client.subcluster.emit("name", JSON.stringify({
    peerId: client.peerId,
    displayName: client.displayName
  }));

  await initializeCallbacks(peer, client);
  return client;
}
