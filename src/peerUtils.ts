import { Peer, Packet } from "socket:latica/index"
import { Client } from "./types.js";
import Buffer from 'socket:buffer';
import { PacketQuery } from 'socket:latica/packets';
import { randomBytes } from 'socket:crypto';
import { addMessageToChat } from "./index.js";

async function packetQuery(query: any){
  // I copied all this from the source code and it works
  // They don't really make it clear what usr1/2/3 are but... it works?
  const packet = new PacketQuery({
    message: query,
    usr1: Buffer.from(String(Date.now())),
    usr3: Buffer.from(randomBytes(32)),
    usr4: Buffer.from(String(1)),
  })

  const data = await Packet.encode(packet)
  const p = Packet.decode(data)

  return p
}

export async function initializeCallbacks(peer: Peer, client: Client){
  const _recGetName = async () => {
    // construct the "message" field in the packet (Note this is the same  structure we're parsing before)
    const message = {"operation":"sendName", "name": client.displayName, "address":peer.address, "port":peer.port, "id":peer.peerId}
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
    console.log(message);
    const pid = message.id;
    console.log("Mapped pid " + (message.id).substring(0, 5) + " with display name: " + message.name)
    const remotePeer = {"peerId":message.id, "address":message.address, "port":message.port}
    const name = message.name
    const wasPeerAdded = client.addPeer(name, remotePeer);
    if(wasPeerAdded){
      return;
    }

    addMessageToChat(`${name} joined the chat`, true);
  }

  const _handleDirectMessage = async (message: any, client: Client) => {
    console.log(message);
    const author = client.getUserById(message.peerId)?.displayName
    const target = message.targetId
    if(target !== client.peer.peerId){ // yikes
      return; 
    }
    const formatted = `Direct from ${author}: ${message.message}`
    addMessageToChat(formatted, true)
    
  }

  // When we (as in Peer) receive a PacketQuery
  (peer as any).onQuery = async (packet: any ) => {
    // get the "message" field of the packet
    // When we construct the PacketQuery in utils/_handleLogin WE set this message field with some 
    // information (ex: login)
    const json = packet.message
    const operation = json.operation
    // Match the operation someone else using our program sent
    console.log("Handling operation: " + operation);
    
    switch (operation){
      case "getName": await _recGetName();break; // They told us "Send me your display name"
      case "sendName": await _recSendName(json);break; // They told us "Here's my display name"
      case "directMessage": await _handleDirectMessage(json, client);break; // They told us "Here's my display name"
      default: console.log("Couldn't match operation: " + operation);
    }
  }
}



