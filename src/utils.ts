import { Client, User } from './types.js';
import { addMessageToChat } from './index.js';
import { Packet } from 'socket:network';
import Buffer from 'socket:buffer';
import { PacketQuery } from 'socket:latica/packets';
import { randomBytes } from 'socket:crypto';
  
export async function packetQuery(query: any){
  // copied from the source code and it works
  // They don't really make it clear what usr1/2/3 are, likely dummy previous packet IDs
  const packet = new PacketQuery({
    message: query,
    usr1: Buffer.from(String(Date.now())),
    usr3: Buffer.from(randomBytes(32)),
    usr4: Buffer.from(String(1))
  })
  // Also very unclear why we're encoding and decoding
  const data = await Packet.encode(packet)
  const p = Packet.decode(data)

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
  if(messagePeer === client.peer.peerId){
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
  if(messagePeer === client.peer.peerId){
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
  if(messagePeer === client.peer.peerId){
    console.log("Message is from self. Ignoring.");
    return;
  }
  const finalMessage = `${messageAuthor}: ${messageContent}`;
  addMessageToChat(finalMessage);
}

// This is called when the subcluster (network of peers) receives a #join event 
// This happens internally when we do subcluster things

// the newPeer argument is given to us by SocketSupply and it's... some sort of type.
// It's similar to RemotePeer but I can't figure out what it really is
async function _handleJoin(client: Client, subcluster: any, newPeer: any){
  // in theory (and ideally) we'd use these message the peer themselves, but right now we're 
  // just sending a PacketQuery to the network... 
  const newPeerId = newPeer.peerId;
  const newPeerPort = newPeer._peer.port;
  const newPeerAddress = newPeer._peer.address;

  // We want to get this new peer's name, so we construct a PacketQuery to send into the network of peers
  // Again, should probably just send a msg to the actual peer themselves via client.peer.send(msg, newPeerPort, newPeerAddress)
  // but I spent like 6 hours trying that and couldn't get it to work :shrug:
  const message = {"operation":"getName", "address":client.peer.address, "port":client.peer.port, "id":client.peer.peerId}
  
  // use util funtion to construct a socketsupply PacketQuery
  const packet = await packetQuery(message)

  // send this packet to the network (and eventually the new peer will get it and respond to us)
  client.peer.query(packet);

}

function _requestName(client: Client, subcluster: any, requesterMessage: any){
  console.log("==================Handling requestName================");
  const json = JSON.parse(requesterMessage);
  const requesterId = json.peerId;
  if(requesterId === client.peer.peerId){
    console.log("Self request detected. Ignoring.");
    return;
  }
  subcluster.peers.get(requesterId).emit("resolveName", { peerId: client.peer.peerId, displayName: client.displayName });
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


