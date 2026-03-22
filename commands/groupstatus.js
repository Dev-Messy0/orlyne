// commands/groupstatus.js
import { generateWAMessageContent, generateWAMessageFromContent } from '@whiskeysockets/baileys';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import crypto from 'crypto';
import { getMessages, formatMessage } from '../Utils/langManager.js';

export default async function groupstatus(m, dvmsy) {
    const msg = getMessages(m.sender);
    
    try {
        // Fonction pour publier un status de groupe
        async function groupStatus(client, jid, content) {
            const inside = await generateWAMessageContent(content, {
                upload: client.waUploadToServer
            });
            
            const messageSecret = crypto.randomBytes(32);
            
            const message = generateWAMessageFromContent(
                jid,
                {
                    messageContextInfo: { messageSecret },
                    groupStatusMessageV2: {
                        message: { ...inside, messageContextInfo: { messageSecret } }
                    }
                },
                {}
            );
            
            await client.relayMessage(jid, message.message, { messageId: message.key.id });
        }

        // Récupérer le message cité et le texte
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const textInput = m.args.join(' ').trim();
        const jid = m.chat;

        // Vérifier si c'est un groupe
        if (!m.isGroup) {
            return dvmsy.sendMessage(m.chat, { 
                text: msg.onlyGroup
            });
        }

        // Vérifier les permissions (admin ou owner)
        if (!m.isAdmin && !m.isOwner) {
            return dvmsy.sendMessage(m.chat, { 
                text: msg.onlyAdmin
            });
        }

        if (!quoted && !textInput) {
            await dvmsy.sendMessage(m.chat, { 
                text: formatMessage(msg.groupstatus_usage, { prefix: m.prefix })
            });
            return;
        }

        // Message d'attente
        const waitMsg = await dvmsy.sendMessage(m.chat, { 
            text: msg.wait
        });

        // Fonction pour télécharger le média
        async function downloadMedia(mediaMessage) {
            let stream;
            if (mediaMessage.imageMessage) {
                stream = await downloadContentFromMessage(mediaMessage.imageMessage, 'image');
            } else if (mediaMessage.videoMessage) {
                stream = await downloadContentFromMessage(mediaMessage.videoMessage, 'video');
            } else if (mediaMessage.audioMessage) {
                stream = await downloadContentFromMessage(mediaMessage.audioMessage, 'audio');
            } else if (mediaMessage.stickerMessage) {
                stream = await downloadContentFromMessage(mediaMessage.stickerMessage, 'sticker');
            } else if (mediaMessage.documentMessage) {
                stream = await downloadContentFromMessage(mediaMessage.documentMessage, 'document');
            } else {
                throw new Error("Type de média non supporté");
            }
            
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            return Buffer.concat(chunks);
        }

        // Construire le payload
        let payload = {};
        
        if (quoted) {
            const mediaBuffer = await downloadMedia(quoted);
            
            if (quoted.imageMessage) {
                payload = { image: mediaBuffer, caption: textInput || "" };
            } else if (quoted.videoMessage) {
                payload = { video: mediaBuffer, caption: textInput || "" };
            } else if (quoted.audioMessage) {
                payload = {
                    audio: mediaBuffer,
                    mimetype: quoted.audioMessage.mimetype || 'audio/mp4',
                    ptt: quoted.audioMessage.ptt || false
                };
            } else if (quoted.stickerMessage) {
                payload = { sticker: mediaBuffer };
            } else if (quoted.documentMessage) {
                payload = {
                    document: mediaBuffer,
                    fileName: quoted.documentMessage.fileName || "Document",
                    mimetype: quoted.documentMessage.mimetype || 'application/octet-stream'
                };
            }
        } else if (textInput) {
            payload = { text: textInput };
        }

        // Publier le status de groupe
        await groupStatus(dvmsy, jid, payload);
        
        // Confirmation
        await dvmsy.sendMessage(m.chat, { 
            text: msg.groupstatus_success,
            edit: waitMsg.key 
        });

    } catch (error) {
        console.error('[GROUPSTATUS ERROR]:', error);
        await dvmsy.sendMessage(m.chat, { 
            text: formatMessage(msg.groupstatus_error, { error: error.message })
        });
    }
}