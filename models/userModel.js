const db = require('../database/db');
const bcrypt = require('bcrypt');

exports.createUser = async (name, email, password) => {
    const hashedPassword = await bcrypt.hash(password, 10);

    // ❌ removed duplicate query
    const result = await db.query(
        "INSERT INTO users (name, email, password) VALUES ($1,$2,$3) RETURNING *",
        [name, email, hashedPassword]
    );

    return result.rows[0];
};

exports.findUserByEmail = async (email) => {
    const result = await db.query(
        "SELECT * FROM users WHERE email=$1",
        [email]
    );
    return result.rows[0];
};

exports.getAllUsers = async () => {
    const result = await db.query(
        "SELECT id,name,email,city,role FROM users ORDER BY id DESC"
    );
    return result.rows;
};