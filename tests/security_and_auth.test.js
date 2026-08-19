const bcrypt = require('bcryptjs');
const { signToken, verifyToken } = require('../config/jwt');
const {
  registerSchema,
  loginSchema,
  postItemSchema,
  requestItemSchema,
  changePasswordSchema,
  updateStatusSchema
} = require('../middleware/validation');

describe('1. Security & Authentication Unit Tests', () => {
  test('JWT sign and verify embeds and validates tokenVersion', () => {
    const payload = { id: 10, email: 'donor@givingtree.in', role: 'user', tokenVersion: 2 };
    const token = signToken(payload);
    expect(typeof token).toBe('string');
    
    const decoded = verifyToken(token);
    expect(decoded.id).toBe(10);
    expect(decoded.email).toBe('donor@givingtree.in');
    expect(decoded.tokenVersion).toBe(2);
  });

  test('Password hashing with bcrypt is secure and verifies correctly', async () => {
    const password = 'StrongPassword2026!';
    const hash = await bcrypt.hash(password, 10);
    expect(hash).not.toBe(password);
    
    const isMatch = await bcrypt.compare(password, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await bcrypt.compare('WrongPassword', hash);
    expect(isWrongMatch).toBe(false);
  });

  test('Binary Magic Bytes correctly distinguishes valid image buffers from scripts', () => {
    function isValidImageBuffer(buffer) {
      if (!buffer || buffer.length < 4) return false;
      if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
      if (buffer.length >= 12 &&
          buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
          buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return true;
      return false;
    }

    const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A]);
    const webpBuffer = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
    const scriptBuffer = Buffer.from("<script>alert('XSS')</script>");
    const exeBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00]); // MZ DOS header

    expect(isValidImageBuffer(jpegBuffer)).toBe(true);
    expect(isValidImageBuffer(pngBuffer)).toBe(true);
    expect(isValidImageBuffer(webpBuffer)).toBe(true);
    expect(isValidImageBuffer(scriptBuffer)).toBe(false);
    expect(isValidImageBuffer(exeBuffer)).toBe(false);
  });

  test('Privacy coordinate fuzzing snaps coordinates to protect donor home addresses', () => {
    function fuzzCoordinate(coord) {
      if (coord === null || coord === undefined || isNaN(coord)) return coord;
      return Math.round(Number(coord) * 1000) / 1000;
    }

    const donorExactLat = 18.520438192847;
    const donorExactLng = 73.856743918234;

    const fuzzedLat = fuzzCoordinate(donorExactLat);
    const fuzzedLng = fuzzCoordinate(donorExactLng);

    expect(fuzzedLat).toBe(18.52);
    expect(fuzzedLng).toBe(73.857);
    expect(String(fuzzedLat).split('.')[1].length).toBeLessThanOrEqual(3);
    expect(String(fuzzedLng).split('.')[1].length).toBeLessThanOrEqual(3);
  });
});

describe('2. Zod Input Validation Schemas', () => {
  test('registerSchema validates correct credentials', () => {
    const validData = {
      body: {
        name: 'Abhishek Badave',
        email: 'abhishek@givingtree.in',
        password: 'SecurePassword123',
        city: 'Kothrud, Pune',
        phone: '9876543210'
      }
    };
    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  test('registerSchema rejects short passwords and invalid phone numbers', () => {
    const invalidData = {
      body: {
        name: 'Abhishek',
        email: 'abhishek@givingtree.in',
        password: '123', // Too short
        phone: '123' // Not 10 digits
      }
    };
    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  test('postItemSchema validates required item fields and Pune condition enums', () => {
    const validItem = {
      body: {
        title: 'Solid Teak Study Table',
        description: 'Excellent condition study table for student use in Pune.',
        category: 'Furniture',
        condition: 'Like new',
        location: 'Baner, Pune',
        latitude: 18.5590,
        longitude: 73.7868,
        pickup_availability: 'Weekends 10 AM to 6 PM',
        weight_category: 'Medium (Need a bag/box)'
      }
    };
    const result = postItemSchema.safeParse(validItem);
    expect(result.success).toBe(true);
  });

  test('changePasswordSchema enforces minimum length', () => {
    const valid = { body: { currentPassword: 'OldPassword123', newPassword: 'NewSecurePassword456' } };
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);

    const invalid = { body: { currentPassword: 'OldPassword123', newPassword: '123' } };
    expect(changePasswordSchema.safeParse(invalid).success).toBe(false);
  });
});
