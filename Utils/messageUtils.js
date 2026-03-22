// Utils/messageUtils.js
import config from '../config.js';

/**
 * Extrait les informations de base du message
 */
export function getMessageInfo(m, dvmsy) {
    try {
        if (!m) return { body: '', sender: '', pushName: '' };
        
        const messageType = m.message ? 
            Object.keys(m.message)[0] : 'unknown';
        
        let body = '';
        let pushName = m.pushName || '';
        
        if (messageType === 'conversation') {
            body = m.message.conversation;
        } else if (messageType === 'extendedTextMessage') {
            body = m.message.extendedTextMessage.text;
        } else if (messageType === 'imageMessage') {
            body = m.message.imageMessage.caption || '';
        } else if (messageType === 'videoMessage') {
            body = m.message.videoMessage.caption || '';
        } else if (messageType === 'documentMessage') {
            body = m.message.documentMessage.caption || '';
        }
        
        const sender = m.key.participant || m.key.remoteJid;
        
        return {
            body,
            sender,
            pushName,
            messageType,
            isGroup: m.key.remoteJid.endsWith('@g.us'),
            timestamp: m.messageTimestamp,
            chat: m.key.remoteJid
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
    
    return ownerNums.includes(senderNumber) || // Par numéro
           config.OWNERS.includes(senderJid) || // Par JID complet
           m?.key?.fromMe || // Message du bot lui-même
           (dvmsy?.user && senderJid === dvmsy.user.id); // C'est le bot
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
        
        // JID de l'expéditeur
        const senderJid = m.key.participant || m.key.remoteJid;
        
        // JID du bot
        const botJid = dvmsy.user?.id?.split(':')[0] + '@s.whatsapp.net';
        
        // Vérifier si l'expéditeur est admin
        const senderParticipant = participants.find(p => p.id === senderJid);
        const isAdmin = senderParticipant && 
                       (senderParticipant.admin === "admin" || 
                        senderParticipant.admin === "superadmin");
        
        // Vérifier si le bot est admin
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