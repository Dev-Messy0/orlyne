import {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    delay,
    jidDecode,
    jidNormalizedUser
} from "@whiskeysockets/baileys";

import pino from "pino";
import { Boom } from "@hapi/boom";
import express from "express";
import fs from "fs";
import path from "path";
import cors from 'cors';
import chalk from 'chalk'
import { fileURLToPath } from 'url';
import handlerCommand from './handler.js';
import setupGroupHandlers from './system/group-handler.js';
import { initLanguage } from './Utils/langManager.js';

import config from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CACHE ULTRA RAPIDE
const cmdHandler = handlerCommand;

const app = express();
const port = 3421;
const sessionsDir = path.join(__dirname, 'accounts');
const welcomeStatusFile = path.join(__dirname, 'data', 'welcome_status.json');

// Initialisation de global.sessionActive
if (!global.sessionActive) {
    global.sessionActive = new Map();
}

// Création des dossiers
if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });
if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

let tempDvmsys = {};
global.msgStore = {};

// Store pour les messages
const store = {
    messages: {},
    loadMessage: async (jid, id) => {
        return store.messages[jid]?.[id] || null;
    },
    bind: (ev) => {
        ev.on('messages.upsert', ({ messages }) => {
            for (const msg of messages) {
                const jid = msg.key.remoteJid;
                if (!store.messages[jid]) store.messages[jid] = {};
                store.messages[jid][msg.key.id] = msg;
            }
        });
    }
};

// Gestion du statut d'envoi du message de bienvenue
function loadWelcomeStatus() {
    try {
        if (fs.existsSync(welcomeStatusFile)) {
            return JSON.parse(fs.readFileSync(welcomeStatusFile, 'utf8'));
        }
    } catch (error) {}
    return {};
}

function saveWelcomeStatus(status) {
    try {
        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(welcomeStatusFile, JSON.stringify(status, null, 2));
    } catch (error) {}
}

// Fonction pour sauvegarder l'état des sessions actives
function saveActiveSessions() {
    if (!global.sessionActive) return;
    
    const sessionsData = {
        activeNumbers: Array.from(global.sessionActive.keys()),
        timestamp: Date.now()
    };
    
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    
    fs.writeFileSync(
        path.join(dataDir, 'active_sessions.json'),
        JSON.stringify(sessionsData, null, 2)
    );
    console.log(`💾 Sessions sauvegardées: ${sessionsData.activeNumbers.length}`);
}

// Fonction pour charger les sessions depuis le fichier JSON
async function loadActiveSessions() {
    try {
        const dataDir = path.join(__dirname, 'data');
        const sessionsFile = path.join(dataDir, 'active_sessions.json');
        
        if (fs.existsSync(sessionsFile)) {
            const data = JSON.parse(fs.readFileSync(sessionsFile, 'utf-8'));
            
            if (data.activeNumbers && Array.isArray(data.activeNumbers)) {
                console.log(`📂 ${data.activeNumbers.length} sessions à restaurer depuis JSON...`);
                
                for (const num of data.activeNumbers) {
                    const sessionPath = path.join(sessionsDir, `session_${num}`);
                    
                    if (fs.existsSync(sessionPath)) {
                        console.log(`🔄 Démarrage depuis JSON: ${num}`);
                        startUserBot(num);
                        await delay(3000);
                    } else {
                        console.log(`❌ Session ${num} introuvable dans accounts/, ignorée`);
                    }
                }
            }
        } else {
            console.log("📂 Aucun fichier de sauvegarde trouvé");
        }
    } catch (err) {
        console.error("❌ Erreur loadActiveSessions:", err.message);
    }
}

// Fonction pour restaurer et nettoyer les sessions
async function restoreSessions() {
    console.log("📂 [RESTORE] Scan du dossier accounts/...");
    
    const validSessions = [];
    const sessionsToDelete = [];
    
    if (fs.existsSync(sessionsDir)) {
        const folders = fs.readdirSync(sessionsDir);
        
        for (const folder of folders) {
            if (folder.startsWith('session_')) {
                const phoneNumber = folder.replace('session_', '');
                const credsPath = path.join(sessionsDir, folder, 'creds.json');
                
                if (fs.existsSync(credsPath)) {
                    if (global.sessionActive?.has(phoneNumber)) {
                        validSessions.push(phoneNumber);
                        console.log(`✅ ${phoneNumber} - OK (dans sessionActive)`);
                    } else {
                        sessionsToDelete.push(folder);
                        console.log(`🗑️ ${phoneNumber} - À supprimer (pas dans sessionActive)`);
                    }
                } else {
                    sessionsToDelete.push(folder);
                    console.log(`🗑️ ${folder} - Dossier invalide (sans creds), à supprimer`);
                }
            }
        }
        
        if (sessionsToDelete.length > 0) {
            console.log(`\n🧹 Nettoyage: ${sessionsToDelete.length} session(s) à supprimer...`);
            
            for (const folder of sessionsToDelete) {
                const folderPath = path.join(sessionsDir, folder);
                try {
                    fs.rmSync(folderPath, { recursive: true, force: true });
                    console.log(`✅ Supprimé: ${folder}`);
                } catch (e) {
                    console.log(`❌ Erreur suppression ${folder}:`, e.message);
                }
            }
        }
        
        const sessionsToStart = validSessions.filter(num => !tempDvmsys[`session_${num}`]);
        
        if (sessionsToStart.length > 0) {
            console.log(`\n🚀 Démarrage des ${sessionsToStart.length} sessions valides...`);
            for (const num of sessionsToStart) {
                await startUserBot(num);
                await delay(3000);
            }
        }
    }
    
    console.log(`\n✅ Restauration terminée. ${global.sessionActive?.size || 0} sessions actives`);
}

