// import { Packet, type RemotePeer } from 'socket:latica';
import { Client, User } from './handler.js';
import { addMessageToChat } from './index.js';
import Buffer from 'socket:buffer';
import { PEER_ID_MASK } from './values.js';
import { Packet } from 'socket:network';
import { PacketJoin, PacketQuery } from 'socket:latica/packets';
import { randomBytes } from 'socket:crypto';
import { Peer, RemotePeer } from 'socket:latica/index';
import { lchown } from 'socket:fs';
import { toBuffer } from 'socket:util';

export async function packetQuery(query: any){
  const packet = new PacketQuery({
    message: query,
    usr1: Buffer.from(String(Date.now())),
    usr3: Buffer.from(randomBytes(32)),
    usr4: Buffer.from(String(1))
  })
  const data = await Packet.encode(packet)

  const p = Packet.decode(data) // finalize a packet
  // console.log("Constructed packet: " + JSON.stringify(final));
  // return JSON.stringify(p)

  return p
}


export function pid(peerId: string){
  return peerId.substring(0, 8);
}
// do something better than this
export const listenerKeys: string[] = ["#join", "#leave", "requestName", "resolveName", "message", "directMessage"];

export function setupPeerMessages(client: Client, subcluster: any){
  subcluster.on("requestName", (requesterMessage: any) => {
    _requestName(client, subcluster, requesterMessage);
  })

  subcluster.on("resolveName", (peer: any) => {
    _resolveName(client, subcluster, peer);
  });

  subcluster.on("message", (message: any) => {
    _handleMessage(client, subcluster, message);
  });
  
  subcluster.on("directMessage", (message: any) => {
    _handleDirectMessage(client, subcluster, message);
  });
  client.socket.on("directMessage", (message: any) => {
    _handleDirectMessageSocket(client, subcluster, message);
  });

  subcluster.on("#join", async (newPeer: any) => {
    await _handleJoin(client, subcluster, newPeer);
  });
  subcluster.on("logout", (peer: any) => {
    _handleLeave(client, subcluster, peer);
  });

}


function _handleDirectMessage(client: Client, subcluster: any, message: any){
  console.log("Handling direct message");
  const parsedMessage = JSON.parse(message.toString());
  const messageContent = parsedMessage.message;
  const messagePeer = parsedMessage.peer;
  const messageAuthor = parsedMessage.author;
  if(messagePeer === client.peerId){
    console.log("Direct message is from self. Ignoring.");
    return;
  }
  const finalMessage: string = `(Direct) ${messageAuthor}: ${messageContent}`;
  addMessageToChat(finalMessage, true);
}
function _handleDirectMessageSocket(client: Client, subcluster: any, message: any){
  console.log("==================Handling directMessageSocket================");
  const parsedMessage = JSON.parse(message.toString());
  const messageContent = parsedMessage.message;
  const messagePeer = parsedMessage.peer;
  const messageAuthor = parsedMessage.author;
  if(messagePeer === client.peerId){
    console.log("Direct message is from self. Ignoring.");
    return;
  }
  const finalMessage: string = `(Direct) ${messageAuthor}: ${messageContent}`;
  addMessageToChat(finalMessage, true);
}

export function _handleMessage(client: Client, subcluster: any, message: any){
  console.log("==================Handling message================");
  const parsedMessage = JSON.parse(message.toString());
  const messageContent = parsedMessage.message;
  const messagePeer = parsedMessage.peer;
  const messageAuthor = parsedMessage.author;
  if(messagePeer === client.peerId){
    console.log("Message is from self. Ignoring.");
    return;
  }
  const finalMessage = `${messageAuthor}: ${messageContent}`;
  addMessageToChat(finalMessage);
}
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function _handleJoin(client: Client, subcluster: any, newPeer: any){
  const newPeerId = newPeer.peerId;
  const newPeerPort = newPeer._peer.port;
  const newPeerAddress = newPeer._peer.address;

  const message = {"operation":"getName", "address":client.peer.address, "port":client.peer.port, "id":client.peer.peerId}
  const packet = await packetQuery(message)

  // still just sending a packet into the network of peers, not directly to the new peer...
  client.peer.query(packet);
}

function _requestName(client: Client, subcluster: any, requesterMessage: any){
  console.log("==================Handling requestName================");
  const json = JSON.parse(requesterMessage);
  const requesterId = json.peerId;
  if(requesterId === client.peerId){
    console.log("Self request detected. Ignoring.");
    return;
  }
  subcluster.peers.get(requesterId).emit("resolveName", { peerId: client.peerId, displayName: client.displayName });
}

function _resolveName(client: Client, subcluster: any, peerMessage: any){
  console.log("==================Handling resolveName================");
  const json = JSON.parse(peerMessage);
  const peerName = json.displayName;
  const peerId = json.peerId
  const resolvedUser: User | null = client.getUserById(peerId)
  if(!resolvedUser){
    console.error(`Peer with id: ${pid(peerId)} not found in subcluster`);
    return;
  }
  resolvedUser.setName(peerName);
  
  addMessageToChat(`${peerName} has joined the chat.`);
}

function _handleLeave(client: Client, subcluster: any, peer: any){
  console.log("==================Handling leave================");
  const payload = JSON.parse(peer);
  const leftPeerName: string | null = client.removePeer(payload.peerId);
  if(!leftPeerName){
    return;
  }
  addMessageToChat(`${leftPeerName} has left the chat.`);
}