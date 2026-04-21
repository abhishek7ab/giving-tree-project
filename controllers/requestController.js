diff --git a/controllers/requestController.js b/controllers/requestController.js
index 6947027b5d7c41a8143e8fcebec74471779111be..31cd40e1f925fa141ab965f2f08f95c1990de126 100644
--- a/controllers/requestController.js
+++ b/controllers/requestController.js
@@ -1,53 +1,53 @@
-const path = require('path');
 const requestModel = require('../models/requestModel');
+const FRONTEND_BASE_URL = 'https://giving-tree-frontend.vercel.app';
 
 // ================= 1. REQUEST AN ITEM =================
 exports.requestItem = async (req, res) => {
     if (!req.session.user) return res.redirect('/login');
 
     try {
         const item_id = req.body.item_id;
         const email = req.session.user.email;
         await requestModel.createRequest(item_id, email);
         res.redirect('/items');
     } catch (err) {
         console.error(err);
         res.send("Error sending request");
     }
 };
 
 // ================= 2. SHOW THE HUB PAGE =================
 exports.viewRequests = (req, res) => {
-    res.sendFile(path.join(__dirname, '../pages/requests.html'));
+    return res.redirect(`${FRONTEND_BASE_URL}/requests.html`);
 };
 
 // ================= 3. GET DATA FOR THE HUB (API) =================
 exports.getActivityData = async (req, res) => {
     if (!req.session.user) return res.json({ error: "Not logged in" });
 
     try {
         const userEmail = req.session.user.email;
         const receivedResults = await requestModel.getRequests();
         const sentResults = await requestModel.getRequestsByRequester(userEmail);
 
         res.json({
             received: receivedResults,
             sent: sentResults
         });
     } catch (err) {
         console.error(err);
         res.json({ error: "DB Error" });
     }
 };
 
 // ================= 4. UPDATE STATUS =================
 exports.updateRequestStatus = async (req, res) => {
     try {
         const { id, status } = req.body;
         await requestModel.updateStatus(id, status);
         res.redirect('/requests');
     } catch (err) {
         console.error(err);
         res.send("Error updating status");
     }
};
\ No newline at end of file
};
