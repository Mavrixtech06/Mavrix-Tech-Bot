const settings = require("../settings");

async function aliveCommand(sock, chatId, message) {
    try {
        await sock.sendPresenceUpdate('composing', chatId);
        
        await sock.sendMessage(chatId, {
            react: { text: '💚', key: message.key }
        });

        const message1 = `╭━━━━━━━━━━━━╮
┃  💚 *BOT STATUS*  ┃
╰━━━━━━━━━━━━╯

📊 *System Info*
├ 🤖 *Bot:* Knight Bot
├ 📌 *Version:* ${settings.version}
├ ⚡ *Status:* ● Online
├ 🔓 *Mode:* Public
└ 🕒 *Uptime:* Active

🌟 *Features*
├ 👥 Group Management
├ 🛡️ Antilink Protection
├ 🎮 Fun Commands
├ 📥 Media Downloader
└ ✨ And much more!

━━━━━━━━━━━━━━━
💡 Type *.menu* to see all commands
━━━━━━━━━━━━━━━`;

        await sock.sendMessage(chatId, {
            text: message1,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363161513685998@newsletter',
                    newsletterName: 'KnightBot MD',
                    serverMessageId: -1
                }
            }
        }, { quoted: message });

        await sock.sendMessage(chatId, {
            react: { text: '🎉', key: message.key }
        });

    } catch (error) {
        console.error('Error in alive command:', error);
        await sock.sendMessage(chatId, { 
            react: { text: '❌', key: message.key }
        });
        await sock.sendMessage(chatId, { 
            text: '🤖 Bot is alive and running!' 
        }, { quoted: message });
    }
}

module.exports = aliveCommand;
