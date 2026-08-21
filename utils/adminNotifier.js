const requestModel = require('../models/requestModel');
const auditModel = require('../models/auditModel');

const ADMIN_EMAIL = 'badaveabhishek2004@gmail.com';

let ioInstance = null;

exports.setSocketIO = (io) => {
    ioInstance = io;
};

exports.ADMIN_EMAIL = ADMIN_EMAIL;

/**
 * Send persistent notification and real-time Socket.IO alert to Admin
 */
exports.notifyAdmin = async ({ type, title, body, requestId = null, userId = null, userEmail = null, req = null }) => {
    try {
        // 1. Insert notification in database for platform administrator
        const notif = await requestModel.createNotification({
            userEmail: ADMIN_EMAIL,
            type: type || 'admin_alert',
            title: title || 'Admin Platform Alert',
            body: body || 'New platform activity detected.',
            requestId: requestId || null
        });

        // 2. Real-time emit to admin room & user email
        if (ioInstance) {
            ioInstance.to(`user:${ADMIN_EMAIL}`).emit('notification:new', notif);
            ioInstance.to('admin').emit('notification:new', notif);
            ioInstance.emit('admin:activity', { type, title, body, createdAt: new Date() });
        }

        // 3. Record in audit_logs for traceability
        await auditModel.logEvent({
            userId,
            userEmail: userEmail || ADMIN_EMAIL,
            action: String(type || 'ADMIN_ALERT').toUpperCase(),
            details: { title, body },
            req
        });

        return notif;
    } catch (e) {
        console.error('Failed to notify admin:', e.message);
        return null;
    }
};
