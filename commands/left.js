// commands/left.js
import { getMessages } from '../Utils/langManager.js';

export default async function left(m, dvmsy) {
    const msg = getMessages(m.sender);
    
    if (!m.isOwner) {
        return dvmsy.sendMessage(m.chat, { text: msg.onlyOwner });
    }
    
    if (!m.isGroup) {
        return dvmsy.sendMessage(m.chat, { text: msg.onlyGroup });
    }
    
    await dvmsy.groupLeave(m.chat);
}