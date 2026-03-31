/**
 * Room Manager — manages room state for Planning Poker.
 *
 * Rooms are stored in a plain object keyed by roomId.
 * Each room has: { users: [], adminId, cardSetIndex, showResults, stats }
 * Each user has: { id, name, card, cardIndex }
 *
 * This module is pure logic — no Socket.IO dependency.
 */

class RoomManager {
  constructor() {
    this.rooms = {};
    this.socketToRoom = {};
  }

  /**
   * Create a room if it doesn't exist and return it.
   */
  getOrCreateRoom(roomId) {
    let isReuse = false;
    if (!this.rooms[roomId]) {
      if (this.deletedRoomIds && this.deletedRoomIds.has(roomId)) {
        isReuse = true;
        this.deletedRoomIds.delete(roomId);
      }
      this.rooms[roomId] = {
        users: [],
        adminId: undefined,
        cardSetIndex: undefined,
        showResults: false,
        stats: undefined,
      };
    }
    return { room: this.rooms[roomId], isReuse };
  }

  /**
   * Get an existing room, or undefined.
   */
  getRoom(roomId) {
    return this.rooms[roomId];
  }

  /**
   * Add a user to a room. Returns { room, user, isNewAdmin }.
   */
  joinRoom(roomId, socketId, name) {
    const { room, isReuse } = this.getOrCreateRoom(roomId);
    const user = { id: socketId, name, card: undefined, cardIndex: undefined };
    room.users.push(user);
    this.socketToRoom[socketId] = roomId;

    let isNewAdmin = false;
    if (!room.adminId) {
      room.adminId = user.id;
      isNewAdmin = true;
    }

    return { room, user, isNewAdmin, isReuse };
  }

  /**
   * Toggle a card selection for a user. Returns the updated user or undefined.
   */
  selectCard(roomId, socketId, card, cardIndex) {
    const room = this.rooms[roomId];
    if (!room) return undefined;

    const user = room.users.find(u => u.id === socketId);
    if (!user) return undefined;

    user.card = (user.card === card) ? undefined : card;
    user.cardIndex = (user.cardIndex === cardIndex) ? undefined : cardIndex;
    return user;
  }

  /**
   * Clear all selections in a room. Only admin can do this.
   * Returns true if cleared, false if unauthorized.
   */
  clearRoom(roomId, socketId) {
    const room = this.rooms[roomId];
    if (!room || room.adminId !== socketId) return false;

    room.users = room.users.map(u => ({
      ...u,
      card: undefined,
      cardIndex: undefined,
    }));
    room.showResults = false;
    room.stats = undefined;
    return true;
  }

  /**
   * Reveal results and compute statistics. Only admin can do this.
   * Returns { stats } or undefined if unauthorized.
   */
  showResults(roomId, socketId, calculateStatistics, useIndexStatsCalculation, ignoredIndices) {
    const room = this.rooms[roomId];
    if (!room || room.adminId !== socketId) return undefined;

    room.showResults = true;

    const numericCards = room.users
      .map(user => {
        if (useIndexStatsCalculation) {
          return !ignoredIndices.includes(user.cardIndex) ? user.cardIndex : undefined;
        }
        return (typeof user.card === 'number') ? user.card : undefined;
      })
      .filter(v => v !== undefined);

    const stats = calculateStatistics(numericCards);
    room.stats = stats;
    return { stats };
  }

  /**
   * Change the card set for a room. Only admin can do this.
   */
  changeCardSet(roomId, socketId, cardSetIndex) {
    const room = this.rooms[roomId];
    if (!room || room.adminId !== socketId) return false;
    room.cardSetIndex = cardSetIndex;
    return true;
  }

  /**
   * Check if a socket is the admin of a room.
   */
  isAdmin(roomId, socketId) {
    const room = this.rooms[roomId];
    return room && room.adminId === socketId;
  }

  /**
   * Get the admin display name for a room (name with " (Admin)" suffix).
   */
  getAdminName(roomId) {
    const room = this.rooms[roomId];
    if (!room || !room.adminId) return undefined;
    const admin = room.users.find(u => u.id === room.adminId);
    return admin ? admin.name : undefined;
  }

  /**
   * Remove a user from their room on disconnect.
   * Returns { roomId, room, removedUser, newAdmin, roomDeleted }.
   */
  removeUser(socketId) {
    const roomId = this.socketToRoom[socketId];
    if (!roomId) return undefined;

    delete this.socketToRoom[socketId];
    const room = this.rooms[roomId];
    if (!room) return undefined;

    const removedUser = room.users.find(u => u.id === socketId);
    room.users = room.users.filter(u => u.id !== socketId);

    let newAdmin = undefined;
    if (socketId === room.adminId) {
      if (room.users.length > 0) {
        newAdmin = room.users[0];
        room.adminId = newAdmin.id;
      } else {
        room.adminId = undefined;
      }
    }

    let roomDeleted = false;
    if (room.users.length === 0) {
      delete this.rooms[roomId];
      if (!this.deletedRoomIds) this.deletedRoomIds = new Set();
      this.deletedRoomIds.add(roomId);
      roomDeleted = true;
    }

    return { roomId, room, removedUser, newAdmin, roomDeleted };
  }

  /**
   * Get the list of users with display names (admin gets " (Admin)" label).
   * This does NOT mutate the stored user names.
   */
  getUsersForDisplay(roomId) {
    const room = this.rooms[roomId];
    if (!room) return [];
    return room.users.map(u => ({
      ...u,
      displayName: u.id === room.adminId ? `${u.name} (Admin)` : u.name,
    }));
  }
}

module.exports = RoomManager;
