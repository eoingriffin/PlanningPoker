const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let rooms = {};

app.use(express.static('public'));

io.on('connection', (socket) => {
  socket.on('join room', (roomId, name) => {
    socket.join(roomId);
    let room = rooms[roomId];
    if (!room) {
      rooms[roomId] = room = {users: [], adminId: undefined, cardSetIndex: undefined, showResults: false, stats: undefined};
    }

    const newUser = {id: socket.id, name, card: undefined, cardIndex: undefined};
    room.users.push(newUser);
    if (!room.adminId) {
      setAdmin(roomId, newUser);
    } else {
      io.to(roomId).emit('user list', room.users);
    }
    if (!isNaN(room.cardSetIndex)) {
      io.to(socket.id).emit('change card set', room.cardSetIndex);
    }
    if (room.stats) {
      io.to(socket.id).emit('show stats', room.stats);
      io.to(socket.id).emit('show results');
    }
    sendAdminMessage(roomId, `User "${name}" joined`)
  });

  socket.on('select card', (roomId, card, cardIndex) => {
    const room = rooms[roomId];
    if (room) {
      const user = room.users.find(user => user.id === socket.id);
      if (user) {
        sendAdminMessage(roomId, `User "${user.name}" selected: "${card}"`)
        user.card = (user.card === card) ? undefined : card;
        user.cardIndex = (user.cardIndex === cardIndex) ? undefined : cardIndex;
        io.to(roomId).emit('user list', room.users);
      }
    }
  });

  socket.on('clear', (roomId) => {
    const room = rooms[roomId];
    if (room && isAdminUser(room)) {
      room.users = room.users.map(user => ({...user, card: undefined, cardIndex: undefined}));
      room.showResults = false;
      room.stats = undefined;
      io.to(roomId).emit('clear');
      io.to(roomId).emit('user list', room.users);
      io.to(roomId).emit('show stats', room.stats);
    }
  });

  function setAdmin(roomId, newAdmin) {
    const room = rooms[roomId];
    if (newAdmin) {
      room.adminId = newAdmin.id;
      broadcastMessage(roomId, `${newAdmin.name} is now the Admin`)
      newAdmin.name = `${newAdmin.name} (Admin)`;
      io.to(newAdmin.id).emit('admin');
    } else {
      room.adminId = undefined;
    }
    io.to(roomId).emit('user list', room.users);
  }

  function isAdminUser(room) {
    return room.adminId === socket.id;
  }

  function broadcastMessage(roomId, message) {
    io.to(roomId).emit('log message', message);
  }

  function sendAdminMessage(roomId, message) {
    const room = rooms[roomId];
    io.to(room.adminId).emit('log message', message);
  }

  function calculateStatistics(numericCards) {
    if (numericCards.length === 0) {
      return undefined;
    }

    const sortedCards = numericCards.slice().sort((a, b) => a - b);
    const len = sortedCards.length;

    // Calculate median
    const median = (len % 2 === 0)
      ? (sortedCards[len / 2 - 1] + sortedCards[len / 2]) / 2
      : sortedCards[Math.floor(len / 2)];

    // Calculate average
    const sum = sortedCards.reduce((a, b) => a + b, 0);
    const average = sum / len;

    // Calculate outliers (using 1.5 * IQR method)
    const q1 = sortedCards[Math.floor(len / 4)];
    const q3 = sortedCards[Math.ceil(len * (3 / 4)) - 1];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    const outliers = sortedCards.filter(card => !isNaN(card) && (card < lowerBound || card > upperBound));

    return {median, average, outliers};
  }

  socket.on('show results', (roomId, useIndexStatsCalculation, ignoredIndices) => {
    const room = rooms[roomId];
    if (room && isAdminUser(room)) {
      room.showResults = true;

      const userNumericCards = room.users
        .map(user => {
          if (useIndexStatsCalculation) {
            return ignoredIndices.indexOf(user.cardIndex) === -1 ? user.cardIndex : undefined;
          }
          return isNaN(user.card) ? undefined : user.card
        })
        .filter(numericCard => numericCard !== undefined);

      const stats = calculateStatistics(userNumericCards);
      room.stats = stats;
      io.to(roomId).emit('show results');
      io.to(roomId).emit('user list', room.users);
      io.to(roomId).emit('show stats', stats);
    }
  });

  socket.on('change card set', (roomId, cardSetIndex) => {
    const room = rooms[roomId];
    if (room && isAdminUser(room)) {
      room.cardSetIndex = cardSetIndex;
      io.to(roomId).emit('change card set', cardSetIndex);
    }
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      room.users = room.users.filter(user => user.id !== socket.id);
      if (socket.id === room.adminId) {
        const newAdmin = room.users.length > 0 ? room.users[0] : undefined;
        setAdmin(roomId, newAdmin);
      }
      io.to(roomId).emit('user list', room.users);
      if (room.users.length === 0) {
        delete rooms[roomId];
      }
    }
    socket.disconnect();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
