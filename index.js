const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

const PASTEBIN_API = "https://pastebin.com/api/api_post.php";
const API_DEV_KEY = process.env.PASTEBIN_API_KEY;
const SECRET_KEY = process.env.SECRET_KEY || "lifeishard"; // JWT secret key

// Initialize SQLite database
const db = new sqlite3.Database('./data.db', (err) => {
    if (err) console.error(err.message);
    console.log('Connected to SQLite database.');
});

// Create tables
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )
`);
db.run(`
    CREATE TABLE IF NOT EXISTS chapters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_title TEXT,
        chapter_title TEXT,
        pastebin_url TEXT
    )
`);

// Register route
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hashedPassword], function (err) {
        if (err) return res.status(500).json({ error: "Username already exists." });
        res.status(201).json({ message: "User registered successfully." });
    });
});

// Login route
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
    }
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err || !user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: "Invalid credentials." });
        }
        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ message: "Login successful.", token });
    });
});

// Middleware for authentication
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Access denied." });
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ error: "Invalid token." });
    }
};

// Save data to Pastebin and database
app.post('/api/save-to-pastebin', authenticate, async (req, res) => {
    const { bookTitle, chapterTitle, content } = req.body;

    if (!bookTitle || !chapterTitle || !content) {
        return res.status(400).json({ error: "Book title, chapter title, and content are required." });
    }

    try {
        const response = await axios.post(PASTEBIN_API, new URLSearchParams({
            api_dev_key: API_DEV_KEY,
            api_option: "paste",
            api_paste_code: content,
            api_paste_name: chapterTitle,
            api_paste_private: "1",
            api_paste_expire_date: "1M",
        }));

        const pastebinUrl = response.data;

        db.run(`INSERT INTO chapters (book_title, chapter_title, pastebin_url) VALUES (?, ?, ?)`,
            [bookTitle, chapterTitle, pastebinUrl],
            function (err) {
                if (err) return res.status(500).json({ error: "Failed to save data to database." });
                res.json({ message: "Data saved successfully.", link: pastebinUrl });
            });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to save chapter to Pastebin." });
    }
});

// API to fetch saved chapters
app.get('/api/chapters', authenticate, (req, res) => {
    db.all(`SELECT book_title, chapter_title, pastebin_url FROM chapters`, [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Failed to fetch chapters." });
        }
        res.json(rows);
    });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
