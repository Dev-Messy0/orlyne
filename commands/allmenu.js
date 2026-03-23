// commands/menu.js
import config from '../config.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getMessages, formatMessage, getLanguageFlag, getLanguageName } from '../Utils/langManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function allmenu(m, dvmsy) {
    const { sender, pushName } = m;
    const msg = getMessages(sender);
    
    // Récupérer la langue pour l'affichage
    const userLang = global.botLang || 'fr';
    const langFlag = getLanguageFlag(userLang);
    const langName = getLanguageName(userLang);
    
    // Récupérer le nombre de sessions actives depuis global.sessionActive
    const activeSessionsCount = global.sessionActive ? global.sessionActive.size : 0;
    
    const text = formatMessage(msg.menu_title, {
        user: pushName || sender?.split('@')[0] || 'Utilisateur',
        prefix: config.PREFIX || '👾',
        mode: dvmsy.public ? "Public" : "Privé",
        active: activeSessionsCount,
        activeEmoji: activeSessionsCount > 1 ? '👥' : '👤',
        lang: `${langFlag} ${langName}`
    }) + `
       
╭─「 \`${msg.menu_general}\` 」─╮
┃ ⤷ ᴍᴇɴᴜ
┃ ⤷ ᴘɪɴɢ
┃ ⤷ ʀᴜɴᴛɪᴍᴇ
┃ ⤷ ɪɴғᴏ
┃ ⤷ ᴘᴀɪʀ
┃ ⤷ sᴜᴘᴘᴏʀᴛ
┃ ⤷ sᴇᴛʟᴀɴɢ
╰─────────────────────
    
╭─「 \`${msg.menu_owner}\` 」─╮
┃ ⤷ ʀᴇsᴛᴀʀᴛ
┃ ⤷ ᴘᴜʙʟɪᴄ
┃ ⤷ ᴘʀɪᴠᴀᴛᴇ
┃ ⤷ ʟᴇғᴛ
┃ ⤷ ᴄʟᴇᴀʀᴄʜᴀᴛ
╰─────────────────────    
    
╭─「 \`${msg.menu_tool}\` 」─╮
┃ ⤷ ᴛᴀᴋᴇ
┃ ⤷ sᴛɪᴄᴋᴇʀ
┃ ⤷ sᴏɴɢ
┃ ⤷ ᴡᴀsᴛᴇᴅ
┃ ⤷ ᴡᴀɴᴛᴇᴅ
┃ ⤷ ᴠᴠ
┃ ⤷ ᴀɪ
┃ ⤷ ᴘᴏsᴛ
╰─────────────────────    
    
╭─「 \`${msg.menu_group}\` 」─╮
┃ ⤷ ᴘʀᴏᴍᴏᴛᴇ
┃ ⤷ ᴅᴇᴍᴏᴛᴇ
┃ ⤷ ᴋɪᴄᴋ
┃ ⤷ ᴋɪᴄᴋᴀʟʟ
┃ ⤷ ʟɪɴᴋ
┃ ⤷ ᴛᴀɢᴀʟʟ
┃ ⤷ ʜɪᴅᴇᴛᴀɢ
┃ ⤷ ᴏᴘᴇɴ
┃ ⤷ ᴄʟᴏsᴇ
┃ ⤷ ɴᴇᴡʟɪɴᴋ
╰─────────────────────

╭─「 \`${msg.menu_download}\` 」─╮
┃ ⤷ ᴜʀʟ
┃ ⤷ ᴀᴘᴋ
┃ ⤷ ʏᴏᴜᴛᴜʙᴇ
┃ ⤷ ᴛɪᴋᴛᴏᴋ
┃ ⤷ ɪɴsᴛᴀɢʀᴀᴍ
┃ ⤷ ғᴀᴄᴇʙᴏᴏᴋ
┃ ⤷ ᴛᴡɪᴛᴛᴇʀ
┃ ⤷ ɢɪᴛᴄʟᴏɴᴇ
╰─────────────────────

╭─「 \`${msg.menu_media}\` 」─╮
┃ ⤷ ᴛᴏ-ᴀᴜᴅ
┃ ⤷ ᴛᴏ-ᴠɪᴅ
┃ ⤷ ᴛᴏ-ɪᴍɢ
┃ ⤷ ᴛᴇʟᴇɢʀᴀᴍsᴛɪᴄᴋᴇʀ
┃ ⤷ ᴠᴏɪx
╰─────────────────────

╭─「 \`${msg.menu_admin}\` 」─╮
┃ ⤷ ᴀɴᴛɪʟɪɴᴋ \`ᴏɴ/ᴏғғ\`
┃ ⤷ ᴀɴᴛɪsᴘᴀᴍ \`ᴏɴ/ᴏғғ\`
┃ ⤷ ᴀɴᴛɪᴘʀᴏᴍᴏᴛᴇ \`ᴏɴ/ᴏғғ\`
┃ ⤷ ᴀɴᴛɪᴅᴇᴍᴏᴛᴇ \`ᴏɴ/ᴏғғ\`
┃ ⤷ ᴀɴᴛɪʀᴇᴍᴏᴠᴇ \`ᴏɴ/ᴏғғ\`
┃ ⤷ ᴡᴇʟᴄᴏᴍᴇ \`ᴏɴ/ᴏғғ\`
┃ ⤷ ɢᴏᴏᴅʙʏᴇ \`ᴏɴ/ᴏғғ\`
╰─────────────────────
> ® ᴅᴇᴠ ᴍᴇssʏ ᴛᴇᴄʜ | 👥 ${activeSessionsCount} utilisateur(s) actif(s) | ${langFlag}`;

try {
        const imagePath = path.join(__dirname, '..', 'image', 'image4.png');
        
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