const requestModel = require('../models/requestModel');
const reviewModel = require('../models/reviewModel');
const userModel = require('../models/userModel');
const mailer = require('../utils/mailer');
let io = null;

const BLOCKED_WORDS = ['abuse', 'idiot', 'stupid'];

exports.setSocketIO = (socketServer) => {
    io = socketServer;
};

// ================= 1. REQUEST AN ITEM =================
exports.requestItem = async (req, res) => {
    const user = req.user || req.session?.user;
    if (!user) return res.status(401).send('Please log in first.');

    try {
        const item_id = req.body.item_id;
        const requester_location = req.body.requester_location;
        const requester_latitude = req.body.requester_latitude;
        const requester_longitude = req.body.requester_longitude;
        const delivery_instructions = req.body.delivery_instructions;

        const createdRequest = await requestModel.createRequest(
            item_id,
            {
                id: user.id,
                email: user.email
            },
            requester_location,
            requester_latitude,
            requester_longitude,
            delivery_instructions
        );

        const details = await requestModel.getRequestWithOwnerById(createdRequest.id);
        if (details?.owner_email) {
            const notification = await requestModel.createNotification({
                userEmail: details.owner_email,
                type: 'new_request',
                title: 'New item request',
                body: `${user.email} requested one of your items.`,
                requestId: createdRequest.id
            });
            if (io) {
                io.to(`user:${details.owner_email.toLowerCase()}`).emit('notification:new', notification);
            }
        }
        return res.json({ success: true, request: createdRequest });
    } catch (err) {
        console.error(err);
        const statusCode = err.statusCode || 500;
        return res.status(statusCode).send(err.message || "Error sending request");
    }
};

// ================= 2. SHOW THE HUB PAGE =================
exports.viewRequests = (req, res) => {
    return res.redirect(`/requests.html`);
};

function getAuthUser(req) {
    return req.session?.user || req.user || null;
}

function checkIsAdmin(req) {
    const user = getAuthUser(req);
    if (!user) return false;
    const email = String(user.email || '').trim().toLowerCase();
    return user.role === 'admin' || email === 'badaveabhishek2004@gmail.com';
}

// ================= 3. GET DATA FOR THE HUB (API) =================
exports.getActivityData = async (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.json({ error: "Not logged in" });

    try {
        const isAdmin = checkIsAdmin(req);
        const userEmail = user.email;
        const receivedResults = isAdmin
            ? await requestModel.getRequests()
            : await requestModel.getRequestsForOwner(userEmail);
        const sentResults = await requestModel.getRequestsByRequester(userEmail);

        res.json({
            received: receivedResults,
            sent: sentResults,
            currentUserEmail: userEmail,
            isAdmin
        });
    } catch (err) {
        console.error(err);
        res.json({ error: "DB Error" });
    }
};

// ================= 4. UPDATE STATUS =================
exports.updateRequestStatus = async (req, res) => {
    try {
        const id = Number(req.body.id || req.body.request_id);
        const rawStatus = String(req.body.status || '').trim().toLowerCase();
        const mappedStatus = rawStatus === 'declined' || rawStatus === 'rejected' ? 'rejected' : rawStatus;
        const isJson = req.headers.accept?.includes('application/json') || req.headers['content-type']?.includes('application/json');

        if (!id) {
            if (isJson) return res.status(400).json({ error: "Invalid request id" });
            return res.status(400).send("Invalid request id");
        }

        const requestDetails = await requestModel.getRequestWithOwnerById(id);
        if (!requestDetails) {
            if (isJson) return res.status(404).json({ error: "Request not found" });
            return res.status(404).send("Request not found");
        }

        const user = getAuthUser(req);
        const currentUserId = Number(user?.id);
        const currentUserEmail = String(user?.email || '').trim().toLowerCase();
        const ownerUserId = Number(requestDetails.owner_user_id);
        const ownerEmail = String(requestDetails.owner_email || '').trim().toLowerCase();
        const requesterEmail = String(requestDetails.requester_email || '').trim().toLowerCase();

        const isAdmin = checkIsAdmin(req);
        const isOwner = currentUserId === ownerUserId || (currentUserEmail && currentUserEmail === ownerEmail);
        const isRequester = currentUserEmail && currentUserEmail === requesterEmail;

        if (mappedStatus === 'cancelled') {
            if (!isRequester && !isAdmin) {
                if (isJson) return res.status(403).json({ error: "Only the requester can cancel their request." });
                return res.status(403).send("Only the requester can cancel their request.");
            }
        } else if (!isAdmin && !isOwner) {
            if (isJson) return res.status(403).json({ error: "Only the item owner or admin can update this request." });
            return res.status(403).send("Only the item owner or admin can update this request.");
        }

        const allowedStatuses = ['accepted', 'rejected', 'completed', 'cancelled'];
        if (!allowedStatuses.includes(mappedStatus)) {
            if (isJson) return res.status(400).json({ error: 'Invalid request status.' });
            return res.status(400).send('Invalid request status.');
        }
        if (mappedStatus === 'completed' && String(requestDetails.status).toLowerCase() !== 'accepted') {
            if (isJson) return res.status(400).json({ error: 'Only an accepted request can be marked complete.' });
            return res.status(400).send('Only an accepted request can be marked complete.');
        }

        await requestModel.updateStatus(id, mappedStatus);

        const notifyEmail = isOwner ? requestDetails.requester_email : requestDetails.owner_email;
        if (notifyEmail) {
            const notification = await requestModel.createNotification({
                userEmail: notifyEmail,
                type: 'request_status',
                title: 'Request status updated',
                body: `The request for "${requestDetails.item_title || 'item'}" was ${mappedStatus}.`,
                requestId: Number(id)
            });
            if (io) {
                io.to(`user:${String(notifyEmail).toLowerCase()}`).emit('notification:new', notification);
            }

            if (mappedStatus === 'accepted' || mappedStatus === 'rejected') {
                mailer.sendStatusEmail(
                    requestDetails.requester_email,
                    mappedStatus,
                    requestDetails.item_title || 'an item',
                    isAdmin
                ).catch(err => console.error("Mail error:", err));
            }
        }

        if (isJson) {
            return res.json({ success: true, status: mappedStatus, message: `Request marked as ${mappedStatus}` });
        }
        return res.redirect('/requests.html');
    } catch (err) {
        console.error("UPDATE STATUS ERROR:", err);
        if (req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ error: "Error updating status" });
        }
        return res.status(500).send("Error updating status");
    }
};

