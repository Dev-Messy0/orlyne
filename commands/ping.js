// commands/ping.js
import { getMessages, formatMessage } from '../Utils/langManager.js';

export default async function ping(m, dvmsy) {
    try {
        const msg = getMessages();
        
        const start = Date.now();
        const response = await dvmsy.sendMessage(m.chat, { text: msg.ping_wait });
        const end = Date.now();
        
        await dvmsy.sendMessage(m.chat, {
            text: formatMessage(msg.ping, { time: end - start }),
            edit: response.key
        });
    } catch (error) {
        console.error('Erreur ping:', error);
    }
}