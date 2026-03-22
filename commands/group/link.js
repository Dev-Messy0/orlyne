// commands/group/link.js
import { getMessages, formatMessage } from '../../Utils/langManager.js';

export default async function link(m, dvmsy) {
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
        
        try {
            const inviteCode = await dvmsy.groupInviteCode(m.chat);
            await dvmsy.sendMessage(m.chat, {
                text: formatMessage(msg.link, { url: `https://chat.whatsapp.com/${inviteCode}` })
            }, { quoted: m });
        } catch (error) {
            await dvmsy.sendMessage(m.chat, { 
                text: msg.link_error
            }, { quoted: m });
        }
        
    } catch (err) {
        console.error('[link] erreur:', err);
        const msg = getMessages(m.sender);
        await dvmsy.sendMessage(m.chat, {
            text: msg.command_error
        }, { quoted: m });
    }
}