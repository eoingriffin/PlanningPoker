const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const RoomManager = require('./src/roomManager');
const { calculateStatistics } = require('./src/statistics');
const { validateUsername, validateRoomId } = require('./src/validation');
const UsageStats = require('./src/usageStats');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const roomManager = new RoomManager();
const usageStats = new UsageStats();

const cardSets = [
  { index: 0, name: 'Fibonacci' },
  { index: 1, name: 'Fibonacci++' },
  { index: 2, name: 'T-shirt Sizes' },
  { index: 3, name: 'Relative Sizes' },
  { index: 4, name: 'Powers of 2' },
  { index: 5, name: 'Prime Numbers' },
  { index: 6, name: 'Logarithmic Scale' },
];

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
  usageStats.recordConnection();

  socket.on('join room', (roomId, name) => {
    const nameResult = validateUsername(name);
    const roomResult = validateRoomId(roomId);
    if (!nameResult.valid || !roomResult.valid) return;

    socket.join(roomResult.sanitized);
    const { room, user, isNewAdmin, isReuse } = roomManager.joinRoom(roomResult.sanitized, socket.id, nameResult.sanitized);

    usageStats.recordJoin(roomResult.sanitized, nameResult.sanitized);
    if (isReuse) {
      usageStats.recordRoomReuse();
    }

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
      usageStats.recordVotingRound();
      io.to(roomId).emit('show results');
      emitUserList(roomId);
      io.to(roomId).emit('show stats', result.stats);
    }
  });

  socket.on('change card set', (roomId, cardSetIndex) => {
    const index = Number(cardSetIndex);
    if (roomManager.changeCardSet(roomId, socket.id, index)) {
      const cardSet = cardSets.find(cs => cs.index === index);
      if (cardSet) usageStats.recordCardSetUsage(cardSet.name);
      io.to(roomId).emit('change card set', index);
    }
  });

  socket.on('disconnect', () => {
    usageStats.recordDisconnect();
    const result = roomManager.removeUser(socket.id);
    if (!result) return;

    const { roomId, newAdmin, roomDeleted } = result;
    if (roomDeleted) {
      usageStats.trackRoomDeletion(roomId);
      return;
    }
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

function shutdown() {
  usageStats.flush();
  usageStats.stop();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = { app, server, io, roomManager, usageStats };
