// commands/group/close.js
import { getMessages } from '../../Utils/langManager.js';

export default async function close(m, dvmsy) {
    try {
        const msg = getMessages();
        
        if (!m.isGroup) {
            return await dvmsy.sendMessage(m.chat, { text: msg.onlyGroup }, { quoted: m });
        }
        
        if (!m.isAdmin && !m.isOwner) {
            return await dvmsy.sendMessage(m.chat, { text: msg.onlyAdmin }, { quoted: m });
        }
        
        await dvmsy.groupSettingUpdate(m.chat, 'announcement');
        await dvmsy.sendMessage(m.chat, { text: msg.groupClose }, { quoted: m });
    } catch (error) {
        console.error('Erreur close:', error);
    }
}