export class Message {
    content = '';
    author = '';
    ip = '';
    port = '';
    constructor(content, author, ip, port) {
        this.content = content;
        this.author = author;
        this.ip = ip;
        this.port = port;
    }
}
