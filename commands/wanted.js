// commands/wanted.js
import axios from 'axios';
import { getMessages, formatMessage } from '../Utils/langManager.js';

export default async function wanted(m, dvmsy) {
    const msg = getMessages(m.sender);
    let userToWanted;
    
    // Check for mentioned users
    if (m.mentionedJid?.length > 0) {
        userToWanted = m.mentionedJid[0];
    }
    // Check for replied message
    else if (m.quoted?.sender) {
        userToWanted = m.quoted.sender;
    }
    // Check for argument (phone number)
    else if (m.args[0]) {
        const num = m.args[0].replace(/[^0-9]/g, '');
        if (num.length >= 10) {
            userToWanted = num + '@s.whatsapp.net';
        }
    }
    
    if (!userToWanted) {
        await dvmsy.sendMessage(m.chat, { 
            text: msg.wanted_no_target
        }, { quoted: m });
        return;
    }

    try {
        await dvmsy.sendMessage(m.chat, { 
            react: { text: msg.reaction_wanted || '⏳', key: m.key } 
        });

        const waitMsg = await dvmsy.sendMessage(m.chat, { 
            text: msg.wait
        }, { quoted: m });

        // Get user's profile picture
        let profilePic;
        try {
            profilePic = await dvmsy.profilePictureUrl(userToWanted, 'image');
        } catch {
            profilePic = 'https://i.imgur.com/2wzGhpF.jpeg'; // Default image if no profile pic
        }

        // Get the wanted poster from API
        const wantedResponse = await axios.get(
            `https://api.popcat.xyz/wanted?image=${encodeURIComponent(profilePic)}`,
            { responseType: 'arraybuffer' }
        );

        // Send the wanted poster
        await dvmsy.sendMessage(m.chat, {
            image: Buffer.from(wantedResponse.data),
            caption: formatMessage(msg.wanted_success, { 
                user: userToWanted.split('@')[0] 
            }),
            mentions: [userToWanted],
            edit: waitMsg.key
        });

        await dvmsy.sendMessage(m.chat, { 
            react: { text: msg.reaction_success || '✅', key: m.key } 
        });

    } catch (error) {
        console.error('Error in wanted command:', error);
        await dvmsy.sendMessage(m.chat, { 
            text: msg.wanted_error
        }, { quoted: m });
    }
}