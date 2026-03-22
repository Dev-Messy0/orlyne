// commands/group/groupinfo.js
import { getMessages, formatMessage } from '../../Utils/langManager.js';

export default async function groupinfo(m, dvmsy) {
    const msg = getMessages(m.sender);
    
    if (!m.isGroup) {
        return dvmsy.sendMessage(m.chat, { 
            text: msg.onlyGroup
        });
    }
    
    const info = formatMessage(msg.group_info, {
        name: m.groupName || 'Inconnu',
        id: m.chat,
        members: m.participants?.length || 0,
        admins: m.groupAdmins?.length || 0,
        you: m.isAdmin ? msg.you_admin : msg.you_member,
        bot: m.isBotAdmin ? msg.bot_admin : msg.bot_member
    });

    await dvmsy.sendMessage(m.chat, { text: info });
}