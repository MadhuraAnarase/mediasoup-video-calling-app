import { WebRtcTransport, Producer, Consumer, MediaKind } from 'mediasoup/node/lib/types';
import { router } from '../config/mediasoup';

const transports = new Map<string, WebRtcTransport>();
const producers = new Map<string, Producer>();  // Store producers by transport ID
const consumers = new Map<string, Consumer>();  // Store consumers by transport ID

// Create WebRTC Transport
export async function createTransport(): Promise<WebRtcTransport> {
  const transport = await router.createWebRtcTransport({
    listenIps: [{ ip: '0.0.0.0', announcedIp: process.env.MEDIASOUP_LISTEN_IP || '127.0.0.1' }],
    enableUdp: true,
    enableTcp: true,
  });

  transports.set(transport.id, transport);
  return transport;
}

// Connect WebRTC Transport
export async function connectTransport(transportId: string, dtlsParameters: any) {
  const transport = transports.get(transportId);
  if (!transport) {
    throw new Error(`Transport with ID ${transportId} not found`);
  }
  await transport.connect({ dtlsParameters });
}

// Create Media Producer (Audio/Video)
export async function createProducer(transportId: string, kind: MediaKind, rtpParameters: any): Promise<Producer> {
  const transport = transports.get(transportId);
  if (!transport) {
    throw new Error(`Transport with ID ${transportId} not found`);
  }

  const producer = await transport.produce({ kind, rtpParameters });
  producers.set(producer.id, producer);
  return producer;
}

// Create Media Consumer
export async function createConsumer(transportId: string, producerId: string, rtpCapabilities: any): Promise<Consumer> {
  const transport = transports.get(transportId);
  const producer = producers.get(producerId);

  if (!transport || !producer) {
    throw new Error(`Invalid transport or producer`);
  }

  const consumer = await transport.consume({
    producerId: producer.id,
    rtpCapabilities,
  });

  consumers.set(consumer.id, consumer);
  return consumer;
}
