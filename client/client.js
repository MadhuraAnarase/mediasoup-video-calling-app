// client.js
const socket = io('https://b5fb-223-233-86-161.ngrok-free.app/');
const localVideo = document.getElementById('local-video');
const remoteVideosContainer = document.getElementById('remote-videos');

let localStream;
let device;
let sendTransport; 
let remoteClients = {}; // Store remote client video elements

// Get user media
async function getUserMedia() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        localVideo.srcObject = localStream;
        socket.emit('create-transport');
    } catch (error) {
        console.error('Error accessing media devices.', error);
    }
}

// Create device for Mediasoup
async function createDevice() {
    try {
        const { rtpCapabilities } = await fetch('/api/rtp-capabilities').then(res => res.json());
        device = new mediasoupClient.Device();
        await device.load({ routerRtpCapabilities: rtpCapabilities });
        console.log('Device created and RTP capabilities loaded:', device);
    } catch (error) {
        console.error('Error creating device:', error);
    }
}

// Socket event for transport creation
socket.on('transport-created', async (data) => {
    await createDevice();
    sendTransport = device.createSendTransport(data); // Store send transport

    sendTransport.on('connect', async ({ dtlsParameters }, callback) => {
        socket.emit('connect-transport', { transportId: sendTransport.id, dtlsParameters });
        callback();
    });

    // Send audio and video producers
    const videoTrack = localStream.getVideoTracks()[0];
    const audioTrack = localStream.getAudioTracks()[0];

    try {
        await sendTransport.produce({ track: videoTrack, appData: { kind: 'video' } });
        await sendTransport.produce({ track: audioTrack, appData: { kind: 'audio' } });
        console.log('Audio and video tracks sent.');
    } catch (error) {
        console.error('Error producing track:', error);
    }
});

// When a new peer connects
socket.on('new-peer', (peerId) => {
    const remoteVideo = document.createElement('video');
    remoteVideo.id = `remote-${peerId}`;
    remoteVideo.autoplay = true;
    remoteVideo.style.width = '200px'; // Example styling
    remoteVideo.style.height = '150px'; // Example styling
    remoteVideosContainer.appendChild(remoteVideo);
    remoteClients[peerId] = remoteVideo; // Store the remote video element
});

// Handle receiving remote tracks
socket.on('new-producer', async ({ producerId, socketId }) => {
    const remoteVideo = remoteClients[socketId];

    // Create a new consumer for the producer
    const consumerTransport = device.createRecvTransport(/* Transport parameters here */);

    consumerTransport.on('connect', async ({ dtlsParameters }, callback) => {
        socket.emit('connect-transport', { transportId: consumerTransport.id, dtlsParameters });
        callback();
    });

    // Receive the track
    const { rtpParameters } = await socket.emit('consume', { producerId, transportId: consumerTransport.id });
    const consumer = await consumerTransport.consume({ id: producerId, rtpParameters });

    // Add the track to the remote video element
    if (remoteVideo) {
        const remoteStream = new MediaStream([consumer.track]);
        remoteVideo.srcObject = remoteStream;
    }
});

// When a producer closes
socket.on('producer-closed', ({ producerId }) => {
    for (const [clientId, remoteVideo] of Object.entries(remoteClients)) {
        if (producerId === clientId) {
            remoteVideo.srcObject.getTracks().forEach(track => track.stop());
            remoteVideo.srcObject = null;
            remoteVideosContainer.removeChild(remoteVideo);
            delete remoteClients[clientId]; // Remove from the client list
            break;
        }
    }
});

// Handle peer disconnection
socket.on('peer-disconnected', (peerId) => {
    const remoteVideo = document.getElementById(`remote-${peerId}`);
    if (remoteVideo) {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.srcObject = null;
        remoteVideosContainer.removeChild(remoteVideo);
        delete remoteClients[peerId]; // Remove from remote clients
    }
});

// Function to end the call
function endCall() {
    localStream.getTracks().forEach(track => track.stop());
    socket.emit('call-ended', socket.id);
    while (remoteVideosContainer.firstChild) {
        remoteVideosContainer.removeChild(remoteVideosContainer.firstChild);
    }
    console.log('Call ended.');
}

// When a call ends
socket.on('call-ended', (peerId) => {
    console.log(`Call ended by peer: ${peerId}`);
    const remoteVideo = document.getElementById(`remote-${peerId}`);
    if (remoteVideo) {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.srcObject = null;
        remoteVideosContainer.removeChild(remoteVideo);
        delete remoteClients[peerId]; // Remove from remote clients
    }
});

// Start the app
getUserMedia();
