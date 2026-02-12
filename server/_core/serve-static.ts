import express, { type Express } from "express";
import fs from "fs";
import path from "path";

function findStaticRoot(): string | null {
    const cwd = process.cwd();
    console.log(`🔍 Searching for static root. CWD: ${cwd}`);

    const candidates = [
        path.join(cwd, "dist", "public"), // Standard Vite output as per config
        path.join(cwd, "dist"),           // Fallback if config ignored
        path.join(cwd, "public"),         // Raw public (unlikely for assets)
        path.join(cwd, "client", "dist"), // Monorepo style
        path.join(cwd, "client", "public"),
    ];

    for (const p of candidates) {
        const indexHtml = path.join(p, "index.html");
        if (fs.existsSync(indexHtml)) {
            console.log(`✅ Found static root at: ${p} (contains index.html)`);
            return p;
        } else {
            // Check if directory exists at least
            if (fs.existsSync(p)) {
                console.log(`   Checked: ${p} (Exists, but NO index.html)`);
            } else {
                console.log(`   Checked: ${p} (Missing)`);
            }
        }
    }
    return null;
}

export function serveStatic(app: Express) {
    const root = findStaticRoot();

    if (!root) {
        console.error("❌ CRITICAL: Could not find static root (index.html not found in any candidate).");
        // We don't throw, we let it fail gracefully with 404s so API still works
    } else {
        console.log("📂 Serving static files from:", root);

        // Assets debug
        const assetsPath = path.join(root, "assets");
        if (fs.existsSync(assetsPath)) {
            try {
                const files = fs.readdirSync(assetsPath).slice(0, 5);
                console.log(`   Assets found (${files.length}+):`, files);
            } catch (e) { console.error("   Error listing assets:", e); }
        } else {
            console.warn("⚠️  Assets folder missing in resolved root!");
        }

        app.use(
            express.static(root, {
                index: false,
                maxAge: "1y",
                immutable: true,
                setHeaders(res, filePath) {
                    if (filePath.endsWith(".html")) {
                        res.setHeader("Cache-Control", "no-store");
                    }
                },
            })
        );
    }

    // Fallback Handler
    app.get("*", (req, res) => {
        // API/TRPC -> 404 JSON
        if (req.path.startsWith("/api") || req.path.startsWith("/trpc")) {
            return res.status(404).json({ error: "Not Found", path: req.path });
        }

        // Assets -> 404 (Don't serve HTML)
        if (req.path.startsWith("/assets/") || req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
            return res.status(404).send("Asset not found");
        }

        if (!root) {
            return res.status(500).send("Server Error: Static assets not found.");
        }

        const indexPath = path.join(root, "index.html");
        // Final check
        if (!fs.existsSync(indexPath)) {
            return res.status(500).send("Server Error: index.html missing.");
        }

        res.sendFile(indexPath);
    });
}
