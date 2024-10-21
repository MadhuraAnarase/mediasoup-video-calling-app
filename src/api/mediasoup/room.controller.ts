import { io } from '../../app';
import { Socket } from 'socket.io';
import { connectTransport, createTransport, createProducer, createConsumer } from '../../services/mediasoup.service';
import { createRoom, getRoom, addPeerToRoom } from '../../services/room.service';

io.on('connection', (socket: Socket) => {
    console.log('New client connected:', socket.id);

    // Create WebRTC Transport
    socket.on('create-transport', async () => {
        try {
            const transport = await createTransport();
            socket.emit('transport-created', {
                id: transport.id,
                iceParameters: transport.iceParameters,
                iceCandidates: transport.iceCandidates,
                dtlsParameters: transport.dtlsParameters,
            });
        } catch (error) {
            socket.emit('error', `Failed to create transport: ${error}`);
        }
    });

    // Connect WebRTC Transport
    socket.on('connect-transport', async ({ transportId, dtlsParameters }) => {
        try {
            await connectTransport(transportId, dtlsParameters);
            socket.emit('transport-connected', transportId);
        } catch (error) {
            socket.emit('error', `Failed to connect transport: ${error}`);
        }
    });

    // Create Media Producer (Audio/Video)
    socket.on('produce', async ({ transportId, kind, rtpParameters }) => {
        try {
            const producer = await createProducer(transportId, kind, rtpParameters);
            socket.emit('produced', { id: producer.id, kind });
        } catch (error) {
            socket.emit('error', `Failed to create producer: ${error}`);
        }
    });

    // Consume Media (Audio/Video)
    socket.on('consume', async ({ transportId, producerId, rtpCapabilities }) => {
        try {
            const consumer = await createConsumer(transportId, producerId, rtpCapabilities);
            socket.emit('consumed', {
                id: consumer.id,
                producerId: producerId,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters,
            });
        } catch (error) {
            socket.emit('error', `Failed to create consumer: ${error}`);
        }
    });

    // Room Management
    socket.on('create-room', (roomId: string) => {
        try {
            createRoom(roomId);
            socket.join(roomId);
            console.log(`Room ${roomId} created by ${socket.id}`);
        } catch (error) {
            socket.emit('error', `Error creating room: ${error}`);
        }
    });

    socket.on('join-room', (roomId: string) => {
        try {
            const room = getRoom(roomId);
            if (room) {
                addPeerToRoom(roomId, socket.id);
                socket.join(roomId);
                console.log(`Client ${socket.id} joined room ${roomId}`);
            } else {
                socket.emit('room-not-found', roomId);
            }
        } catch (error) {
            socket.emit('error', `Error joining room: ${error}`);
        }
    });

    // Handle call ended
    socket.on('call-ended', (peerId) => {
      console.log(`Call ended by: ${peerId}`);
      
      // Get the array of rooms the socket is in
      const rooms = Array.from(socket.rooms);
  
      // Ensure there's at least one room to emit to
      if (rooms.length > 0) {
          const roomId = rooms[0]; // Assuming the socket is in at least one room
          socket.to(roomId).emit('call-ended', peerId); // Broadcast to other peers in the same room
      }
  });
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});
