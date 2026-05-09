const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

app.get('/api/download', async (req, res) => {
    let pinUrl = req.query.url;
    if (!pinUrl) return res.status(400).json({ error: "URL missing" });

    try {
        const response = await axios.get(pinUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
            }
        });
        const html = response.data;
        const mp4Matches = html.match(/https:\/\/v[0-9]\.pinimg\.com\/videos\/.*?\.mp4/g);
        let videoUrl = mp4Matches ? mp4Matches[mp4Matches.length - 1].replace(/\\u002F/g, "/") : "";
        const imageUrl = html.match(/property="og:image" content="(.*?)"/)?.[1];
        res.json({ success: true, url: videoUrl || imageUrl, isVideo: !!videoUrl });
    } catch (error) { res.status(500).json({ success: false }); }
});

// IMPROVED PROXY LOGIC
app.get('/api/save', async (req, res) => {
    const fileUrl = req.query.url;
    if (!fileUrl) return res.status(400).send("URL missing");

    try {
        const response = await axios({
            method: 'get',
            url: fileUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                'Referer': 'https://www.pinterest.com/',
                'Origin': 'https://www.pinterest.com',
                'Accept': '*/*',
                'Range': 'bytes=0-' // Ye video player ko simulate karta hai
            }
        });

        const isVideo = fileUrl.includes('.mp4');
        const filename = `PinSaver_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        response.data.pipe(res);

    } catch (e) {
        console.log("Pinterest Blocked Proxy. Redirecting to Direct Link...");
        // Agar proxy block ho jaye, toh direct link par bhej do (User long-press karke save kar lega)
        res.redirect(fileUrl);
    }
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
