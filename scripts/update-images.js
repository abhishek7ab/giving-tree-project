require('dotenv').config();
const db = require('../database/db');

async function updateItemImages() {
    await db.query("UPDATE items SET image = '/assets/uploads/1773840191342-mahrous-houses-5AoOejjRUrA-unsplash.jpg' WHERE title ILIKE '%Study Table%'");
    await db.query("UPDATE items SET image = '/assets/uploads/1773840358957-lisa-anna-B_Z0jNzpyWk-unsplash.jpg' WHERE title ILIKE '%Guitar%'");
    await db.query("UPDATE items SET image = '/assets/uploads/laptop.jpg' WHERE title ILIKE '%Monitor%' OR title ILIKE '%Laptop%'");
    await db.query("UPDATE items SET image = '/assets/story-img.png' WHERE title ILIKE '%Bookset%' OR title ILIKE '%Book%'");
    await db.query("UPDATE items SET image = '/assets/uploads/printer.jpg' WHERE title ILIKE '%Cycle%' OR title ILIKE '%Printer%'");
    await db.query("UPDATE items SET image = '/assets/uploads/tv.jpg' WHERE title ILIKE '%Kettle%' OR title ILIKE '%TV%'");
    console.log('Database items updated with clean image assets.');
    process.exit(0);
}

updateItemImages().catch(err => {
    console.error(err);
    process.exit(1);
});
