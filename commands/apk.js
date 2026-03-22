// commands/apk.js
import fetch from 'node-fetch';
import { getMessages, formatMessage } from '../Utils/langManager.js';

export default async function apk(m, dvmsy) {
    const msg = getMessages(m.sender);
    
    try {
        const appName = m.args.join(' ').trim();
        
        if (!appName) {
            await dvmsy.sendMessage(m.chat, { 
                text: msg.apk_usage
            });
            return;
        }

        // Réaction ⏳
        await dvmsy.sendMessage(m.chat, { react: { text: msg.reaction_wait || '⏳', key: m.key } });

        // Message d'attente
        const waitMsg = await dvmsy.sendMessage(m.chat, { 
            text: formatMessage(msg.apk_search, { app: appName })
        });

        const apiUrl = `https://api.nexoracle.com/downloader/apk?q=${encodeURIComponent(appName)}&apikey=free_key@maher_apis`;
        console.log('Recherche APK depuis:', apiUrl);
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Échec de la requête API: ${response.status}`);
        }

        const data = await response.json();
        console.log('Réponse API:', JSON.stringify(data, null, 2));

        if (!data || data.status !== 200 || !data.result || typeof data.result !== 'object') {
            await dvmsy.sendMessage(m.chat, { 
                text: msg.apk_not_found
            });
            return;
        }

        const { name, lastup, package: pkg, size, icon, dllink } = data.result;
        
        if (!name || !dllink) {
            console.error('Données résultat invalides:', data.result);
            await dvmsy.sendMessage(m.chat, { 
                text: msg.apk_invalid_data
            });
            return;
        }

        // Envoyer les infos de l'app avec l'icône
        await dvmsy.sendMessage(m.chat, {
            image: { url: icon || 'https://i.ibb.co/ynmqJG8j/vision-v.jpg' },
            caption: formatMessage(msg.apk_info, { name, lastup, pkg, size })
        });

        console.log('Téléchargement APK depuis:', dllink);
        
        // Mise à jour du message
        await dvmsy.sendMessage(m.chat, { 
            text: formatMessage(msg.apk_downloading, { name }),
            edit: waitMsg.key 
        });
        
        const apkResponse = await fetch(dllink, { 
            headers: { 'Accept': 'application/octet-stream' } 
        });
        
        const contentType = apkResponse.headers.get('content-type');
        if (!apkResponse.ok || (contentType && !contentType.includes('application/vnd.android.package-archive'))) {
            throw new Error(`Échec du téléchargement APK: Statut ${apkResponse.status}, Content-Type: ${contentType || 'inconnu'}`);
        }

        const apkBuffer = await apkResponse.arrayBuffer();
        if (!apkBuffer || apkBuffer.byteLength === 0) {
            throw new Error('L\'APK téléchargé est vide ou invalide');
        }
        
        const buffer = Buffer.from(apkBuffer);

        // Validation basique de l'APK (signature ZIP)
        if (!buffer.slice(0, 2).toString('hex').startsWith('504b')) {
            throw new Error('Le fichier téléchargé n\'est pas un APK valide');
        }

        // Envoyer le fichier APK
        await dvmsy.sendMessage(m.chat, {
            document: buffer,
            mimetype: 'application/vnd.android.package-archive',
            fileName: `${name.replace(/[^a-zA-Z0-9]/g, '_')}.apk`,
            caption: formatMessage(msg.apk_ready, { name, size })
        });

        // Réaction ✅
        await dvmsy.sendMessage(m.chat, { react: { text: msg.reaction_success || '✅', key: m.key } });
        
        // Message de confirmation
        await dvmsy.sendMessage(m.chat, { 
            text: formatMessage(msg.apk_sent, { name })
        });
        
    } catch (error) {
        console.error('Erreur commande apk:', error.message, error.stack);
        await dvmsy.sendMessage(m.chat, { 
            text: formatMessage(msg.apk_error, { error: error.message })
        });
        await dvmsy.sendMessage(m.chat, { react: { text: msg.reaction_error || '❌', key: m.key } });
    }
}