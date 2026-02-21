const yts = require('yt-search');
const axios = require('axios');

async function playCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();
        
        if (!searchQuery) {
            return await sock.sendMessage(chatId, { 
                text: "🎵 *What song shall I find for you?*\n\n_Example: .play shape of you_"
            });
        }

        // Send typing indicator
        await sock.sendPresenceUpdate('composing', chatId);
        
        // Search for the song
        const { videos } = await yts(searchQuery);
        if (!videos || videos.length === 0) {
            return await sock.sendMessage(chatId, { 
                text: "😕 *No songs found*\n_Try a different search term!_"
            });
        }

        // Send loading message
        await sock.sendMessage(chatId, {
            text: "```🎵 Hunting for your music...```\n✨ _Just a moment, fetching the best quality!_"
        });

        // Get the first video result
        const video = videos[0];
        const urlYt = video.url;

        // Fetch audio data from API
        const response = await axios.get(`https://apis-keith.vercel.app/download/dlmp3?url=${urlYt}`);
        const data = response.data;

        if (!data || !data.status || !data.result || !data.result.downloadUrl) {
            return await sock.sendMessage(chatId, { 
                text: "😅 *Download failed*\n_The music service is busy. Try again later!_"
            });
        }

        const audioUrl = data.result.downloadUrl;
        const title = data.result.title;

        // Send found message
        await sock.sendMessage(chatId, { 
            text: `
╭─「 ✨ *MUSIC FOUND* 」─╮
│
│  📀 *Title:* ${title.slice(0, 30)}${title.length > 30 ? '...' : ''}
│  ⏱️ *Duration:* ${video.timestamp}
│  👁️ *Views:* ${video.views.toLocaleString()}
│
╰──────────────────────╯
⬇️ _Sending your music..._`.trim()
        });

        // Send the audio
        await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
            mimetype: "audio/mpeg",
            fileName: `${title}.mp3`
        }, { quoted: message });

        // Send success reaction
        await sock.sendMessage(chatId, { react: { text: "🎧", key: message.key } });

    } catch (error) {
        console.error('Error in song2 command:', error);
        await sock.sendMessage(chatId, { 
            text: "😵 *Download failed*\n_Something went wrong. Please try again!_"
        });
    }
}

module.exports = playCommand;
