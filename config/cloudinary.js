const cloudinary = require('cloudinary').v2;

if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
}

// 🔥 UPLOAD FUNCTION
const uploadToCloudinary = (buffer) => {
    return new Promise((resolve, reject) => {
        if (!process.env.CLOUDINARY_CLOUD_NAME) {
            return reject(new Error('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'));
        }
        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'image',
                folder: 'giving-tree',
            },
            (error, result) => {
                if (error) {
                    console.error('❌ Cloudinary Upload Error:', error);
                    return reject(error);
                }
                resolve(result);
            }
        );
        stream.end(buffer);
    });
};

module.exports = { uploadToCloudinary };
