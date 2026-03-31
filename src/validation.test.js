const {
  validateUsername,
  validateRoomId,
  validateCardIndex,
  escapeHtml,
} = require('./validation');

describe('validateUsername', () => {
  test('accepts a valid name', () => {
    const result = validateUsername('Alice');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('Alice');
  });

  test('trims whitespace', () => {
    const result = validateUsername('  Bob  ');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('Bob');
  });

  test('rejects empty string', () => {
    expect(validateUsername('').valid).toBe(false);
  });

  test('rejects whitespace-only string', () => {
    expect(validateUsername('   ').valid).toBe(false);
  });

  test('rejects non-string input', () => {
    expect(validateUsername(123).valid).toBe(false);
    expect(validateUsername(null).valid).toBe(false);
    expect(validateUsername(undefined).valid).toBe(false);
  });

  test('rejects name exceeding max length', () => {
    const longName = 'A'.repeat(51);
    expect(validateUsername(longName).valid).toBe(false);
  });

  test('accepts name at max length', () => {
    const maxName = 'A'.repeat(50);
    const result = validateUsername(maxName);
    expect(result.valid).toBe(true);
  });

  test('accepts names with special characters', () => {
    const result = validateUsername('O\'Brien');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('O\'Brien');
  });
});

describe('validateRoomId', () => {
  test('accepts a valid room ID', () => {
    const result = validateRoomId('room-123');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('room-123');
  });

  test('accepts alphanumeric with underscores and hyphens', () => {
    expect(validateRoomId('my_room-42').valid).toBe(true);
  });

  test('rejects empty string', () => {
    expect(validateRoomId('').valid).toBe(false);
  });

  test('rejects non-string input', () => {
    expect(validateRoomId(123).valid).toBe(false);
    expect(validateRoomId(null).valid).toBe(false);
  });

  test('rejects room ID with spaces', () => {
    expect(validateRoomId('room 1').valid).toBe(false);
  });

  test('rejects room ID with HTML characters', () => {
    expect(validateRoomId('<script>').valid).toBe(false);
    expect(validateRoomId('room&id').valid).toBe(false);
  });

  test('rejects room ID exceeding max length', () => {
    const longId = 'a'.repeat(51);
    expect(validateRoomId(longId).valid).toBe(false);
  });

  test('trims whitespace before validation', () => {
    const result = validateRoomId('  room1  ');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('room1');
  });
});

describe('validateCardIndex', () => {
  test('accepts valid index within bounds', () => {
    expect(validateCardIndex(0, 10)).toBe(true);
    expect(validateCardIndex(5, 10)).toBe(true);
    expect(validateCardIndex(9, 10)).toBe(true);
  });

  test('rejects index at upper bound', () => {
    expect(validateCardIndex(10, 10)).toBe(false);
  });

  test('rejects negative index', () => {
    expect(validateCardIndex(-1, 10)).toBe(false);
  });

  test('rejects non-integer', () => {
    expect(validateCardIndex(1.5, 10)).toBe(false);
    expect(validateCardIndex('1', 10)).toBe(false);
    expect(validateCardIndex(null, 10)).toBe(false);
    expect(validateCardIndex(undefined, 10)).toBe(false);
  });
});

describe('escapeHtml', () => {
  test('escapes ampersand', () => {
    expect(escapeHtml('a&b')).toBe('a&amp;b');
  });

  test('escapes less-than', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  test('escapes greater-than', () => {
    expect(escapeHtml('a>b')).toBe('a&gt;b');
  });

  test('escapes double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  test('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  test('escapes multiple special characters', () => {
    expect(escapeHtml('<img src="x" onerror="alert(1)">')).toBe(
      '&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;'
    );
  });

  test('returns empty string for non-string input', () => {
    expect(escapeHtml(123)).toBe('');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  test('returns unchanged string with no special characters', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});
