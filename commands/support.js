// commands/support.js
import path from 'path';
import { fileURLToPath } from 'url';
import { getMessages, formatMessage } from '../Utils/langManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function support(m, dvmsy) {
    const { sender, pushName } = m;
    const msg = getMessages(sender);
    
    const text = formatMessage(msg.support_text, {
        creator: 'Dev Messy',
        site: 'https://web-bot-devmessy.vercel.app',
        whatsapp: 'wa.me/24177474264'
    });
    
    try {
        const imagePath = path.join(__dirname, '..', 'image', 'image2.png');
        
        await dvmsy.sendMessage(m.key.remoteJid, {
            image: { url: imagePath },
            caption: text,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true
            }
        });
    } catch (error) {
        console.error('Erreur envoi image:', error);
        await dvmsy.sendMessage(m.key.remoteJid, {
            text: text,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true
            }
        });
    }    
}