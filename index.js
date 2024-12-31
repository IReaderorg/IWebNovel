const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

const PASTEBIN_API = "https://pastebin.com/api/api_post.php";
const API_DEV_KEY = process.env.PASTEBIN_API_KEY; // Store your API key in a `.env` file

app.post('/api/save-to-pastebin', async (req, res) => {
    const { title, content } = req.body;

    if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required." });
    }

    try {
        const response = await axios.post(PASTEBIN_API, new URLSearchParams({
            api_dev_key: API_DEV_KEY,
            api_option: "paste",
            api_paste_code: content,
            api_paste_name: title,
            api_paste_private: "1", // Unlisted
            api_paste_expire_date: "1M", // 1 Month
        }));

        res.json({ link: response.data });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Failed to save chapter to Pastebin." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
