import { Client, User } from './types.js';
import { addMessageToChat } from './index.js';
import Buffer from 'socket:buffer';
import { Packet } from 'socket:network';
import { PacketQuery } from 'socket:latica/packets';
import { randomBytes } from 'socket:crypto';

export async function packetQuery(query: any) {
  const packet = new PacketQuery({
    message: query,
    usr1: Buffer.from(String(Date.now())),
    usr3: Buffer.from(randomBytes(32)),
    usr4: Buffer.from(String(1)),
  });

  const data = await Packet.encode(packet);
  return Packet.decode(data);
}

export async function packetQueryTest(query: any, peer: any) {
  const packet = new PacketQuery({
    message: { requesterPeerId: "-1", message: "test" },
    usr1: Buffer.from(String(Date.now())),
    usr3: Buffer.from(randomBytes(32)),
    usr4: Buffer.from(String(1)),
    clusterId: Buffer.from(peer.clusterId),
  });

  const data = await Packet.encode(packet);
  return Packet.decode(data);
}

export const listenerKeys = [
  "#join",
  "#leave",
  "requestName",
  "resolveName",
  "message",
  "directMessage"
];

export function pid(peerId: string): string {
  return peerId.substring(0, 8);
}

export function setupPeerMessages(client: Client, subcluster: any) {
  subcluster.on("requestName", (msg: any) => _requestName(client, subcluster, msg));
  subcluster.on("resolveName", (msg: any) => _resolveName(client, subcluster, msg));
  subcluster.on("message", (msg: any) => _handleMessage(client, subcluster, msg));
  subcluster.on("directMessage", (msg: any) => _handleDirectMessage(client, subcluster, msg));
  subcluster.on("#join", async (peer: any) => await _handleJoin(client, subcluster, peer));
  subcluster.on("logout", (peer: any) => _handleLeave(client, subcluster, peer));
}

function _handleDirectMessage(client: Client, _subcluster: any, message: any) {
  const parsed = JSON.parse(message.toString());
  if (parsed.peer === client.peerId) return;

  const formatted = `(Direct) ${parsed.author}: ${parsed.message}`;
  addMessageToChat(formatted, true);
}

export function _handleMessage(client: Client, _subcluster: any, message: any) {
  const parsed = JSON.parse(message.toString());
  if (parsed.peer === client.peerId) return;

  client.users.push(new User(parsed.author, parsed.peer)); // temporary fix to update users
  const formatted = `${parsed.author}: ${parsed.message}`;
  addMessageToChat(formatted);
}

async function _handleJoin(client: Client, _subcluster: any, newPeer: any) {
  const queryMessage = {
    operation: "getName",
    address: client.peer.address,
    port: client.peer.port,
    id: client.peer.peerId,
  };

  const packet = await packetQuery(queryMessage);
  client.peer.query(packet);
}

function _requestName(client: Client, subcluster: any, msg: any) {
  const { peerId } = JSON.parse(msg);
  if (peerId === client.peerId) return;

  const peer = subcluster.peers.get(peerId);
  if (peer) {
    peer.emit("resolveName", {
      peerId: client.peerId,
      displayName: client.displayName,
    });
  }
}

function _resolveName(client: Client, _subcluster: any, msg: any) {
  const { displayName, peerId } = JSON.parse(msg);
  const resolved = client.getUserById(peerId);

  if (!resolved) {
    console.error(`Peer ${pid(peerId)} not found.`);
    return;
  }

  resolved.setName(displayName);
  client.users.push(resolved); // allow UI to show name
  addMessageToChat(`${displayName} has joined the chat.`);
}

function _handleLeave(client: Client, _subcluster: any, peer: any) {
  const { peerId } = JSON.parse(peer);
  const name = client.removePeer(peerId);
  if (name) {
    addMessageToChat(`${name} has left the chat.`);
  }
}
