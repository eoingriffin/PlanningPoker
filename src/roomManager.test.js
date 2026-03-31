const RoomManager = require('./roomManager');

let manager;

beforeEach(() => {
  manager = new RoomManager();
});

describe('getOrCreateRoom', () => {
  test('creates a new room with correct defaults', () => {
    const room = manager.getOrCreateRoom('room1');
    expect(room.users).toEqual([]);
    expect(room.adminId).toBeUndefined();
    expect(room.cardSetIndex).toBeUndefined();
    expect(room.showResults).toBe(false);
    expect(room.stats).toBeUndefined();
  });

  test('returns existing room if already created', () => {
    const room1 = manager.getOrCreateRoom('room1');
    room1.cardSetIndex = 3;
    const room2 = manager.getOrCreateRoom('room1');
    expect(room2.cardSetIndex).toBe(3);
    expect(room1).toBe(room2);
  });
});

describe('getRoom', () => {
  test('returns undefined for non-existent room', () => {
    expect(manager.getRoom('nonexistent')).toBeUndefined();
  });

  test('returns existing room', () => {
    manager.getOrCreateRoom('room1');
    expect(manager.getRoom('room1')).toBeDefined();
  });
});

describe('joinRoom', () => {
  test('first user becomes admin', () => {
    const { room, user, isNewAdmin } = manager.joinRoom('room1', 'socket1', 'Alice');
    expect(isNewAdmin).toBe(true);
    expect(room.adminId).toBe('socket1');
    expect(user.name).toBe('Alice');
    expect(room.users).toHaveLength(1);
  });

  test('second user does not become admin', () => {
    manager.joinRoom('room1', 'socket1', 'Alice');
    const { isNewAdmin } = manager.joinRoom('room1', 'socket2', 'Bob');
    expect(isNewAdmin).toBe(false);
    const room = manager.getRoom('room1');
    expect(room.adminId).toBe('socket1');
    expect(room.users).toHaveLength(2);
  });

  test('user is added with correct initial state', () => {
    const { user } = manager.joinRoom('room1', 'socket1', 'Alice');
    expect(user.id).toBe('socket1');
    expect(user.name).toBe('Alice');
    expect(user.card).toBeUndefined();
    expect(user.cardIndex).toBeUndefined();
  });

  test('tracks socket-to-room mapping', () => {
    manager.joinRoom('room1', 'socket1', 'Alice');
    expect(manager.socketToRoom['socket1']).toBe('room1');
  });
});

describe('selectCard', () => {
  beforeEach(() => {
    manager.joinRoom('room1', 'socket1', 'Alice');
  });

  test('selects a card', () => {
    const user = manager.selectCard('room1', 'socket1', 5, 4);
    expect(user.card).toBe(5);
    expect(user.cardIndex).toBe(4);
  });

  test('toggles card off when same card selected again', () => {
    manager.selectCard('room1', 'socket1', 5, 4);
    const user = manager.selectCard('room1', 'socket1', 5, 4);
    expect(user.card).toBeUndefined();
    expect(user.cardIndex).toBeUndefined();
  });

  test('switches to different card', () => {
    manager.selectCard('room1', 'socket1', 5, 4);
    const user = manager.selectCard('room1', 'socket1', 8, 5);
    expect(user.card).toBe(8);
    expect(user.cardIndex).toBe(5);
  });

  test('returns undefined for non-existent room', () => {
    expect(manager.selectCard('nonexistent', 'socket1', 5, 4)).toBeUndefined();
  });

  test('returns undefined for non-existent user', () => {
    expect(manager.selectCard('room1', 'socketX', 5, 4)).toBeUndefined();
  });
});

describe('clearRoom', () => {
  beforeEach(() => {
    manager.joinRoom('room1', 'socket1', 'Alice');
    manager.joinRoom('room1', 'socket2', 'Bob');
    manager.selectCard('room1', 'socket1', 5, 4);
    manager.selectCard('room1', 'socket2', 8, 5);
  });

  test('admin can clear selections', () => {
    const result = manager.clearRoom('room1', 'socket1');
    expect(result).toBe(true);
    const room = manager.getRoom('room1');
    room.users.forEach(u => {
      expect(u.card).toBeUndefined();
      expect(u.cardIndex).toBeUndefined();
    });
    expect(room.showResults).toBe(false);
    expect(room.stats).toBeUndefined();
  });

  test('non-admin cannot clear', () => {
    const result = manager.clearRoom('room1', 'socket2');
    expect(result).toBe(false);
    const room = manager.getRoom('room1');
    expect(room.users[0].card).toBe(5);
  });

  test('returns false for non-existent room', () => {
    expect(manager.clearRoom('nonexistent', 'socket1')).toBe(false);
  });
});

