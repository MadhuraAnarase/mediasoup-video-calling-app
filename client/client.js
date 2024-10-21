const socket = io('http://localhost:3100'); 
const localVideo = document.getElementById('local-video');
const remoteVideosContainer = document.getElementById('remote-videos');

let localStream;
let device;
let sendTransport; // Store send transport for cleanup

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
        await sendTransport.produce({ track: videoTrack });
        await sendTransport.produce({ track: audioTrack });
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
    remoteVideosContainer.appendChild(remoteVideo);
});

// Handle receiving remote tracks (adjust based on your signaling logic)
socket.on('track-received', ({ peerId, track }) => {
    const remoteVideo = document.getElementById(`remote-${peerId}`);
    if (remoteVideo) {
        const remoteStream = new MediaStream([track]);
        remoteVideo.srcObject = remoteStream;
    }
});

// Function to end the call
function endCall() {
    // Stop all local tracks
    localStream.getTracks().forEach(track => track.stop());

    // Notify the server to end the call
    socket.emit('call-ended', socket.id); // Emit call-ended event with peer ID

    // Remove remote video elements
    while (remoteVideosContainer.firstChild) {
        remoteVideosContainer.removeChild(remoteVideosContainer.firstChild);
    }

    console.log('Call ended.');
}

// When a call ends
socket.on('call-ended', (peerId) => {
    console.log(`Call ended by peer: ${peerId}`);
    
    // Clean up remote video element
    const remoteVideo = document.getElementById(`remote-${peerId}`);
    if (remoteVideo) {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop()); // Stop the remote stream
        remoteVideo.srcObject = null; // Clear the video element
        remoteVideosContainer.removeChild(remoteVideo); // Remove the remote video element
    }
});

// Event listeners for buttons
document.getElementById('start-call').addEventListener('click', () => {
    getUserMedia();
});

document.getElementById('end-call').addEventListener('click', () => {
    endCall(); // Call the endCall function when the button is clicked
});
