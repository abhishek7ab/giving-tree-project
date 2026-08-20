const { ALLOWED_PUNE_LOCATIONS } = require('../middleware/validation');

describe('3. Pune Locality & Domain Constraints', () => {
  test('ALLOWED_PUNE_LOCATIONS contains all 10 major Pune hubs', () => {
    expect(ALLOWED_PUNE_LOCATIONS).toBeDefined();
    expect(ALLOWED_PUNE_LOCATIONS.length).toBe(10);
    expect(ALLOWED_PUNE_LOCATIONS).toContain('Kothrud, Pune');
    expect(ALLOWED_PUNE_LOCATIONS).toContain('Baner, Pune');
    expect(ALLOWED_PUNE_LOCATIONS).toContain('FC Road, Pune');
    expect(ALLOWED_PUNE_LOCATIONS).toContain('Hinjawadi, Pune');
    expect(ALLOWED_PUNE_LOCATIONS).toContain('Viman Nagar, Pune');
    expect(ALLOWED_PUNE_LOCATIONS).toContain('Koregaon Park, Pune');
    expect(ALLOWED_PUNE_LOCATIONS).toContain('Hadapsar, Pune');
    expect(ALLOWED_PUNE_LOCATIONS).toContain('Katraj, Pune');
    expect(ALLOWED_PUNE_LOCATIONS).toContain('Wakad, Pune');
    expect(ALLOWED_PUNE_LOCATIONS).toContain('Aundh, Pune');
  });

  test('Invalid locality is properly detected', () => {
    const invalidLocality = 'Mumbai Central';
    expect(ALLOWED_PUNE_LOCATIONS.includes(invalidLocality)).toBe(false);
  });
});
