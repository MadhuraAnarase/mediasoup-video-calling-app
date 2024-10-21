// server.ts
import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import mediasoupRouter from './api/mediasoup/router'; // Adjusted import
import { initMediasoup } from './config/mediasoup';
import { Server as SocketIOServer } from 'socket.io';
import { connectTransport, createTransport } from './services/mediasoup.service';
import { setMediasoupRouter } from './api/mediasoup/router';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3100;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (_, res: Response) => {
    res.sendFile(path.join(__dirname, '../client', 'index.html'));
});

// Use the router for API routes
app.use('/api', mediasoupRouter);

// Store all connected clients and their transports
const clients: { [key: string]: any } = {}; // Store client transports and media

async function startServer() {
    try {
        const routerInstance = await initMediasoup();
        setMediasoupRouter(routerInstance);

        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
}

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Notify all clients about the new connection
    io.emit('new-peer', socket.id); // Notify all clients about the new peer

    // Create a new transport for this client
    socket.on('create-transport', async () => {
        try {
            const transport = await createTransport();
            clients[socket.id] = {
                transport,
                producers: []
            };
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

    socket.on('connect-transport', async ({ transportId, dtlsParameters }) => {
        try {
            await connectTransport(transportId, dtlsParameters);
            socket.emit('transport-connected', transportId);
        } catch (error) {
            socket.emit('error', `Failed to connect transport: ${error}`);
        }
    });

    socket.on('produce', async ({ kind, rtpParameters }) => {
        try {
            const producer = await clients[socket.id].transport.produce({ kind, rtpParameters });
            clients[socket.id].producers.push(producer);

            // Notify other clients about the new producer
            socket.broadcast.emit('new-producer', {
                producerId: producer.id,
                socketId: socket.id,
                kind,
            });

            // Handle receiving track from producers
            producer.on('trackended', () => {
                console.log('Track ended:', producer.id);
                socket.broadcast.emit('producer-closed', { producerId: producer.id });
            });

        } catch (error) {
            console.error('Error producing track:', error);
            socket.emit('error', `Failed to produce track: ${error}`);
        }
    });

    // When a client disconnects, clean up their resources
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        const client = clients[socket.id];
        if (client) {
            client.producers.forEach((producer: any) => producer.close());
            client.transport.close();
            delete clients[socket.id];

            // Notify all clients about the disconnection
            socket.broadcast.emit('peer-disconnected', socket.id);
        }
    });
});

startServer();
