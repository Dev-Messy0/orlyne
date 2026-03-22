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

/**
 * Vérifie si un utilisateur est owner
 */
export function checkIsOwner(senderJid, senderNumber, m, dvmsy) {
    const ownerNums = [config.OWNER_NUMBER].filter(Boolean);
    
    return ownerNums.includes(senderNumber) || 
           config.OWNERS.includes(senderJid) || 
           m?.key?.fromMe || 
           (dvmsy?.user && senderJid === dvmsy.user.id);
}

/**
 * Récupère les informations du groupe
 */
export async function getGroupInfo(m, dvmsy) {
    try {
        if (!m.key.remoteJid.endsWith('@g.us')) {
            return { 
                isGroup: false,
                participants: [],
                groupName: '',
                isAdmin: false,
                isBotAdmin: false,
                metadata: {}
            };
        }
        
        const metadata = await dvmsy.groupMetadata(m.key.remoteJid);
        const participants = metadata.participants || [];
        
        const senderJid = m.key.participant || m.key.remoteJid;
        const botJid = dvmsy.user?.id?.split(':')[0] + '@s.whatsapp.net';
        
        const senderParticipant = participants.find(p => p.id === senderJid);
        const isAdmin = senderParticipant && 
                       (senderParticipant.admin === "admin" || 
                        senderParticipant.admin === "superadmin");
        
        const botParticipant = participants.find(p => p.id === botJid);
        const isBotAdmin = botParticipant && 
                          (botParticipant.admin === "admin" || 
                           botParticipant.admin === "superadmin");
        
        return {
            isGroup: true,
            groupName: metadata.subject || '',
            groupId: m.key.remoteJid,
            participants,
            groupAdmins: participants.filter(p => p.admin),
            metadata,
            isAdmin,
            isBotAdmin
        };
    } catch (error) {
        console.error('Erreur getGroupInfo:', error);
        return { 
            isGroup: true,
            participants: [],
            groupName: '',
            isAdmin: false,
            isBotAdmin: false,
            metadata: {}
        };
    }
}

/**
 * Récupère les permissions de l'utilisateur
 */
export function getUserPermissions(senderJid, isOwner = false, isAdmin = false) {
    return {
        isOwner,
        isAdmin,
        canUseOwnerCommands: isOwner,
        canUseAdminCommands: isOwner || isAdmin
    };
}