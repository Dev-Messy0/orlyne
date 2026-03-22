// commands/group-settings.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMessages, formatMessage } from '../Utils/langManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../data/groupSetting.json');

// Créer le fichier de base de données s'il n'existe pas
function initDatabase() {
    try {
        if (!fs.existsSync(DB_PATH)) {
            const dir = path.dirname(DB_PATH);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
            console.log('✅ groupSetting.json created successfully');
        }
    } catch (error) {
        console.error('Error creating database:', error);
    }
}

initDatabase();

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

// ==================== ANTI-LINK ====================
export async function antilink(m, dvmsy) {
    const msg = getMessages(m.sender);
    
    try {
        const { isGroup, isAdmin, isOwner } = m;
        
        await dvmsy.sendMessage(m.chat, { react: { text: msg.reaction_antilink || "🔗", key: m.key } });

        if (!isGroup) {
            return dvmsy.sendMessage(m.chat, { 
                text: msg.onlyGroup
            });
        }
        
        if (!isAdmin && !isOwner) {
            return dvmsy.sendMessage(m.chat, { 
                text: msg.onlyAdmin
            });
        }

        const groupSettings = loadGroupSettings();
        const groupId = m.chat;
        
        groupSettings[groupId] = groupSettings[groupId] || {};
        const currentStatus = groupSettings[groupId].antilink || false;

        if (!m.args[0] || !['on', 'off', 'delete', 'warn', 'kick'].includes(m.args[0].toLowerCase())) {
            let mode = 'delete';
            if (groupSettings[groupId].antilinkMode) {
                mode = groupSettings[groupId].antilinkMode;
            }
            
            const modeEmoji = {
                'delete': '🗑️',
                'warn': '⚠️',
                'kick': '👢'
            };
            
            return await dvmsy.sendMessage(m.chat, {
                text: formatMessage(msg.antilink_status, {
                    status: currentStatus ? '✅ Activé' : '❌ Désactivé',
                    mode: `${modeEmoji[mode]} *${mode.toUpperCase()}*`,
                    prefix: m.prefix
                })
            });
        }

        const action = m.args[0].toLowerCase();

        if (action === 'delete' || action === 'warn' || action === 'kick') {
            groupSettings[groupId].antilinkMode = action;
            
            if (saveGroupSettings(groupSettings)) {
                const modeEmoji = {
                    'delete': '🗑️',
                    'warn': '⚠️',
                    'kick': '👢'
                };
                
                let description = '';
                if (action === 'delete') {
                    description = msg.antilink_delete_desc || 'Les liens seront simplement supprimés.';
                } else if (action === 'warn') {
                    description = msg.antilink_warn_desc || 'Les liens seront supprimés + avertissement (1-2).';
                } else {
                    description = msg.antilink_kick_desc || 'Les liens seront supprimés + avertissement + kick au 3ème.';
                }
                
                await dvmsy.sendMessage(m.chat, {
                    text: formatMessage(msg.antilink_mode_changed, {
                        mode: `${modeEmoji[action]} *${action.toUpperCase()}*`,
                        description
                    })
                });
            }
            return;
        }

        if (action === 'on') {
            groupSettings[groupId].antilink = true;
            
            if (saveGroupSettings(groupSettings)) {
                let mode = groupSettings[groupId].antilinkMode || 'delete';
                const modeEmoji = {
                    'delete': '🗑️',
                    'warn': '⚠️',
                    'kick': '👢'
                };
                
                await dvmsy.sendMessage(m.chat, {
                    text: formatMessage(msg.antilink_on, {
                        mode: `${modeEmoji[mode]} *${mode.toUpperCase()}*`
                    })
                });
            }
        } else if (action === 'off') {
            groupSettings[groupId].antilink = false;
            
            if (saveGroupSettings(groupSettings)) {
                await dvmsy.sendMessage(m.chat, {
                    text: msg.antilink_off
                });
            }
        }

    } catch (err) {
        console.error('[antilink] error:', err);
        await dvmsy.sendMessage(m.chat, {
            text: msg.command_error || "❌ Erreur lors du traitement de la commande antilink"
        });
    }
}

