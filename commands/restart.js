// commands/restart.js
import config from '../config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMessages, formatMessage } from '../Utils/langManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function restart(m, dvmsy, args) {
    const { sender, pushName } = m;
    const msg = getMessages(sender);
    const senderNumber = sender.split('@')[0];
    
    // Vérifier si l'utilisateur est owner
    const isDevmessy = config.OWNER_NUMBER === senderNumber;
    
    if (!isDevmessy) {
        return await dvmsy.sendMessage(m.key.remoteJid, {
            text: msg.onlyOwner,
            contextInfo: { mentionedJid: [sender] }
        });
    }
    
    // Vérifier si un numéro est fourni
    if (!args || args.length === 0) {
        return await dvmsy.sendMessage(m.key.remoteJid, {
            text: formatMessage(msg.restart_usage, { prefix: config.PREFIX }),
            contextInfo: { mentionedJid: [sender] }
        });
    }
    
    const targetNumber = args[0].replace(/[^0-9]/g, '');
    const sessionName = `session_${targetNumber}`;
    const sessionsDir = path.join(__dirname, '..', 'accounts');
    const sessionPath = path.join(sessionsDir, sessionName);
    
    // Vérifier si la session existe
    if (!fs.existsSync(sessionPath)) {
        return await dvmsy.sendMessage(m.key.remoteJid, {
            text: formatMessage(msg.restart_not_found, { number: targetNumber }),
            contextInfo: { mentionedJid: [sender] }
        });
    }
    
    try {
        await dvmsy.sendMessage(m.key.remoteJid, {
            text: formatMessage(msg.restart_progress, { number: targetNumber }),
            contextInfo: { mentionedJid: [sender] }
        });
        
        // Arrêter la session si elle est active
        if (global.sessionActive?.has(targetNumber)) {
            global.sessionActive.delete(targetNumber);
            if (typeof saveActiveSessions === 'function') saveActiveSessions();
        }
        
        // Arrêter la connexion existante
        if (global.tempDvmsys?.[sessionName]) {
            try {
                global.tempDvmsys[sessionName].end();
                delete global.tempDvmsys[sessionName];
            } catch (e) {
                console.log(`⚠️ Erreur arrêt ${targetNumber}:`, e.message);
            }
        }
        
        // Attendre 3 secondes
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Redémarrer la session
        if (typeof startUserBot === 'function') {
            await startUserBot(targetNumber);
        } else {
            throw new Error('Fonction startUserBot non trouvée');
        }
        
        await dvmsy.sendMessage(m.key.remoteJid, {
            text: formatMessage(msg.restart_success, { number: targetNumber }),
            contextInfo: { mentionedJid: [sender] }
        });
        
    } catch (error) {
        console.error('Erreur restart:', error);
        await dvmsy.sendMessage(m.key.remoteJid, {
            text: formatMessage(msg.restart_error, { error: error.message }),
            contextInfo: { mentionedJid: [sender] }
        });
    }
}