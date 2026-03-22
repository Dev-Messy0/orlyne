// commands/saveStatus.js
import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import config from '../config.js';
import { getMessages, formatMessage } from '../Utils/langManager.js';

export default async function saveStatus(m, dvmsy) {
    const msg = getMessages(m.sender);
    
    // La commande doit être une réponse à un statut
    const quoted = m.quoted;

    if (!quoted) {
        return dvmsy.sendMessage(m.key.remoteJid, {
            text: formatMessage(msg.save_usage, { prefix: config.PREFIX })
        }, { quoted: m });
    }

    const mime = quoted?.msg?.mimetype || '';
    const isImage = mime.startsWith('image/');
    const isVideo = mime.startsWith('video/');
    const isAudio = mime.startsWith('audio/');

    if (!isImage && !isVideo && !isAudio) {
        return dvmsy.sendMessage(m.key.remoteJid, {
            text: msg.save_invalid
        }, { quoted: m });
    }

    try {
        await dvmsy.sendMessage(m.key.remoteJid, {
            text: msg.wait
        }, { quoted: m });

        // Déterminer le type de contenu
        let mediaType = 'image';
        if (isVideo) mediaType = 'video';
        else if (isAudio) mediaType = 'audio';

        // Télécharger le média
        const stream = await downloadContentFromMessage(quoted.msg, mediaType);
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);

        const senderName = quoted.sender?.split('@')[0] || 'Inconnu';

        // Renvoyer selon le type
        if (isImage) {
            await dvmsy.sendMessage(m.key.remoteJid, {
                image: buffer,
                caption: formatMessage(msg.save_success, { 
                    from: senderName,
                    type: 'Image'
                })
            });
        } else if (isVideo) {
            await dvmsy.sendMessage(m.key.remoteJid, {
                video: buffer,
                caption: formatMessage(msg.save_success, { 
                    from: senderName,
                    type: 'Vidéo'
                })
            });
        } else if (isAudio) {
            await dvmsy.sendMessage(m.key.remoteJid, {
                audio: buffer,
                mimetype: 'audio/mp4',
                ptt: false
            });
            await dvmsy.sendMessage(m.key.remoteJid, {
                text: formatMessage(msg.save_success, { 
                    from: senderName,
                    type: 'Audio'
                })
            });
        }

    } catch (err) {
        console.error('Erreur saveStatus:', err);
        await dvmsy.sendMessage(m.key.remoteJid, {
            text: msg.save_error
        }, { quoted: m });
    }
}