const isAdmin = require('../lib/isAdmin');

async function muteCommand(sock, chatId, senderId, message, durationInMinutes) {
    await sock.sendPresenceUpdate('composing', chatId);

    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);
    
    if (!isBotAdmin) {
        await sock.sendMessage(chatId, { 
            react: { text: '❌', key: message.key }
        });
        await sock.sendMessage(chatId, { 
            text: '🤖 *Bot Not Admin*\n\nPlease make the bot an admin first.' 
        }, { quoted: message });
        return;
    }

    if (!isSenderAdmin) {
        await sock.sendMessage(chatId, { 
            react: { text: '❌', key: message.key }
        });
        await sock.sendMessage(chatId, { 
            text: '👑 *Admin Only*\n\nOnly group admins can use the mute command.' 
        }, { quoted: message });
        return;
    }

    try {
        await sock.sendMessage(chatId, {
            react: { text: '⏳', key: message.key }
        });
        
        await sock.groupSettingUpdate(chatId, 'announcement');
        
        if (durationInMinutes !== undefined && durationInMinutes > 0) {
            const durationInMilliseconds = durationInMinutes * 60 * 1000;
            
            const muteMessage = `╭━━━━━━━━━━━━╮
┃  🔇 *GROUP MUTED*  ┃
╰━━━━━━━━━━━━╯

⏱️ *Duration:* ${durationInMinutes} minute${durationInMinutes > 1 ? 's' : ''}
👑 *Action by:* @${senderId.split('@')[0]}

━━━━━━━━━━━━━━━
💬 Only admins can send messages
━━━━━━━━━━━━━━━`;
            
            await sock.sendMessage(chatId, { 
                text: muteMessage,
                mentions: [senderId]
            }, { quoted: message });
            
            setTimeout(async () => {
                try {
                    await sock.groupSettingUpdate(chatId, 'not_announcement');
                    
                    const unmuteMessage = `╭━━━━━━━━━━━━╮
┃  🔈 *GROUP UNMUTED*  ┃
╰━━━━━━━━━━━━╯

⏱️ *Mute period ended*

━━━━━━━━━━━━━━━
💬 Everyone can send messages again
━━━━━━━━━━━━━━━`;
                    
                    await sock.sendMessage(chatId, { 
                        text: unmuteMessage 
                    });

                    await sock.sendMessage(chatId, {
                        react: { text: '🔈', key: { remoteJid: chatId } }
                    });
                    
                } catch (unmuteError) {
                    console.error('Error unmuting group:', unmuteError);
                }
            }, durationInMilliseconds);
        } else {
            const muteMessage = `╭━━━━━━━━━━━━╮
┃  🔇 *GROUP MUTED*  ┃
╰━━━━━━━━━━━━╯

👑 *Action by:* @${senderId.split('@')[0]}

━━━━━━━━━━━━━━━
💬 Only admins can send messages
💡 Use *.unmute* to enable chatting
━━━━━━━━━━━━━━━`;
            
            await sock.sendMessage(chatId, { 
                text: muteMessage,
                mentions: [senderId]
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, {
            react: { text: '🔇', key: message.key }
        });

    } catch (error) {
        console.error('Error muting/unmuting the group:', error);
        await sock.sendMessage(chatId, { 
            react: { text: '❌', key: message.key }
        });
        await sock.sendMessage(chatId, { 
            text: '❌ *Error*\n\nAn error occurred while muting the group. Please try again.' 
        }, { quoted: message });
    }
}

module.exports = muteCommand;