// ==================== WELCOME ====================
export async function welcome(m, dvmsy) {
    const msg = getMessages(m.sender);
    
    try {
        const { isGroup, isAdmin, isOwner } = m;
        
        await dvmsy.sendMessage(m.chat, { react: { text: msg.reaction_welcome || "👋", key: m.key } });

        if (!isGroup) {
            return dvmsy.sendMessage(m.chat, { 
                text: msg.onlyGroup
            });
        }
        
        if (!isAdmin && !isOwner) {
            return dvmsy.sendMessage(m.chat, { 
                text: msg.onlyAdmin
            });
        }

        const groupSettings = loadGroupSettings();
        const groupId = m.chat;
        
        groupSettings[groupId] = groupSettings[groupId] || {};
        const currentStatus = groupSettings[groupId].welcome || false;

        if (m.args[0]?.toLowerCase() === 'on') {
            groupSettings[groupId].welcome = true;
            
            if (saveGroupSettings(groupSettings)) {
                await dvmsy.sendMessage(m.chat, {
                    text: msg.welcome_on
                });
            }
        } else if (m.args[0]?.toLowerCase() === 'off') {
            groupSettings[groupId].welcome = false;
            
            if (saveGroupSettings(groupSettings)) {
                await dvmsy.sendMessage(m.chat, {
                    text: msg.welcome_off
                });
            }
        } else {
            await dvmsy.sendMessage(m.chat, {
                text: formatMessage(msg.welcome_status, {
                    status: currentStatus ? '✅ Activé' : '❌ Désactivé',
                    prefix: m.prefix
                })
            });
        }

    } catch (err) {
        console.error('[welcome] error:', err);
        await dvmsy.sendMessage(m.chat, {
            text: msg.command_error || "❌ Erreur lors du traitement de la commande welcome"
        });
    }
}

// ==================== GOODBYE ====================
export async function goodbye(m, dvmsy) {
    const msg = getMessages(m.sender);
    
    try {
        const { isGroup, isAdmin, isOwner } = m;
        
        await dvmsy.sendMessage(m.chat, { react: { text: msg.reaction_goodbye || "👋", key: m.key } });

        if (!isGroup) {
            return dvmsy.sendMessage(m.chat, { 
                text: msg.onlyGroup
            });
        }
        
        if (!isAdmin && !isOwner) {
            return dvmsy.sendMessage(m.chat, { 
                text: msg.onlyAdmin
            });
        }

        const groupSettings = loadGroupSettings();
        const groupId = m.chat;
        
        groupSettings[groupId] = groupSettings[groupId] || {};
        const currentStatus = groupSettings[groupId].goodbye || false;

        if (m.args[0]?.toLowerCase() === 'on') {
            groupSettings[groupId].goodbye = true;
            
            if (saveGroupSettings(groupSettings)) {
                await dvmsy.sendMessage(m.chat, {
                    text: msg.goodbye_on
                });
            }
        } else if (m.args[0]?.toLowerCase() === 'off') {
            groupSettings[groupId].goodbye = false;
            
            if (saveGroupSettings(groupSettings)) {
                await dvmsy.sendMessage(m.chat, {
                    text: msg.goodbye_off
                });
            }
        } else {
            await dvmsy.sendMessage(m.chat, {
                text: formatMessage(msg.goodbye_status, {
                    status: currentStatus ? '✅ Activé' : '❌ Désactivé',
                    prefix: m.prefix
                })
            });
        }

    } catch (err) {
        console.error('[goodbye] error:', err);
        await dvmsy.sendMessage(m.chat, {
            text: msg.command_error || "❌ Erreur lors du traitement de la commande goodbye"
        });
    }
}


// commands/group-settings.js
// ... (le début du fichier reste identique avec loadGroupSettings, saveGroupSettings, etc.)

