import express from "express";
import session from "express-session";
import expressLayouts from "express-ejs-layouts";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import config from "../config.js";
import logger from "../utils/logger.js";
import { stringify, prettySize } from "./utils/helpers.js";

import { requireAuth } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";
import uploadRoutes from "./routes/upload.js";
import previewRoutes from "./routes/preview.js";

const app = express();

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'src/server/views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

app.use(express.urlencoded({ extended: true }));

// ✅ BUG FIX: السر الثابت 'streambot-2024' استُبدل بسر عشوائي
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.use(express.static(path.join(process.cwd(), 'src/server/public')));

app.use((req, res, next) => {
    res.locals.stringify = stringify;
    res.locals.prettySize = prettySize;
    next();
});

app.use(requireAuth);
app.use('/', authRoutes);
app.use('/', dashboardRoutes);
app.use('/', uploadRoutes);
app.use('/', previewRoutes);

if (!fs.existsSync(config.videosDir)) {
    fs.mkdirSync(config.videosDir, { recursive: true });
}
if (!fs.existsSync(path.dirname(config.previewCacheDir))) {
    fs.mkdirSync(path.dirname(config.previewCacheDir), { recursive: true });
}
if (!fs.existsSync(config.previewCacheDir)) {
    fs.mkdirSync(config.previewCacheDir, { recursive: true });
}

app.listen(config.server_port, () => {
    logger.info(`✅ Server running on port ${config.server_port}`);
});

export default app;
