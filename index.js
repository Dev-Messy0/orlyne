// index.js
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
import { getMessageText } from './Utils/messageUtils.js';

import config from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cmdHandler = handlerCommand;
const app = express();
const port = 3421;
const sessionsDir = path.join(__dirname, 'accounts');
const welcomeStatusFile = path.join(__dirname, 'data', 'welcome_status.json');

if (!global.sessionActive) {
    global.sessionActive = new Map();
}

if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });
if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

let tempDvmsys = {};
global.msgStore = {};

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
        fs.writeFileSync(welcomeStatusFile, JSON.stringify(status, null, 2));
    } catch (error) {}
}

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

async function loadActiveSessions() {
    try {
        const dataDir = path.join(__dirname, 'data');
        const sessionsFile = path.join(dataDir, 'active_sessions.json');
        if (fs.existsSync(sessionsFile)) {
            const data = JSON.parse(fs.readFileSync(sessionsFile, 'utf-8'));
            if (data.activeNumbers && Array.isArray(data.activeNumbers)) {
                console.log(`📂 ${data.activeNumbers.length} sessions à restaurer...`);
                for (const num of data.activeNumbers) {
                    const sessionPath = path.join(sessionsDir, `session_${num}`);
                    if (fs.existsSync(sessionPath)) {
                        console.log(`🔄 Démarrage: ${num}`);
                        startUserBot(num);
                        await delay(3000);
                    }
                }
            }
        }
    } catch (err) {
        console.error("❌ Erreur loadActiveSessions:", err.message);
    }
}

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
                    } else {
                        sessionsToDelete.push(folder);
                    }
                } else {
                    sessionsToDelete.push(folder);
                }
            }
        }
        
        for (const folder of sessionsToDelete) {
            try {
                fs.rmSync(path.join(sessionsDir, folder), { recursive: true, force: true });
                console.log(`✅ Supprimé: ${folder}`);
            } catch (e) {}
        }
        
        const sessionsToStart = validSessions.filter(num => !tempDvmsys[`session_${num}`]);
        for (const num of sessionsToStart) {
            await startUserBot(num);
            await delay(3000);
        }
    }
    console.log(`\n✅ Restauration terminée. ${global.sessionActive?.size || 0} sessions actives`);
}

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
    });

    dvmsy.public = false;
    tempDvmsys[sessionName] = dvmsy;
    store.bind(dvmsy.ev);

    // TRAITEMENT DES MESSAGES
    dvmsy.ev.on("messages.upsert", async (chatUpdate) => {
        try {
            const msg = chatUpdate.messages[0];
            if (!msg?.message) return;
            if (msg.key.remoteJid === 'status@broadcast') return;
            
            // Utiliser getMessageText pour extraire le texte
            let text = getMessageText(msg);
            
            // Vérifier le préfixe
            if (text && (text.startsWith('.') || text.startsWith('!') || text.startsWith('/') || text.startsWith('#') || text.startsWith('?'))) {
                msg.chat = msg.key.remoteJid;
                msg.text = text;
                msg.sender = msg.key.participant || msg.key.remoteJid;
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
                console.log(`❌ [${phoneNumber}] Déconnecté`);
            }
            if (tempDvmsys[sessionName]) delete tempDvmsys[sessionName];
            if (reason !== DisconnectReason.loggedOut) {
                console.log(`🔄 [${phoneNumber}] Reconnexion dans 5s...`);
                setTimeout(() => startUserBot(phoneNumber), 5000);
            }
            
        } else if (connection === "open") {
            console.log(`✅ [${phoneNumber}] Session Connectée !`);
            if (global.sessionActive) {
                global.sessionActive.set(phoneNumber, true);
                saveActiveSessions();
            }
            
            try {
                await dvmsy.newsletterFollow("120363423764339810@newsletter");
                await dvmsy.newsletterFollow("120363406273402002@newsletter");
            } catch (e) {}
            
            setupGroupHandlers(dvmsy);
            
            // WELCOME MESSAGE (UNE SEULE FOIS)
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
│ 🔤 *Préfixe:* .
╰───────────────⭓
> ® DEVELOPED BY DEV MESSY`;

                    await dvmsy.sendMessage(userJid, {
                        image: { url: "./image/image1.png" },
                        caption: welcomeMessage
                    });
                    
                    welcomeStatus[welcomeKey] = Date.now();
                    saveWelcomeStatus(welcomeStatus);
                    console.log(`📨 Welcome envoyé à ${phoneNumber}`);
                }
            } catch (e) {
                console.error(`❌ Erreur welcome:`, e.message);
            }
        }
    });

    dvmsy.ev.on("creds.update", saveCreds);
    return dvmsy;
}

// API
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
        res.json({ success: true, code: code });
    } catch (e) {
        res.json({ success: false, error: "Erreur de connexion" });
    }
});

app.get("/sessions/count", (req, res) => {
    try {
        const count = fs.readdirSync(sessionsDir).filter(f => f.startsWith('session_')).length;
        res.json({ count, active: global.sessionActive?.size || 0 });
    } catch (e) {
        res.json({ count: 0, active: 0 });
    }
});

app.get("/sessions/active", (req, res) => {
    try {
        const activeSessions = Array.from(global.sessionActive?.keys() || []);
        res.json({ count: activeSessions.length, sessions: activeSessions });
    } catch (e) {
        res.json({ count: 0, sessions: [] });
    }
});

app.get("/health", (req, res) => {
    res.json({ 
        status: 'online',
        activeSessions: global.sessionActive?.size || 0,
        uptime: process.uptime()
    });
});

setInterval(() => {
    saveActiveSessions();
}, 1000 * 60 * 5);

process.on('SIGINT', () => {
    saveActiveSessions();
    process.exit(0);
});

app.listen(port, '0.0.0.0', async () => {
    console.log(`🌐 Serveur démarré sur le port ${port}`);
    await loadActiveSessions();
    await restoreSessions();    
    await initLanguage();
    console.log(`🚀 Prêt! ${global.sessionActive?.size || 0} sessions actives`);
});