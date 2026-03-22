// commands/song.js
import yts from 'yt-search';
import axios from 'axios';
import { getMessages, formatMessage } from '../Utils/langManager.js';

export default async function song(m, dvmsy) {
    const msg = getMessages(m.sender);
    
    try {
        const searchQuery = m.args.join(' ').trim();
        
        if (!searchQuery) {
            await dvmsy.sendMessage(m.chat, { 
                text: msg.song_usage
            });
            return;
        }

        // Réaction 🔎 pendant la recherche
        await dvmsy.sendMessage(m.chat, { react: { text: msg.reaction_search || "🔎", key: m.key } });

        // Recherche YouTube
        const { videos } = await yts(searchQuery);
        
        if (!videos || videos.length === 0) {
            await dvmsy.sendMessage(m.chat, { 
                text: msg.song_not_found
            });
            await dvmsy.sendMessage(m.chat, { react: { text: "⚠️", key: m.key } });
            return;
        }

        // Utiliser la première vidéo
        const video = videos[0];
        const videoUrl = video.url;

        // Envoyer les infos avant téléchargement
        await dvmsy.sendMessage(m.chat, {
            image: { url: video.thumbnail },
            caption: formatMessage(msg.song_info, {
                title: video.title,
                duration: video.timestamp,
                views: video.views
            })
        });

        // Réaction ⏳ pendant le téléchargement
        await dvmsy.sendMessage(m.chat, { react: { text: msg.reaction_wait || "⏳", key: m.key } });

        // Appeler l'API
        const apiUrl = `https://yt-dl.officialhectormanuel.workers.dev/?url=${encodeURIComponent(videoUrl)}`;
        const response = await axios.get(apiUrl);
        const data = response.data;

        if (!data?.status) {
            await dvmsy.sendMessage(m.chat, {
                text: msg.song_api_error
            });
            await dvmsy.sendMessage(m.chat, { react: { text: msg.reaction_error || "❌", key: m.key } });
            return;
        }

        const audioUrl = data.audio;
        const title = data.title || video.title;

        if (!audioUrl) {
            await dvmsy.sendMessage(m.chat, {
                text: msg.song_no_audio
            });
            await dvmsy.sendMessage(m.chat, { react: { text: msg.reaction_error || "❌", key: m.key } });
            return;
        }

        // Envoyer le fichier audio
        await dvmsy.sendMessage(m.chat, {
            audio: { url: audioUrl },
            mimetype: "audio/mpeg",
            fileName: `${title.replace(/[^a-zA-Z0-9-_\.]/g, '_')}.mp3`,
            caption: formatMessage(msg.song_success, { title })
        });

        // Réaction ✅ en cas de succès
        await dvmsy.sendMessage(m.chat, { react: { text: msg.reaction_success || "✅", key: m.key } });

    } catch (error) {
        console.error('Erreur commande song:', error);
        
        let errorMessage = msg.song_error;
        
        if (error.code === 'ENOTFOUND') {
            errorMessage = msg.network_error;
        } else if (error.response?.status === 404) {
            errorMessage = msg.song_not_found;
        } else if (error.response?.status === 429) {
            errorMessage = msg.rate_limit;
        }
        
        await dvmsy.sendMessage(m.chat, {
            text: errorMessage
        });

        // Réaction ❌ en cas d'erreur
        await dvmsy.sendMessage(m.chat, { react: { text: msg.reaction_error || "❌", key: m.key } });
    }
}