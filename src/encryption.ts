import sodium from "socket:crypto/sodium"
import { Buffer } from 'node:buffer';


export function encryptName(name: string, keyStr: string): string {
  // Ensure key is exactly 32 bytes (if not, hash it)
  const key = Buffer.from(keyStr, 'utf8');
  const hashedKey = sodium.crypto_hash_sha256(key); // Hash the key if necessary
  
  const message = Buffer.from(name, 'utf8');
  if (message.length === 0) {
    throw new Error('Message must not be empty');
  }

  // Ensure nonce size is correct (should be sodium.crypto_secretbox_NONCEBYTES)
  const nonceLength = sodium.crypto_secretbox_NONCEBYTES;
  console.log("length " + nonceLength);
  
  const nonce = Buffer.alloc(nonceLength);
  console.log(typeof nonce.length);
  
  
  // Fill the nonce with random bytes
  sodium.randombytes_buf(nonce);  // Randomize the nonce buffer
  
  const ciphertext = Buffer.alloc(message.length + sodium.crypto_secretbox_MACBYTES);
  sodium.crypto_secretbox_easy(ciphertext, message, nonce, hashedKey);

  // Store nonce + ciphertext together
  return Buffer.concat([nonce, ciphertext]).toString('hex');
}

function decryptId(idHex: string, key: Buffer): string {
  const idBuffer = Buffer.from(idHex, 'hex');
  const nonce = idBuffer.slice(0, sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = idBuffer.slice(sodium.crypto_secretbox_NONCEBYTES);

  const decrypted = Buffer.alloc(ciphertext.length - sodium.crypto_secretbox_MACBYTES);
  if (!sodium.crypto_secretbox_open_easy(decrypted, ciphertext, nonce, key)) {
    throw new Error('Failed to decrypt');
  }
  return decrypted.toString('utf8');
}