// Utils/messageUtils.js
import config from '../config.js';

/**
 * Extrait le texte du message quel que soit son type
 */
export function getMessageText(m) {
    if (!m || !m.message) return '';
    
    const mtype = Object.keys(m.message)[0];
    
    const body = (
        mtype === "conversation" ? m.message.conversation || "[Conversation]" :
        mtype === "imageMessage" ? m.message.imageMessage.caption || "[Image]" :
        mtype === "videoMessage" ? m.message.videoMessage.caption || "[Video]" :
        mtype === "audioMessage" ? m.message.audioMessage.caption || "[Audio]" :
        mtype === "stickerMessage" ? m.message.stickerMessage.caption || "[Sticker]" :
        mtype === "documentMessage" ? m.message.documentMessage.fileName || "[Document]" :
        mtype === "contactMessage" ? "[Contact]" :
        mtype === "locationMessage" ? m.message.locationMessage.name || "[Location]" :
        mtype === "liveLocationMessage" ? "[Live Location]" :
        mtype === "extendedTextMessage" ? m.message.extendedTextMessage.text || "[Extended Text]" :
        mtype === "buttonsResponseMessage" ? m.message.buttonsResponseMessage.selectedButtonId || "[Button Response]" :
        mtype === "listResponseMessage" ? m.message.listResponseMessage.singleSelectReply.selectedRowId || "[List Response]" :
        mtype === "templateButtonReplyMessage" ? m.message.templateButtonReplyMessage.selectedId || "[Template Button Reply]" :
        mtype === "pollCreationMessage" ? "[Poll Creation]" :
        mtype === "reactionMessage" ? m.message.reactionMessage.text || "[Reaction]" :
        mtype === "ephemeralMessage" ? "[Ephemeral]" :
        mtype === "viewOnceMessage" ? "[View Once]" :
        mtype === "productMessage" ? m.message.productMessage.product?.name || "[Product]" :
        mtype === "messageContextInfo" ? m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || "[Message Context]" :
        "[Unknown Type]"
    );
    
    return body;
}

/**
 * Extrait les informations de base du message
 */
export function getMessageInfo(m, dvmsy) {
    try {
        if (!m) return { body: '', sender: '', pushName: '' };
        
        const mtype = m.message ? Object.keys(m.message)[0] : 'unknown';
        const body = getMessageText(m);
        const pushName = m.pushName || '';
        const sender = m.key.participant || m.key.remoteJid;
        
        return {
            body,
            sender,
            pushName,
            messageType: mtype,
            isGroup: m.key.remoteJid?.endsWith('@g.us') || false,
            timestamp: m.messageTimestamp,
            chat: m.key.remoteJid
        };
    } catch (error) {
        console.error('Erreur getMessageInfo:', error);
        return { body: '', sender: '', pushName: '' };
    }
}

/**
 * Récupère le message cité
 */
export function getQuotedMessage(m) {
    if (!m) return null;
    
    const quoted = m.quoted || m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    
    if (!quoted) return null;
    
    const quotedMtype = Object.keys(quoted)[0];
    const quotedText = getMessageText({ message: quoted });
    
    return {
        message: quoted,
        type: quotedMtype,
        text: quotedText,
        sender: m.message?.extendedTextMessage?.contextInfo?.participant
    };
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
        if (!m.key.remoteJid?.endsWith('@g.us')) {
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