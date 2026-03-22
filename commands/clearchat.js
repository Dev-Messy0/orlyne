// commands/clearchat.js
import { getMessages } from '../Utils/langManager.js';

export default async function clearchat(m, dvmsy) {
    const msg = getMessages(m.sender);
    
    try {
        // Vérifier si l'utilisateur est owner
        if (!m.isOwner) {
            return dvmsy.sendMessage(m.chat, { 
                text: msg.onlyOwner
            });
        }

        // Message d'attente
        const waitMsg = await dvmsy.sendMessage(m.chat, { 
            text: msg.clearchat_wait || '🧹 *Nettoyage du chat en cours...*'
        });

        // Supprimer le message du bot
        await dvmsy.chatModify({
            delete: true, 
            lastMessages: [{ key: m.key, messageTimestamp: m.messageTimestamp }]
        }, m.chat);

        // Réaction ✅
        await dvmsy.sendMessage(m.chat, { 
            react: { text: msg.reaction_success || '✅', key: m.key } 
        });

        // Message de confirmation (édité)
        await dvmsy.sendMessage(m.chat, { 
            text: msg.clearchat_success || '🧹 *Chat nettoyé avec succès !*',
            edit: waitMsg.key 
        });

    } catch (error) {
        console.error('❌ Erreur dans clearchat:', error);
        await dvmsy.sendMessage(m.chat, { 
            text: msg.clearchat_error || '❌ *Échec du nettoyage du chat.*',
        });
    }
}