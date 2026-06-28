import { Router } from 'express';
import axios from 'axios';
import https from 'https';
import fs from 'fs';
import path from 'path';
import config from '../../config.js';
import logger from '../../utils/logger.js';
import { upload } from '../middleware/multer.js';

const router = Router();
const agent = new https.Agent({ rejectUnauthorized: false });

// ✅ BUG FIX: أُضيف null check على req.file
router.post("/api/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
        res.status(400).json({ success: false, message: "No file was uploaded" });
        return;
    }
    res.json({
        success: true,
        message: "File uploaded successfully",
        filename: req.file.filename,
        size: req.file.size
    });
});

// ✅ BUG FIX: أُزيل الحساب المزدوج لـ downloaded (كان يُحسب مرتين)
router.post("/api/remote_upload", upload.single("link"), async (req, res) => {
    const link = req.body.link;
    if (!link) {
        res.status(400).json({ success: false, message: "No URL provided" });
        return;
    }

    const filename = link.substring(link.lastIndexOf('/') + 1) || 'video.mp4';
    const filepath = path.join(config.videosDir, filename);

    try {
        const headResponse = await axios.head(link, { httpsAgent: agent });
        const totalSize = parseInt(String(headResponse.headers['content-length'] ?? 0), 10);

        const response = await axios.get(link, {
            responseType: "stream",
            httpsAgent: agent
        });

        const writer = fs.createWriteStream(filepath);
        let downloaded = 0;

        // ✅ FIX: تتبع التقدم من data فقط، مش onDownloadProgress و data معاً
        response.data.on('data', (chunk: Buffer) => {
            downloaded += chunk.length;
            const pct = totalSize > 0 ? Math.round((downloaded * 100) / totalSize) : 0;
            logger.info(`Remote download progress: ${pct}% (${downloaded}/${totalSize})`);
        });

        response.data.pipe(writer);

        writer.on("finish", () => {
            res.json({
                success: true,
                message: "Remote file downloaded successfully",
                filename,
                size: downloaded
            });
        });

        writer.on("error", (err) => {
            logger.error(err);
            res.status(500).json({ success: false, message: "Error writing file" });
        });
    } catch (err) {
        logger.error(err);
        res.status(500).json({ success: false, message: "Error downloading file" });
    }
});

export default router;
