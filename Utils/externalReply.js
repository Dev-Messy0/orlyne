// Utils/externalReply.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger l'image pour le fake message
const imagePath = path.join(__dirname, '..', 'image', 'image1.png');
let imageBuffer = null;
try {
    if (fs.existsSync(imagePath)) {
        imageBuffer = fs.readFileSync(imagePath);
    }
} catch (e) {
    console.log('Image non trouvée pour fake message');
}

const messyFake = {
    key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast"
    },
    message: {
        orderMessage: {
            orderId: "2029",
            thumbnail: imageBuffer,
            itemCount: `9999999`,
            status: "INQUIRY",
            surface: "CATALOG",
            message: `𝑂𝑅𝐿𝑌𝑁𝐸 𝑀𝐷 𝐵𝑌 𝑆𝑌𝑁𝑇𝐴𝑋𝐸`
        }
    }
};

const ReplyRafa = (teks, dvmsy, chatId, options = {}) => {
    const messageOptions = {
        text: teks,
        contextInfo: {
            externalAdReply: {
                showAdAttribution: true,
                title: `ORLYNE MD`,
                body: `syntaxe corps`,
                mediaType: 3,
                renderLargerThumbnail: false,
                thumbnailUrl: "https://raw.githubusercontent.com/NdikzDatabase/Database/main/Database/1771227167948-ajtucq.jpg",
                sourceUrl: `https://www.youtube.com/@yanzmodsofficial`
            }
        }
    };
    
    // Pour l'édition, on ne peut pas mettre contextInfo
    // On fait deux fonctions différentes
    if (options.edit) {
        return dvmsy.sendMessage(chatId, { text: teks, edit: options.edit });
    }
    
    return dvmsy.sendMessage(chatId, messageOptions, { quoted: messyFake });
};

export { messyFake, ReplyRafa };