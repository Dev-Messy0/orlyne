// commands/group/tagall.js
import { getMessages, formatMessage } from '../../Utils/langManager.js';

export default async function tagall(m, dvmsy) {
    try {
        const msg = getMessages(m.sender);
        
        if (!m.isGroup) {
            return dvmsy.sendMessage(m.chat, { 
                text: msg.onlyGroup
            }, { quoted: m });
        }
        
        if (!m.isAdmin && !m.isOwner) {
            return dvmsy.sendMessage(m.chat, { 
                text: msg.onlyAdmin
            }, { quoted: m });
        }
        
        let mentions = [];
        let text = formatMessage(msg.tagall, { user: m.pushName || 'Admin' });
        
        for (let participant of m.participants) {
            if (!participant.id.includes(dvmsy.user.id.split(':')[0])) {
                mentions.push(participant.id);
                text += `@${participant.id.split('@')[0]}\n`;
            }
        }
        
        await dvmsy.sendMessage(m.chat, {
            text: text,
            mentions: mentions
        }, { quoted: m });
        
    } catch (err) {
        console.error('[tagall] erreur:', err);
        const msg = getMessages(m.sender);
        await dvmsy.sendMessage(m.chat, {
            text: msg.command_error
        }, { quoted: m });
    }
}