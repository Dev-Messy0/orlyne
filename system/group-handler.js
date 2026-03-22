// system/group-handler.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMessages, formatMessage } from '../Utils/langManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../data/groupSetting.json');

// Stockage des warns pour anti-spam et anti-link
const userActivity = new Map();

function loadGroupSettings() {
    try {
        if (fs.existsSync(DB_PATH)) {
            return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
    return {};
}

function saveGroupSettings(settings) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(settings, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving settings:', error);
        return false;
    }
}

// ==================== FONCTION POUR EXTRAIRE LE TEXTE ====================
function extractBody(m) {
    if (!m?.message) return null;
    const msg = m.message;
    if (msg.conversation) return msg.conversation;
    if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
    if (msg.imageMessage?.caption) return msg.imageMessage.caption;
    if (msg.videoMessage?.caption) return msg.videoMessage.caption;
    if (msg.documentMessage?.caption) return msg.documentMessage.caption;
    if (msg.buttonsResponseMessage?.selectedDisplayText) return msg.buttonsResponseMessage.selectedDisplayText;
    if (msg.listResponseMessage?.title) return msg.listResponseMessage.title;
    return null;
}

// ==================== VÉRIFICATION ADMIN POUR BAILEYS V7 ====================
async function isGroupAdmin(dvmsy, groupId, userJid) {
    try {
        const groupMetadata = await dvmsy.groupMetadata(groupId);
        const participants = groupMetadata.participants || [];
        
        const participant = participants.find(p => p.id === userJid);
        
        return !!(participant && (participant.admin === 'admin' || participant.admin === 'superadmin'));
    } catch (error) {
        console.error('[isGroupAdmin] Error:', error.message);
        return false;
    }
}

// ==================== ANTI-LINK HANDLER ====================
async function setupAntiLinkHandler(dvmsy, config = {}) {
    dvmsy.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const m = messages[0];
            
            if (!m?.key?.remoteJid?.endsWith('@g.us')) return;

            const groupSettings = loadGroupSettings();
            const groupId = m.key.remoteJid;
            
            if (!groupSettings[groupId]?.antilink) return;

            const ownerNums = [config?.OWNER_NUMBER].filter(Boolean);
            const senderJidRaw = m.key.participant || m.key.remoteJid;
            const senderNumber = senderJidRaw?.split('@')[0] || "";
            const isOwner = ownerNums.includes(senderNumber) || m.key.fromMe;
            
            const isAdmin = await isGroupAdmin(dvmsy, groupId, senderJidRaw);
            
            if (isOwner || isAdmin) return;

            const body = String(extractBody(m) || "").trim();

            const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|wa\.me\/[0-9]+|t\.me\/[^\s]+|chat\.whatsapp\.com\/[^\s]+)/gi;
            const hasLinks = linkRegex.test(body);

            if (hasLinks) {
                const warnKey = `${groupId}-link-warns`;
                
                if (!userActivity.has(warnKey)) {
                    userActivity.set(warnKey, new Map());
                }
                
                const linkWarns = userActivity.get(warnKey);
                const currentWarns = (linkWarns.get(senderJidRaw) || 0) + 1;
                linkWarns.set(senderJidRaw, currentWarns);
                
                try {
                    await dvmsy.sendMessage(groupId, {
                        delete: m.key
                    });
                } catch (e) {
                    console.error('Error deleting message:', e);
                }
                
                const mode = groupSettings[groupId].antilinkMode || 'kick';
                const msg = getMessages(senderJidRaw);
                
                if (mode === 'kick' && currentWarns >= 3) {
                    try {
                        await dvmsy.groupParticipantsUpdate(groupId, [senderJidRaw], "remove");
                        await dvmsy.sendMessage(groupId, {
                            text: formatMessage(msg.antilink_kick_action, { 
                                user: senderJidRaw.split('@')[0] 
                            }),
                            mentions: [senderJidRaw]
                        });
                        linkWarns.delete(senderJidRaw);
                    } catch (error) {
                        console.error('Error removing link spammer:', error);
                    }
                } else if (mode === 'warn' || (mode === 'kick' && currentWarns < 3)) {
                    await dvmsy.sendMessage(groupId, {
                        text: formatMessage(msg.antilink_warn, { 
                            user: senderJidRaw.split('@')[0],
                            warns: currentWarns
                        }),
                        mentions: [senderJidRaw]
                    });
                }
            }
        } catch (error) {
            console.error('Anti-link error:', error);
        }
    });
}

