// commands/active.js
import axios from 'axios';
import { getMessages, formatMessage } from '../Utils/langManager.js';

export default async function active(m, dvmsy) {
    const { sender } = m;
    const msg = getMessages(sender);
    
    // Récupérer les sessions actives depuis l'API
    let activeCount = 0;
    let activeList = '';
    let sessionsData = [];
    
    try {
        // Appel à l'API pour récupérer les sessions
        const response = await axios.get('https://orlyne-backend.duckdns.org/sessions/list');
        
        if (response.data && response.data.sessions) {
            sessionsData = response.data.sessions;
            activeCount = sessionsData.length;
            
            // Construire la liste des numéros actifs
            if (activeCount > 0) {
                sessionsData.forEach((session, index) => {
                    const number = session.number || session.id || 'Inconnu';
                    activeList += `${index + 1}. ${number}\n`;
                });
            } else {
                activeList = msg.active_none || 'Aucune session active pour le moment.';
            }
        } else {
            activeList = msg.active_error || 'Impossible de récupérer la liste des sessions.';
        }
        
    } catch (error) {
        console.error('Erreur récupération sessions API:', error);
        activeList = msg.active_connection_error || 'Erreur de connexion au serveur.';
        
        // Fallback: utiliser les sessions globales si disponibles
        const fallbackSessions = global.sessionActive ? Array.from(global.sessionActive.keys()) : [];
        activeCount = fallbackSessions.length;
        
        if (activeCount > 0) {
            activeList = '';
            fallbackSessions.forEach((num, index) => {
                activeList += `${index + 1}. ${num}\n`;
            });
        } else {
            activeList = msg.active_none || 'Aucune session active pour le moment.';
        }
    }
    
    // Récupérer aussi le nombre total de sessions (pour info)
    let totalSessions = 0;
    try {
        const countRes = await axios.get('https://orlyne-backend.duckdns.org/sessions/count');
        totalSessions = countRes.data.count || 0;
    } catch (e) {
        console.error('Erreur récupération count:', e);
    }
    
    const activeText = formatMessage(msg.active_title, {
        active: activeCount,
        total: totalSessions,
        list: activeList
    });

    try {
        await dvmsy.sendMessage(m.chat, {
            text: activeText,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true
            }
        });
    } catch (error) {
        console.error('Erreur commande active:', error);
        await dvmsy.sendMessage(m.chat, {
            text: msg.error || '❌ Erreur lors de la récupération des sessions actives.',
            contextInfo: {
                mentionedJid: [sender]
            }
        });
    }
}