describe('showResults', () => {
  const mockCalculateStats = (numericCards) => {
    if (numericCards.length === 0) return undefined;
    return { median: 5, average: 5, outliers: [] };
  };

  beforeEach(() => {
    manager.joinRoom('room1', 'socket1', 'Alice');
    manager.joinRoom('room1', 'socket2', 'Bob');
    manager.selectCard('room1', 'socket1', 5, 4);
    manager.selectCard('room1', 'socket2', 8, 5);
  });

  test('admin can show results', () => {
    const result = manager.showResults('room1', 'socket1', mockCalculateStats, false, []);
    expect(result).toBeDefined();
    expect(result.stats).toEqual({ median: 5, average: 5, outliers: [] });
    expect(manager.getRoom('room1').showResults).toBe(true);
  });

  test('non-admin cannot show results', () => {
    const result = manager.showResults('room1', 'socket2', mockCalculateStats, false, []);
    expect(result).toBeUndefined();
  });

  test('filters ignored indices for non-numeric card sets', () => {
    const spy = jest.fn(() => ({ median: 4, average: 4.5, outliers: [] }));
    manager.showResults('room1', 'socket1', spy, true, [4]);
    // socket1 has cardIndex 4 (ignored), socket2 has cardIndex 5 (included)
    expect(spy).toHaveBeenCalledWith([5]);
  });

  test('filters non-numeric cards for numeric card sets', () => {
    manager.selectCard('room1', 'socket1', '?', 7); // select non-numeric
    const spy = jest.fn(() => ({ median: 8, average: 8, outliers: [] }));
    manager.showResults('room1', 'socket1', spy, false, []);
    expect(spy).toHaveBeenCalledWith([8]);
  });

  test('returns undefined for non-existent room', () => {
    expect(manager.showResults('nonexistent', 'socket1', mockCalculateStats, false, [])).toBeUndefined();
  });
});

describe('changeCardSet', () => {
  beforeEach(() => {
    manager.joinRoom('room1', 'socket1', 'Alice');
  });

  test('admin can change card set', () => {
    const result = manager.changeCardSet('room1', 'socket1', 2);
    expect(result).toBe(true);
    expect(manager.getRoom('room1').cardSetIndex).toBe(2);
  });

  test('non-admin cannot change card set', () => {
    manager.joinRoom('room1', 'socket2', 'Bob');
    const result = manager.changeCardSet('room1', 'socket2', 2);
    expect(result).toBe(false);
  });
});

describe('isAdmin', () => {
  test('returns true for admin socket', () => {
    manager.joinRoom('room1', 'socket1', 'Alice');
    expect(manager.isAdmin('room1', 'socket1')).toBe(true);
  });

  test('returns false for non-admin socket', () => {
    manager.joinRoom('room1', 'socket1', 'Alice');
    manager.joinRoom('room1', 'socket2', 'Bob');
    expect(manager.isAdmin('room1', 'socket2')).toBe(false);
  });

  test('returns false for non-existent room', () => {
    expect(manager.isAdmin('nonexistent', 'socket1')).toBeFalsy();
  });
});

describe('removeUser', () => {
  test('removes user from room', () => {
    manager.joinRoom('room1', 'socket1', 'Alice');
    manager.joinRoom('room1', 'socket2', 'Bob');
    const result = manager.removeUser('socket2');
    expect(result.roomId).toBe('room1');
    expect(result.newAdmin).toBeUndefined();
    expect(result.roomDeleted).toBe(false);
    expect(manager.getRoom('room1').users).toHaveLength(1);
  });

  test('reassigns admin when admin leaves', () => {
    manager.joinRoom('room1', 'socket1', 'Alice');
    manager.joinRoom('room1', 'socket2', 'Bob');
    const result = manager.removeUser('socket1');
    expect(result.newAdmin.id).toBe('socket2');
    expect(manager.getRoom('room1').adminId).toBe('socket2');
  });

  test('deletes room when last user leaves', () => {
    manager.joinRoom('room1', 'socket1', 'Alice');
    const result = manager.removeUser('socket1');
    expect(result.roomDeleted).toBe(true);
    expect(manager.getRoom('room1')).toBeUndefined();
  });

  test('returns undefined for unknown socket', () => {
    expect(manager.removeUser('unknownSocket')).toBeUndefined();
  });

  test('clears socket-to-room mapping', () => {
    manager.joinRoom('room1', 'socket1', 'Alice');
    manager.removeUser('socket1');
    expect(manager.socketToRoom['socket1']).toBeUndefined();
  });

  test('returns the removed user info', () => {
    manager.joinRoom('room1', 'socket1', 'Alice');
    const result = manager.removeUser('socket1');
    expect(result.removedUser.name).toBe('Alice');
  });
});

describe('getUsersForDisplay', () => {
  test('admin gets (Admin) suffix in displayName', () => {
    manager.joinRoom('room1', 'socket1', 'Alice');
    manager.joinRoom('room1', 'socket2', 'Bob');
    const users = manager.getUsersForDisplay('room1');
    expect(users[0].displayName).toBe('Alice (Admin)');
    expect(users[1].displayName).toBe('Bob');
  });

  test('does not mutate original user names', () => {
    manager.joinRoom('room1', 'socket1', 'Alice');
    manager.getUsersForDisplay('room1');
    const room = manager.getRoom('room1');
    expect(room.users[0].name).toBe('Alice');
  });

  test('returns empty array for non-existent room', () => {
    expect(manager.getUsersForDisplay('nonexistent')).toEqual([]);
  });
});
