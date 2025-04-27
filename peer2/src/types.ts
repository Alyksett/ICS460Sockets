export class Message{
    content: any = '';
    author: any = '';
    ip: any = '';
    port: any = '';


    constructor(content: any, author: any, ip: any, port: any){
        this.content = content;
        this.author = author;
        this.ip = ip;
        this.port = port;
    }


}

