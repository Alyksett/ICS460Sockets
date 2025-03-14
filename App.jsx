import './App.css'
import Chat from './Chat';
import chatIcon from './assets/icon.png'


function App() {

  return (
    <>
      <img src={chatIcon} alt="chapt pot icon" className='icon' />

      <Chat />
    </>
  );
}

export default App
/*

peer:
Peer own properties:
[
  '_events',
  '_eventsCount',
  '_contexts',
  '_maxListeners',
  '_on',
  '_emit',
  'peerId',
  'port',
  'address',
  'emit',
  '_peer'
]
  'on',
EventEmitter {
  _events: {},
  _eventsCount: 0,
  _contexts: Map(0) {},
  _maxListeners: undefined,
  _on: [Function: on],
  _emit: [Function: emit],
  peerId: '5f89ec7200997fb0c6f3161f6c14b1ed5138258e4aac9ebca8bf0310b4d78592',
  address: '174.20.45.137',
  emit: [AsyncFunction],
  on: [AsyncFunction],
  port: 50732,
  _peer:
    {
      address: '174.20.45.137',
      clusters: { lO4FkzXlh+UBzEv5BhPggU8Ap7CLx8ZI/YZaKvaiLMI=: [Object] },
      connected: true,
      lastRequest: 0,
      lastUpdate: 1741720363283,
      natType: 7,
      peerId: '5f89ec7200997fb0c6f3161f6c14b1ed5138258e4aac9ebca8bf0310b4d78592',
      port: 50732
    }
}

*/