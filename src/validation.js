const MAX_USERNAME_LENGTH = 50;
const MAX_ROOM_ID_LENGTH = 50;
const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * Validate and sanitize a username.
 * @param {string} name
 * @returns {{ valid: boolean, sanitized?: string, error?: string }}
 */
function validateUsername(name) {
  if (typeof name !== 'string') {
    return { valid: false, error: 'Username must be a string' };
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Username cannot be empty' };
  }
  if (trimmed.length > MAX_USERNAME_LENGTH) {
    return { valid: false, error: `Username cannot exceed ${MAX_USERNAME_LENGTH} characters` };
  }
  return { valid: true, sanitized: trimmed };
}

/**
 * Validate a room ID.
 * @param {string} roomId
 * @returns {{ valid: boolean, sanitized?: string, error?: string }}
 */
function validateRoomId(roomId) {
  if (typeof roomId !== 'string') {
    return { valid: false, error: 'Room ID must be a string' };
  }
  const trimmed = roomId.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Room ID cannot be empty' };
  }
  if (trimmed.length > MAX_ROOM_ID_LENGTH) {
    return { valid: false, error: `Room ID cannot exceed ${MAX_ROOM_ID_LENGTH} characters` };
  }
  if (!ROOM_ID_PATTERN.test(trimmed)) {
    return { valid: false, error: 'Room ID can only contain letters, numbers, hyphens, and underscores' };
  }
  return { valid: true, sanitized: trimmed };
}

/**
 * Validate a card index is a non-negative integer within bounds.
 * @param {*} cardIndex
 * @param {number} maxIndex - Exclusive upper bound
 * @returns {boolean}
 */
function validateCardIndex(cardIndex, maxIndex) {
  return Number.isInteger(cardIndex) && cardIndex >= 0 && cardIndex < maxIndex;
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = {
  validateUsername,
  validateRoomId,
  validateCardIndex,
  escapeHtml,
  MAX_USERNAME_LENGTH,
  MAX_ROOM_ID_LENGTH,
  ROOM_ID_PATTERN,
};
