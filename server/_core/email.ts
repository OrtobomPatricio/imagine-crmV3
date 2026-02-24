import nodemailer from 'nodemailer';
import { getDb } from '../db';
import { appSettings } from '../../drizzle/schema';
import { desc } from 'drizzle-orm';
import { decryptSecret } from './crypto';

interface SendEmailOptions {
    tenantId: number;
    to: string;
    subject: string;
    html?: string;
    text?: string;
}

export async function getSmtpConfig(tenantId: number) {
    const db = await getDb();
    if (!db) return null;

    const { getOrCreateAppSettings } = await import("../services/app-settings");
    const row = await getOrCreateAppSettings(db, tenantId);

    if (!row.smtpConfig || !row.smtpConfig.host) return null;

    return row.smtpConfig as {
        host: string;
        port: number;
        secure: boolean;
        user: string;
        pass?: string | null;
        from?: string;
    };
}

export async function sendEmail({ tenantId, to, subject, html, text }: SendEmailOptions) {
    const config = await getSmtpConfig(tenantId);

    // If no SMTP config, we just log it (in dev/preview)
    if (!config) {
        console.log(`[Email Service] No SMTP config found. Mock sending to ${to}`);
        console.log(`[Email Service] Subject: ${subject}`);
        console.log(`[Email Service] Content length: ${html?.length ?? text?.length ?? 0}`);
        return false;
    }

    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
            user: config.user,
            pass: decryptSecret(config.pass) ?? "",
        },
    });

    try {
        const info = await transporter.sendMail({
            from: config.from || `"Imagine CRM" <${config.user}>`,
            to,
            subject,
            ...(html ? { html } : {}),
            ...(text ? { text } : {}),
        });
        console.log(`[Email Service] Email sent: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('[Email Service] Error sending email:', error);
        throw error;
    }
}

export async function verifySmtpConnection(config: any) {
    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
            user: config.user,
            pass: decryptSecret(config.pass) ?? "",
        },
    });

    await transporter.verify();
    return true;
}