// ==================== WELCOME/GOODBYE HANDLER ====================
async function setupWelcomeGoodbyeHandler(dvmsy, config = {}) {
    dvmsy.ev.on('group-participants.update', async (update) => {
        try {
            const groupSettings = loadGroupSettings();
            const { id, participants, action } = update;
            
            if (!participants || !Array.isArray(participants)) return;
            
            console.log(`[Welcome/Goodbye] Processing ${action} for ${participants.length} participant(s) in ${id}`);
            
            for (const participant of participants) {
                try {
                    const participantJid = typeof participant === 'string' 
                        ? participant 
                        : participant?.id || participant?.jid || '';
                    
                    if (!participantJid) continue;
                    
                    const username = participantJid.split('@')[0] || 'user';
                    const msg = getMessages(participantJid);
                    
                    // Welcome message avec image
                    if (action === 'add' && groupSettings[id]?.welcome) {
                        try {
                            const metadata = await dvmsy.groupMetadata(id);
                            const groupName = metadata.subject || 'le groupe';
                            const groupDesc = metadata.desc || 'Aucune description';
                            
                            // Get profile picture (par défaut si pas de photo)
                            let ppUrl;
                            try {
                                ppUrl = await dvmsy.profilePictureUrl(participantJid, 'image');
                            } catch {
                                ppUrl = 'https://files.catbox.moe/forqr5.jpeg'; // Image par défaut
                            }

                            const welcomeText = formatMessage(msg.welcome_message, {
                                user: username,
                                groupName: groupName,
                                groupDesc: groupDesc,
                                members: metadata.participants.length
                            });

                            await dvmsy.sendMessage(id, {
                                image: { url: ppUrl },
                                caption: welcomeText,
                                mentions: [participantJid]
                            });
                            
                            console.log(`[Welcome] ${username} a rejoint ${groupName}`);
                        } catch (err) {
                            console.error('[Welcome] Error:', err.message);
                        }
                    }

                    // Goodbye message avec image
                    if (action === 'remove' && groupSettings[id]?.goodbye) {
                        try {
                            const metadata = await dvmsy.groupMetadata(id);
                            const groupName = metadata.subject || 'le groupe';
                            const groupDesc = metadata.desc || 'Aucune description';
                            
                            // Get profile picture (par défaut si pas de photo)
                            let ppUrl;
                            try {
                                ppUrl = await dvmsy.profilePictureUrl(participantJid, 'image');
                            } catch {
                                ppUrl = 'https://files.catbox.moe/forqr5.jpeg'; // Image par défaut
                            }

                            const goodbyeText = formatMessage(msg.goodbye_message, {
                                user: username,
                                groupName: groupName,
                                groupDesc: groupDesc,
                                members: metadata.participants.length
                            });

                            await dvmsy.sendMessage(id, {
                                image: { url: ppUrl },
                                caption: goodbyeText,
                                mentions: [participantJid]
                            });
                            
                            console.log(`[Goodbye] ${username} a quitté ${groupName}`);
                        } catch (err) {
                            console.error('[Goodbye] Error:', err.message);
                        }
                    }
                } catch (participantError) {
                    console.error('[Welcome/Goodbye] Participant error:', participantError.message);
                }
            }
        } catch (err) {
            console.error('[Welcome/Goodbye] Handler error:', err.message);
        }
    });
}

