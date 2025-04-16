import { Client, User } from './handler.js';
import { addMessageToChat } from './index.js';

function pid(peerId: string){
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

  subcluster.on("#join", (newPeer: any) => {    
    _handleJoin(client, subcluster, newPeer);
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

export function _handleMessage(client: Client, subcluster: any, message: any){
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

function _handleJoin(client: Client, subcluster: any, newPeer: any){
  const newPeerId = newPeer.peerId;
  if(newPeerId === client.peerId){
    console.log("Self join detected. Ignoring.");
    return;
  }
  const resolvedPeer = subcluster.peers.get(newPeerId);
  
  if(resolvedPeer){
    console.log("Found peer that just joined: " + resolvedPeer.peerId);
    resolvedPeer.emit("requestName", { peerId: client.peerId });
  }else{
    console.error("Peer not found in subcluster: " + pid(newPeerId));
  }
}

function _requestName(client: Client, subcluster: any, requesterMessage: any){
  const json = JSON.parse(requesterMessage);
  const requesterId = json.peerId;
  if(requesterId === client.peerId){
    console.log("Self request detected. Ignoring.");
    return;
  }
  subcluster.peers.get(requesterId).emit("resolveName", { peerId: client.peerId, displayName: client.displayName });
}

function _resolveName(client: Client, subcluster: any, peerMessage: any){
  const json = JSON.parse(peerMessage);
  const peerName = json.displayName;
  const peerId = json.peerId
  const resolvedPeer = subcluster.peers.get(peerId);
  if(!resolvedPeer){
    console.error(`Peer with id: ${pid(peerId)} not found in subcluster`);
    return;
  }
  const newUser = new User(peerName, resolvedPeer);
  client.users.push(newUser);
  addMessageToChat(`${peerName} has joined the chat.`);
}


/*
When we have received a leave event
*/
function _handleLeave(client: Client, subcluster: any, peer: any){
  console.log("Handling leave");
  const payload = JSON.parse(peer);
  const leftPeerName: string | null = client.removePeer(payload.peerId);
  if(!leftPeerName){
    return;
  }
  addMessageToChat(`${leftPeerName} has left the chat.`);
}