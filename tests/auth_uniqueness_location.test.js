const { ALLOWED_PUNE_LOCATIONS } = require('../middleware/validation');
const { PUNE_LOCALITY_COORDS } = require('../models/userModel');

describe('Username Uniqueness and Compulsory Top 8 Curated Locations', () => {
  it('strictly defines all 8 Pune locations in ALLOWED_PUNE_LOCATIONS', () => {
    expect(ALLOWED_PUNE_LOCATIONS).toHaveLength(8);
    expect(ALLOWED_PUNE_LOCATIONS).toEqual([
      'Kothrud, Pune',
      'Baner, Pune',
      'FC Road, Pune',
      'Hinjawadi, Pune',
      'Viman Nagar, Pune',
      'Koregaon Park, Pune',
      'Hadapsar, Pune',
      'Katraj, Pune'
    ]);
  });

  it('maps every allowed location to valid coordinates in PUNE_LOCALITY_COORDS', () => {
    ALLOWED_PUNE_LOCATIONS.forEach(loc => {
      const coords = PUNE_LOCALITY_COORDS[loc];
      expect(coords).toBeDefined();
      expect(coords.lat).toBeGreaterThanOrEqual(18.4);
      expect(coords.lat).toBeLessThanOrEqual(18.7);
      expect(coords.lng).toBeGreaterThanOrEqual(73.7);
      expect(coords.lng).toBeLessThanOrEqual(74.0);
    });
  });

  it('verifies that PUNE_LOCALITY_COORDS contains exactly 8 hubs', () => {
    expect(Object.keys(PUNE_LOCALITY_COORDS)).toHaveLength(8);
  });
});
