const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Frontend files serve karne ke liye
app.use(express.static('public'));

// API: Pinterest se Video ya Image link nikalne ke liye
app.get('/api/download', async (req, res) => {
    let pinUrl = req.query.url;
    if (!pinUrl) return res.status(400).json({ error: "URL missing" });

    try {
        const response = await axios.get(pinUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Referer': 'https://www.pinterest.com/'
            }
        });

        const html = response.data;
        
        // Brute Force Regex: Poore HTML mein sabse high resolution wali MP4 dhoondna
        const mp4Matches = html.match(/https:\/\/v[0-9]\.pinimg\.com\/videos\/.*?\.mp4/g);
        let videoUrl = "";
        
        if (mp4Matches && mp4Matches.length > 0) {
            // Last link aksar sabse high quality (720p) hota hai
            videoUrl = mp4Matches[mp4Matches.length - 1].replace(/\\u002F/g, "/");
        }

        // Agar video nahi mili toh Image link dhoondna (Backup)
        const imageUrl = html.match(/property="og:image" content="(.*?)"/)?.[1];

        if (!videoUrl && !imageUrl) {
            return res.status(404).json({ success: false, message: "Media not found" });
        }

        res.json({
            success: true,
            url: videoUrl || imageUrl,
            isVideo: !!videoUrl
        });

    } catch (error) {
        res.status(500).json({ success: false, error: "Invalid URL or Pinterest blocked the request" });
    }
});

// API: Force Download (File ko browser mein save karwane ke liye)
app.get('/api/save', async (req, res) => {
    const fileUrl = req.query.url;
    if (!fileUrl) return res.status(400).send("URL required");

    try {
        const response = await axios({
            method: 'get',
            url: fileUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
                'Referer': 'https://www.pinterest.com/'
            }
        });

        const isVideo = fileUrl.includes('.mp4');
        const filename = `PinSaver_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;

        // Header set karna taaki file save ho, open nahi
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', isVideo ? 'video/mp4' : 'image/jpeg');

        response.data.pipe(res);
    } catch (e) {
        res.status(500).send("Pinterest blocked the download proxy. Please long-press on the media to save.");
    }
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