// ==================== ANTI-SPAM ====================
export async function antispam(m, dvmsy) {
    try {
        const { isGroup, isAdmin, isOwner } = m;
        const msg = getMessages(m.sender);
        
        await dvmsy.sendMessage(m.chat, { react: { text: msg.reaction_antispam || "🚫", key: m.key } });

        if (!isGroup) {
            return dvmsy.sendMessage(m.chat, { 
                text: msg.onlyGroup
            }, { quoted: m });
        }
        
        if (!isAdmin && !isOwner) {
            return dvmsy.sendMessage(m.chat, { 
                text: msg.onlyAdmin
            }, { quoted: m });
        }

        const groupSettings = loadGroupSettings();
        const groupId = m.chat;
        
        groupSettings[groupId] = groupSettings[groupId] || {};
        const currentStatus = groupSettings[groupId].antispam || false;

        if (m.args[0]?.toLowerCase() === 'on') {
            groupSettings[groupId].antispam = true;
            
            if (saveGroupSettings(groupSettings)) {
                await dvmsy.sendMessage(m.chat, {
                    text: msg.antispam_on
                }, { quoted: m });
            }
        } else if (m.args[0]?.toLowerCase() === 'off') {
            groupSettings[groupId].antispam = false;
            
            if (saveGroupSettings(groupSettings)) {
                await dvmsy.sendMessage(m.chat, {
                    text: msg.antispam_off
                }, { quoted: m });
            }
        } else {
            await dvmsy.sendMessage(m.chat, {
                text: formatMessage(msg.antispam_status, {
                    status: currentStatus ? '✅ ᴀᴄᴛɪᴠᴇ́' : '❌ ᴅᴇ́ꜱᴀᴄᴛɪᴠᴇ́',
                    prefix: m.prefix
                })
            }, { quoted: m });
        }

    } catch (err) {
        console.error('[antispam] error:', err);
        const msg = getMessages(m.sender);
        await dvmsy.sendMessage(m.chat, {
            text: msg.command_error
        }, { quoted: m });
    }
}

// ==================== ANTI-PROMOTE ====================
export async function antipromote(m, dvmsy) {
    try {
        const { isGroup, isAdmin, isOwner } = m;
        const msg = getMessages(m.sender);
        
        await dvmsy.sendMessage(m.chat, { react: { text: msg.reaction_antipromote || "🛡️", key: m.key } });

        if (!isGroup) {
            return dvmsy.sendMessage(m.chat, { 
                text: msg.onlyGroup
            }, { quoted: m });
        }
        
        if (!isAdmin && !isOwner) {
            return dvmsy.sendMessage(m.chat, { 
                text: msg.onlyAdmin
            }, { quoted: m });
        }

        const groupSettings = loadGroupSettings();
        const groupId = m.chat;
        
        groupSettings[groupId] = groupSettings[groupId] || {};
        const currentStatus = groupSettings[groupId].antipromote || false;

        if (m.args[0]?.toLowerCase() === 'on') {
            groupSettings[groupId].antipromote = true;
            
            if (saveGroupSettings(groupSettings)) {
                await dvmsy.sendMessage(m.chat, {
                    text: msg.antipromote_on
                }, { quoted: m });
            }
        } else if (m.args[0]?.toLowerCase() === 'off') {
            groupSettings[groupId].antipromote = false;
            
            if (saveGroupSettings(groupSettings)) {
                await dvmsy.sendMessage(m.chat, {
                    text: msg.antipromote_off
                }, { quoted: m });
            }
        } else {
            await dvmsy.sendMessage(m.chat, {
                text: formatMessage(msg.antipromote_status, {
                    status: currentStatus ? '✅ ᴀᴄᴛɪᴠᴇ́' : '❌ ᴅᴇ́ꜱᴀᴄᴛɪᴠᴇ́',
                    prefix: m.prefix
                })
            }, { quoted: m });
        }

    } catch (err) {
        console.error('[antipromote] error:', err);
        const msg = getMessages(m.sender);
        await dvmsy.sendMessage(m.chat, {
            text: msg.command_error
        }, { quoted: m });
    }
}

