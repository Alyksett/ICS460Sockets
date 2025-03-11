import { network, Encryption } from 'socket:network'
// const peerId = await Encryption.createId()
export const listener = async(peerId, callback) => {
    //
    // Create (or read from storage) a peer ID and a key-pair for signing.
    //
    
    const signingKeys = await Encryption.createKeyPair()

    //
    // Create (or read from storage) a clusterID and a symmetrical/shared key.
    //
    const clusterId = await Encryption.createClusterId('TEST')
    const sharedKey = await Encryption.createSharedKey('TEST')

    //
    // Create a socket that can send a receive network events. The clusterId
    // helps to find other peers and be found by other peers.
    //
    const socket = await network({ peerId, clusterId, signingKeys })

    //
    // Create a subcluster (a partition within your cluster)
    //
    const cats = await socket.subcluster({ sharedKey })

    //
    // A published message on this subcluster has arrived!
    //
    cats.on('mew', value => callback(value))

    //
    // A message will be published into this subcluster
    //
    cats.emit('mew', { food: true })

    //
    // Another peer from this subcluster has directly connected to you.
    //
    cats.on('#join', peer => {
    peer.on('mew', value => {
        callback(value)
    })
})
}

