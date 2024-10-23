# Building a Video Calling App using Mediasoup, Express, and Socket.IO

## Introduction

Mediasoup is a cutting-edge, low-level library for real-time audio and video communications over WebRTC, focusing on scalability and performance. It's ideal for developing applications such as video conferencing, live streaming, and other real-time communication platforms.

Mediasoup offers flexible APIs that allow developers to create fully customized WebRTC servers, managing media streams (both sending and receiving) and allowing inter-client communication in real-time.

### Key Components of Mediasoup

1. **Worker**: 
Each Mediasoup server runs one or more worker processes that handle the intensive tasks related to media transmission and communication. Workers manage multiple WebRTC transports, producers, and consumers.
2. **Router**:
 Routers handle the media codecs and are responsible for routing media streams between different producers and consumers.
3. **Producer**: 
A producer is responsible for sending media (audio or video) into the Mediasoup server.
4. **Consumer**: 
A consumer subscribes to the media streams produced by a producer, receiving the transmitted media.
5. **Transport**: Transports are used to send and receive media streams between clients and the server over WebRTC.


### Steps to create video calling app
# Step 1: Install  required packages

Before starting, initialize a new Node.js project and install the necessary dependencies for Mediasoup, Express, Socket.IO, and TypeScript.

1. Initialize a Node.js project:

   `npm init -y` 
 
2. necessary packages like Mediasoup, Express, Socket.IO, and TypeScript.

    `npm install mediasoup express socket.io`
    `npm install --save-dev typescript @types/express @types/socket.io`

3. Initialize TypeScript:

    `npx tsc --init`
4. In the tsconfig.json file, set the following options for strict type-checking and using ES2020 as the target    version:
```ts
{
  "strict": true,
  "target": "ES2020"
}
```

    
# Step 2: Mediasoup server setup


# step 3:WebSocket Signaling
    1. Install WebSocket Client:
        <script src="/socket.io/socket.io.js"></script>
    2. Client WebRTC and Socket.IO Code.
    