// commands/sticker.js
import fs from "fs";
import path from "path";
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import { Sticker, StickerTypes } from "wa-sticker-formatter";
import { getMessages } from '../Utils/langManager.js';

export default async function sticker(m, dvmsy) {
    const msg = getMessages(m.sender);
    
    try {
        const remoteJid = m.key.remoteJid;
        const quotedMessage = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const username = m.pushName || "Inconnu";

        if (!quotedMessage) {
            return dvmsy.sendMessage(remoteJid, { 
                text: msg.sticker_reply
            });
        }

        const isVideo = !!quotedMessage.videoMessage;
        const isImage = !!quotedMessage.imageMessage;

        if (!isVideo && !isImage) {
            return dvmsy.sendMessage(remoteJid, { 
                text: msg.sticker_invalid
            });
        }

        const mediaBuffer = await downloadMediaMessage({ message: quotedMessage, client: dvmsy }, "buffer");

        if (!mediaBuffer) {
            return dvmsy.sendMessage(remoteJid, { 
                text: msg.download_error
            });
        }

        const tempInput = isVideo ? "./temp_video.mp4" : "./temp_image.jpg";
        const tempOutput = "./temp_sticker.webp";

        fs.writeFileSync(tempInput, mediaBuffer);

        if (isVideo) {
            console.log("⚙️ Traitement de la vidéo en sticker...");

            await new Promise((resolve, reject) => {
                ffmpeg(tempInput)
                    .output(tempOutput)
                    .outputOptions([
                        "-vf scale=512:512:flags=lanczos",
                        "-c:v libwebp",
                        "-q:v 50",
                        "-preset default",
                        "-loop 0",
                        "-an",
                        "-vsync 0"
                    ])
                    .on("end", resolve)
                    .on("error", reject)
                    .run();
            });

        } else {
            console.log("⚙️ Traitement de l'image en sticker...");

            await sharp(tempInput)
                .resize(512, 512, { fit: "inside" })
                .webp({ quality: 80 })
                .toFile(tempOutput);
        }

        const sticker = new Sticker(tempOutput, {
            pack: `${username}`,
            author: `Orlyne BOT`,
            type: isVideo ? StickerTypes.FULL : StickerTypes.DEFAULT,
            quality: 80,
            animated: isVideo,
        });

        const stickerMessage = await sticker.toMessage();
        await dvmsy.sendMessage(remoteJid, stickerMessage);

        fs.unlinkSync(tempInput);
        fs.unlinkSync(tempOutput);

    } catch (error) {
        console.error("❌ Erreur:", error);
        await dvmsy.sendMessage(m.key.remoteJid, { 
            text: msg.sticker_error
        });
    }
}