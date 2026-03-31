const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const RoomManager = require('./src/roomManager');
const { calculateStatistics } = require('./src/statistics');
const { validateUsername, validateRoomId } = require('./src/validation');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const roomManager = new RoomManager();

app.use(express.static('public'));

function broadcastMessage(roomId, message) {
  io.to(roomId).emit('log message', message);
}

function sendAdminMessage(roomId, message) {
  const room = roomManager.getRoom(roomId);
  if (room && room.adminId) {
    io.to(room.adminId).emit('log message', message);
  }
}

function emitUserList(roomId) {
  const room = roomManager.getRoom(roomId);
  if (room) {
    io.to(roomId).emit('user list', roomManager.getUsersForDisplay(roomId));
  }
}

io.on('connection', (socket) => {
  socket.on('join room', (roomId, name) => {
    const nameResult = validateUsername(name);
    const roomResult = validateRoomId(roomId);
    if (!nameResult.valid || !roomResult.valid) return;

    socket.join(roomResult.sanitized);
    const { room, user, isNewAdmin } = roomManager.joinRoom(roomResult.sanitized, socket.id, nameResult.sanitized);

    if (isNewAdmin) {
      broadcastMessage(roomResult.sanitized, `${user.name} is now the Admin`);
      io.to(user.id).emit('admin');
    }

    emitUserList(roomResult.sanitized);

    if (room.cardSetIndex !== undefined) {
      io.to(socket.id).emit('change card set', room.cardSetIndex);
    }
    if (room.stats) {
      io.to(socket.id).emit('show stats', room.stats);
      io.to(socket.id).emit('show results');
    }
    sendAdminMessage(roomResult.sanitized, `User "${nameResult.sanitized}" joined`);
  });

  socket.on('select card', (roomId, card, cardIndex) => {
    const user = roomManager.selectCard(roomId, socket.id, card, cardIndex);
    if (user) {
      sendAdminMessage(roomId, `User "${user.name}" selected: "${card}"`);
      emitUserList(roomId);
    }
  });

  socket.on('clear', (roomId) => {
    if (roomManager.clearRoom(roomId, socket.id)) {
      io.to(roomId).emit('clear');
      emitUserList(roomId);
      io.to(roomId).emit('show stats', undefined);
    }
  });

  socket.on('show results', (roomId, useIndexStatsCalculation, ignoredIndices) => {
    const result = roomManager.showResults(roomId, socket.id, calculateStatistics, useIndexStatsCalculation, ignoredIndices);
    if (result) {
      io.to(roomId).emit('show results');
      emitUserList(roomId);
      io.to(roomId).emit('show stats', result.stats);
    }
  });

  socket.on('change card set', (roomId, cardSetIndex) => {
    const index = Number(cardSetIndex);
    if (roomManager.changeCardSet(roomId, socket.id, index)) {
      io.to(roomId).emit('change card set', index);
    }
  });

  socket.on('disconnect', () => {
    const result = roomManager.removeUser(socket.id);
    if (!result || result.roomDeleted) return;

    const { roomId, newAdmin } = result;
    if (newAdmin) {
      broadcastMessage(roomId, `${newAdmin.name} is now the Admin`);
      io.to(newAdmin.id).emit('admin');
    }
    emitUserList(roomId);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = { app, server, io, roomManager };
