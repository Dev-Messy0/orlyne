// Utils/messageUtils.js
import config from '../config.js';

/**
 * Extrait les informations de base du message
 */

export function getMessageInfo(m, dvmsy) {
    try {
        if (!m) return { body: '', sender: '', pushName: '' };
        if (!m.message) return { body: '', sender: m.key?.participant || m.key?.remoteJid || '', pushName: m.pushName || '' };
        
        const messageType = m.message ? Object.keys(m.message)[0] : 'unknown';
        
        let body = '';
        let pushName = m.pushName || '';
        
        // Protection contre les messages null
        const msgContent = m.message[messageType];
        if (!msgContent) return { body: '', sender: m.key?.participant || m.key?.remoteJid || '', pushName };
        
        if (messageType === 'conversation') {
            body = msgContent || '';
        } else if (messageType === 'extendedTextMessage') {
            body = msgContent?.text || '';
        } else if (messageType === 'imageMessage') {
            body = msgContent?.caption || '';
        } else if (messageType === 'videoMessage') {
            body = msgContent?.caption || '';
        } else if (messageType === 'documentMessage') {
            body = msgContent?.caption || '';
        }
        
        const sender = m.key?.participant || m.key?.remoteJid || '';
        
        return {
            body: body || '',
            sender,
            pushName: pushName || sender?.split('@')[0] || '',
            messageType,
            isGroup: m.key?.remoteJid?.endsWith('@g.us') || false,
            timestamp: m.messageTimestamp,
            chat: m.key?.remoteJid || ''
        };
    } catch (error) {
        console.error('Erreur getMessageInfo:', error);
        return { body: '', sender: '', pushName: '' };
    }
}