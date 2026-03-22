// commands/telegramsticker.js
/**
 * @command telegramsticker
 * @desc Télécharge un pack de stickers Telegram
 * @usage .telegramsticker <nom_du_pack> ou <url>
 * @access public
 */

import axios from 'axios';
import { Sticker, StickerTypes } from "wa-sticker-formatter";
import { getMessages, formatMessage } from '../Utils/langManager.js';

const BOT_TOKEN = "8777153082:AAHMLTwwq8AWKZiXVpiADT3oDO8O1EDB3pM";

export default async function telegramsticker(m, dvmsy) {
 const msg = getMessages(m.sender);
 const text = m.args.join(' ');
 
 if (!text) {
   return await dvmsy.sendMessage(m.chat, { 
     text: msg.tgsticker_usage
   }, { quoted: m });
 }

 // Réaction
 await dvmsy.sendMessage(m.chat, { 
   react: { text: msg.reaction_tgsticker || "📦", key: m.key } 
 });

 try {
   // Extrait le nom du pack
   let packName = text.trim();
   if (text.includes('t.me/')) {
     packName = text.split('/').pop().replace('addstickers/', '');
   }

   await dvmsy.sendMessage(m.chat, { 
     text: formatMessage(msg.tgsticker_fetching, { pack: packName })
   }, { quoted: m });

   // Récupère le pack via l'API Telegram
   const apiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getStickerSet?name=${encodeURIComponent(packName)}`;
   const { data } = await axios.get(apiUrl, { timeout: 10000 });

   if (!data.ok || !data.result) {
     throw new Error('Pack introuvable');
   }

   const stickers = data.result.stickers;
   const packTitle = data.result.title;
   const totalStickers = stickers.length;
   const maxStickers = 5; // Limite à 5 stickers pour éviter le spam
   
   await dvmsy.sendMessage(m.chat, { 
     text: formatMessage(msg.tgsticker_info, { 
       title: packTitle, 
       total: totalStickers, 
       max: maxStickers 
     })
   }, { quoted: m });

   // Télécharge et envoie les stickers un par un
   let sentCount = 0;
   
   for (let i = 0; i < Math.min(maxStickers, totalStickers); i++) {
     try {
       const sticker = stickers[i];
       
       // Récupère le fichier
       const fileRes = await axios.get(
         `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${sticker.file_id}`,
         { timeout: 10000 }
       );
       
       const filePath = fileRes.data.result?.file_path;
       if (!filePath) continue;

       const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
       const stickerData = await axios.get(downloadUrl, { 
         responseType: 'arraybuffer',
         timeout: 30000 
       });

       // Convertit en sticker WhatsApp
       const stickerBuffer = await new Sticker(Buffer.from(stickerData.data), {
         pack: packTitle,
         author: 'Orlyne Bot',
         type: StickerTypes.CROP,
         quality: 80
       }).toBuffer();

       // Envoie le sticker
       await dvmsy.sendMessage(m.chat, { 
         sticker: stickerBuffer 
       }, { quoted: m });
       
       sentCount++;
       
       // Anti-flood
       await new Promise(r => setTimeout(r, 1500));

     } catch (stickerErr) {
       console.log('[TELEGRAMSTICKER] Erreur sur un sticker:', stickerErr.message);
       continue;
     }
   }

   if (sentCount === 0) {
     throw new Error('Aucun sticker téléchargé');
   }

   await dvmsy.sendMessage(m.chat, { 
     text: formatMessage(msg.tgsticker_success, { 
       sent: sentCount, 
       total: totalStickers 
     })
   }, { quoted: m });

 } catch (error) {
   console.error('[TELEGRAMSTICKER] Error:', error.message);
   const errorMsg = error.message.includes('introuvable') ? msg.tgsticker_not_found : error.message;
   await dvmsy.sendMessage(m.chat, { 
     text: formatMessage(msg.error, { error: errorMsg })
   }, { quoted: m });
 }
}