// ==================== ANTI-SPAM HANDLER ====================
async function setupAntiSpamHandler(dvmsy, config = {}) {
    dvmsy.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const m = messages[0];
            
            // Vérifications de base
            if (!m?.key?.remoteJid?.endsWith('@g.us')) return;
            
            const groupSettings = loadGroupSettings();
            const groupId = m.key.remoteJid;
            
            if (!groupSettings[groupId]?.antispam) return;

            // ===== TA LOGIQUE DE RECONNAISSANCE =====
            const ownerNums = [config?.OWNER_NUMBER].filter(Boolean);
            const senderJidRaw = m.key.participant || m.key.remoteJid;
            const senderNumber = senderJidRaw?.split('@')[0] || "";
            const isOwner = ownerNums.includes(senderNumber) || m.key.fromMe;
            
            // Vérifier si admin avec Baileys v7
            const isAdmin = await isGroupAdmin(dvmsy, groupId, senderJidRaw);
            
            // ✅ NE PAS SUPPRIMER LE PROPRIÉTAIRE DU BOT NI LES ADMINS
            if (isOwner || isAdmin) return;
            
            const activityKey = `${groupId}-spam`;
            
            if (!userActivity.has(activityKey)) {
                userActivity.set(activityKey, new Map());
            }
            
            const groupActivity = userActivity.get(activityKey);
            const now = Date.now();
            
            if (!groupActivity.has(senderJidRaw)) {
                groupActivity.set(senderJidRaw, {
                    count: 1,
                    lastMessage: now,
                    firstMessage: now,
                    warns: 0
                });
            } else {
                const userData = groupActivity.get(senderJidRaw);
                userData.count++;
                
                const timeDiff = now - userData.firstMessage;
                // 10 messages en moins de 10 secondes = spam
                if (timeDiff < 10000 && userData.count > 10) {
                    userData.warns++;
                    const msg = getMessages(senderJidRaw);
                    
                    if (userData.warns >= 3) {
                        try {
                            await dvmsy.groupParticipantsUpdate(groupId, [senderJidRaw], "remove");
                            await dvmsy.sendMessage(groupId, {
                                text: formatMessage(msg.antispam_kick, { 
                                    user: senderJidRaw.split('@')[0] 
                                }),
                                mentions: [senderJidRaw]
                            });
                            groupActivity.delete(senderJidRaw);
                        } catch (error) {
                            console.error('Error removing spammer:', error);
                        }
                    } else {
                        await dvmsy.sendMessage(groupId, {
                            text: formatMessage(msg.antispam_warn, { 
                                user: senderJidRaw.split('@')[0],
                                warns: userData.warns
                            }),
                            mentions: [senderJidRaw]
                        });
                    }
                    
                    userData.count = 0;
                    userData.firstMessage = now;
                }
                
                groupActivity.set(senderJidRaw, userData);
            }
            
            // Nettoyage des anciennes entrées
            for (const [user, data] of groupActivity.entries()) {
                if (now - data.firstMessage > 30000) {
                    groupActivity.delete(user);
                }
            }
            
        } catch (error) {
            console.error('Anti-spam error:', error);
        }
    });
}


