// Utils/langManager.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import languages from '../lang.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USER_LANGS_FILE = path.join(__dirname, '../data/user_langs.json');

// Charger les préférences de langue
function loadUserLanguages() {
    try {
        if (fs.existsSync(USER_LANGS_FILE)) {
            return JSON.parse(fs.readFileSync(USER_LANGS_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('❌ Erreur chargement langues:', error);
    }
    return {};
}

// Sauvegarder les préférences
function saveUserLanguages(userLangs) {
    try {
        const dir = path.dirname(USER_LANGS_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(USER_LANGS_FILE, JSON.stringify(userLangs, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Erreur sauvegarde langues:', error);
        return false;
    }
}

// Obtenir la langue d'un utilisateur
export function getUserLanguage(userJid) {
    const userLangs = loadUserLanguages();
    return userLangs[userJid] || 'fr';
}

// Définir la langue d'un utilisateur
export function setUserLanguage(userJid, lang) {
    if (!languages[lang]) return false;
    const userLangs = loadUserLanguages();
    userLangs[userJid] = lang;
    return saveUserLanguages(userLangs);
}

// Obtenir les messages d'un utilisateur
export function getMessages(userJid) {
    const lang = getUserLanguage(userJid);
    return languages[lang] || languages.fr;
}

// 🎯 SOLUTION MAGIQUE - Comprend vos fonctions (error) => et (time) =>
export function formatMessage(message, variables = {}) {
    if (!message) return '';
    
    // CAS 1: Si c'est une fonction (comme (error) => ou (time) =>)
    if (typeof message === 'function') {
        try {
            // Compter le nombre de paramètres que la fonction attend
            const paramCount = message.length;
            
            // Si la fonction attend 1 paramètre (cas le plus courant)
            if (paramCount === 1) {
                // Récupérer la première clé de l'objet variables
                const keys = Object.keys(variables);
                if (keys.length > 0) {
                    // Passer la valeur directement, pas l'objet !
                    // Ex: pour (time) =>, on passe 123 au lieu de { time: 123 }
                    return message(variables[keys[0]]);
                }
            }
            
            // Si la fonction attend plusieurs paramètres
            if (paramCount > 1) {
                const values = [];
                const keys = Object.keys(variables);
                for (let i = 0; i < Math.min(paramCount, keys.length); i++) {
                    values.push(variables[keys[i]]);
                }
                return message(...values);
            }
            
            // Fallback: on passe l'objet entier
            return message(variables);
            
        } catch (e) {
            console.error('❌ Erreur appel fonction:', e);
            return String(message);
        }
    }
    
    // CAS 2: Si c'est une chaîne avec ${variables}
    if (typeof message === 'string') {
        return replaceVariables(message, variables);
    }
    
    // CAS 3: Autre type
    return String(message);
}

// Fonction pour remplacer les ${variable} dans une chaîne
function replaceVariables(text, variables) {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
        result = result.replace(regex, value);
    }
    return result;
}

// 📦 Version simplifiée
export function t(userJid, key, ...args) {
    const messages = getMessages(userJid);
    const message = messages[key];
    
    if (!message) return `[Message manquant: ${key}]`;
    
    // Si c'est une fonction
    if (typeof message === 'function') {
        return message(...args);
    }
    
    // Si c'est une chaîne avec des variables
    if (typeof message === 'string') {
        // Si le premier argument est un objet, on l'utilise pour remplacer
        if (args.length === 1 && typeof args[0] === 'object') {
            return replaceVariables(message, args[0]);
        }
        return message;
    }
    
    return String(message);
}

// Liste des langues disponibles
export function getAvailableLanguages() {
    return Object.entries(languages)
        .map(([code, lang]) => `• ${code} - ${lang.name} ${lang.flag}`)
        .join('\n');
}

// Drapeau d'une langue
export function getLanguageFlag(lang) {
    return languages[lang]?.flag || '🇫🇷';
}

// Nom d'une langue
export function getLanguageName(lang) {
    return languages[lang]?.name || 'Français';
}

// Initialisation
export function initLanguage() {
    console.log(`🌐 Langues disponibles: ${Object.keys(languages).join(', ')}`);
}