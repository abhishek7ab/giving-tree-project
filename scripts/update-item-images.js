require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../database/db');

const brainDir = 'C:\\Users\\Abhishek\\.gemini\\antigravity-ide\\brain\\78ef4b8d-1a48-46cd-8cab-9be97aa97581';
const uploadsDir = path.join(__dirname, '..', 'frontend', 'assets', 'uploads');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// 1. Copy generated helmet image
const helmetSrc = path.join(brainDir, 'motorcycle_helmet_asset_1787162445257.jpg');
const helmetDest = path.join(uploadsDir, 'helmet.jpg');
if (fs.existsSync(helmetSrc)) {
    fs.copyFileSync(helmetSrc, helmetDest);
    console.log('✅ Helmet image copied to:', helmetDest);
}

// 2. Copy generated phone image
const phoneSrc = path.join(brainDir, 'old_samsung_phone_asset_1787162461566.jpg');
const phoneDest = path.join(uploadsDir, 'phone.jpg');
if (fs.existsSync(phoneSrc)) {
    fs.copyFileSync(phoneSrc, phoneDest);
    console.log('✅ Phone image copied to:', phoneDest);
}

async function updateDb() {
    try {
        const helmetResult = await db.query(
            "UPDATE items SET image = '/assets/uploads/helmet.jpg' WHERE title ILIKE '%Healmet%' OR title ILIKE '%Helmet%' RETURNING id, title, image"
        );
        console.log('✅ Updated Helmet in DB:', helmetResult.rows);

        const phoneResult = await db.query(
            "UPDATE items SET image = '/assets/uploads/phone.jpg' WHERE title ILIKE '%Phone%' OR title ILIKE '%Mobile%' RETURNING id, title, image"
        );
        console.log('✅ Updated Old Phone in DB:', phoneResult.rows);

        const allItems = await db.query("SELECT id, title, image, category FROM items ORDER BY id ASC");
        console.log('\n📊 All Live Inventory Items:');
        console.table(allItems.rows);

        process.exit(0);
    } catch (err) {
        console.error('❌ Error updating DB:', err);
        process.exit(1);
    }
}

updateDb();
