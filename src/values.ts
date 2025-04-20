import { RemotePeer } from "socket:latica/index";

export const PEER_ID = "Math.random().toString(36);"
export const SIGNING_KEY = "Math.random().toString(36);"
export const CLUSTER_ID = "Math.random().toString(36)";
export const SHARED_KEY = "Math.random().toString(36)";

// I have no idea what these are but they're hard-coded in SS... maybe we need these...?
// By looking a little bit they look like aws data center things, perhaps SS needs these to discover peers on the internet...
export const strangePeers = JSON.parse(`
    [{"address":"44.213.42.133","port":10885,"peerId":"4825fe0475c44bc0222e76c5fa7cf4759cd5ef8c66258c039653f06d329a9af5","natType":31,"indexed":true},{"address":"107.20.123.15","port":31503,"peerId":"2de8ac51f820a5b9dc8a3d2c0f27ccc6e12a418c9674272a10daaa609eab0b41","natType":31,"indexed":true},{"address":"54.227.171.107","port":43883,"peerId":"7aa3d21ceb527533489af3888ea6d73d26771f30419578e85fba197b15b3d18d","natType":31,"indexed":true},{"address":"54.157.134.116","port":34420,"peerId":"1d2315f6f16e5f560b75fbfaf274cad28c12eb54bb921f32cf93087d926f05a9","natType":31,"indexed":true},{"address":"184.169.205.9","port":52489,"peerId":"db00d46e23d99befe42beb32da65ac3343a1579da32c3f6f89f707d5f71bb052","natType":31,"indexed":true},{"address":"35.158.123.13","port":31501,"peerId":"4ba1d23266a2d2833a3275c1d6e6f7ce4b8657e2f1b8be11f6caf53d0955db88","natType":31,"indexed":true},{"address":"3.68.89.3","port":22787,"peerId":"448b083bd8a495ce684d5837359ce69d0ff8a5a844efe18583ab000c99d3a0ff","natType":31,"indexed":true},{"address":"3.76.100.161","port":25761,"peerId":"07bffa90d89bf74e06ff7f83938b90acb1a1c5ce718d1f07854c48c6c12cee49","natType":31,"indexed":true},{"address":"3.70.241.230","port":61926,"peerId":"1d7ee8d965794ee286ac425d060bab27698a1de92986dc6f4028300895c6aa5c","natType":31,"indexed":true},{"address":"3.70.160.181","port":41141,"peerId":"707c07171ac9371b2f1de23e78dad15d29b56d47abed5e5a187944ed55fc8483","natType":31,"indexed":true},{"address":"3.122.250.236","port":64236,"peerId":"a830615090d5cdc3698559764e853965a0d27baad0e3757568e6c7362bc6a12a","natType":31,"indexed":true},{"address":"18.130.98.23","port":25111,"peerId":"ba483c1477ab7a99de2d9b60358d9641ff6a6dc6ef4e3d3e1fc069b19ac89da4","natType":31,"indexed":true},{"address":"13.42.10.247","port":2807,"peerId":"032b79de5b4581ee39c6d15b12908171229a8eb1017cf68fd356af6bbbc21892","natType":31,"indexed":true},{"address":"18.229.140.216","port":36056,"peerId":"73d726c04c05fb3a8a5382e7a4d7af41b4e1661aadf9020545f23781fefe3527","natType":31,"indexed":true}]
  `).map((o: any) => new RemotePeer({ ...o, indexed: true }, null));
``
export const PEER_ID_MASK = strangePeers.map((o: RemotePeer) => o.peerId)
