// commands/pair.js
import axios from 'axios';
import { getMessages, formatMessage } from '../Utils/langManager.js';

export default async function pair(m, dvmsy) {
    const { sender, pushName, args } = m;
    const msg = getMessages(sender);
    
    if (!m.isOwner) {
        return await dvmsy.sendMessage(m.chat, {
            text: msg.pair_only_owner,
            contextInfo: { mentionedJid: [sender] }
        });
    }
    
    // Récupérer le nombre de sessions même sans argument
    let sessionsCount = 0;
    try {
        const sessionsRes = await axios.get('https://orlyne-backend.duckdns.org/sessions/count');
        sessionsCount = sessionsRes.data.count || 0;
    } catch (e) {
        console.error('Erreur récupération sessions:', e);
    }
    
    if (!args || args.length === 0) {
        return await dvmsy.sendMessage(m.chat, { 
            text: formatMessage(msg.pair_usage, { sessions: sessionsCount })
        }, { quoted: m });
    }

    const numero = args[0].replace(/[^0-9]/g, '');
    
    if (/[a-z]/i.test(numero) || !/^\d{7,15}$/.test(numero) || numero.startsWith('0')) {
        return await dvmsy.sendMessage(m.chat, { 
            text: msg.pair_invalid
        }, { quoted: m });
    }

    await dvmsy.sendMessage(m.chat, { react: { text: msg.reaction_pair || "🔑", key: m.key } });
    
    try {
        await dvmsy.sendMessage(m.chat, {
            text: formatMessage(msg.pair_wait, { number: numero }),
            contextInfo: { mentionedJid: [sender] }
        });
        
        // Appel à l'API du backend ORLYNE
        const response = await axios.get(`https://orlyne-backend.duckdns.org/pair?number=${numero}`, {
            timeout: 20000
        });
        
        // Mettre à jour le nombre de sessions après la génération
        try {
            const sessionsRes = await axios.get('https://orlyne-backend.duckdns.org/sessions/count');
            sessionsCount = sessionsRes.data.count || 0;
        } catch (e) {}
        
        if (response.data.code) {
            const code = response.data.code;
            
            await dvmsy.sendMessage(m.chat, {
                text: formatMessage(msg.pair_success, {
                    number: numero,
                    code: code,
                    sessions: sessionsCount
                }),
                contextInfo: { mentionedJid: [sender] }
            });
        } else {
            throw new Error('Code non reçu');
        }
        
    } catch (error) {
        console.error('Erreur pairing:', error);
        
        // Mettre à jour le nombre de sessions même en cas d'erreur
        try {
            const sessionsRes = await axios.get('https://orlyne-backend.duckdns.org/sessions/count');
            sessionsCount = sessionsRes.data.count || 0;
        } catch (e) {}
        
        let errorMessage = error.response?.data?.error || error.message || 'Erreur inconnue';
        
        await dvmsy.sendMessage(m.chat, {
            text: formatMessage(msg.pair_error, {
                error: errorMessage,
                sessions: sessionsCount
            }),
            contextInfo: { mentionedJid: [sender] }
        });
    }
}