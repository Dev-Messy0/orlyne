// commands/to-img.js
import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { getMessages } from '../Utils/langManager.js';

const execPromise = util.promisify(exec);

export default async function toImg(m, dvmsy) {
    const msg = getMessages(m.sender);
    
    try {
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quoted || !quoted.stickerMessage) {
            return await dvmsy.sendMessage(m.chat, {
                text: msg.toimg_reply
            }, { quoted: m });
        }
        
        const stream = await downloadContentFromMessage(quoted.stickerMessage, "image");
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        
        if (quoted.stickerMessage.isAnimated) {
            const tempWebp = path.resolve('./temp_sticker.webp');
            const tempGif = path.resolve('./temp_output.gif');
            
            fs.writeFileSync(tempWebp, buffer);
            
            try {
                await execPromise(`ffmpeg -i ${tempWebp} ${tempGif}`);
                
                await dvmsy.sendMessage(m.chat, {
                    video: fs.readFileSync(tempGif),
                    caption: msg.toimg_gif_success,
                    gifPlayback: true
                }, { quoted: m });
                
                fs.unlinkSync(tempWebp);
                fs.unlinkSync(tempGif);
                
            } catch (error) {
                await dvmsy.sendMessage(m.chat, {
                    image: buffer,
                    caption: msg.toimg_success
                }, { quoted: m });
                if (fs.existsSync(tempWebp)) fs.unlinkSync(tempWebp);
                if (fs.existsSync(tempGif)) fs.unlinkSync(tempGif);
            }
        } else {
            await dvmsy.sendMessage(m.chat, {
                image: buffer,
                caption: msg.toimg_success
            }, { quoted: m });
        }
        
    } catch (err) {
        console.error('[to-img] erreur:', err);
        await dvmsy.sendMessage(m.chat, {
            text: msg.toimg_error
        }, { quoted: m });
    }
}