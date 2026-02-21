const isAdmin = require('../lib/isAdmin');

async function kickCommand(sock, chatId, senderId, mentionedJids, message) {
    await sock.sendPresenceUpdate('composing', chatId);
    
    const isOwner = message.key.fromMe;
    if (!isOwner) {
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
                text: '👑 *Admin Only*\n\nOnly group admins can use the kick command.' 
            }, { quoted: message });
            return;
        }
    }

    let usersToKick = [];
    
    if (mentionedJids && mentionedJids.length > 0) {
        usersToKick = mentionedJids;
    }
    else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
        usersToKick = [message.message.extendedTextMessage.contextInfo.participant];
    }
    
    if (usersToKick.length === 0) {
        await sock.sendMessage(chatId, { 
            react: { text: '❌', key: message.key }
        });
        await sock.sendMessage(chatId, { 
            text: '👤 *No User Selected*\n\nPlease mention the user or reply to their message to kick!'
        }, { quoted: message });
        return;
    }

    const botId = sock.user?.id || '';
    const botLid = sock.user?.lid || '';
    const botPhoneNumber = botId.includes(':') ? botId.split(':')[0] : (botId.includes('@') ? botId.split('@')[0] : botId);
    const botIdFormatted = botPhoneNumber + '@s.whatsapp.net';
    const botLidNumeric = botLid.includes(':') ? botLid.split(':')[0] : (botLid.includes('@') ? botLid.split('@')[0] : botLid);
    const botLidWithoutSuffix = botLid.includes('@') ? botLid.split('@')[0] : botLid;

    const metadata = await sock.groupMetadata(chatId);
    const participants = metadata.participants || [];

    const isTryingToKickBot = usersToKick.some(userId => {
        const userPhoneNumber = userId.includes(':') ? userId.split(':')[0] : (userId.includes('@') ? userId.split('@')[0] : userId);
        const userLidNumeric = userId.includes('@lid') ? userId.split('@')[0].split(':')[0] : '';
        
        const directMatch = (
            userId === botId ||
            userId === botLid ||
            userId === botIdFormatted ||
            userPhoneNumber === botPhoneNumber ||
            (userLidNumeric && botLidNumeric && userLidNumeric === botLidNumeric)
        );
        
        if (directMatch) {
            return true;
        }
        
        const participantMatch = participants.some(p => {
            const pPhoneNumber = p.phoneNumber ? p.phoneNumber.split('@')[0] : '';
            const pId = p.id ? p.id.split('@')[0] : '';
            const pLid = p.lid ? p.lid.split('@')[0] : '';
            const pFullId = p.id || '';
            const pFullLid = p.lid || '';
            const pLidNumeric = pLid.includes(':') ? pLid.split(':')[0] : pLid;
            
            const isThisParticipantBot = (
                pFullId === botId ||
                pFullLid === botLid ||
                pLidNumeric === botLidNumeric ||
                pPhoneNumber === botPhoneNumber ||
                pId === botPhoneNumber ||
                p.phoneNumber === botIdFormatted ||
                (botLid && pLid && botLidWithoutSuffix === pLid)
            );
            
            if (isThisParticipantBot) {
                return (
                    userId === pFullId ||
                    userId === pFullLid ||
                    userPhoneNumber === pPhoneNumber ||
                    userPhoneNumber === pId ||
                    userId === p.phoneNumber ||
                    (pLid && userLidNumeric && userLidNumeric === pLidNumeric) ||
                    (userLidNumeric && pLidNumeric && userLidNumeric === pLidNumeric)
                );
            }
            return false;
        });
        
        return participantMatch;
    });

    if (isTryingToKickBot) {
        await sock.sendMessage(chatId, { 
            react: { text: '🤖', key: message.key }
        });
        await sock.sendMessage(chatId, { 
            text: "🤖 *Nice Try!*\n\nI can't kick myself!"
        }, { quoted: message });
        return;
    }

    try {
        await sock.sendMessage(chatId, {
            react: { text: '⏳', key: message.key }
        });
        
        await sock.groupParticipantsUpdate(chatId, usersToKick, "remove");
        
        const usernames = await Promise.all(usersToKick.map(async jid => {
            return `@${jid.split('@')[0]}`;
        }));
        
        const kickMessage = `╭━━━━━━━━━━━━╮
┃  🚫 *KICKED*  ┃
╰━━━━━━━━━━━━╯

👤 *User${usersToKick.length > 1 ? 's' : ''} Removed:*
${usernames.map(name => `├ ${name}`).join('\n')}
└─────────────

👑 *Kicked By:* @${senderId.split('@')[0]}

━━━━━━━━━━━━━━━
✅ *Removed successfully!*
━━━━━━━━━━━━━━━`;
        
        await sock.sendMessage(chatId, { 
            text: kickMessage,
            mentions: usersToKick
        });

        await sock.sendMessage(chatId, {
            react: { text: '🎉', key: message.key }
        });

    } catch (error) {
        console.error('Error in kick command:', error);
        await sock.sendMessage(chatId, { 
            react: { text: '❌', key: message.key }
        });
        await sock.sendMessage(chatId, { 
            text: '❌ *Failed*\n\nCould not kick user(s)!'
        });
    }
}

module.exports = kickCommand;
