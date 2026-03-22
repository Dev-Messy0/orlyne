// commands/voix.js
import { getMessages, formatMessage } from '../Utils/langManager.js';

// Fonction pour générer l'URL Google TTS
function getAudioUrl(text, options = {}) {
  const { lang = 'fr', slow = false, host = 'https://translate.google.com' } = options;
  
  const query = new URLSearchParams({
    ie: 'UTF-8',
    q: text,
    tl: lang,
    client: 'tw-ob',
    ttsspeed: slow ? 0.24 : 1,
  });

  return `${host}/translate_tts?${query}`;
}

export default async function voix(m, dvmsy) {
    try {
        const msg = getMessages(m.sender);
        const text = m.args.join(' ');
        
        if (!text) {
            return dvmsy.sendMessage(
                m.chat,
                { text: msg.voix_usage },
                { quoted: m }
            );
        }

        // Limiter la longueur du texte (Google TTS a une limite)
        if (text.length > 200) {
            return dvmsy.sendMessage(
                m.chat,
                { text: msg.voix_too_long },
                { quoted: m }
            );
        }

        // Générer l'URL audio
        const url = getAudioUrl(text, { lang: 'fr' });
        
        // Envoyer le message vocal
        await dvmsy.sendMessage(
            m.chat,
            {
                audio: { url },
                mimetype: 'audio/mpeg',
                ptt: true // Push-to-talk (message vocal WhatsApp)
            },
            { quoted: m }
        );

    } catch (err) {
        console.error('❌ Voice command error:', err);
        const msg = getMessages(m.sender);
        await dvmsy.sendMessage(
            m.chat,
            { text: msg.voix_error },
            { quoted: m }
        );
    }
}
