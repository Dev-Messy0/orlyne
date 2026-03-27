// commands/ping.js
import { getMessages, formatMessage } from '../Utils/langManager.js';
import { messyFake } from '../Utils/externalReply.js';

export default async function ping(m, dvmsy) {
    try {
        const msg = getMessages(m.sender);
        
        const start = Date.now();
        await messyFake(msg.ping_wait, dvmsy, m.chat);
        const end = Date.now();
        
        await messyFake(formatMessage(msg.ping, { time: end - start }), dvmsy, m.chat);
    } catch (error) {
        console.error('Erreur ping:', error);
    }
}