const { postItemSchema, requestItemSchema } = require('../middleware/validation');

function getDistanceKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Earth radius in KM
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
}

describe('Location & Geolocation Test Suite', () => {
    it('correctly parses latitude & longitude in postItemSchema', () => {
        const validPost = postItemSchema.parse({
            body: {
                title: 'Vintage Acoustic Guitar',
                description: 'In wonderful condition, perfect for beginners or students',
                category: 'Music',
                condition: 'Good',
                location: 'Kothrud, Pune, Maharashtra',
                latitude: 18.5074,
                longitude: 73.8077,
                pickup_availability: 'Weekdays after 6 PM'
            }
        });
        expect(validPost.body.latitude).toBe(18.5074);
        expect(validPost.body.longitude).toBe(73.8077);
    });

    it('correctly parses delivery coordinates & instructions in requestItemSchema', () => {
        const validRequest = requestItemSchema.parse({
            body: {
                item_id: 42,
                requester_location: 'FC Road, Shivaji Nagar, Pune',
                requester_latitude: 18.5284,
                requester_longitude: 73.8417,
                delivery_instructions: 'Can meet near Goodluck Cafe or Deccan Gymkhana gate'
            }
        });
        expect(validRequest.body.requester_latitude).toBe(18.5284);
        expect(validRequest.body.requester_longitude).toBe(73.8417);
        expect(validRequest.body.delivery_instructions).toBe('Can meet near Goodluck Cafe or Deccan Gymkhana gate');
    });

    it('correctly rejects invalid latitude (> 90)', () => {
        expect(() => {
            postItemSchema.parse({
                body: {
                    title: 'Item with invalid lat',
                    description: 'Valid description for testing validation bounds',
                    category: 'Books',
                    condition: 'Good',
                    location: 'Somewhere',
                    latitude: 195.0,
                    longitude: 73.0
                }
            });
        }).toThrow();
    });

    it('calculates Haversine distance correctly between coordinates', () => {
        // Distance between Kothrud (18.5074, 73.8077) and FC Road Pune (18.5284, 73.8417)
        const dist = getDistanceKm(18.5074, 73.8077, 18.5284, 73.8417);
        expect(dist).toBeGreaterThanOrEqual(4.0);
        expect(dist).toBeLessThanOrEqual(5.0);
    });
});
