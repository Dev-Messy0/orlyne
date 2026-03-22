// commands/vv.js
import { downloadContentFromMessage, jidNormalizedUser } from "@whiskeysockets/baileys";
import { getMessages } from '../Utils/langManager.js';

export default async function vv(m, dvmsy) {
    const msg = getMessages(m.sender);
    
    try {
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted) {
            await dvmsy.sendMessage(
                m.chat,
                { 
                    text: msg.vv_reply
                },
                { quoted: m }
            );
            return;
        }

        // Extraire le message réel (affichage unique)
        const innerMsg =
            quoted.viewOnceMessageV2?.message ||
            quoted.viewOnceMessageV2Extension?.message ||
            quoted;

        let buffer, mediaType, caption;

        // --- Image à affichage unique ---
        if (innerMsg.imageMessage) {
            const stream = await downloadContentFromMessage(innerMsg.imageMessage, "image");
            buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            mediaType = "image";
            caption = msg.vv_image_caption;
        }
        // --- Vidéo à affichage unique ---
        else if (innerMsg.videoMessage) {
            const stream = await downloadContentFromMessage(innerMsg.videoMessage, "video");
            buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            mediaType = "video";
            caption = msg.vv_video_caption;
        }
        // --- Audio à affichage unique ---
        else if (innerMsg.audioMessage) {
            const stream = await downloadContentFromMessage(innerMsg.audioMessage, "audio");
            buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            mediaType = "audio";
            caption = msg.vv_audio_caption;
        }
        else {
            await dvmsy.sendMessage(
                m.chat,
                { 
                    text: msg.vv_invalid
                },
                { quoted: m }
            );
            return;
        }

        // Envoyer au propriétaire du bot (dvmsy.user.id)
        const botOwnerJid = jidNormalizedUser(dvmsy.user.id);      
        
        const footer = `\n👤 *De:* ${m.pushName || "Inconnu"}\n📞 *Numéro:* ${m.sender.split('@')[0]}\n🤖 *Par Orlyne BOT*`;
        
        if (mediaType === "image") {
            await dvmsy.sendMessage(
                botOwnerJid,
                { 
                    image: buffer, 
                    caption: caption + footer
                }
            );
        } else if (mediaType === "video") {
            await dvmsy.sendMessage(
                botOwnerJid,
                { 
                    video: buffer, 
                    caption: caption + footer
                }
            );
        } else if (mediaType === "audio") {
            await dvmsy.sendMessage(
                botOwnerJid,
                { 
                    audio: buffer, 
                    mimetype: "audio/mp4", 
                    ptt: innerMsg.audioMessage?.ptt || false,
                    caption: caption + footer
                }
            );
        }


    } catch (e) {
        console.error('[vv] erreur:', e);
        await dvmsy.sendMessage(
            m.chat,
            { 
                text: msg.vv_error + e.message
            },
            { quoted: m }
        );
    }
}