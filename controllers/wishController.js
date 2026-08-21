const wishModel = require('../models/wishModel');
const userModel = require('../models/userModel');
const adminNotifier = require('../utils/adminNotifier');

const VALID_CATEGORIES = [
    'Furniture', 'Electronics', 'Appliances', 'Books', 'Clothing',
    'Kitchen & Dining', 'Baby & Kids', 'Sports & Outdoors',
    'Home & Garden', 'Pet Supplies', 'Office & Study', 'Other'
];

const VALID_LOCALITIES = [
    'Kothrud', 'Baner', 'FC Road', 'Hinjawadi', 'Viman Nagar',
    'Koregaon Park', 'Hadapsar', 'Katraj', 'Wakad', 'Aundh',
    'Kothrud, Pune', 'Baner, Pune', 'FC Road, Pune', 'Hinjawadi, Pune', 'Viman Nagar, Pune',
    'Koregaon Park, Pune', 'Hadapsar, Pune', 'Katraj, Pune', 'Wakad, Pune', 'Aundh, Pune'
];

/**
 * Create a new Community Wish / Item Wanted
 */
async function createWish(req, res) {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'You must be logged in to post a community wish.' });
        }

        const { title, description, category, locality, urgency } = req.body;

        if (!title || typeof title !== 'string' || title.trim().length < 3) {
            return res.status(400).json({ error: 'Please provide a descriptive item title (at least 3 characters).' });
        }
        if (title.trim().length > 150) {
            return res.status(400).json({ error: 'Title is too long (maximum 150 characters).' });
        }

        if (!category || !VALID_CATEGORIES.includes(category.trim())) {
            return res.status(400).json({ error: 'Please select a valid donation category.' });
        }

        if (!locality || typeof locality !== 'string' || !VALID_LOCALITIES.includes(locality.trim())) {
            return res.status(400).json({ error: 'Please select your Pune neighborhood hub.' });
        }

        const validUrgency = ['Urgent', 'Normal', 'Flexible'].includes(urgency) ? urgency : 'Normal';

        const user = await userModel.findUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User account not found.' });
        }

        const wish = await wishModel.createWish({
            userId: user.id,
            requesterName: user.name,
            requesterEmail: user.email,
            title: title.trim(),
            description: (description || '').trim().slice(0, 1000),
            category: category.trim(),
            locality: locality.trim(),
            urgency: validUrgency,
        });

        // Admin notification & Socket event
        adminNotifier.notifyAdmin({
            type: 'WISH_CREATED',
            title: 'New Community Wish Posted',
            body: `${user.name} posted wish: "${wish.title}" in ${wish.locality} (${wish.category})`,
            userId: user.id,
            userEmail: user.email,
            req
        });

        if (req.app && req.app.get('io')) {
            const io = req.app.get('io');
            io.emit('new_community_wish', {
                id: wish.id,
                title: wish.title,
                category: wish.category,
                locality: wish.locality,
                urgency: wish.urgency
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Your community wish was published successfully! Neighbors in your area will see what you need.',
            wish
        });
    } catch (err) {
        console.error('Error creating wish:', err);
        return res.status(500).json({ error: 'Internal server error while publishing wish.' });
    }
}

/**
 * Get all active community wishes (Public & Filterable)
 */
async function getWishes(req, res) {
    try {
        const { category, locality, search, status = 'open', page = 1, limit = 50 } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
        const offset = (pageNum - 1) * limitNum;

        const wishes = await wishModel.getAllWishes({
            category,
            locality,
            status,
            search,
            limit: limitNum,
            offset
        });

        return res.json({
            success: true,
            wishes,
            page: pageNum,
            count: wishes.length
        });
    } catch (err) {
        console.error('Error fetching wishes:', err);
        return res.status(500).json({ error: 'Failed to fetch community wishlist.' });
    }
}

/**
 * Get current authenticated user's wishes
 */
async function getMyWishes(req, res) {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized. Please log in.' });
        }

        const wishes = await wishModel.getWishesByUser(req.user.id);
        return res.json({
            success: true,
            wishes
        });
    } catch (err) {
        console.error('Error fetching my wishes:', err);
        return res.status(500).json({ error: 'Failed to fetch your wishes.' });
    }
}

/**
 * Mark a wish as fulfilled
 */
async function fulfillWish(req, res) {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        const wishId = parseInt(req.params.id, 10);
        if (!wishId) {
            return res.status(400).json({ error: 'Invalid wish ID.' });
        }

        const wish = await wishModel.getWishById(wishId);
        if (!wish) {
            return res.status(404).json({ error: 'Wish not found.' });
        }

        // Only the owner or an admin can mark fulfilled
        if (wish.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You do not have permission to update this wish.' });
        }

        const updated = await wishModel.updateWishStatus(wishId, wish.user_id, 'fulfilled');
        return res.json({
            success: true,
            message: 'Wish marked as fulfilled! Thank you for sharing with the community.',
            wish: updated
        });
    } catch (err) {
        console.error('Error fulfilling wish:', err);
        return res.status(500).json({ error: 'Failed to update wish status.' });
    }
}

/**
 * Delete a wish
 */
async function deleteWish(req, res) {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        const wishId = parseInt(req.params.id, 10);
        if (!wishId) {
            return res.status(400).json({ error: 'Invalid wish ID.' });
        }

        const wish = await wishModel.getWishById(wishId);
        if (!wish) {
            return res.status(404).json({ error: 'Wish not found.' });
        }

        if (wish.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You do not have permission to delete this wish.' });
        }

        await wishModel.deleteWish(wishId, wish.user_id);
        return res.json({
            success: true,
            message: 'Wish removed successfully.'
        });
    } catch (err) {
        console.error('Error deleting wish:', err);
        return res.status(500).json({ error: 'Failed to delete wish.' });
    }
}

/**
 * Find matching active wishes for a donor's item
 */
async function getMatchingWishes(req, res) {
    try {
        const { category, locality, title } = req.query;
        if (!category && !locality) {
            return res.json({ success: true, matches: [] });
        }

        const matches = await wishModel.findMatchingWishesForDonorItem({
            category,
            locality,
            title
        });

        return res.json({
            success: true,
            matches,
            count: matches.length
        });
    } catch (err) {
        console.error('Error finding matching wishes:', err);
        return res.status(500).json({ error: 'Failed to find matching wishes.' });
    }
}

module.exports = {
    createWish,
    getWishes,
    getMyWishes,
    fulfillWish,
    deleteWish,
    getMatchingWishes,
};
