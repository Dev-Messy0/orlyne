// commands/menu.js
import config from '../config.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getMessages, formatMessage, getLanguageFlag, getLanguageName } from '../Utils/langManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function menu(m, dvmsy) {
    const { sender, pushName } = m;
    const msg = getMessages(sender);
    
    // Récupérer la langue pour l'affichage
    const userLang = global.botLang || 'fr';
    const langFlag = getLanguageFlag(userLang);
    const langName = getLanguageName(userLang);
    
    // Récupérer le nombre de sessions actives
    const activeSessionsCount = global.sessionActive ? global.sessionActive.size : 0;
    
    const menuText = formatMessage(msg.menu_title, {
        user: pushName || sender?.split('@')[0] || 'Utilisateur',
        prefix: config.PREFIX || '👾',
        mode: dvmsy.public ? "Public" : "Privé",
        active: activeSessionsCount,
        activeEmoji: activeSessionsCount > 1 ? '👥' : '👤',
        lang: `${langFlag} ${langName}`
    }) + `
    
❖═━═══𖠁𐂃𖠁══━═❖
📱\`𝖯𝖺𝗂𝗋:\` https://orlyne-md-v2.duckdns.org
❖═━═══𖠁𐂃𖠁══━═❖

*\`Ξ\` Select a category below:*

*1.* \`𝗀𝖾𝗇𝖾𝗋𝖺𝗅𝖾\`
*2.* \`𝖺𝗅𝗅-𝗆𝖾𝗇𝗎\`
*3.* \`𝗈𝗐𝗇𝖾𝗋-𝗆𝖾𝗇𝗎\`
*4.* \`𝗀𝗋𝗈𝗎𝗉-𝗆𝖾𝗇𝗎\`
*5.* \`𝗍𝗈𝗈𝗅𝗌-𝗆𝖾𝗇𝗎\`
*6.* \`𝖽𝗈𝗐𝗇𝗅𝖺𝗈𝖽-𝗆𝖾𝗇𝗎\`
*7.* \`𝖺𝖽𝗆𝗂𝗇𝗌-𝗆𝖾𝗇𝗎\`
*8.* \`𝗆𝖾𝖽𝗂𝖺-𝗆𝖾𝗇𝗎\`

> *𓊈 ッ ᴏʀʟʏɴᴇ ᴍᴅ ッ 𓊉*

> 👥 ${activeSessionsCount} utilisateur(s) actif(s) | ${langFlag}`;

    try {
        // Chemin absolu vers l'image à la racine
        const imagePath = path.join(__dirname, '..', 'image', 'image1.png');
        
        await dvmsy.sendMessage(m.key.remoteJid, {
            image: { url: imagePath },
            caption: menuText,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true
            }
        });
    } catch (error) {
        console.error('Erreur envoi image:', error);
        // Fallback: envoyer sans image si erreur
        await dvmsy.sendMessage(m.key.remoteJid, {
            text: menuText,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true
            }
        });
    }
}
