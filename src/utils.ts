import { Client, User } from './handler.js';
import { addMessageToChat } from './index.js';

export function setupPeerMessages(client: Client, subcluster: any){
  subcluster.on("requestName", (requesterMessage: any) => {
    _requestName(client, subcluster, requesterMessage);
  })

  subcluster.on("resolveName", (peer: any) => {
    _resolveName(client, subcluster, peer);
  });

  subcluster.on("message", (message: any) => {
    client.handleMessage(message);
  });

  subcluster.on("#join", (newPeer: any) => {    
    _handleJoin(client, subcluster, newPeer);
  });
  subcluster.on("#leave", (peer: any) => {
    _handleLeave(client, subcluster, peer);
  });
}


function _requestName(client: Client, subcluster: any, requesterMessage: any){
  const json = JSON.parse(requesterMessage);
  const requesterId = json.peerId;
  subcluster.peers.get(requesterId).emit("resolveName", { peerId: client.peerId, displayName: client.displayName });
}

function _resolveName(client: Client, subcluster: any, peerMessage: any){
  const json = JSON.parse(peerMessage);
  const peerName = json.displayName;
  const peerId = json.peerId
  const resolvedPeer = subcluster.peers.get(peerId);
  if(!resolvedPeer){
    console.error("Peer not found in subcluster");
  }
  const newUser = new User(peerName, resolvedPeer);
  client.users.push(newUser);
  addMessageToChat(`${peerName} has joined the chat.`);
}

function _handleJoin(client: Client, subcluster: any, newPeer: any){
  const resolvedPeer = subcluster.peers.get(newPeer.peerId);
  if(resolvedPeer){
    console.log("Found peer that just joined: " + resolvedPeer.peerId);
    resolvedPeer.emit("requestName", { peerId: client.peerId });
  }
}

function _handleLeave(client: Client, subcluster: any, peer: any){
  console.log("============================================")
  console.log("________DETECTED LEAVE__________")
  console.log("PAYLOAD: ")
  console.log(JSON.stringify(peer))
  addMessageToChat(`${peer.peerId} has left the chat.`);
}