const { z } = require('zod');

const ALLOWED_PUNE_LOCATIONS = [
  'Kothrud, Pune',
  'Baner, Pune',
  'FC Road, Pune',
  'Hinjawadi, Pune',
  'Viman Nagar, Pune',
  'Koregaon Park, Pune',
  'Hadapsar, Pune',
  'Katraj, Pune'
];

const registerSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Username / Name is compulsory.' })
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must not exceed 100 characters'),
    city: z.string({ required_error: 'Location is compulsory. Please select your neighborhood.' })
      .trim()
      .refine(val => ALLOWED_PUNE_LOCATIONS.includes(val), {
        message: 'Location must be one of the 8 supported Pune localities.',
      }),
    email: z.string().email('Please enter a valid email address.').toLowerCase().trim(),
    password: z.string().min(6, 'Password must be at least 6 characters').max(128),
    phone: z.string().trim().regex(/^\d{10}$/, 'Phone must be exactly 10 digits').optional().or(z.literal('')).nullable(),
  }).passthrough(),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase().trim(),
    password: z.string().min(1),
  }).passthrough(),
});

const postItemSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(100).trim(),
    description: z.string().min(1).max(2000).trim(),
    category: z.string().min(1).max(50),
    condition: z.enum(['New', 'Like new', 'Good', 'Fair', 'For repair']),
    location: z.string().min(2).max(100).trim(),
    latitude: z.preprocess(val => (val === '' || val === null || val === undefined ? undefined : Number(val)), z.number().min(-90).max(90).optional().nullable()),
    longitude: z.preprocess(val => (val === '' || val === null || val === undefined ? undefined : Number(val)), z.number().min(-180).max(180).optional().nullable()),
    pickup_availability: z.string().max(200).optional(),
    weight_category: z.string().max(100).optional(),
  }),
});

const editItemSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(100).trim().optional(),
    description: z.string().min(1).max(2000).trim().optional(),
    category: z.string().min(1).max(50).optional(),
    condition: z.enum(['New', 'Like new', 'Good', 'Fair', 'For repair']).optional(),
    location: z.string().min(2).max(100).trim().optional(),
    latitude: z.preprocess(val => (val === '' || val === null || val === undefined ? undefined : Number(val)), z.number().min(-90).max(90).optional().nullable()),
    longitude: z.preprocess(val => (val === '' || val === null || val === undefined ? undefined : Number(val)), z.number().min(-180).max(180).optional().nullable()),
    pickup_availability: z.string().max(200).optional(),
    weight_category: z.string().max(100).optional(),
  }),
});

const reviewSchema = z.object({
  body: z.object({
    request_id: z.coerce.number().int().positive(),
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().max(1000).optional(),
  }),
});

const requestItemSchema = z.object({
  body: z.object({
    item_id: z.coerce.number().int().positive(),
    requester_location: z.string().min(2).max(200).trim(),
    requester_latitude: z.preprocess(val => (val === '' || val === null || val === undefined ? undefined : Number(val)), z.number().min(-90).max(90).optional().nullable()),
    requester_longitude: z.preprocess(val => (val === '' || val === null || val === undefined ? undefined : Number(val)), z.number().min(-180).max(180).optional().nullable()),
    delivery_instructions: z.string().max(1000).optional().nullable(),
  }),
});

const updateStatusSchema = z.object({
  body: z.object({
    id: z.coerce.number().int().positive().optional(),
    request_id: z.coerce.number().int().positive().optional(),
    status: z.string().trim().toLowerCase(),
  }).refine(data => data.id !== undefined || data.request_id !== undefined, {
    message: "id or request_id is required",
    path: ["id"]
  }),
});

const updateNameSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim().optional(),
    city: z.string().trim().refine(val => !val || ALLOWED_PUNE_LOCATIONS.includes(val), {
      message: 'Location must be one of the 8 supported Pune localities.',
    }).optional(),
  }).passthrough().refine(data => (data.name !== undefined && data.name !== '') || (data.city !== undefined && data.city !== ''), {
    message: 'Please provide a valid name or location to update.',
  }),
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6, 'Password must be at least 6 characters').max(128),
  }),
});

const deleteOwnAccountSchema = z.object({
  body: z.object({
    confirmDelete: z.literal('yes'),
  }),
});

const sendMessageSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    message: z.string().min(1).max(5000).trim(),
  }),
});

const getItemsQuerySchema = z.object({
  query: z.object({
    search: z.string().max(200).optional(),
    category: z.string().max(50).optional(),
    condition: z.string().max(30).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

const adminDeleteSchema = z.object({
  body: z.object({
    id: z.coerce.number().int().positive(),
    confirmDelete: z.literal('yes'),
  }),
});

function validate(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      if (parsed.query) req.query = parsed.query;
      if (parsed.body) req.body = parsed.body;
      if (parsed.params) req.params = parsed.params;
      next();
    } catch (err) {
      if (err.name === 'ZodError' || err.issues) {
        const issues = err.issues || err.errors || [];
        const messages = issues.map(e => `${e.path ? e.path.join('.') : 'field'}: ${e.message}`).join('; ');
        
        const isJson = req.headers.accept?.includes('application/json') || req.headers['content-type']?.includes('application/json');
        if (isJson) {
          return res.status(400).json({ error: 'Validation failed', details: messages });
        }

        // Graceful redirect for HTML form submissions
        if (req.path === '/register') {
          return res.redirect('/register.html?error=missingfields');
        }
        if (req.path === '/login') {
          return res.redirect('/login.html?error=usernotfound');
        }

        return res.status(400).send(`Validation error: ${messages}`);
      }
      next(err);
    }
  };
}

module.exports = {
  ALLOWED_PUNE_LOCATIONS,
  validate,
  registerSchema,
  loginSchema,
  postItemSchema,
  editItemSchema,
  reviewSchema,
  requestItemSchema,
  updateStatusSchema,
  updateNameSchema,
  changePasswordSchema,
  deleteOwnAccountSchema,
  sendMessageSchema,
  getItemsQuerySchema,
  adminDeleteSchema,
};