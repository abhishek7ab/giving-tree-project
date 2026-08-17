const { registerSchema, loginSchema, postItemSchema, editItemSchema, reviewSchema, requestItemSchema, updateNameSchema, ALLOWED_PUNE_LOCATIONS } = require('../middleware/validation');

describe('Validation Schemas', () => {
  describe('registerSchema', () => {
    it('validates correct registration data with valid Pune location', () => {
      const validData = {
        body: {
          name: 'John Doe',
          city: 'Kothrud, Pune',
          email: 'john@example.com',
          password: 'SecurePass123!',
          phone: '9876543210',
        },
      };
      expect(() => registerSchema.parse(validData)).not.toThrow();
    });

    it('validates registration with all 8 allowed Pune locations', () => {
      ALLOWED_PUNE_LOCATIONS.forEach(loc => {
        const validData = {
          body: {
            name: `User in ${loc.split(',')[0]}`,
            city: loc,
            email: `user_${loc.split(',')[0].toLowerCase().replace(/\s+/g, '')}@example.com`,
            password: 'SecurePass123!',
          },
        };
        expect(() => registerSchema.parse(validData)).not.toThrow();
      });
    });

    it('rejects registration without compulsory location', () => {
      const invalidData = {
        body: {
          name: 'John Doe',
          email: 'john@example.com',
          password: 'SecurePass123!',
        },
      };
      expect(() => registerSchema.parse(invalidData)).toThrow();
    });

    it('rejects registration with location outside the 8 allowed locations', () => {
      const invalidData = {
        body: {
          name: 'John Doe',
          city: 'Mumbai Central',
          email: 'john@example.com',
          password: 'SecurePass123!',
        },
      };
      expect(() => registerSchema.parse(invalidData)).toThrow();
    });

    it('rejects missing or short name (< 2 chars)', () => {
      const invalidData = {
        body: {
          name: 'J',
          city: 'Kothrud, Pune',
          email: 'john@example.com',
          password: 'SecurePass123!',
        },
      };
      expect(() => registerSchema.parse(invalidData)).toThrow();
    });

    it('rejects short password (< 6 chars)', () => {
      const invalidData = {
        body: {
          name: 'John Doe',
          city: 'Baner, Pune',
          email: 'john@example.com',
          password: 'short',
          phone: '9876543210',
        },
      };
      expect(() => registerSchema.parse(invalidData)).toThrow();
    });

    it('rejects invalid email', () => {
      const invalidData = {
        body: {
          name: 'John Doe',
          city: 'FC Road, Pune',
          email: 'not-an-email',
          password: 'SecurePass123!',
          phone: '9876543210',
        },
      };
      expect(() => registerSchema.parse(invalidData)).toThrow();
    });

    it('rejects invalid phone number (not 10 digits)', () => {
      const invalidData = {
        body: {
          name: 'John Doe',
          city: 'Viman Nagar, Pune',
          email: 'john@example.com',
          password: 'SecurePass123!',
          phone: '12345',
        },
      };
      expect(() => registerSchema.parse(invalidData)).toThrow();
    });

    it('accepts empty or null phone number', () => {
      const validData = {
        body: {
          name: 'John Doe',
          city: 'Hinjawadi, Pune',
          email: 'john@example.com',
          password: 'SecurePass123!',
          phone: '',
        },
      };
      expect(() => registerSchema.parse(validData)).not.toThrow();
    });
  });

  describe('updateNameSchema', () => {
    it('validates valid name and valid location update', () => {
      const validData = {
        body: {
          name: 'Jane Doe',
          city: 'Koregaon Park, Pune',
        },
      };
      expect(() => updateNameSchema.parse(validData)).not.toThrow();
    });

    it('rejects location not in the 8 allowed locations', () => {
      const invalidData = {
        body: {
          name: 'Jane Doe',
          city: 'Delhi NCR',
        },
      };
      expect(() => updateNameSchema.parse(invalidData)).toThrow();
    });
  });

  describe('loginSchema', () => {
    it('validates correct login data', () => {
      const validData = {
        body: {
          email: 'john@example.com',
          password: 'anypassword',
        },
      };
      expect(() => loginSchema.parse(validData)).not.toThrow();
    });

    it('rejects missing email', () => {
      const invalidData = {
        body: {
          password: 'anypassword',
        },
      };
      expect(() => loginSchema.parse(invalidData)).toThrow();
    });
  });

  describe('postItemSchema', () => {
    it('validates correct item data', () => {
      const validData = {
        body: {
          title: 'Test Item',
          description: 'This is a test item description that is long enough',
          category: 'Electronics',
          condition: 'Good',
          location: 'New York, NY',
          pickup_availability: 'Weekends',
        },
      };
      expect(() => postItemSchema.parse(validData)).not.toThrow();
    });

    it('rejects short title', () => {
      const invalidData = {
        body: {
          title: '',
          description: 'This is a test item description that is long enough',
          category: 'Electronics',
          condition: 'Good',
          location: 'New York, NY',
        },
      };
      expect(() => postItemSchema.parse(invalidData)).toThrow();
    });

    it('rejects invalid condition enum', () => {
      const invalidData = {
        body: {
          title: 'Test Item',
          description: 'This is a test item description that is long enough',
          category: 'Electronics',
          condition: 'InvalidCondition',
          location: 'New York, NY',
        },
      };
      expect(() => postItemSchema.parse(invalidData)).toThrow();
    });

    it('validates postItem with latitude and longitude coordinates', () => {
      const validData = {
        body: {
          title: 'Test Item',
          description: 'This is a test item description that is long enough',
          category: 'Electronics',
          condition: 'Good',
          location: 'Kothrud, Pune',
          latitude: 18.5204,
          longitude: 73.8567,
          pickup_availability: 'Evenings',
        },
      };
      expect(() => postItemSchema.parse(validData)).not.toThrow();
    });

    it('rejects out of bounds latitude', () => {
      const invalidData = {
        body: {
          title: 'Test Item',
          description: 'This is a test item description that is long enough',
          category: 'Electronics',
          condition: 'Good',
          location: 'Kothrud, Pune',
          latitude: 95.5,
          longitude: 73.8567,
        },
      };
      expect(() => postItemSchema.parse(invalidData)).toThrow();
    });
  });

  describe('requestItemSchema', () => {
    it('validates correct request data', () => {
      const validData = {
        body: {
          item_id: 1,
          requester_location: 'Brooklyn, NY',
        },
      };
      expect(() => requestItemSchema.parse(validData)).not.toThrow();
    });

    it('validates request with delivery coordinates and delivery instructions', () => {
      const validData = {
        body: {
          item_id: 1,
          requester_location: 'Indiranagar, Bangalore',
          requester_latitude: 12.9716,
          requester_longitude: 77.5946,
          delivery_instructions: 'Meet outside metro gate 2',
        },
      };
      expect(() => requestItemSchema.parse(validData)).not.toThrow();
    });

    it('rejects missing item_id', () => {
      const invalidData = {
        body: {
          requester_location: 'Brooklyn, NY',
        },
      };
      expect(() => requestItemSchema.parse(invalidData)).toThrow();
    });

    it('rejects negative item_id', () => {
      const invalidData = {
        body: {
          item_id: -1,
          requester_location: 'Brooklyn, NY',
        },
      };
      expect(() => requestItemSchema.parse(invalidData)).toThrow();
    });
  });

  describe('reviewSchema', () => {
    it('validates correct review rating & comment', () => {
      const validData = {
        body: {
          request_id: 10,
          rating: 5,
          comment: 'Great interaction with neighbor!',
        },
      };
      expect(() => reviewSchema.parse(validData)).not.toThrow();
    });

    it('rejects rating out of 1-5 range', () => {
      const invalidData = {
        body: {
          request_id: 10,
          rating: 6,
        },
      };
      expect(() => reviewSchema.parse(invalidData)).toThrow();
    });
  });
});
