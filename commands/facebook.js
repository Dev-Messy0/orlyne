// commands/facebook.js
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { getMessages, formatMessage } from '../Utils/langManager.js';

export default async function facebook(m, dvmsy) {
    const msg = getMessages(m.sender);
    const url = m.args[0];
    
    if (!url) {
        return await dvmsy.sendMessage(m.chat, {
            text: msg.facebook_usage
        }, { quoted: m });
    }

    const urlRegex = /(https?:\/\/(?:www\.)?(?:facebook\.com|fb\.watch)\/[^\s]+)/i;
    if (!urlRegex.test(url)) {
        return await dvmsy.sendMessage(m.chat, {
            text: msg.facebook_invalid
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
    const filePath = path.join(cacheDir, `facebook_${Date.now()}.mp4`);

    try {
        const apiUrl = `https://aryan-autodl.vercel.app/alldl?url=${encodeURIComponent(url)}`;
        
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
        
        if (stats.size > 100 * 1024 * 1024) { // 100MB max pour Facebook
            throw new Error('Video too large');
        }

        await dvmsy.sendMessage(m.chat, {
            video: fs.readFileSync(filePath),
            caption: formatMessage(msg.facebook_success, { 
                title: resData.title || 'Facebook Video',
                platform: 'Facebook'
            }),
            mimetype: 'video/mp4'
        }, { quoted: m });

        await dvmsy.sendMessage(m.chat, { 
            react: { text: msg.reaction_success || '✅', key: m.key } 
        });

    } catch (error) {
        console.error('[Facebook] Error:', error);
        await dvmsy.sendMessage(m.chat, {
            text: msg.download_error,
            edit: waitMsg.key
        });
        await dvmsy.sendMessage(m.chat, { 
            react: { text: msg.reaction_error || '❌', key: m.key } 
        });
    } finally {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
}