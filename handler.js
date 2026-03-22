// handler.js
import config from './config.js';
import { getMessages, formatMessage } from './Utils/langManager.js';

import ping from './commands/ping.js';
import menu from './commands/menu.js';
import info from './commands/info.js';
import support from './commands/support.js';
import restart from './commands/restart.js';
import url from './commands/url.js';
import wasted from './commands/wasted.js';
import wanted from './commands/wanted.js';
import pair from './commands/pair.js';
import vv from './commands/vv.js';
import song from './commands/song.js';
import youtube from './commands/youtube.js';
import orlyneAi from './commands/orlyne-ai.js';
import clearchat from './commands/clearchat.js';
import take from './commands/take.js';
import sticker from './commands/sticker.js';
import apk from './commands/apk.js';
import groupstatus from './commands/groupstatus.js';
import active from './commands/active.js';
import toImg from './commands/to-img.js';
import toVid from './commands/to-vid.js';
import toAud from './commands/to-aud.js';
import saveStatus from './commands/saveStatus.js';
import setlang from './commands/setlang.js';
import telegramsticker from './commands/telegramsticker.js';
import voix from './commands/voix.js';
import tiktok from './commands/tiktok.js';
import instagram from './commands/instagram.js';
import facebook from './commands/facebook.js';
import twitter from './commands/twitter.js';

// Commandes groupe
import tagall from './commands/group/tagall.js';
import hidetag from './commands/group/hidetag.js';
import link from './commands/group/link.js';
import groupinfo from './commands/group/groupinfo.js';
import promote from './commands/group/promote.js';
import demote from './commands/group/demote.js';
import kick from './commands/group/kick.js';
import kickall from './commands/group/kickall.js';
import open from './commands/group/open.js';
import close from './commands/group/close.js';
import newlink from './commands/group/newlink.js';

// Commandes settings groupe (avec les nouvelles)
import { 
    antilink, 
    welcome, 
    goodbye,
    antispam,
    antipromote,
    antidemote,
    antiremove
} from './commands/group-settings.js';

import { 
    getMessageInfo, 
    getGroupInfo, 
    checkIsOwner,
    getUserPermissions 
} from './Utils/messageUtils.js';

// Rendre config accessible globalement
global.config = config;
global.autobio = true;

// ==================== FONCTION RÉACTION ====================
const sendReaction = async (dvmsy, chatId, key, emoji = "👾") => {
    try {
        await dvmsy.sendMessage(chatId, { 
            react: { 
                text: emoji, 
                key: key 
            } 
        });
    } catch (error) {
        console.error('Erreur réaction:', error);
    }
};

// Fonction runtime
const runtime = (seconds) => {
    seconds = Number(seconds);
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    
    const dDisplay = d > 0 ? d + 'd ' : '';
    const hDisplay = h > 0 ? h + 'h ' : '';
    const mDisplay = m > 0 ? m + 'm ' : '';
    const sDisplay = s > 0 ? s + 's' : '';
    
    return dDisplay + hDisplay + mDisplay + sDisplay;
};

