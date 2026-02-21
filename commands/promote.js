const { isAdmin } = require('../lib/isAdmin');

// Function to handle manual promotions via command
async function promoteCommand(sock, chatId, mentionedJids, message) {
    let userToPromote = [];
    
    // Check for mentioned users
    if (mentionedJids && mentionedJids.length > 0) {
        userToPromote = mentionedJids;
    }
    // Check for replied message
    else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
        userToPromote = [message.message.extendedTextMessage.contextInfo.participant];
    }
    
    // If no user found through either method
    if (userToPromote.length === 0) {
        await sock.sendMessage(chatId, { 
            text: "👑 *Who should I promote?*\n\n_Please mention the user or reply to their message!_"
        });
        return;
    }

    try {
        await sock.sendPresenceUpdate('composing', chatId);
        await sock.groupParticipantsUpdate(chatId, userToPromote, "promote");
        
        // Get usernames for each promoted user
        const usernames = await Promise.all(userToPromote.map(async jid => {
            return `@${jid.split('@')[0]}`;
        }));

        // Get promoter's name (the bot user in this case)
        const promoterJid = sock.user.id;
        
        const promotionMessage = `
╭─「 👑 *PROMOTION ALERT* 」─╮
│
│  🎉 *Congratulations!*
│  ✨ _You've been promoted!_
│
│  👤 *New Admin${userToPromote.length > 1 ? 's' : ''}:*
${usernames.map(name => `│     • ${name}`).join('\n')}
│
│  🤝 *Promoted by:* @${promoterJid.split('@')[0]}
│  📅 *Date:* ${new Date().toLocaleDateString()}
│  🕐 *Time:* ${new Date().toLocaleTimeString()}
│
╰──────────────────────╯

🌟 _Use your powers wisely!_`.trim();
        
        await sock.sendMessage(chatId, { 
            text: promotionMessage,
            mentions: [...userToPromote, promoterJid]
        });
        
        // Send celebration reaction
        await sock.sendMessage(chatId, { react: { text: "🎉", key: message.key } });
        
    } catch (error) {
        console.error('Error in promote command:', error);
        await sock.sendMessage(chatId, { text: '😕 *Failed to promote*\n_Check if I have admin rights!_', quoted: message });
    }
}

// Function to handle automatic promotion detection
async function handlePromotionEvent(sock, groupId, participants, author) {
    try {
        // Safety check for participants
        if (!Array.isArray(participants) || participants.length === 0) {
            return;
        }

        // Get usernames for promoted participants
        const promotedUsernames = await Promise.all(participants.map(async jid => {
            const jidString = typeof jid === 'string' ? jid : (jid.id || jid.toString());
            return `@${jidString.split('@')[0]}`;
        }));

        let promotedBy;
        let mentionList = participants.map(jid => {
            return typeof jid === 'string' ? jid : (jid.id || jid.toString());
        });

        if (author && author.length > 0) {
            const authorJid = typeof author === 'string' ? author : (author.id || author.toString());
            promotedBy = `@${authorJid.split('@')[0]}`;
            mentionList.push(authorJid);
        } else {
            promotedBy = '*System*';
        }

        const promotionMessage = `
╭─「 👑 *AUTO-PROMOTION* 」─╮
│
│  🎉 *New Admin${participants.length > 1 ? 's' : ''} Joined!*
│
│  👤 *Promoted:*
${promotedUsernames.map(name => `│     • ${name}`).join('\n')}
│
│  🤝 *Action by:* ${promotedBy}
│  📅 *Date:* ${new Date().toLocaleDateString()}
│
╰──────────────────────╯

🌟 _Welcome to the admin team!_`.trim();
        
        await sock.sendMessage(groupId, {
            text: promotionMessage,
            mentions: mentionList
        });
        
    } catch (error) {
        console.error('Error handling promotion event:', error);
    }
}

module.exports = { promoteCommand, handlePromotionEvent };
