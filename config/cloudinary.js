const cloudinary = require('cloudinary').v2;

// 🔥 DEBUG (REMOVE AFTER FIX)
console.log("🔥 CLOUD NAME:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("🔥 API KEY:", process.env.CLOUDINARY_API_KEY ? "Loaded ✅" : "Missing ❌");
console.log("🔥 API SECRET:", process.env.CLOUDINARY_API_SECRET ? "Loaded ✅" : "Missing ❌");

// ⚠️ FAIL FAST (VERY IMPORTANT)
if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error("❌ CLOUDINARY_CLOUD_NAME is NOT set");
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(), // 🔥 trim safety
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 🔥 UPLOAD FUNCTION
const uploadToCloudinary = (buffer) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'image',
                folder: 'giving-tree', // optional (keeps uploads organized)
            },
            (error, result) => {
                if (error) {
                    console.error("❌ Cloudinary Upload Error:", error);
                    return reject(error);
                }
                resolve(result);
            }
        );
        stream.end(buffer);
    });
};

module.exports = { uploadToCloudinary };