const isAdmin = require('../lib/isAdmin');

async function demoteCommand(sock, chatId, mentionedJids, message) {
    try {
        await sock.sendPresenceUpdate('composing', chatId);
        
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, { 
                react: { text: '❌', key: message.key }
            });
            await sock.sendMessage(chatId, { 
                text: '👥 *Group Only*\n\nThis command can only be used in groups!'
            });
            return;
        }

        try {
            const adminStatus = await isAdmin(sock, chatId, message.key.participant || message.key.remoteJid);
            
            if (!adminStatus.isBotAdmin) {
                await sock.sendMessage(chatId, { 
                    react: { text: '❌', key: message.key }
                });
                await sock.sendMessage(chatId, { 
                    text: '🤖 *Bot Not Admin*\n\nPlease make the bot an admin first to use this command.'
                });
                return;
            }

            if (!adminStatus.isSenderAdmin) {
                await sock.sendMessage(chatId, { 
                    react: { text: '❌', key: message.key }
                });
                await sock.sendMessage(chatId, { 
                    text: '👑 *Admin Only*\n\nOnly group admins can use the demote command.'
                });
                return;
            }
        } catch (adminError) {
            console.error('Error checking admin status:', adminError);
            await sock.sendMessage(chatId, { 
                react: { text: '❌', key: message.key }
            });
            await sock.sendMessage(chatId, { 
                text: '❌ *Error*\n\nPlease make sure the bot is an admin of this group.'
            });
            return;
        }

        let userToDemote = [];
        
        if (mentionedJids && mentionedJids.length > 0) {
            userToDemote = mentionedJids;
        }
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToDemote = [message.message.extendedTextMessage.contextInfo.participant];
        }
        
        if (userToDemote.length === 0) {
            await sock.sendMessage(chatId, { 
                react: { text: '❌', key: message.key }
            });
            await sock.sendMessage(chatId, { 
                text: '👤 *No User Selected*\n\nPlease mention the user or reply to their message to demote!'
            });
            return;
        }

        await sock.sendMessage(chatId, {
            react: { text: '⏳', key: message.key }
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        await sock.groupParticipantsUpdate(chatId, userToDemote, "demote");
        
        const usernames = await Promise.all(userToDemote.map(async jid => {
            return `@${jid.split('@')[0]}`;
        }));

        await new Promise(resolve => setTimeout(resolve, 1000));

        const demotionMessage = `╭━━━━━━━━━━━━╮
┃  👑 *DEMOTION*  ┃
╰━━━━━━━━━━━━╯

👤 *Demoted User${userToDemote.length > 1 ? 's' : ''}:*
${usernames.map(name => `├ ${name}`).join('\n')}
└─────────────

👑 *Demoted By:* @${message.key.participant ? message.key.participant.split('@')[0] : message.key.remoteJid.split('@')[0]}

📅 *Date:* ${new Date().toLocaleString()}

━━━━━━━━━━━━━━━
✅ *User${userToDemote.length > 1 ? 's have' : ' has'} been demoted successfully!*
━━━━━━━━━━━━━━━`;
        
        await sock.sendMessage(chatId, { 
            text: demotionMessage,
            mentions: [...userToDemote, message.key.participant || message.key.remoteJid]
        });

        await sock.sendMessage(chatId, {
            react: { text: '🎉', key: message.key }
        });

    } catch (error) {
        console.error('Error in demote command:', error);
        await sock.sendMessage(chatId, { 
            react: { text: '❌', key: message.key }
        });
        
        if (error.data === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
                await sock.sendMessage(chatId, { 
                    text: '⏳ *Rate Limit*\n\nPlease try again in a few seconds.'
                });
            } catch (retryError) {
                console.error('Error sending retry message:', retryError);
            }
        } else {
            try {
                await sock.sendMessage(chatId, { 
                    text: '❌ *Failed*\n\nCould not demote user(s). Make sure the bot is admin and has sufficient permissions.'
                });
            } catch (sendError) {
                console.error('Error sending error message:', sendError);
            }
        }
    }
}

async function handleDemotionEvent(sock, groupId, participants, author) {
    try {
        if (!Array.isArray(participants) || participants.length === 0) {
            return;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        const demotedUsernames = await Promise.all(participants.map(async jid => {
            const jidString = typeof jid === 'string' ? jid : (jid.id || jid.toString());
            return `@${jidString.split('@')[0]}`;
        }));

        let demotedBy;
        let mentionList = participants.map(jid => {
            return typeof jid === 'string' ? jid : (jid.id || jid.toString());
        });

        if (author && author.length > 0) {
            const authorJid = typeof author === 'string' ? author : (author.id || author.toString());
            demotedBy = `@${authorJid.split('@')[0]}`;
            mentionList.push(authorJid);
        } else {
            demotedBy = 'System';
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        const demotionMessage = `╭━━━━━━━━━━━━╮
┃  👑 *DEMOTION*  ┃
╰━━━━━━━━━━━━╯

👤 *Demoted User${participants.length > 1 ? 's' : ''}:*
${demotedUsernames.map(name => `├ ${name}`).join('\n')}
└─────────────

👑 *Demoted By:* ${demotedBy}

📅 *Date:* ${new Date().toLocaleString()}`;
        
        await sock.sendMessage(groupId, {
            text: demotionMessage,
            mentions: mentionList
        });

        await sock.sendMessage(groupId, {
            react: { text: '🔔', key: { remoteJid: groupId } }
        });

    } catch (error) {
        console.error('Error handling demotion event:', error);
        if (error.data === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

module.exports = { demoteCommand, handleDemotionEvent };
