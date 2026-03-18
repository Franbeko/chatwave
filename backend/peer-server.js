import { PeerServer } from 'peer';

PeerServer({ port: 3001, path: '/peerjs' });

console.log('PeerJS server running on port 3001');