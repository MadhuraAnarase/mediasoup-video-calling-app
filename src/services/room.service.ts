interface Room {
    id: string;
    peers: string[];
  }
  
  const rooms: Map<string, Room> = new Map();
  
  export function createRoom(roomId: string): Room {
    if (rooms.has(roomId)) {
      throw new Error(`Room with ID ${roomId} already exists`);
    }
    const room = { id: roomId, peers: [] };
    rooms.set(roomId, room);
    return room;
  }
  
  export function getRoom(roomId: string): Room | undefined {
    return rooms.get(roomId);
  }
  
  export function addPeerToRoom(roomId: string, peerId: string) {
    const room = rooms.get(roomId);
    if (!room) {
      throw new Error(`Room with ID ${roomId} not found`);
    }
    if (!room.peers.includes(peerId)) {
      room.peers.push(peerId);
    }
  }
  
  export function removePeerFromRoom(roomId: string, peerId: string) {
    const room = rooms.get(roomId);
    if (room) {
        room.peers = room.peers.filter((peer) => peer !== peerId);
        if (room.peers.length === 0) {
            rooms.delete(roomId); // Delete room if no peers left
        }
    }
}