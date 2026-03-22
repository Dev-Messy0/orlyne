// commands/wasted.js
import axios from 'axios';
import { getMessages, formatMessage } from '../Utils/langManager.js';

export default async function wasted(m, dvmsy) {
    const msg = getMessages(m.sender);
    let userToWaste;
    
    // Vérifier les mentions
    if (m.mentionedJid && m.mentionedJid.length > 0) {
        userToWaste = m.mentionedJid[0];
    }
    // Vérifier si c'est une réponse à un message
    else if (m.quoted && m.quoted.sender) {
        userToWaste = m.quoted.sender;
    }
    // Vérifier les arguments (numéro)
    else if (m.args[0]) {
        const num = m.args[0].replace(/[^0-9]/g, '');
        if (num.length >= 10) {
            userToWaste = num + '@s.whatsapp.net';
        }
    }
    
    if (!userToWaste) {
        await dvmsy.sendMessage(m.chat, { 
            text: msg.wasted_no_target
        });
        return;
    }

    // Message d'attente
    const waitMsg = await dvmsy.sendMessage(m.chat, { 
        text: msg.wait
    });

    try {
        // Récupérer la photo de profil
        let profilePic;
        try {
            profilePic = await dvmsy.profilePictureUrl(userToWaste, 'image');
        } catch {
            profilePic = 'https://i.imgur.com/2wzGhpF.jpeg'; // Image par défaut
        }

        // Appliquer l'effet WASTED
        const wastedResponse = await axios.get(
            `https://some-random-api.com/canvas/overlay/wasted?avatar=${encodeURIComponent(profilePic)}`,
            { responseType: 'arraybuffer' }
        );

        // Envoyer l'image
        await dvmsy.sendMessage(m.chat, {
            image: Buffer.from(wastedResponse.data),
            caption: formatMessage(msg.wasted_success, { user: userToWaste.split('@')[0] }),
            mentions: [userToWaste],
            edit: waitMsg.key
        });

    } catch (error) {
        console.error('Erreur wasted:', error);
        await dvmsy.sendMessage(m.chat, { 
            text: msg.wasted_error,
            edit: waitMsg.key
        });
    }
}