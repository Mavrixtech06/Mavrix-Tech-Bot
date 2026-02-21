const fetch = require('node-fetch');

async function dareCommand(sock, chatId, message) {
    try {
        await sock.sendPresenceUpdate('composing', chatId);
        
        await sock.sendMessage(chatId, {
            react: { text: '⏳', key: message.key }
        });

        const shizokeys = 'shizo';
        const res = await fetch(`https://shizoapi.onrender.com/api/texts/dare?apikey=${shizokeys}`);
        
        if (!res.ok) {
            throw await res.text();
        }
        
        const json = await res.json();
        const dareMessage = json.result;

        const finalMessage = `🎲 *DARE CHALLENGE*\n\n${dareMessage}\n\n━━━━━━━━━━━━━━━\n💫 Accept the challenge! 🔥`;

        await sock.sendMessage(chatId, { 
            text: finalMessage 
        }, { quoted: message });

        await sock.sendMessage(chatId, {
            react: { text: '🎲', key: message.key }
        });

    } catch (error) {
        console.error('Error in dare command:', error);
        await sock.sendMessage(chatId, { 
            react: { text: '❌', key: message.key }
        });
        await sock.sendMessage(chatId, { 
            text: '❌ *Error*\n\nFailed to get dare. Please try again later!' 
        }, { quoted: message });
    }
}

module.exports = { dareCommand };
