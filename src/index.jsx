import process from 'socket:process'
import os from 'socket:os'
import { listener } from './network/driver' 
import { createRoot } from 'react-dom/client'
import React, { useState } from 'react'

if (process.env.DEBUG) {
  console.log('started in debug mode')
}

function AppContainer() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [inputKey, setKeyInput] = useState('');

  const setKey = () => {
    if (inputKey.trim() !== '') {
      listener(inputKey, addExternalMessage);
    }
  };
  const sendMessage = () => {
    if (input.trim() !== '') {    
      setMessages([...messages, input]);
      setInput('');
    }
  };
  
  const addExternalMessage = (text) => {
    if (text.trim() !== '') {
      setMessages((prevMessages) => [...prevMessages, text]);
    }
  };


  return (
    <div style={{ maxWidth: '400px', margin: 'auto', padding: '20px', border: '1px solid #ccc' }}>
      <h2 style={{color:'antiquewhite'}}>Simple Chat</h2>
      <div style={{ height: '300px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px' }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: '5px', padding: '5px', background: '#f1f1f1', borderRadius: '5px' }}>
            {msg}
          </div>
        ))}
      </div>
      <input 
        type="text" 
        value={input} 
        onChange={(e) => {
          setInput(e.target.value)}
        } 
        style={{ width: '100%', padding: '8px', marginTop: '10px' }}
      />
      <button onClick={sendMessage} style={{ width: '100%', padding: '8px', marginTop: '5px' }}>Send</button>
      <br />      
      <br />      
      <br />      
      <input 
        type="text" 
        value={inputKey} 
        onChange={(e) => {
          setKeyInput(e.target.value)}
        } 
        style={{ width: '100%', padding: '8px', marginTop: '10px' }}
      />
      <button onClick={setKey} style={{ width: '100%', padding: '8px', marginTop: '5px' }}>Set Key</button>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<AppContainer />);
