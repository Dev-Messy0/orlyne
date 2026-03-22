// commands/group/promote.js
import { getMessages, formatMessage } from '../../Utils/langManager.js';

export default async function promote(m, dvmsy) {
    try {
        const msg = getMessages(m.sender);
        
        if (!m.isGroup) {
            return await dvmsy.sendMessage(m.chat, {
                text: msg.onlyGroup
            }, { quoted: m });
        }
        
        if (!m.isAdmin && !m.isOwner) {
            return await dvmsy.sendMessage(m.chat, {
                text: msg.onlyAdmin
            }, { quoted: m });
        }
        
        let targetJid = m.mentionedJid;
        if ((!targetJid || targetJid.length === 0) && m.quoted?.sender) {
            targetJid = [m.quoted.sender];
        }
        
        if (!targetJid || targetJid.length === 0) {
            return await dvmsy.sendMessage(m.chat, {
                text: msg.promote_usage
            }, { quoted: m });
        }
        
        for (const target of targetJid) {
            try {
                await dvmsy.groupParticipantsUpdate(m.chat, [target], "promote");
                
                await dvmsy.sendMessage(m.chat, {
                    text: formatMessage(msg.promote, { user: target.split('@')[0] }),
                    mentions: [target]
                }, { quoted: m });
                
            } catch (error) {
                console.error(`Erreur lors de la promotion de ${target}:`, error);
                await dvmsy.sendMessage(m.chat, {
                    text: formatMessage(msg.promote_fail, { user: target.split('@')[0] }),
                    mentions: [target]
                }, { quoted: m });
            }
        }
        
    } catch (err) {
        console.error('[promote] erreur:', err);
        const msg = getMessages(m.sender);
        await dvmsy.sendMessage(m.chat, {
            text: msg.command_error
        }, { quoted: m });
    }
}