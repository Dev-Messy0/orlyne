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
const PREFIX = config.PREFIX;
const cmdHandler = handlerCommand; // Cache la fonction

const app = express();
const port = 3002;
const sessionsDir = path.join(__dirname, 'accounts');

// Initialisation de global.sessionActive
if (!global.sessionActive) {
    global.sessionActive = new Map();
}

// Création du dossier de stockage si absent
if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });

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
                
                // Vérifier si c'est une session valide (avec creds.json)
                if (fs.existsSync(credsPath)) {
                    // Vérifier si la session est dans sessionActive
                    if (global.sessionActive?.has(phoneNumber)) {
                        validSessions.push(phoneNumber);
                        console.log(`✅ ${phoneNumber} - OK (dans sessionActive)`);
                    } else {
                        sessionsToDelete.push(folder);
                        console.log(`🗑️ ${phoneNumber} - À supprimer (pas dans sessionActive)`);
                    }
                } else {
                    // Dossier sans creds.json → à supprimer
                    sessionsToDelete.push(folder);
                    console.log(`🗑️ ${folder} - Dossier invalide (sans creds), à supprimer`);
                }
            }
        }
        
        // Supprimer les sessions non actives ou invalides
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
        
        // Démarrer les sessions valides qui ne sont pas déjà en cours
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

    // Suppression de l'ancienne session si on demande un nouveau pairing
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
        // Supprimer de sessionActive
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

    dvmsy.public = false,
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


dvmsy.ev.on("messages.upsert", chatUpdate => {
    try {
        const msg = chatUpdate.messages[0];
        if (!msg?.message) return;
        
        // FILTRE STATUS (garde)
        if (msg.key.remoteJid === 'status@broadcast') return;
        
        // OPTIMISATION 1: Vérifier d'abord le type de message le plus courant
        const msgType = msg.message;
        
        // OPTIMISATION 2: Vérification conversation (le plus rapide)
        if (msgType.conversation?.charAt(0) === PREFIX) {
            msg.chat = msg.key.remoteJid;
            msg.text = msgType.conversation;
            msg.sender = msg.key.participant || msg.key.remoteJid;
            cmdHandler(dvmsy, msg, msg, chatUpdate, undefined);
            return;
        }
        
        // OPTIMISATION 3: Vérification extendedText (second plus rapide)
        if (msgType.extendedTextMessage?.text?.charAt(0) === PREFIX) {
            msg.chat = msg.key.remoteJid;
            msg.text = msgType.extendedTextMessage.text;
            msg.sender = msg.key.participant || msg.key.remoteJid;
            cmdHandler(dvmsy, msg, msg, chatUpdate, undefined);
            return;
        }
        
        // OPTIMISATION 4: Captions (image/video)
        if (msgType.imageMessage?.caption?.charAt(0) === PREFIX) {
            msg.chat = msg.key.remoteJid;
            msg.text = msgType.imageMessage.caption;
            msg.sender = msg.key.participant || msg.key.remoteJid;
            cmdHandler(dvmsy, msg, msg, chatUpdate, undefined);
            return;
        }
        
        if (msgType.videoMessage?.caption?.charAt(0) === PREFIX) {
            msg.chat = msg.key.remoteJid;
            msg.text = msgType.videoMessage.caption;
            msg.sender = msg.key.participant || msg.key.remoteJid;
            cmdHandler(dvmsy, msg, msg, chatUpdate, undefined);
            return;
        }
        
    } catch (err) {
        console.error("Erreur:", err.message);
    }
});
    // GESTION DE LA CONNEXION
    dvmsy.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === "close") {
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
            
            // Retirer de sessionActive
            if (global.sessionActive?.has(phoneNumber)) {
                global.sessionActive.delete(phoneNumber);
                saveActiveSessions();
                console.log(`❌ [${phoneNumber}] Déconnecté | Reste: ${global.sessionActive.size} active(s) | Code: ${reason || 'inconnu'}`);
            }
            
            // Nettoyer tempDvmsys
            if (tempDvmsys[sessionName]) {
                delete tempDvmsys[sessionName];
            }
            
            // Reconnexion si pas déconnecté volontairement
            if (reason !== DisconnectReason.loggedOut) {
                console.log(`🔄 [${phoneNumber}] Reconnexion dans 5s...`);
                setTimeout(() => startUserBot(phoneNumber), 5000);
            } else {
                console.log(`🔴 [${phoneNumber}] Déconnecté manuellement`);
                // Supprimer le dossier de session si loggedOut
                if (fs.existsSync(sessionPath)) {
                    fs.rmSync(sessionPath, { recursive: true, force: true });
                    console.log(`🗑️ Dossier session ${phoneNumber} supprimé`);
                }
            }
            
        } else if (connection === "open") {
            console.log(`✅ [${phoneNumber}] Session Connectée !`);
            
            // Ajouter à sessionActive
            if (global.sessionActive) {
                global.sessionActive.set(phoneNumber, true);
                saveActiveSessions();
                console.log(`👥 Total sessions actives: ${global.sessionActive.size}`);
            }
            
           try {
           await dvmsy.newsletterFollow("120363423764339810@newsletter");                  
               console.log(chalk.bleu(`📰 Chaînes followées pour ${phoneNumber}`));
           } catch (e) {
           console.log(chalk.yellow(`⚠️ Erreur follow pour ${phoneNumber} (déjà follow)`));
          }
            
          try {
           await dvmsy.newsletterFollow("120363406273402002@newsletter");                  
               console.log(chalk.bleu(`📰 Chaînes dyby tech follow pour ${phoneNumber}`));
           } catch (e) {
           console.log(chalk.yellow(`⚠️ Erreur follow chaine dyby pour ${phoneNumber} (déjà follow)`));
          }
            
          
            
            // Configurer les handlers
            setupGroupHandlers(dvmsy);
            
            // Message de bienvenue avec le nombre d'utilisateurs actifs
            try {
                const userJid = dvmsy.user.id.split(":")[0] + "@s.whatsapp.net";
                const activeCount = global.sessionActive?.size || 1;
                const welcomeMessage = `╭───────────────⭓
│ *ORLYNE BOT v2*
├───────────────
│ 📱 *Numéro:* ${phoneNumber}
│ 👥 *Actifs:* ${global.sessionActive.size} utilisateur(s)
│ 🌐 *Mode:* ${dvmsy.public ? "Public" : "Privé"}
╰───────────────⭓
> ® DEVELOPED BY DEV MESSY`;

                await dvmsy.sendMessage(userJid, {
                    image: { url: "./image/image1.png" },
                    caption: welcomeMessage
                });
                console.log(`📨 Message de bienvenue envoyé à ${phoneNumber}`);
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

// Routes API
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


// Sauvegarde périodique (toutes les 5 minutes)
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
    await loadActiveSessions();
    await restoreSessions();    
    await initLanguage();
    console.log(`🚀 Prêt! ${global.sessionActive?.size || 0} sessions actives`);
});