const path = require('path');
const requestModel = require('../models/requestModel');

// ================= 1. REQUEST AN ITEM =================
exports.requestItem = (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const item_id = req.body.item_id;
    const email = req.session.user.email;

    requestModel.createRequest(item_id, email, (err) => {
        if (err) return res.send("Error sending request");
        res.redirect('/items');
    });
};

// ================= 2. SHOW THE HUB PAGE =================
// This simply opens your physical 'requests.html' file
exports.viewRequests = (req, res) => {
    res.sendFile(path.join(__dirname, '../pages/requests.html'));
};

// ================= 3. GET DATA FOR THE HUB (API) =================
// This provides the data to the 'requests.html' page via Fetch
exports.getActivityData = (req, res) => {
    if (!req.session.user) return res.json({ error: "Not logged in" });

    const userEmail = req.session.user.email;

    // 1. Get Received Requests (Requests for your items)
    requestModel.getRequests((err, receivedResults) => {
        if (err) return res.json({ error: "DB Error (Received)" });

        // 2. Get Sent Requests (Requests you made)
        requestModel.getRequestsByRequester(userEmail, (err, sentResults) => {
            if (err) return res.json({ error: "DB Error (Sent)" });

            // Return both lists as JSON
            res.json({
                received: receivedResults,
                sent: sentResults
            });
        });
    });
};

// ================= 4. UPDATE STATUS =================
exports.updateRequestStatus = (req, res) => {
    const { id, status } = req.body;

    requestModel.updateStatus(id, status, (err) => {
        if (err) return res.send("Error updating status");
        res.redirect('/requests');
    });
};