// commands/group/open.js
import { getMessages } from '../../Utils/langManager.js';

export default async function open(m, dvmsy) {
    try {
        const msg = getMessages();
        
        if (!m.isGroup) {
            return await dvmsy.sendMessage(m.chat, { text: msg.onlyGroup }, { quoted: m });
        }
        
        if (!m.isAdmin && !m.isOwner) {
            return await dvmsy.sendMessage(m.chat, { text: msg.onlyAdmin }, { quoted: m });
        }
        
        await dvmsy.groupSettingUpdate(m.chat, 'not_announcement');
        await dvmsy.sendMessage(m.chat, { text: msg.groupOpen }, { quoted: m });
    } catch (error) {
        console.error('Erreur open:', error);
    }
}