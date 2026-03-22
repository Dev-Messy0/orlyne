// commands/to-vid.js
import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import fs from 'fs';
import { exec } from 'child_process';
import util from 'util';
import { getMessages } from '../Utils/langManager.js';

const execPromise = util.promisify(exec);

export default async function toVid(m, dvmsy) {
    const msg = getMessages(m.sender);
    
    try {
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quoted) {
            return await dvmsy.sendMessage(m.chat, {
                text: msg.tovid_reply
            }, { quoted: m });
        }
        
        const isGif = quoted.videoMessage?.gifPlayback;
        const isImage = quoted.imageMessage;
        
        if (!isGif && !isImage) {
            return await dvmsy.sendMessage(m.chat, {
                text: msg.tovid_reply
            }, { quoted: m });
        }
        
        const mediaType = isGif ? "video" : "image";
        const stream = await downloadContentFromMessage(
            isGif ? quoted.videoMessage : quoted.imageMessage, 
            mediaType
        );
        
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        
        const tempInput = isGif ? './temp_input.gif' : './temp_input.jpg';
        const tempOutput = './temp_output.mp4';
        
        fs.writeFileSync(tempInput, buffer);
        
        try {
            if (isGif) {
                await execPromise(`ffmpeg -i ${tempInput} -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" ${tempOutput}`);
            } else {
                await execPromise(`ffmpeg -loop 1 -i ${tempInput} -c:v libx264 -t 5 -pix_fmt yuv420p ${tempOutput}`);
            }
            
            const videoBuffer = fs.readFileSync(tempOutput);
            
            await dvmsy.sendMessage(m.chat, {
                video: videoBuffer,
                caption: isGif ? msg.tovid_gif_success : msg.tovid_image_success
            }, { quoted: m });
            
        } catch (error) {
            console.error('Erreur de conversion:', error);
            await dvmsy.sendMessage(m.chat, {
                text: msg.tovid_ffmpeg_error
            }, { quoted: m });
        } finally {
            if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
            if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
        }
        
    } catch (err) {
        console.error('[to-vid] erreur:', err);
        await dvmsy.sendMessage(m.chat, {
            text: msg.tovid_error
        }, { quoted: m });
    }
}