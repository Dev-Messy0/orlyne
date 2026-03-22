// config.js
export default {
    PREFIXES: ['.', '!', '/', '$', '#', '?'], // Plusieurs préfixes
    DEFAULT_PREFIX: '.', // Préfixe par défaut
    BOT_NAME: "ORLYNE",
    OWNER_NUMBER: "24177474264",
    OWNERS: ["24177474264@s.whatsapp.net"],
    
    // Fonction utilitaire pour extraire préfixe et commande
    getPrefixAndCommand(text) {
        if (!text || typeof text !== 'string') return null;
        
        for (const prefix of this.PREFIXES) {
            if (text.startsWith(prefix)) {
                const args = text.slice(prefix.length).trim().split(/ +/);
                const command = args.shift().toLowerCase();
                return { prefix, command, args };
            }
        }
        return null;
    },
    
    // Vérifie si le texte commence par un préfixe valide
    hasValidPrefix(text) {
        if (!text) return false;
        return this.PREFIXES.some(prefix => text.startsWith(prefix));
    },
    
    // Pour les mentions sans préfixe (optionnel)
    getCommandFromText(text) {
        const result = this.getPrefixAndCommand(text);
        if (result) return result;
        
        // Traiter comme commande sans préfixe (si vous voulez)
        if (text && text.trim().length > 0 && !text.startsWith(' ')) {
            const args = text.trim().split(/ +/);
            const command = args.shift().toLowerCase();
            return { prefix: this.DEFAULT_PREFIX, command, args };
        }
        
        return null;
    }
};