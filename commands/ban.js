const fs = require('fs');
const isAdmin = require('../lib/isAdmin');
const { isSudo } = require('../lib/index');

const channelInfo = {
    contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363161513685998@newsletter',
            newsletterName: 'KnightBot MD',
            serverMessageId: -1
        }
    }
};

async function banCommand(sock, chatId, message) {
    try {
        await sock.sendPresenceUpdate('composing', chatId);
        
        // Restrict in groups to admins; in private to owner/sudo
        const isGroup = chatId.endsWith('@g.us');
        const senderId = message.key.participant || message.key.remoteJid;
        
        if (isGroup) {
            const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);
            if (!isBotAdmin) {
                await sock.sendMessage(chatId, { 
                    react: { text: '❌', key: message.key }
                });
                await sock.sendMessage(chatId, { 
                    text: '🤖 *Bot Not Admin*\n\nPlease make the bot an admin to use .ban', 
                    ...channelInfo 
                }, { quoted: message });
                return;
            }
            if (!isSenderAdmin && !message.key.fromMe) {
                await sock.sendMessage(chatId, { 
                    react: { text: '❌', key: message.key }
                });
                await sock.sendMessage(chatId, { 
                    text: '👑 *Admin Only*\n\nOnly group admins can use .ban', 
                    ...channelInfo 
                }, { quoted: message });
                return;
            }
        } else {
            const senderIsSudo = await isSudo(senderId);
            if (!message.key.fromMe && !senderIsSudo) {
                await sock.sendMessage(chatId, { 
                    react: { text: '❌', key: message.key }
                });
                await sock.sendMessage(chatId, { 
                    text: '👑 *Owner Only*\n\nOnly owner/sudo can use .ban in private chat', 
                    ...channelInfo 
                }, { quoted: message });
                return;
            }
        }
        
        let userToBan;
        
        // Check for mentioned users
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            userToBan = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        // Check for replied message
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToBan = message.message.extendedTextMessage.contextInfo.participant;
        }
        
        if (!userToBan) {
            await sock.sendMessage(chatId, { 
                react: { text: '❌', key: message.key }
            });
            await sock.sendMessage(chatId, { 
                text: '👤 *No User Selected*\n\nPlease mention the user or reply to their message to ban!', 
                ...channelInfo 
            });
            return;
        }

        // Prevent banning the bot itself
        try {
            const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            if (userToBan === botId || userToBan === botId.replace('@s.whatsapp.net', '@lid')) {
                await sock.sendMessage(chatId, { 
                    react: { text: '🤖', key: message.key }
                });
                await sock.sendMessage(chatId, { 
                    text: '🤖 *Nice Try!*\n\nYou cannot ban the bot account.', 
                    ...channelInfo 
                }, { quoted: message });
                return;
            }
        } catch {}

        await sock.sendMessage(chatId, {
            react: { text: '⏳', key: message.key }
        });

        // Add user to banned list
        const bannedUsers = JSON.parse(fs.readFileSync('./data/banned.json'));
        if (!bannedUsers.includes(userToBan)) {
            bannedUsers.push(userToBan);
            fs.writeFileSync('./data/banned.json', JSON.stringify(bannedUsers, null, 2));
            
            const banMessage = `╭━━━━━━━━━━━━╮
┃  🔨 *USER BANNED*  ┃
╰━━━━━━━━━━━━╯

👤 *Banned User:* @${userToBan.split('@')[0]}
👑 *Banned By:* @${senderId.split('@')[0]}

━━━━━━━━━━━━━━━
✅ *User has been banned successfully!*
━━━━━━━━━━━━━━━`;
            
            await sock.sendMessage(chatId, { 
                text: banMessage,
                mentions: [userToBan, senderId],
                ...channelInfo 
            });
            
            await sock.sendMessage(chatId, {
                react: { text: '✅', key: message.key }
            });
        } else {
            await sock.sendMessage(chatId, { 
                text: `⚠️ *Already Banned*\n\n@${userToBan.split('@')[0]} is already in the ban list!`,
                mentions: [userToBan],
                ...channelInfo 
            });
        }
    } catch (error) {
        console.error('Error in ban command:', error);
        await sock.sendMessage(chatId, { 
            react: { text: '❌', key: message.key }
        });
        await sock.sendMessage(chatId, { 
            text: '❌ *Failed*\n\nCould not ban user!', 
            ...channelInfo 
        });
    }
}

module.exports = banCommand;
