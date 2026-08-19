// Jest setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'giving_tree_test_secret_key_32_characters_long_safe';
process.env.PORT = '3001';
process.env.FRONTEND_URL = 'http://localhost:3001';

jest.mock('../database/init', () => () => Promise.resolve());
