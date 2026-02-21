const isAdmin = require('../lib/isAdmin');

async function tagAllCommand(sock, chatId, senderId, message) {
    try {
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);
        
        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { 
                text: "🤖 *I need to be admin first!*\n_Please make me an admin to use .tagall_", 
                quoted: message 
            });
            return;
        }

        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { 
                text: "👑 *Only admins can use .tagall*", 
                quoted: message 
            });
            return;
        }

        await sock.sendPresenceUpdate('composing', chatId);
        
        // Get group metadata
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants;
        const groupName = groupMetadata.subject;

        if (!participants || participants.length === 0) {
            await sock.sendMessage(chatId, { text: '😕 *No members found in this group*' });
            return;
        }

        // Get custom message if any
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const customMessage = text.split(' ').slice(1).join(' ').trim();
        
        const announceMessage = customMessage ? 
            `📢 *${customMessage}*` : 
            `👋 *Hello everyone!*`;

        // Create message with each member on a new line
        let messageText = `
╭─「 📢 *GROUP BROADCAST* 」─╮
│
│  ${announceMessage}
│
│  👥 *Members (${participants.length}):*
│
${participants.map(p => `│     • @${p.id.split('@')[0]}`).join('\n')}
│
╰──────────────────────╯

✨ _Have a wonderful day!_`.trim();

        // Send message with mentions
        await sock.sendMessage(chatId, {
            text: messageText,
            mentions: participants.map(p => p.id)
        });

        // Send success reaction
        await sock.sendMessage(chatId, { react: { text: "📢", key: message.key } });

    } catch (error) {
        console.error('Error in tagall command:', error);
        await sock.sendMessage(chatId, { 
            text: '😵 *Failed to tag members*\n_Try again later!_', 
            quoted: message 
        });
    }
}

module.exports = tagAllCommand;
