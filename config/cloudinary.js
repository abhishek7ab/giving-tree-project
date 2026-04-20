const cloudinary = require('cloudinary').v2;

// This will log to your Vercel terminal (Logs) to tell us if the keys are loaded
if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.error("❌ CLOUDINARY ERROR: Environment variables are NOT loaded!");
} else {
    console.log("✅ CLOUDINARY CONFIG: Environment variables detected.");
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

module.exports = cloudinary;