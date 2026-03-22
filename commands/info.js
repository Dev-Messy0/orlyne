// commands/info.js
import os from 'os';
import { performance } from 'perf_hooks';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMessages, formatMessage, getLanguageFlag, getLanguageName } from '../Utils/langManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function info(m, dvmsy) {
    const { sender, pushName } = m;
    const msg = getMessages(sender);
    const start = performance.now();
    
    // Récupérer les infos système
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor(uptime / 3600) % 24;
    const minutes = Math.floor(uptime / 60) % 60;
    const seconds = Math.floor(uptime % 60);
    const uptimeStr = `${days}j ${hours}h ${minutes}m ${seconds}s`;
    
    // Mémoire utilisée
    const memoryUsed = process.memoryUsage().heapUsed / 1024 / 1024;
    const memoryTotal = os.totalmem() / 1024 / 1024 / 1024;
    const memoryFree = os.freemem() / 1024 / 1024 / 1024;
    
    // Compter les sessions actives
    let sessionCount = 0;
    if (global.msgStore) {
        sessionCount = Object.keys(global.msgStore).length;
    }
    
    // Récupérer la langue actuelle
    const userLang = global.botLang || 'fr';
    const langFlag = getLanguageFlag(userLang);
    const langName = getLanguageName(userLang);
    
    const infoText = formatMessage(msg.info_text, {
        botName: global.config?.BOT_NAME || 'ORLYNE',
        prefix: global.config?.PREFIX || '👾',
        sessions: sessionCount,
        uptime: uptimeStr,
        platform: os.platform(),
        arch: os.arch(),
        cpu: os.cpus()[0].model,
        ramTotal: memoryTotal.toFixed(2),
        ramFree: memoryFree.toFixed(2),
        ramUsed: memoryUsed.toFixed(2),
        response: Math.round(performance.now() - start),
        nodeVersion: process.version,
        lang: `${langFlag} ${langName}`
    });

    try {
        const imagePath = path.join(__dirname, '..', 'image', 'image3.png');
        
        await dvmsy.sendMessage(m.key.remoteJid, {
            image: { url: imagePath },
            caption: infoText,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true
            }
        });
    } catch (error) {
        console.error('Erreur envoi image:', error);
        await dvmsy.sendMessage(m.key.remoteJid, {
            text: infoText,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true
            }
        });
    }
}