// commands/group/hidetag.js
import { getMessages, formatMessage } from '../../Utils/langManager.js';

export default async function hidetag(m, dvmsy) {
    const msg = getMessages(m.sender);
    
    if (!m.isGroup) {
        return dvmsy.sendMessage(m.chat, { 
            text: msg.onlyGroup
        });
    }
    
    if (!m.isAdmin && !m.isOwner) {
        return dvmsy.sendMessage(m.chat, { 
            text: msg.onlyAdmin
        });
    }
    
    const hideText = m.args.join(' ') || msg.hidetag_message;
    
    await dvmsy.sendMessage(m.chat, {
        text: hideText,
        mentions: m.participants.map(a => a.id)
    });
}