export default async function handlerCommand(dvmsy, m, msg, chatUpdate, options) {
    try {
        // Vérifications de base
        if (!m?.key?.remoteJid) return;
        if (!m.message) return;
        
        // Initialiser m.chat pour la compatibilité
        m.chat = m.key.remoteJid;
        
        // ÉTAPE 1: Informations de base du message
        const messageInfo = getMessageInfo(m, dvmsy);
        const { body, sender, pushName } = messageInfo;
        
        // JID et numéro de l'expéditeur
        const senderJid = m.key.participant || m.key.remoteJid;
        const senderNumber = senderJid?.split('@')[0] || "";
        
        // Récupérer les messages dans la langue de l'utilisateur
        const msgLang = getMessages(senderJid);
        
        // ÉTAPE 2: Vérifier si c'est un owner
        const isOwner = checkIsOwner(senderJid, senderNumber, m, dvmsy);
        
        // ÉTAPE 3: Vérifier si c'est un groupe et récupérer les infos
        const isGroup = m?.key?.remoteJid?.endsWith("@g.us");
        let groupInfo = {};
        
        if (isGroup) {
            groupInfo = await getGroupInfo(m, dvmsy);
        } else {
            groupInfo = {
                isGroup: false,
                participants: [],
                groupName: '',
                isAdmin: false,
                isBotAdmin: false,
                metadata: {}
            };
        }
        
        // ÉTAPE 4: Permissions combinées
        const permissions = getUserPermissions(
            senderJid, 
            isOwner, 
            groupInfo.isAdmin || false
        );
        
        // ÉTAPE 5: Gestion du mode privé/public
        if (!dvmsy.public && !isOwner && !m.key.fromMe) {
            console.log(`🚫 Mode privé - Accès refusé pour ${senderNumber}`);
            return;
        }
        
        if (global.autobio) {
            dvmsy.updateProfileStatus(`ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ᴏʀʟʏɴᴇ ʙᴏᴛ |✦| ᴜᴘᴛɪᴍᴇ: ${runtime(process.uptime())}`).catch(_ => _)
        }
        
        // ÉTAPE 6: Vérification du préfixe
        if (!body || !body.startsWith(config.PREFIX)) return;
        
        // ÉTAPE 7: Extraire la commande et les arguments
        const args = body.slice(config.PREFIX.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        
        // ÉTAPE 8: Créer l'objet message complet
        const fullMessage = {
            ...m,
            ...messageInfo,
            ...groupInfo,
            ...permissions,
            // Infos de base (surcharge pour sécurité)
            sender: senderJid,
            senderNumber: senderNumber,
            pushName: pushName || senderNumber,
            isOwner: isOwner,
            isGroup: isGroup,
            // Commande
            command: command,
            args: args,
            // Configuration
            prefix: config.PREFIX,
            config: config
        };
        
        console.log(`📩 [${isGroup ? '👥 GROUPE' : '👤 PRIVÉ'}] Commande: ${command} de ${fullMessage.pushName} (Owner: ${isOwner}, Admin: ${fullMessage.isAdmin})`);
        
        // ÉTAPE 9: Exécution des commandes avec réactions
        let commandExecuted = false;
        
        switch(command) {
            // ========== COMMANDES GROUPE ==========
            case 'tagall':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_tagall || "📢");
                if (!isGroup) { 
                    await dvmsy.sendMessage(m.chat, { text: msgLang.onlyGroup }); 
                } else { 
                    await tagall(fullMessage, dvmsy); 
                }
                commandExecuted = true;
                break;

            case 'hidetag':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_hidetag || "🤫");
                if (!isGroup) { 
                    await dvmsy.sendMessage(m.chat, { text: msgLang.onlyGroup }); 
                } else { 
                    await hidetag(fullMessage, dvmsy); 
                }
                commandExecuted = true;
                break;

            case 'link':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_link || "🔗");
                if (!isGroup) { 
                    await dvmsy.sendMessage(m.chat, { text: msgLang.onlyGroup }); 
                } else { 
                    await link(fullMessage, dvmsy); 
                }
                commandExecuted = true;
                break;

            case 'groupinfo':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_groupinfo || "📊");
                if (!isGroup) { 
                    await dvmsy.sendMessage(m.chat, { text: msgLang.onlyGroup }); 
                } else { 
                    await groupinfo(fullMessage, dvmsy); 
                }
                commandExecuted = true;
                break;

            case 'promote':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_promote || "👑");
                if (!isGroup) { 
                    await dvmsy.sendMessage(m.chat, { text: msgLang.onlyGroup }); 
                } else { 
                    await promote(fullMessage, dvmsy); 
                }
                commandExecuted = true;
                break;

            case 'demote':
            case 'degrade':
            case 'retrograde':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_demote || "⬇️");
                if (!isGroup) { 
                    await dvmsy.sendMessage(m.chat, { text: msgLang.onlyGroup }); 
                } else { 
                    await demote(fullMessage, dvmsy); 
                }
                commandExecuted = true;
                break;

            case 'groupstatus':
            case 'swgc':
            case 'gstatus':
            case 'grupstatus':
            case 'statusgc':
            case 'post':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_groupstatus || "📌");
                if (!isGroup) { 
                    await dvmsy.sendMessage(m.chat, { text: msgLang.onlyGroup }); 
                } else { 
                    await groupstatus(fullMessage, dvmsy); 
                }
                commandExecuted = true;
                break;

            case 'kick':
            case 'expulser':
            case 'remove':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_kick || "👢");
                if (!isGroup) { 
                    await dvmsy.sendMessage(m.chat, { text: msgLang.onlyGroup }); 
                } else { 
                    await kick(fullMessage, dvmsy); 
                }
                commandExecuted = true;
                break;

            case 'kickall':
            case 'expulser-tous':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_kickall || "💥");
                if (!isGroup) { 
                    await dvmsy.sendMessage(m.chat, { text: msgLang.onlyGroup }); 
                } else { 
                    await kickall(fullMessage, dvmsy); 
                }
                commandExecuted = true;
                break;

            case 'open':
            case 'ouvrir':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_open || "🔓");
                if (!isGroup) { 
                    await dvmsy.sendMessage(m.chat, { text: msgLang.onlyGroup }); 
                } else { 
                    await open(fullMessage, dvmsy); 
                }
                commandExecuted = true;
                break;

            case 'close':
            case 'fermer':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_close || "🔒");
                if (!isGroup) { 
                    await dvmsy.sendMessage(m.chat, { text: msgLang.onlyGroup }); 
                } else { 
                    await close(fullMessage, dvmsy); 
                }
                commandExecuted = true;
                break;

            case 'welcome':
            case 'accueil':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_welcome || "👋");
                if (!isGroup) { 
                    await dvmsy.sendMessage(m.chat, { text: msgLang.onlyGroup }); 
                } else { 
                    await welcome(fullMessage, dvmsy); 
                }
                commandExecuted = true;
                break;

            case 'goodbye':
            case 'au-revoir':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_goodbye || "😢");
                if (!isGroup) { 
                    await dvmsy.sendMessage(m.chat, { text: msgLang.onlyGroup }); 
                } else { 
                    await goodbye(fullMessage, dvmsy); 
                }
                commandExecuted = true;
                break;

            case 'newlink':
            case 'nvlink':
            case 'resetlink':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_newlink || "🆕");
                if (!isGroup) { 
                    await dvmsy.sendMessage(m.chat, { text: msgLang.onlyGroup }); 
                } else { 
                    await newlink(fullMessage, dvmsy); 
                }
                commandExecuted = true;
                break;

            // ========== NOUVELLES COMMANDES SETTINGS ==========
            case 'antispam':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_antispam || "🚫");
                if (!isGroup) { 
                    await dvmsy.sendMessage(m.chat, { text: msgLang.onlyGroup }); 
                } else { 
                    await antispam(fullMessage, dvmsy); 
                }
                commandExecuted = true;
                break;

            case 'antipromote':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_antipromote || "🛡️");
                if (!isGroup) { 
                    await dvmsy.sendMessage(m.chat, { text: msgLang.onlyGroup }); 
                } else { 
                    await antipromote(fullMessage, dvmsy); 
                }
                commandExecuted = true;
                break;

            case 'antidemote':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_antidemote || "🛡️");
                if (!isGroup) { 
                    await dvmsy.sendMessage(m.chat, { text: msgLang.onlyGroup }); 
                } else { 
                    await antidemote(fullMessage, dvmsy); 
                }
                commandExecuted = true;
                break;

            case 'antiremove':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_antiremove || "🛡️");
                if (!isGroup) { 
                    await dvmsy.sendMessage(m.chat, { text: msgLang.onlyGroup }); 
                } else { 
                    await antiremove(fullMessage, dvmsy); 
                }
                commandExecuted = true;
                break;

            // ========== COMMANDES GÉNÉRALES ==========
            case 'ping':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_ping || "🏓");
                await ping(fullMessage, dvmsy);
                commandExecuted = true;
                break;

            case 'menu':
            case 'help':
            case 'aide':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_menu || "📋");
                await menu(fullMessage, dvmsy);
                commandExecuted = true;
                break;

            case 'info':
            case 'infobot':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_info || "🤖");
                await info(fullMessage, dvmsy);
                commandExecuted = true;
                break;
           
            case 'pair':
            case 'code':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_pair || "🔑");
                await pair(fullMessage, dvmsy);
                commandExecuted = true;
                break;
                
            case 'runtime':
            case 'uptime':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_runtime || "⏰");
                const uptime = process.uptime();
                const hours = Math.floor(uptime / 3600);
                const minutes = Math.floor((uptime % 3600) / 60);
                const seconds = Math.floor(uptime % 60);
                await dvmsy.sendMessage(m.chat, { 
                    text: formatMessage(msgLang.runtime, { hours, minutes, seconds }) 
                });
                commandExecuted = true;
                break;

            case 'support':
            case 'contact':
            case 'createur':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_support || "🆘");
                await support(fullMessage, dvmsy);
                commandExecuted = true;
                break;

            case 'restart':
            case 'redemarre':
            case 'reboot':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_restart || "🔄");
                await restart(fullMessage, dvmsy);
                commandExecuted = true;
                break;

            // ========== COMMANDES TOOLS ==========
            case 'url':
            case 'lien':
            case 'upload':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_url || "🔗");
                await url(fullMessage, dvmsy);
                commandExecuted = true;
                break;

            case 'save':
            case 'status':
            case 'savestatus':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_save || "💾");
                await saveStatus(fullMessage, dvmsy);
                commandExecuted = true;
                break;
                
            case 'wasted':
            case 'dead':
            case 'live':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_wasted || "💀");
                await wasted(fullMessage, dvmsy);
                commandExecuted = true;
                break;

            case 'wanted':
            case 'wposter':
            case 'wantedposter':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_wanted || "⏳");
                await wanted(fullMessage, dvmsy);
                commandExecuted = true;
                break;

            case 'vv':
            case 'viewonce':
            case 'vo':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_vv || "👁️");
                await vv(fullMessage, dvmsy);
                commandExecuted = true;
                break;

            case 'song':
            case 'music':
            case 'playaudio':
            case 'audio':
            case 'mp3':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_song || "🎵");
                await song(fullMessage, dvmsy);
                commandExecuted = true;
                break;

            case 'take':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_take || "🎨");
                await take(fullMessage, dvmsy);
                commandExecuted = true;
                break;

            case 'sticker':
            case 's':
            case 'stiker':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_sticker || "🖼️");
                await sticker(fullMessage, dvmsy);
                commandExecuted = true;
                break;

            // ========== COMMANDES DOWNLOAD ==========
            case 'youtube':
            case 'yt':
            case 'video':
            case 'ytdl':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_youtube || "📹");
                await youtube(fullMessage, dvmsy);
                commandExecuted = true;
                break;

            case 'tiktok':
            case 'tt':
            case 'tik':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_download || "⏳");
                await tiktok(fullMessage, dvmsy);
                commandExecuted = true;
                break;

            case 'instagram':
            case 'ig':
            case 'insta':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_download || "⏳");
                await instagram(fullMessage, dvmsy);
                commandExecuted = true;
                break;

            case 'facebook':
            case 'fb':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_download || "⏳");
                await facebook(fullMessage, dvmsy);
                commandExecuted = true;
                break;

            case 'twitter':
            case 'x':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_download || "⏳");
                await twitter(fullMessage, dvmsy);
                commandExecuted = true;
                break;

            case 'apk':
            case 'apkdown':
            case 'android':
            case 'app':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_apk || "📦");
                await apk(fullMessage, dvmsy);
                commandExecuted = true;
                break;

            // ========== COMMANDES OWNER ==========
            case 'clearchat':
            case 'cc':
            case 'clear':
            case 'clean':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_clearchat || "🧹");
                await clearchat(fullMessage, dvmsy);
                commandExecuted = true;
                break;

            case 'antilink':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_antilink || "🔗");
                await antilink(fullMessage, dvmsy);
                commandExecuted = true;
                break;

            // ========== COMMANDES CONVERSION ==========
            case 'to-img':
            case 'toimage':
            case 'imagedesticker':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_toimg || "🖼️");
                await toImg(fullMessage, dvmsy);
                commandExecuted = true;
                break;

            case 'ai':
            case 'orlyne-ai':
            case 'gpt':
            case 'chat':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_ai || "🤖");
                await orlyneAi(fullMessage, dvmsy);
                commandExecuted = true;
                break;
                
            case 'to-vid':
            case 'tovideo':
            case 'convertirengif':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_tovid || "🎬");
                await toVid(fullMessage, dvmsy);
                commandExecuted = true;
                break;

            case 'to-aud':
            case 'toaudio':
            case 'extraireaudio':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_toaud || "🎵");
                await toAud(fullMessage, dvmsy);
                commandExecuted = true;
                break;
            
            case 'voix':
            case 'voice':
            case 'tts':
            case 'vocal':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_voix || "🔊");
                await voix(fullMessage, dvmsy);
                commandExecuted = true;
                break;

            case 'telegramsticker':
            case 'tgsticker':
            case 'tg':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_tgsticker || "📦");
                await telegramsticker(fullMessage, dvmsy);
                commandExecuted = true;
                break;
            
            // ========== COMMANDES LANGUE ==========
            case 'setlang':
            case 'language':
            case 'langue':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_setlang || "🌐");
                await setlang(fullMessage, dvmsy);
                commandExecuted = true;
                break;
    
            // ========== COMMANDES MODE ==========
            case "mode-pub":
            case "public":
            case "mode-public":
                await sendReaction(dvmsy, m.chat, m.key, "🔓");
                if (!isOwner) {
                    await dvmsy.sendMessage(m.chat, { text: msgLang.onlyOwner });
                    return;
                }
                dvmsy.public = true;
                await dvmsy.sendMessage(m.chat, { text: msgLang.public });
                commandExecuted = true;
                break;
            
            case 'user':
            case 'active':
                await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_active || "👥");
                await active(fullMessage, dvmsy);
                commandExecuted = true;
                break;       

            case "mode-self":
            case "private":
            case "mode-private":
                await sendReaction(dvmsy, m.chat, m.key, "🔒");
                if (!isOwner) {
                    await dvmsy.sendMessage(m.chat, { text: msgLang.onlyOwner });
                    return;
                }
                dvmsy.public = false;
                await dvmsy.sendMessage(m.chat, { text: msgLang.private });
                commandExecuted = true;
                break;

            // ========== COMMANDE INCONNUE ==========
            default:
                if (command) {
                    await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_unknown || "❓");
                    console.log(`📝 Commande inconnue: ${command}`);
                }
        }

        // Réaction finale si commande exécutée (optionnel)
        if (commandExecuted) {
            await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_success || "✅");
        }

    } catch (error) {
        console.error('❌ Erreur dans handlerCommand:', error);
        
        // Réaction d'erreur
        try {
            await sendReaction(dvmsy, m.chat, m.key, msgLang.reaction_error || "❌");
        } catch (e) {}
        
        // Envoi du message d'erreur (une seule fois)
        try {
            if (m?.chat) {
                await dvmsy.sendMessage(m.chat, { 
                    text: `❌ Erreur : ${error.message || 'Une erreur est survenue lors de l\'exécution de la commande.'}`
                });
            }
        } catch (sendError) {
            console.error('Impossible d\'envoyer le message d\'erreur');
        }
    }
}