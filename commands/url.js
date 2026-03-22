// commands/url.js
import axios from 'axios';
import FormData from 'form-data';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { getMessages, formatMessage } from '../Utils/langManager.js';

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

export default async function url(m, dvmsy) {
    const msg = getMessages(m.sender);
    const target = m.quoted ? m.quoted : m;
    
    // Récupérer le type de média
    let mime = '';
    let mediaType = '';
    
    if (target.message?.imageMessage) {
        mime = target.message.imageMessage.mimetype || 'image/jpeg';
        mediaType = 'image';
    } else if (target.message?.videoMessage) {
        mime = target.message.videoMessage.mimetype || 'video/mp4';
        mediaType = 'video';
    } else if (target.message?.audioMessage) {
        mime = target.message.audioMessage.mimetype || 'audio/mpeg';
        mediaType = 'audio';
    } else if (target.message?.documentMessage) {
        mime = target.message.documentMessage.mimetype || 'application/octet-stream';
        mediaType = 'document';
    }

    // Vérifier si c'est un média supporté
    const isImage = /image\/(jpe?g|png|gif|webp)/.test(mime);
    const isVideo = /video\/(mp4|avi|mov|mkv|webm)/.test(mime);
    const isAudio = /audio\/(mpeg|mp4|ogg|wav|aac)/.test(mime);

    if (!isImage && !isVideo && !isAudio) {
        return dvmsy.sendMessage(m.chat, {
            text: msg.url_no_media
        });
    }

    let buffer;
    let fileExtension = '';

    // Déterminer l'extension
    if (isImage) {
        fileExtension = mime.includes('jpeg') ? 'jpg' :
                       mime.includes('png') ? 'png' :
                       mime.includes('gif') ? 'gif' : 'webp';
    } else if (isVideo) {
        fileExtension = mime.includes('mp4') ? 'mp4' :
                       mime.includes('avi') ? 'avi' :
                       mime.includes('mov') ? 'mov' :
                       mime.includes('mkv') ? 'mkv' : 'webm';
    } else if (isAudio) {
        fileExtension = mime.includes('mpeg') ? 'mp3' :
                       mime.includes('mp4') ? 'm4a' :
                       mime.includes('ogg') ? 'ogg' :
                       mime.includes('wav') ? 'wav' : 'aac';
    }

    // Message d'attente
    const waitMsg = await dvmsy.sendMessage(m.chat, { 
        text: msg.wait
    });

    try {
        // Télécharger le média
        const message = target.message;
        let mediaMessage = null;
        
        if (message?.imageMessage) mediaMessage = message.imageMessage;
        else if (message?.videoMessage) mediaMessage = message.videoMessage;
        else if (message?.audioMessage) mediaMessage = message.audioMessage;
        
        if (!mediaMessage) {
            throw new Error('Média non trouvé');
        }

        const stream = await downloadContentFromMessage(mediaMessage, mediaType);
        buffer = await streamToBuffer(stream);

        if (!buffer || buffer.length < 100) {
            throw new Error('Fichier vide ou corrompu');
        }

        const fileSize = (buffer.length / 1024 / 1024).toFixed(2);
        const filename = `file.${fileExtension}`;

        // Mise à jour du message
        await dvmsy.sendMessage(m.chat, {
            text: msg.url_uploading,
            edit: waitMsg.key
        });

        // Upload sur Catbox
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', buffer, { 
            filename, 
            contentType: mime 
        });

        const res = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders(),
            maxBodyLength: Infinity,
            timeout: 120000
        });

        const catboxUrl = (res && res.data) ? String(res.data).trim() : null;
        
        if (!catboxUrl || !/^https?:\/\//i.test(catboxUrl)) {
            throw new Error('Échec de l\'upload');
        }

        // Emoji selon le type
        let mediaEmoji = '📁';
        if (isImage) mediaEmoji = '🖼️';
        else if (isVideo) mediaEmoji = '🎥';
        else if (isAudio) mediaEmoji = '🎵';

        const caption = formatMessage(msg.url_success, {
            emoji: mediaEmoji,
            size: fileSize,
            filename: filename,
            url: catboxUrl
        });

        await dvmsy.sendMessage(m.chat, {
            text: caption,
            edit: waitMsg.key
        });

    } catch (error) {
        console.error('Erreur url:', error);
        
        let errorMessage = msg.url_error;
        
        if (error.message.includes('timeout')) {
            errorMessage = msg.url_timeout;
        } else if (error.message.includes('network')) {
            errorMessage = msg.url_network;
        }

        await dvmsy.sendMessage(m.chat, {
            text: errorMessage,
            edit: waitMsg.key
        });
    }
}