exports.getRequestMessages = async (req, res) => {
    try {
        const requestId = Number(req.params.id);
        if (!requestId) return res.status(400).json({ error: "Invalid request id" });

        const requestDetails = await requestModel.getRequestWithOwnerById(requestId);
        if (!requestDetails) return res.status(404).json({ error: "Request not found" });

        const user = getAuthUser(req);
        const currentEmail = String(user?.email || '').trim().toLowerCase();
        const isAdmin = checkIsAdmin(req);
        const isOwner = currentEmail === String(requestDetails.owner_email || '').trim().toLowerCase();
        const isRequester = currentEmail === String(requestDetails.requester_email || '').trim().toLowerCase();

        if (!isAdmin && !isOwner && !isRequester) {
            return res.status(403).json({ error: "Not allowed to view this chat." });
        }

        const messages = await requestModel.getMessagesByRequestId(requestId);
        await requestModel.markMessagesRead(requestId, currentEmail);
        return res.json({ messages });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Error loading messages" });
    }
};

exports.sendRequestMessage = async (req, res) => {
    try {
        const requestId = Number(req.params.id);
        if (!requestId) return res.status(400).json({ error: "Invalid request id" });

        const requestDetails = await requestModel.getRequestWithOwnerById(requestId);
        if (!requestDetails) return res.status(404).json({ error: "Request not found" });

        const user = getAuthUser(req);
        const currentEmail = String(user?.email || '').trim().toLowerCase();
        const isAdmin = checkIsAdmin(req);
        const isOwner = currentEmail === String(requestDetails.owner_email || '').trim().toLowerCase();
        const isRequester = currentEmail === String(requestDetails.requester_email || '').trim().toLowerCase();

        if (!isAdmin && !isOwner && !isRequester) {
            return res.status(403).json({ error: "Not allowed to send messages for this request." });
        }

        const statusLower = String(requestDetails.status || '').toLowerCase();
        if (!isAdmin && (statusLower === 'rejected' || statusLower === 'cancelled')) {
            return res.status(403).json({ error: "Chat is closed for rejected or cancelled requests." });
        }

        const message = String(req.body.message || '').trim();
        if (!message) return res.status(400).json({ error: "Message cannot be empty." });
        if (message.length > 500) return res.status(400).json({ error: "Message must be 500 characters or less." });

        const normalizedMessage = message.toLowerCase();
        const hasBlockedWord = BLOCKED_WORDS.some(w => normalizedMessage.includes(w));
        if (hasBlockedWord) {
            return res.status(400).json({ error: "Please avoid offensive language in messages." });
        }

        const recentCount = await requestModel.countRecentMessagesForSender(requestId, currentEmail, 60);
        if (recentCount >= 5) {
            return res.status(429).json({ error: "Too many messages. Please wait a minute." });
        }

        const created = await requestModel.createMessage(requestId, currentEmail, message);
        if (io) {
            io.to(`request:${requestId}`).emit('chat:new_message', created);
        }

        const targetEmail = isOwner ? requestDetails.requester_email : requestDetails.owner_email;
        if (targetEmail && String(targetEmail).toLowerCase() !== currentEmail) {
            const notification = await requestModel.createNotification({
                userEmail: targetEmail,
                type: 'new_message',
                title: 'New request message',
                body: `${currentEmail}: ${message.slice(0, 80)}`,
                requestId
            });
            if (io) {
                io.to(`user:${String(targetEmail).toLowerCase()}`).emit('notification:new', notification);
            }
        }
        return res.json({ success: true, message: created });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Error sending message" });
    }
};

