// Utils/externalReply.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imagePath = path.join(__dirname, '..', 'image', 'image1.png');
let imageBuffer = null;
try {
    if (fs.existsSync(imagePath)) {
        imageBuffer = fs.readFileSync(imagePath);
    }
} catch (e) {}

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
            message: `𝑂𝑅𝐿𝑌𝑁𝐸 𝑀𝐷 𝐵𝑌 𝑆𝑌𝑁𝑇𝐴𝑋𝐸`,
token: "AR6xBKbXZn0Xwmu76Ksyd7rnxI+Rx87HfinVlW4lwXa6JA=="
				}
    }
			},
			contextInfo: {
				mentionedJid: [m.sender],
				forwardingScore: 999,
				isForwarded: true
			}        
 }
};

const ReplyRafa = (teks, dvmsy, chatId) => {
    return dvmsy.sendMessage(chatId, {
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
    }, { quoted: messyFake });
};

export { messyFake, ReplyRafa };