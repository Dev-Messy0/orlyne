// commands/to-aud.js
import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import fs from 'fs';
import { exec } from 'child_process';
import util from 'util';
import { getMessages } from '../Utils/langManager.js';

const execPromise = util.promisify(exec);

export default async function toAud(m, dvmsy) {
    const msg = getMessages(m.sender);
    
    try {
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quoted || !quoted.videoMessage) {
            return await dvmsy.sendMessage(m.chat, {
                text: msg.toaud_reply
            }, { quoted: m });
        }
        
        const stream = await downloadContentFromMessage(quoted.videoMessage, "video");
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        
        const tempVideo = './temp_video.mp4';
        const tempAudio = './temp_audio.mp3';
        
        fs.writeFileSync(tempVideo, buffer);
        
        try {
            await execPromise(`ffmpeg -i ${tempVideo} -vn -ar 44100 -ac 2 -ab 192k -f mp3 ${tempAudio}`);
            
            if (!fs.existsSync(tempAudio) || fs.statSync(tempAudio).size === 0) {
                throw new Error("L'extraction audio a échoué");
            }
            
            const audioBuffer = fs.readFileSync(tempAudio);
            
            await dvmsy.sendMessage(m.chat, {
                audio: audioBuffer,
                mimetype: 'audio/mp4',
                ptt: false,
                caption: msg.toaud_success
            }, { quoted: m });
            
        } catch (error) {
            console.error('Erreur d\'extraction audio:', error);
            await dvmsy.sendMessage(m.chat, {
                text: msg.toaud_ffmpeg_error
            }, { quoted: m });
        } finally {
            if (fs.existsSync(tempVideo)) fs.unlinkSync(tempVideo);
            if (fs.existsSync(tempAudio)) fs.unlinkSync(tempAudio);
        }
        
    } catch (err) {
        console.error('[to-aud] erreur:', err);
        await dvmsy.sendMessage(m.chat, {
            text: msg.toaud_error
        }, { quoted: m });
    }
}