// ==================== ANTI-ADMIN ACTIONS HANDLER ====================
async function setupAntiAdminActionsHandler(dvmsy, config = {}) {
    dvmsy.ev.on('group-participants.update', async ({ id, participants, action, author }) => {
        const groupSettings = loadGroupSettings();
        
        // ===== TA LOGIQUE DE RECONNAISSANCE POUR L'AUTEUR =====
        const ownerNums = [config?.OWNER_NUMBER].filter(Boolean);
        const authorJid = typeof author === 'string' ? author : author?.id || author?.jid || '';
        const authorNumber = authorJid?.split('@')[0] || "";
        const isOwner = ownerNums.includes(authorNumber) || authorJid === dvmsy.user.id;
        
        // ✅ NE PAS BLOQUER LES ACTIONS DU PROPRIÉTAIRE DU BOT
        if (isOwner) return;
        
        // Anti-Demote
        if (action === 'demote' && groupSettings[id]?.antidemote) {
            try {
                const participantJids = (participants || []).map(p => {
                    return typeof p === 'string' ? p : p?.id || p?.jid || '';
                }).filter(Boolean);
                
                if (participantJids.length === 0) return;
                
                const msg = getMessages(authorJid);
                
                // ✅ Vérifier si on essaie de démote le bot
                const isDemotingBot = participantJids.some(jid => jid === dvmsy.user.id);
                if (isDemotingBot) {
                    // Re-promote immédiatement
                    await dvmsy.groupParticipantsUpdate(id, [dvmsy.user.id], 'promote');
                    
                    await dvmsy.sendMessage(id, {
                        text: formatMessage(msg.antidemote_bot, { 
                            user: authorJid.split('@')[0] 
                        }),
                        mentions: [authorJid]
                    });
                    return;
                }
                
                // Restaurer les admins démotes
                await dvmsy.groupParticipantsUpdate(id, participantJids, 'promote');
                
                let demotedBy = 'Système';
                let mentionList = [...participantJids];
                
                if (authorJid) {
                    demotedBy = `@${authorJid.split('@')[0]}`;
                    mentionList.push(authorJid);
                }
                
                await dvmsy.sendMessage(id, {        
                    text: formatMessage(msg.antidemote_action, { 
                        user: demotedBy
                    }),
                    mentions: mentionList
                });
            } catch (error) {
                console.error('Anti-demote error:', error);
            }
        }
        
        // Anti-Promote
        if (action === 'promote' && groupSettings[id]?.antipromote) {      
            try {
                const participantJids = (participants || []).map(p => {
                    return typeof p === 'string' ? p : p?.id || p?.jid || '';
                }).filter(Boolean);
                
                if (participantJids.length === 0) return;
                
                const msg = getMessages(authorJid);
                
                // ✅ Ne pas démote le bot s'il est promu
                const isPromotingBot = participantJids.some(jid => jid === dvmsy.user.id);
                if (isPromotingBot) {
                    // Laisser le bot être promu
                    return;
                }
                
                await dvmsy.groupParticipantsUpdate(id, participantJids, 'demote');
                
                const promotedUserJid = participantJids[0];
                let promotedBy = 'Système';
                
                if (authorJid) {
                    promotedBy = `@${authorJid.split('@')[0]}`;
                }
                
                await dvmsy.sendMessage(id, {
                    text: formatMessage(msg.antipromote_action, { 
                        by: promotedBy,
                        user: promotedUserJid.split('@')[0]
                    }),
                    mentions: [promotedUserJid, authorJid]
                });
            } catch (e) {
                console.error('Anti-promote error:', e);
            }
        }
        
        // Anti-Remove (protège le bot)
        if (action === 'remove' && groupSettings[id]?.antiremove) {
            try {
                if (authorJid) {
                    const msg = getMessages(authorJid);
                    
                    // ✅ Vérifier si on essaie de retirer le bot
                    const isRemovingBot = participants.some(p => {
                        const pJid = typeof p === 'string' ? p : p?.id || p?.jid || '';
                        return pJid === dvmsy.user.id;
                    });
                    
                    if (isRemovingBot) {
                        // Retirer celui qui a essayé de retirer le bot
                        await dvmsy.groupParticipantsUpdate(id, [authorJid], "remove");
                        
                        await dvmsy.sendMessage(id, {
                            text: formatMessage(msg.antiremove_bot, { 
                                user: authorJid.split('@')[0] 
                            }),
                            mentions: [authorJid]
                        });
                        return;
                    }
                    
                    // Anti-remove normal
                    if (authorJid !== dvmsy.user.id) {
                        await dvmsy.groupParticipantsUpdate(id, [authorJid], "remove");
                        
                        await dvmsy.sendMessage(id, {
                            text: formatMessage(msg.antiremove_action, { 
                                user: authorJid.split('@')[0] 
                            }),
                            mentions: [authorJid]
                        });
                    }
                }
            } catch (error) {
                console.error('Anti-remove error:', error);
            }
        }
    });
}

// ==================== MAIN SETUP ====================
export default function setupGroupHandlers(dvmsy, config = {}) {
    setupAntiLinkHandler(dvmsy, config);
    setupWelcomeGoodbyeHandler(dvmsy, config);
    setupAntiSpamHandler(dvmsy, config);
    setupAntiAdminActionsHandler(dvmsy, config);
    console.log('✅ Group handlers setup complete');
}