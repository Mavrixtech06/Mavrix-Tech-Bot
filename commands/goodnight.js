const fetch = require('node-fetch');

async function goodnightCommand(sock, chatId, message) {
    try {
        await sock.sendPresenceUpdate('composing', chatId);
        
        await sock.sendMessage(chatId, {
            react: { text: '⏳', key: message.key }
        });

        const shizokeys = 'shizo';
        const res = await fetch(`https://shizoapi.onrender.com/api/texts/lovenight?apikey=${shizokeys}`);
        
        if (!res.ok) {
            throw await res.text();
        }
        
        const json = await res.json();
        const goodnightMessage = json.result;

        const finalMessage = `🌙 *GOOD NIGHT*\n\n${goodnightMessage}\n\n━━━━━━━━━━━━━━━\n💫 Sweet dreams! ✨`;

        await sock.sendMessage(chatId, { 
            text: finalMessage 
        }, { quoted: message });

        await sock.sendMessage(chatId, {
            react: { text: '🌙', key: message.key }
        });

    } catch (error) {
        console.error('Error in goodnight command:', error);
        await sock.sendMessage(chatId, { 
            react: { text: '❌', key: message.key }
        });
        await sock.sendMessage(chatId, { 
            text: '❌ *Error*\n\nFailed to get goodnight message. Please try again later!' 
        }, { quoted: message });
    }
}

module.exports = { goodnightCommand };
