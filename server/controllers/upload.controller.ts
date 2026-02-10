import { Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { createContext } from "../_core/context";

// Configure Upload Directory
const uploadDir = path.join(process.cwd(), "storage/uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, uploadDir);
    },
    filename: function (_req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Multer Upload Instance
export const uploadMiddleware = multer({
    storage,
    limits: {
        fileSize: 30 * 1024 * 1024, // 30MB max
        files: 5 // Max 5 files per request
    },
    fileFilter: (_req, file, cb) => {
        // SECURITY: Block SVG to prevent XSS
        if (file.mimetype === "image/svg+xml") {
            return cb(new Error("SVG files are not allowed for security reasons."));
        }

        // Allowlist
        const allowedTypes = [
            // images
            "image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif",
            // audio (WhatsApp common)
            "audio/ogg", "audio/mpeg", "audio/mp3", "audio/aac", "audio/mp4", "audio/x-m4a", "audio/webm", "audio/opus",
            // video
            "video/mp4", "video/webm", "video/quicktime", "video/3gpp",
            // docs
            "application/pdf",
            "text/plain",
            "application/zip", "application/x-zip-compressed",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            cb(new Error(`Invalid file type: ${file.mimetype}`));
            return;
        }
        cb(null, true);
    }
});

/**
 * Handle serving uploaded files securely
 */
export const serveUpload = async (req: Request, res: Response) => {
    const name = req.params.name;
    // Prevent directory traversal
    const safeName = path.basename(name);
    const filepath = path.join(uploadDir, safeName);

    // Security headers
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'"); // Prevent executing scripts inside

    if (fs.existsSync(filepath)) {
        res.sendFile(filepath);
    } else {
        res.status(404).send("Not found");
    }
};

/**
 * Handle new file uploads
 */
export const handleUpload = (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }

    // Frontend expects: Array<{ filename, originalname, mimetype, url, size }>
    // Keep extra fields for backwards compatibility.
    const uploadedFiles = files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        url: `/api/uploads/${file.filename}`,
        size: file.size,
        type: file.mimetype.startsWith('image/') ? 'image' :
            file.mimetype.startsWith('video/') ? 'video' :
                file.mimetype.startsWith('audio/') ? 'audio' : 'file',
        name: file.originalname,
    }));

    res.json({ files: uploadedFiles });
};