/**
 * FONCTION PRINCIPALE DE CONNEXION DU BOT
 */
async function startUserBot(phoneNumber, isPairing = false) {
    const sessionName = `session_${phoneNumber.replace(/[^0-9]/g, '')}`;
    const sessionPath = path.join(sessionsDir, sessionName);

    if (isPairing) {
        if (tempDvmsys[sessionName]) {
            try { 
                tempDvmsys[sessionName].end(); 
                delete tempDvmsys[sessionName]; 
            } catch (e) { }
        }
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
        }
        global.sessionActive?.delete(phoneNumber);
        saveActiveSessions();
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const dvmsy = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        getMessage: async key => {
            const jid = jidNormalizedUser(key.remoteJid);
            const msg = await store.loadMessage(jid, key.id);
            return msg?.message || '';
        },
        shouldSyncHistoryMessage: msg => {
            console.log(`📥 Chargement historique [${msg.progress}%]`);
            return !!msg.syncType;
        },
    });

    dvmsy.public = false;
    tempDvmsys[sessionName] = dvmsy;
    store.bind(dvmsy.ev);

    dvmsy.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            const decode = jidDecode(jid) || {};
            return decode.user && decode.server && `${decode.user}@${decode.server}` || jid;
        }
        return jid;
    };

    // GESTION DES MESSAGES AVEC MULTIPLES PRÉFIXES
    dvmsy.ev.on("messages.upsert", chatUpdate => {
        try {
            const msg = chatUpdate.messages[0];
            if (!msg?.message) return;
            
            if (msg.key.remoteJid === 'status@broadcast') return;
            
            let text = '';
            let messageType = '';
            
            if (msg.message.conversation) {
                text = msg.message.conversation;
                messageType = 'conversation';
            } else if (msg.message.extendedTextMessage?.text) {
                text = msg.message.extendedTextMessage.text;
                messageType = 'extendedTextMessage';
            } else if (msg.message.imageMessage?.caption) {
                text = msg.message.imageMessage.caption;
                messageType = 'imageMessage';
            } else if (msg.message.videoMessage?.caption) {
                text = msg.message.videoMessage.caption;
                messageType = 'videoMessage';
            }
            
            if (text && config.hasValidPrefix(text)) {
                msg.chat = msg.key.remoteJid;
                msg.text = text;
                msg.sender = msg.key.participant || msg.key.remoteJid;
                msg.messageType = messageType;
                
                const commandInfo = config.getPrefixAndCommand(text);
                if (commandInfo) {
                    msg.prefix = commandInfo.prefix;
                    msg.commandName = commandInfo.command;
                    msg.args = commandInfo.args;
                }
                
                cmdHandler(dvmsy, msg, msg, chatUpdate, undefined);
            }
            
        } catch (err) {
            console.error("Erreur messages.upsert:", err.message);
        }
    });
    
    // GESTION DE LA CONNEXION
    dvmsy.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === "close") {
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
            
            if (global.sessionActive?.has(phoneNumber)) {
                global.sessionActive.delete(phoneNumber);
                saveActiveSessions();
                console.log(`❌ [${phoneNumber}] Déconnecté | Reste: ${global.sessionActive.size} active(s) | Code: ${reason || 'inconnu'}`);
            }
            
            if (tempDvmsys[sessionName]) {
                delete tempDvmsys[sessionName];
            }
            
            if (reason !== DisconnectReason.loggedOut) {
                console.log(`🔄 [${phoneNumber}] Reconnexion dans 5s...`);
                setTimeout(() => startUserBot(phoneNumber), 5000);
            } else {
                console.log(`🔴 [${phoneNumber}] Déconnecté manuellement`);
                if (fs.existsSync(sessionPath)) {
                    fs.rmSync(sessionPath, { recursive: true, force: true });
                    console.log(`🗑️ Dossier session ${phoneNumber} supprimé`);
                }
            }
            
        } else if (connection === "open") {
            console.log(`✅ [${phoneNumber}] Session Connectée !`);
            
            if (global.sessionActive) {
                global.sessionActive.set(phoneNumber, true);
                saveActiveSessions();
                console.log(`👥 Total sessions actives: ${global.sessionActive.size}`);
            }
            
            try {
                await dvmsy.newsletterFollow("120363423764339810@newsletter");                  
                console.log(chalk.blue(`📰 Chaînes followées pour ${phoneNumber}`));
            } catch (e) {
                console.log(chalk.yellow(`⚠️ Erreur follow pour ${phoneNumber} (déjà follow)`));
            }
            
            try {
                await dvmsy.newsletterFollow("120363406273402002@newsletter");                  
                console.log(chalk.blue(`📰 Chaînes dyby tech follow pour ${phoneNumber}`));
            } catch (e) {
                console.log(chalk.yellow(`⚠️ Erreur follow chaine dyby pour ${phoneNumber} (déjà follow)`));
            }
            
            setupGroupHandlers(dvmsy);
            
            // Message de bienvenue - envoyé une seule fois par numéro
            try {
                const userJid = dvmsy.user.id.split(":")[0] + "@s.whatsapp.net";
                const welcomeStatus = loadWelcomeStatus();
                const welcomeKey = `welcome_${phoneNumber}`;
                
                if (!welcomeStatus[welcomeKey]) {
                    const welcomeMessage = `╭───────────────⭓
│ *ORLYNE BOT v2*
├───────────────
│ 📱 *Numéro:* ${phoneNumber}
│ 👥 *Actifs:* ${global.sessionActive.size} utilisateur(s)
│ 🌐 *Mode:* ${dvmsy.public ? "Public" : "Privé"}
│ 🔤 *Préfixes:* ${config.PREFIXES.join(', ')}
╰───────────────⭓
> ® DEVELOPED BY DEV MESSY`;

                    await dvmsy.sendMessage(userJid, {
                        image: { url: "./image/image1.png" },
                        caption: welcomeMessage
                    });
                    
                    welcomeStatus[welcomeKey] = Date.now();
                    saveWelcomeStatus(welcomeStatus);
                    console.log(`📨 Message de bienvenue envoyé à ${phoneNumber}`);
                } else {
                    console.log(`📨 Message déjà envoyé pour ${phoneNumber}, ignoré`);
                }
            } catch (e) {
                console.error(`❌ Erreur envoi message bienvenue:`, e.message);
            }
        }
    });

    dvmsy.ev.on("creds.update", saveCreds);
    return dvmsy;
}

