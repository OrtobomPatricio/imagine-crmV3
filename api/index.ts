import { createApp } from '../server/_core/index';
// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';

let appPromise: Promise<any> | null = null;

async function getApp() {
    if (!appPromise) {
        appPromise = createApp();
    }
    return appPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const app = await getApp();
    // Vercel handles the server, we just pass the request to Express
    app(req, res);
}
