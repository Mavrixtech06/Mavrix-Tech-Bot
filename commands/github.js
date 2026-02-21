const moment = require('moment-timezone');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

async function githubCommand(sock, chatId, message) {
  try {
    await sock.sendPresenceUpdate('composing', chatId);
    
    await sock.sendMessage(chatId, {
        react: { text: '⏳', key: message.key }
    });

    const res = await fetch('https://api.github.com/repos/mruniquehacker/Knightbot-md');
    if (!res.ok) throw new Error('Error fetching repository data');
    const json = await res.json();

    let txt = `╭━━━━━━━━━━━━╮
┃  🐙 *GITHUB*  ┃
╰━━━━━━━━━━━━╯

📦 *Repository:* ${json.name}
├ ⭐ *Stars:* ${json.stargazers_count}
├ 🍴 *Forks:* ${json.forks_count}
├ 👀 *Watchers:* ${json.watchers_count}
├ 📊 *Size:* ${(json.size / 1024).toFixed(2)} MB
└ 📅 *Updated:* ${moment(json.updated_at).format('DD/MM/YY - HH:mm:ss')}

🔗 *URL:* ${json.html_url}

━━━━━━━━━━━━━━━
💫 *KnightBot MD*
⚡ *Powerful WhatsApp Bot*
━━━━━━━━━━━━━━━`;

    const imgPath = path.join(__dirname, '../assets/bot_image.jpg');
    const imgBuffer = fs.readFileSync(imgPath);

    await sock.sendMessage(chatId, { 
        image: imgBuffer, 
        caption: txt 
    }, { quoted: message });

    await sock.sendMessage(chatId, {
        react: { text: '🎉', key: message.key }
    });

  } catch (error) {
    await sock.sendMessage(chatId, { 
        react: { text: '❌', key: message.key }
    });
    await sock.sendMessage(chatId, { 
        text: '❌ *Error*\n\nFailed to fetch repository information.' 
    }, { quoted: message });
  }
}

module.exports = githubCommand;