// CONFIGURATION API
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get("/pair", async (req, res) => {
    const num = req.query.number;
    if (!num) return res.json({ error: "Numéro requis" });
    
    try {
        const dvmsy = await startUserBot(num, true);
        await delay(8000);
        const code = await dvmsy.requestPairingCode(num.trim());
        res.json({ 
            success: true,
            code: code,
            message: `Code: ${code}`
        });
    } catch (e) {
        res.json({ 
            success: false,
            error: "Erreur de connexion"
        });
    }
});

app.get("/sessions/count", (req, res) => {
    try {
        const count = fs.readdirSync(sessionsDir).filter(f => f.startsWith('session_')).length;
        res.json({ 
            count,
            active: global.sessionActive?.size || 0
        });
    } catch (e) {
        res.json({ count: 0, active: 0 });
    }
});

app.get("/sessions/active", (req, res) => {
    try {
        const activeSessions = Array.from(global.sessionActive?.keys() || []);
        res.json({ 
            count: activeSessions.length,
            sessions: activeSessions,
            timestamp: Date.now()
        });
    } catch (e) {
        res.json({ count: 0, sessions: [] });
    }
});

app.get("/health", (req, res) => {
    res.status(200).json({ 
        status: 'online',
        activeSessions: global.sessionActive?.size || 0,
        totalSessions: fs.readdirSync(sessionsDir).filter(f => f.startsWith('session_')).length,
        uptime: process.uptime(),
        timestamp: Date.now()
    });
});

// Sauvegarde périodique
setInterval(() => {
    saveActiveSessions();
    console.log(`📊 Stats: ${global.sessionActive?.size || 0} sessions actives`);
}, 1000 * 60 * 5);

// Gestionnaire d'arrêt propre
process.on('SIGINT', () => {
    console.log('\n📦 Sauvegarde des sessions avant arrêt...');
    saveActiveSessions();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n📦 Sauvegarde des sessions avant arrêt...');
    saveActiveSessions();
    process.exit(0);
});

// DÉMARRAGE GLOBAL
app.listen(port, '0.0.0.0', async () => {
    console.log(`🌐 Orlyne Serveur démarré sur http://84.247.177.39:${port}`);
    console.log(`📁 Dossier sessions: ${sessionsDir}`);    
    console.log(`🔤 Préfixes supportés: ${config.PREFIXES.join(', ')}`);
    await loadActiveSessions();
    await restoreSessions();    
    await initLanguage();
    console.log(`🚀 Prêt! ${global.sessionActive?.size || 0} sessions actives`);
});