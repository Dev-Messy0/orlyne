// commands/take.js
import fs from "fs";
import path from "path";
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { Sticker, StickerTypes } from "wa-sticker-formatter";
import { getMessages } from '../Utils/langManager.js';

export default async function take(m, dvmsy) {
    const msg = getMessages(m.sender);
    
    try {
        const remoteJid = m.key.remoteJid;
        const messageBody = m.message?.extendedTextMessage?.text || m.message?.conversation || '';
        const quotedMessage = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        const commandAndArgs = messageBody.slice(1).trim();
        const parts = commandAndArgs.split(/\s+/);
        let username;
        let text;
        const cmdArgs = parts.slice(1);

        if (cmdArgs.length <= 0) {
            username = m.pushName || "Orlyne";
            text = username;
        } else {
            username = cmdArgs.join(" ");
            text = username;
        }

        if (!quotedMessage || !quotedMessage.stickerMessage) {
            return dvmsy.sendMessage(remoteJid, { 
                text: msg.take_reply
            });
        }

        const stickerBuffer = await downloadMediaMessage({ message: quotedMessage }, "buffer");

        if (!stickerBuffer) {
            return dvmsy.sendMessage(remoteJid, { 
                text: msg.download_error
            });
        }

        const tempStickerPath = path.resolve("./temp_sticker.webp");
        fs.writeFileSync(tempStickerPath, stickerBuffer);

        const isAnimated = quotedMessage.stickerMessage.isAnimated || false;

        const sticker = new Sticker(tempStickerPath, {
            pack: `${username}`,
            author: `${text}`,
            type: isAnimated ? StickerTypes.FULL : StickerTypes.DEFAULT,
            quality: 90,
            animated: isAnimated,
            background: "#FFFFFF",
        });

        const stickerMessage = await sticker.toMessage();
        await dvmsy.sendMessage(remoteJid, stickerMessage);

        fs.unlinkSync(tempStickerPath);
        console.log(`✅ Sticker envoyé avec succès avec les métadonnées "${username}" !`);

    } catch (error) {
        console.error("❌ Erreur:", error);
        await dvmsy.sendMessage(m.key.remoteJid, { 
            text: msg.take_error
        });
    }
}