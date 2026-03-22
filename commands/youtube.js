// commands/youtube.js
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import yts from 'yt-search';
import { getMessages, formatMessage } from '../Utils/langManager.js';

export default async function youtube(m, dvmsy) {
    const msg = getMessages(m.sender);
    const query = m.args.join(' ').trim();
    
    if (!query) {
        return await dvmsy.sendMessage(m.chat, {
            text: msg.yt_no_query
        }, { quoted: m });
    }

    await dvmsy.sendMessage(m.chat, { 
        react: { text: msg.reaction_download || '⏳', key: m.key } 
    });

    const waitMsg = await dvmsy.sendMessage(m.chat, { 
        text: msg.wait
    }, { quoted: m });

    const cacheDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    const filePath = path.join(cacheDir, `youtube_${Date.now()}.mp4`);

    try {
        let videoUrl = query;
        let videoTitle = '';

        if (!query.startsWith('http')) {
            const search = await yts(query);
            if (!search.videos.length) throw new Error('No videos found');
            videoUrl = search.videos[0].url;
            videoTitle = search.videos[0].title;
            
            await dvmsy.sendMessage(m.chat, {
                text: formatMessage(msg.yt_found, { title: videoTitle }),
                edit: waitMsg.key
            });
        }

        const urlRegex = /(?:https?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch\?v=|v\/|embed\/|shorts\/))/i;
        if (!urlRegex.test(videoUrl)) {
            throw new Error('Invalid YouTube URL');
        }

        const apiUrl = `https://aryan-autodl.vercel.app/alldl?url=${encodeURIComponent(videoUrl)}`;
        
        const response = await axios.get(apiUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "application/json"
            },
            timeout: 15000
        });

        const resData = response.data;
        if (!resData.status || !resData.downloadUrl) {
            throw new Error('No download URL');
        }

        const videoRes = await axios({
            method: 'get',
            url: resData.downloadUrl,
            responseType: 'arraybuffer',
            timeout: 120000
        });

        fs.writeFileSync(filePath, Buffer.from(videoRes.data));
        const stats = fs.statSync(filePath);
        
        if (stats.size > 62 * 1024 * 1024) { // 62MB max
            throw new Error('Video too large');
        }

        await dvmsy.sendMessage(m.chat, {
            video: fs.readFileSync(filePath),
            caption: formatMessage(msg.yt_success, { 
                title: resData.title || videoTitle || 'YouTube Video',
                quality: 'HD'
            }),
            mimetype: 'video/mp4'
        }, { quoted: m });

        await dvmsy.sendMessage(m.chat, { 
            react: { text: msg.reaction_success || '✅', key: m.key } 
        });

    } catch (error) {
        console.error('[YouTube] Error:', error);
        await dvmsy.sendMessage(m.chat, {
            text: formatMessage(msg.yt_fail, { error: error.message }),
            edit: waitMsg.key
        });
        await dvmsy.sendMessage(m.chat, { 
            react: { text: msg.reaction_error || '❌', key: m.key } 
        });
    } finally {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
}