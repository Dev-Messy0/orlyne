// commands/setlang.js
import { getMessages, formatMessage, setUserLanguage, getUserLanguage, getAvailableLanguages, getLanguageFlag, getLanguageName } from '../Utils/langManager.js';
import languages from '../lang.js';

import { messyFake } from '../Utils/externalReply.js';

export default async function setlang(m, dvmsy) {
    try {
        const userJid = m.sender;
        const currentLang = getUserLanguage(userJid);
        const currentLangName = getLanguageName(currentLang);
        const currentLangFlag = getLanguageFlag(currentLang);
        
        // Vérifier les arguments
        if (!m.args || m.args.length === 0) {
            const list = getAvailableLanguages();
            const msg = getMessages(userJid);
            
            const text = `🌐 *ʟᴀɴɢᴜᴇ ᴀᴄᴛᴜᴇʟʟᴇ:* ${currentLangFlag} ${currentLangName}

${formatMessage(msg.lang_invalid, { list })}`;
            
            return await dvmsy.sendMessage(m.chat, { text }, { quoted: messyFake });
        }
        
        const selectedLang = m.args[0].toLowerCase();
        
        // Vérifier si la langue est valide
        if (selectedLang !== 'fr' && selectedLang !== 'en') {
            const msg = getMessages(userJid);
            const list = getAvailableLanguages();
            return await dvmsy.sendMessage(m.chat, {
                text: formatMessage(msg.lang_invalid, { list })
            }, { quoted: messyFake });
        }
        
        // Sauvegarder la nouvelle langue pour cet utilisateur
        const success = setUserLanguage(userJid, selectedLang);
        
        if (success) {
            const newLangName = getLanguageName(selectedLang);
            const newLangFlag = getLanguageFlag(selectedLang);
            const msg = getMessages(userJid); // Messages dans la nouvelle langue
            
            await dvmsy.sendMessage(m.chat, {
                text: formatMessage(msg.lang_changed, { 
                    lang: newLangName,
                    flag: newLangFlag
                })
            }, { quoted: messyFake });
            
            // Réaction avec le drapeau
            await dvmsy.sendMessage(m.chat, { 
                react: { text: newLangFlag, key: m.key } 
            });
        } else {
            const msg = getMessages(userJid);
            await dvmsy.sendMessage(m.chat, { 
                text: formatMessage(msg.error, { error: 'Impossible de sauvegarder la langue' })
            }, { quoted: messyFake });
        }
        
    } catch (error) {
        console.error('[setlang] error:', error);
        await dvmsy.sendMessage(m.chat, { 
            text: "❌ ᴇʀʀᴇᴜʀ" 
        }, { quoted: messyFake });
    }
}