exports.getNotifications = async (req, res) => {
    try {
        const email = String(req.user?.email || req.session?.user?.email || '').trim().toLowerCase();
        if (!email) return res.status(401).json({ error: "Not logged in" });
        const notifications = await requestModel.getNotificationsByUser(email);
        const unreadCount = notifications.filter(n => !n.is_read).length;
        return res.json({ notifications, unreadCount });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Error loading notifications" });
    }
};

exports.markNotificationRead = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const email = String(req.user?.email || req.session?.user?.email || '').trim().toLowerCase();
        if (!id) return res.status(400).json({ error: "Invalid notification id" });
        const changed = await requestModel.markNotificationRead(id, email);
        if (!changed) return res.status(404).json({ error: "Notification not found" });
        return res.json({ success: true });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Error updating notification" });
    }
};

exports.markAllNotificationsRead = async (req, res) => {
    try {
        const email = String(req.user?.email || req.session?.user?.email || '').trim().toLowerCase();
        if (!email) return res.status(401).json({ error: "Not logged in" });
        const count = await requestModel.markAllNotificationsAsRead(email);
        return res.json({ success: true, count });
    } catch (err) {
        console.error("MARK ALL NOTIFS READ ERROR:", err);
        return res.status(500).json({ error: "Error updating notifications" });
    }
};

// ================= REVIEWS & FEEDBACK =================
exports.createReview = async (req, res) => {
    try {
        const user = req.user || req.session?.user;
        if (!user) return res.status(401).json({ error: 'Not logged in' });

        const requestId = Number(req.body.request_id);
        const rating = Number(req.body.rating);
        const comment = req.body.comment ? String(req.body.comment).trim() : null;

        if (!requestId || !rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating (1-5) and request ID are required.' });
        }

        const request = await requestModel.getRequestWithOwnerById(requestId);
        if (!request) return res.status(404).json({ error: 'Request not found' });

        const isCompleted = String(request.status || '').toLowerCase() === 'completed';
        if (!isCompleted) {
            return res.status(400).json({ error: 'Reviews can only be given after the handover is marked complete.' });
        }

        const currentEmail = String(user.email || '').trim().toLowerCase();
        const isRequester = currentEmail === String(request.requester_email || '').trim().toLowerCase();
        const isOwner = currentEmail === String(request.owner_email || '').trim().toLowerCase();

        if (!isRequester && !isOwner) {
            return res.status(403).json({ error: 'You are not part of this handover.' });
        }

        const alreadyReviewed = await reviewModel.hasUserReviewedRequest(requestId, user.id);
        if (alreadyReviewed) {
            return res.status(400).json({ error: 'You have already reviewed this handover.' });
        }

        let revieweeId = null;
        if (isRequester) {
            revieweeId = request.owner_id || (await userModel.findUserByEmail(request.owner_email))?.id;
        } else {
            revieweeId = (await userModel.findUserByEmail(request.requester_email))?.id;
        }

        if (!revieweeId) {
            return res.status(400).json({ error: 'Could not find neighbor to review.' });
        }

        const review = await reviewModel.createReview({
            requestId,
            reviewerId: user.id,
            revieweeId,
            rating,
            comment
        });

        // Notify reviewee
        const targetEmail = isRequester ? request.owner_email : request.requester_email;
        if (targetEmail) {
            const notification = await requestModel.createNotification({
                userEmail: targetEmail,
                type: 'new_review',
                title: 'New Neighbor Review! ⭐',
                body: `${user.name || user.email} left you a ${rating}-star review with a thank-you note.`,
                requestId
            });
            if (io) {
                io.to(`user:${String(targetEmail).toLowerCase()}`).emit('notification:new', notification);
            }
        }

        return res.json({ success: true, review, message: 'Thank you for your feedback! 🌿' });
    } catch (err) {
        console.error("CREATE REVIEW ERROR:", err);
        return res.status(500).json({ error: 'Failed to submit review' });
    }
};

// ================= PUBLIC NEIGHBOR PROFILE =================
exports.getPublicUserProfile = async (req, res) => {
    try {
        const userId = Number(req.params.id);
        if (!userId) return res.status(400).json({ error: 'Invalid user id' });

        const profile = await userModel.getPublicUserProfile(userId);
        if (!profile) return res.status(404).json({ error: 'Neighbor profile not found' });

        return res.json(profile);
    } catch (err) {
        console.error("GET PUBLIC PROFILE ERROR:", err);
        return res.status(500).json({ error: 'Error loading profile' });
    }
};

// ================= USER REVIEWS =================
exports.getUserReviews = async (req, res) => {
    try {
        const userId = Number(req.params.id);
        if (!userId) return res.status(400).json({ error: 'Invalid user id' });

        const reviews = await reviewModel.getReviewsForUser(userId);
        const summary = await reviewModel.getUserRatingSummary(userId);

        return res.json({ reviews, summary });
    } catch (err) {
        console.error("GET USER REVIEWS ERROR:", err);
        return res.status(500).json({ error: 'Error loading reviews' });
    }
};
