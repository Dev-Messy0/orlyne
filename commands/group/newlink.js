// commands/group/newlink.js
import { getMessages, formatMessage } from '../../Utils/langManager.js';

export default async function newlink(m, dvmsy) {
    const msg = getMessages(m.sender);
    
    // Vérifier si c'est un groupe
    if (!m.isGroup) {
        return dvmsy.sendMessage(m.chat, { 
            text: msg.onlyGroup
        });
    }
    
    // Vérifier si l'utilisateur est owner UNIQUEMENT (pas isAdmin)
    if (!m.isOwner) {
        return dvmsy.sendMessage(m.chat, { 
            text: msg.onlyOwner
        });
    }
    
    // Vérifier si le bot est admin
    if (!m.isBotAdmin) {
        return dvmsy.sendMessage(m.chat, { 
            text: msg.onlyBotAdmin
        });
    }
    
    const waitMsg = await dvmsy.sendMessage(m.chat, { 
        text: msg.wait
    });
    
    try {
        // Révoquer l'ancien lien et générer un nouveau
        const newInviteCode = await dvmsy.groupRevokeInvite(m.chat);
        
        // Construire le nouveau lien
        const newLink = `https://chat.whatsapp.com/${newInviteCode}`;
        
        // Message de succès
        const successText = formatMessage(msg.newlink_success, { url: newLink });
        
        await dvmsy.sendMessage(m.chat, {
            text: successText,
            edit: waitMsg.key
        });
        
        // Envoyer le lien en message privé à l'owner (optionnel)
        await dvmsy.sendMessage(m.sender, {
            text: formatMessage(msg.newlink_private, {
                groupName: m.groupName || 'Groupe',
                url: newLink
            })
        });
        
    } catch (error) {
        console.error('Erreur newlink:', error);
        
        let errorMessage = msg.newlink_error;
        
        if (error.message?.includes('not-authorized')) {
            errorMessage = msg.newlink_not_authorized;
        } else if (error.message?.includes('rate-overlimit')) {
            errorMessage = msg.newlink_rate_limit;
        }
        
        await dvmsy.sendMessage(m.chat, {
            text: errorMessage,
            edit: waitMsg.key
        });
    }
}