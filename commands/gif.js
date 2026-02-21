const axios = require('axios');
const settings = require('../settings');

async function gifCommand(sock, chatId, query, message) {
    try {
        await sock.sendPresenceUpdate('composing', chatId);
        
        const apiKey = settings.giphyApiKey;

        if (!query) {
            await sock.sendMessage(chatId, { 
                react: { text: '❓', key: message.key }
            });
            await sock.sendMessage(chatId, { 
                text: '🎥 *GIF Search*\n\n📌 *Usage:* `.gif <search term>`\n\n✨ *Example:* `.gif dancing cat`' 
            });
            return;
        }

        await sock.sendMessage(chatId, {
            react: { text: '⏳', key: message.key }
        });

        const response = await axios.get(`https://api.giphy.com/v1/gifs/search`, {
            params: {
                api_key: apiKey,
                q: query,
                limit: 1,
                rating: 'g'
            }
        });

        const gifUrl = response.data.data[0]?.images?.downsized_medium?.url;

        if (gifUrl) {
            const caption = `╭━━━━━━━━━━━━╮
┃  🎥 *GIF FOUND*  ┃
╰━━━━━━━━━━━━╯

🔍 *Search:* ${query}
📊 *Source:* GIPHY

━━━━━━━━━━━━━━━
💫 Powered by *Knight-Bot*
━━━━━━━━━━━━━━━`;
            
            await sock.sendMessage(chatId, { 
                video: { url: gifUrl }, 
                caption: caption,
                gifPlayback: true
            });
            
            await sock.sendMessage(chatId, {
                react: { text: '✅', key: message.key }
            });
        } else {
            await sock.sendMessage(chatId, { 
                react: { text: '❌', key: message.key }
            });
            await sock.sendMessage(chatId, { 
                text: '❌ *Not Found*\n\nNo GIFs found for your search term.' 
            });
        }
    } catch (error) {
        console.error('Error fetching GIF:', error);
        await sock.sendMessage(chatId, { 
            react: { text: '❌', key: message.key }
        });
        await sock.sendMessage(chatId, { 
            text: '❌ *Error*\n\nFailed to fetch GIF. Please try again later.' 
        });
    }
}

module.exports = gifCommand;
