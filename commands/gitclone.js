// commands/gitclone.js
import fetch from 'node-fetch';
import { getMessages, formatMessage } from '../Utils/langManager.js';

export default async function gitclone(m, dvmsy) {
    const msg = getMessages(m.sender);
    
    const url = m.args[0];
    if (!url || !url.includes('github.com')) {
        return dvmsy.sendMessage(m.chat, { text: msg.gitclone_invalid || '❌ Lien GitHub valide ?' });
    }
    
    const sent = await dvmsy.sendMessage(m.chat, { text: msg.wait });
    
    try {
        // Extraire le nom du repo
        const parts = url.split('/');
        const repoName = parts[parts.length - 1].replace('.git', '');
        const zipUrl = url.endsWith('.git') ? url.replace('.git', '/archive/refs/heads/main.zip') : url + '/archive/refs/heads/main.zip';
        
        // Télécharger le zip
        const response = await fetch(zipUrl);
        const buffer = await response.buffer();
        
        // Envoyer le zip
        await dvmsy.sendMessage(m.chat, {
            document: buffer,
            fileName: `${repoName}.zip`,
            mimetype: 'application/zip',
            caption: formatMessage(msg.gitclone_success, { repo: repoName, url })
        });
        
        await dvmsy.sendMessage(m.chat, { 
            text: msg.success,
            edit: sent.key 
        });
    } catch (e) {
        await dvmsy.sendMessage(m.chat, { 
            text: msg.gitclone_error || '❌ Erreur ou dépôt introuvable',
            edit: sent.key 
        });
    }
}