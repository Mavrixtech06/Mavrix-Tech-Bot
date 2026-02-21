const fs = require('fs');
const path = require('path');

const warningsFilePath = path.join(__dirname, '../data/warnings.json');

function loadWarnings() {
    if (!fs.existsSync(warningsFilePath)) {
        fs.writeFileSync(warningsFilePath, JSON.stringify({}), 'utf8');
    }
    const data = fs.readFileSync(warningsFilePath, 'utf8');
    return JSON.parse(data);
}

async function warningsCommand(sock, chatId, mentionedJidList, message) {
    try {
        await sock.sendPresenceUpdate('composing', chatId);
        
        if (mentionedJidList.length === 0) {
            await sock.sendMessage(chatId, { 
                react: { text: '❌', key: message.key }
            });
            await sock.sendMessage(chatId, { 
                text: '👤 *No User Mentioned*\n\nPlease mention a user to check warnings.' 
            });
            return;
        }

        await sock.sendMessage(chatId, {
            react: { text: '⏳', key: message.key }
        });

        const warnings = loadWarnings();
        const userToCheck = mentionedJidList[0];
        
        // Get warnings for this user in this group
        const userWarnings = warnings[chatId]?.[userToCheck] || 0;

        const warningStatus = `╭━━━━━━━━━━━━╮
┃  ⚠️ *WARNINGS*  ┃
╰━━━━━━━━━━━━╯

👤 *User:* @${userToCheck.split('@')[0]}
📊 *Warnings:* ${userWarnings}/3

━━━━━━━━━━━━━━━
${userWarnings >= 3 ? '🚫 *User will be kicked on next warning!*' : '✅ *User is within limit*'}
━━━━━━━━━━━━━━━`;

        await sock.sendMessage(chatId, { 
            text: warningStatus,
            mentions: [userToCheck]
        });

        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('Error in warnings command:', error);
        await sock.sendMessage(chatId, { 
            react: { text: '❌', key: message.key }
        });
        await sock.sendMessage(chatId, { 
            text: '❌ *Error*\n\nFailed to check warnings.' 
        });
    }
}

module.exports = warningsCommand;
