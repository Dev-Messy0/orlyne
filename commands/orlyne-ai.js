// commands/orlyne-ai.js
import axios from 'axios';
import { getMessages, formatMessage } from '../Utils/langManager.js';

export default async function orlyneAi(m, dvmsy) {
    const { args, sender } = m;
    const msg = getMessages(sender);
    const text = args.join(' ');
    
    if (!text) {
        return await dvmsy.sendMessage(m.chat, { 
            text: msg.ai_no_query,
        }, { quoted: m });
    }

    try {
        await dvmsy.sendMessage(m.chat, { 
            react: { text: msg.reaction_ai || '🤖', key: m.key } 
        });

        async function openai(prompt) {
            let response = await axios.post("https://chateverywhere.app/api/chat/", {
                "model": {
                    "id": "gpt-4",
                    "name": "GPT-4",
                    "maxLength": 32000,
                    "tokenLimit": 8000,
                    "completionTokenLimit": 5000,
                    "deploymentName": "gpt-4"
                },
                "messages": [
                    {
                        "pluginId": null,
                        "content": prompt,
                        "role": "user"
                    }
                ],
                "prompt": `Tu es Orlyne Bot v1.0.0 créé par Dev-Messy. Tu es serviable, amical et compétent. Réponds aux questions de manière concise mais complète en ${global.botLang === 'fr' ? 'français' : 'anglais'}.`,
                "temperature": 0.5
            }, {
                headers: {
                    "Accept": "*/*",
                    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
                }
            });
            
            return response.data;
        }

        let result = await openai(text);
        
        await dvmsy.sendMessage(m.chat, { 
            text: formatMessage(msg.ai_response, { response: result }),
        }, { quoted: m });

        await dvmsy.sendMessage(m.chat, { 
            react: { text: msg.reaction_success || '✅', key: m.key } 
        });

    } catch (error) {
        console.error('❌ Erreur dans Orlyne AI command:', error);
        await dvmsy.sendMessage(m.chat, { 
            text: msg.ai_error,
        }, { quoted: m });
    }
}