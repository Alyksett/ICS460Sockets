

function handleMessageType(message){
    switch (message.type){
        case ("public"):
            console.log("public")
        case ("private"):
            console.log("private")
        case ("join"):
            console.log("join")
        case ("leave"):
            console.log("leave")
        case ("type"):
            console.log("type")
        case _:
            console.log(`unhandled message type: ${type}`)
    }
}




export class Message{
    constructor(content, type, author, ip, port){
        this.content = content;
        this.type
        this.author = author;
        this.ip = ip;
        this.port = port;
    }
}


export class Peer{
    constructor(name, address, port, peerReference){
        this.name = name
        this.address = address
        this.port = port
        this.peerReference = peerReference
    }
    toString(){
        return `Name: ${this.name}\n Address: ${this.address}\n Port: ${this.port}`
    }
}