// ==================== ANTI-DEMOTE ====================
export async function antidemote(m, dvmsy) {
    try {
        const { isGroup, isAdmin, isOwner } = m;
        const msg = getMessages(m.sender);
        
        await dvmsy.sendMessage(m.chat, { react: { text: msg.reaction_antidemote || "🛡️", key: m.key } });

        if (!isGroup) {
            return dvmsy.sendMessage(m.chat, { 
                text: msg.onlyGroup
            }, { quoted: m });
        }
        
        if (!isAdmin && !isOwner) {
            return dvmsy.sendMessage(m.chat, { 
                text: msg.onlyAdmin
            }, { quoted: m });
        }

        const groupSettings = loadGroupSettings();
        const groupId = m.chat;
        
        groupSettings[groupId] = groupSettings[groupId] || {};
        const currentStatus = groupSettings[groupId].antidemote || false;

        if (m.args[0]?.toLowerCase() === 'on') {
            groupSettings[groupId].antidemote = true;
            
            if (saveGroupSettings(groupSettings)) {
                await dvmsy.sendMessage(m.chat, {
                    text: msg.antidemote_on
                }, { quoted: m });
            }
        } else if (m.args[0]?.toLowerCase() === 'off') {
            groupSettings[groupId].antidemote = false;
            
            if (saveGroupSettings(groupSettings)) {
                await dvmsy.sendMessage(m.chat, {
                    text: msg.antidemote_off
                }, { quoted: m });
            }
        } else {
            await dvmsy.sendMessage(m.chat, {
                text: formatMessage(msg.antidemote_status, {
                    status: currentStatus ? '✅ ᴀᴄᴛɪᴠᴇ́' : '❌ ᴅᴇ́ꜱᴀᴄᴛɪᴠᴇ́',
                    prefix: m.prefix
                })
            }, { quoted: m });
        }

    } catch (err) {
        console.error('[antidemote] error:', err);
        const msg = getMessages(m.sender);
        await dvmsy.sendMessage(m.chat, {
            text: msg.command_error
        }, { quoted: m });
    }
}

// ==================== ANTI-REMOVE ====================
export async function antiremove(m, dvmsy) {
    try {
        const { isGroup, isAdmin, isOwner } = m;
        const msg = getMessages(m.sender);
        
        await dvmsy.sendMessage(m.chat, { react: { text: msg.reaction_antiremove || "🛡️", key: m.key } });

        if (!isGroup) {
            return dvmsy.sendMessage(m.chat, { 
                text: msg.onlyGroup
            }, { quoted: m });
        }
        
        if (!isAdmin && !isOwner) {
            return dvmsy.sendMessage(m.chat, { 
                text: msg.onlyAdmin
            }, { quoted: m });
        }

        const groupSettings = loadGroupSettings();
        const groupId = m.chat;
        
        groupSettings[groupId] = groupSettings[groupId] || {};
        const currentStatus = groupSettings[groupId].antiremove || false;

        if (m.args[0]?.toLowerCase() === 'on') {
            groupSettings[groupId].antiremove = true;
            
            if (saveGroupSettings(groupSettings)) {
                await dvmsy.sendMessage(m.chat, {
                    text: msg.antiremove_on
                }, { quoted: m });
            }
        } else if (m.args[0]?.toLowerCase() === 'off') {
            groupSettings[groupId].antiremove = false;
            
            if (saveGroupSettings(groupSettings)) {
                await dvmsy.sendMessage(m.chat, {
                    text: msg.antiremove_off
                }, { quoted: m });
            }
        } else {
            await dvmsy.sendMessage(m.chat, {
                text: formatMessage(msg.antiremove_status, {
                    status: currentStatus ? '✅ ᴀᴄᴛɪᴠᴇ́' : '❌ ᴅᴇ́ꜱᴀᴄᴛɪᴠᴇ́',
                    prefix: m.prefix
                })
            }, { quoted: m });
        }

    } catch (err) {
        console.error('[antiremove] error:', err);
        const msg = getMessages(m.sender);
        await dvmsy.sendMessage(m.chat, {
            text: msg.command_error
        }, { quoted: m });
    }
}