async function resetlinkCommand(sock, chatId, senderId, message) {
    try {
        await sock.sendPresenceUpdate('composing', chatId);
        
        await sock.sendMessage(chatId, {
            react: { text: '⏳', key: message.key }
        });
        
        // Check if sender is admin
        const groupMetadata = await sock.groupMetadata(chatId);
        const isAdmin = groupMetadata.participants
            .filter(p => p.admin)
            .map(p => p.id)
            .includes(senderId);

        // Check if bot is admin
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata.participants
            .filter(p => p.admin)
            .map(p => p.id)
            .includes(botId);

        if (!isAdmin) {
            await sock.sendMessage(chatId, { 
                react: { text: '❌', key: message.key }
            });
            await sock.sendMessage(chatId, { 
                text: '👑 *Admin Only*\n\nOnly admins can use this command!' 
            });
            return;
        }

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { 
                react: { text: '❌', key: message.key }
            });
            await sock.sendMessage(chatId, { 
                text: '🤖 *Bot Not Admin*\n\nBot must be admin to reset group link!' 
            });
            return;
        }

        // Reset the group link
        const newCode = await sock.groupRevokeInvite(chatId);
        
        const successMessage = `╭━━━━━━━━━━━━╮
┃  🔗 *LINK RESET*  ┃
╰━━━━━━━━━━━━╯

✅ *Group link has been successfully reset!*

📌 *New Link:*
https://chat.whatsapp.com/${newCode}

━━━━━━━━━━━━━━━
💫 The old link no longer works
━━━━━━━━━━━━━━━`;
        
        // Send the new link
        await sock.sendMessage(chatId, { 
            text: successMessage
        });

        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('Error in resetlink command:', error);
        await sock.sendMessage(chatId, { 
            react: { text: '❌', key: message.key }
        });
        await sock.sendMessage(chatId, { 
            text: '❌ *Error*\n\nFailed to reset group link!' 
        });
    }
}

module.exports = resetlinkCommand;
