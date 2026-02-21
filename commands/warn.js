const fs = require('fs');
const path = require('path');
const isAdmin = require('../lib/isAdmin');

// Define paths
const databaseDir = path.join(process.cwd(), 'data');
const warningsPath = path.join(databaseDir, 'warnings.json');

// Initialize warnings file if it doesn't exist
function initializeWarningsFile() {
    if (!fs.existsSync(databaseDir)) {
        fs.mkdirSync(databaseDir, { recursive: true });
    }
    
    if (!fs.existsSync(warningsPath)) {
        fs.writeFileSync(warningsPath, JSON.stringify({}), 'utf8');
    }
}

async function warnCommand(sock, chatId, senderId, mentionedJids, message) {
    try {
        await sock.sendPresenceUpdate('composing', chatId);
        
        // Initialize files first
        initializeWarningsFile();

        // First check if it's a group
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, { 
                react: { text: '❌', key: message.key }
            });
            await sock.sendMessage(chatId, { 
                text: '👥 *Group Only*\n\nThis command can only be used in groups!'
            });
            return;
        }

        // Check admin status first
        try {
            const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);
            
            if (!isBotAdmin) {
                await sock.sendMessage(chatId, { 
                    react: { text: '❌', key: message.key }
                });
                await sock.sendMessage(chatId, { 
                    text: '🤖 *Bot Not Admin*\n\nPlease make the bot an admin first to use this command.'
                });
                return;
            }

            if (!isSenderAdmin) {
                await sock.sendMessage(chatId, { 
                    react: { text: '❌', key: message.key }
                });
                await sock.sendMessage(chatId, { 
                    text: '👑 *Admin Only*\n\nOnly group admins can use the warn command.'
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

        let userToWarn;
        
        // Check for mentioned users
        if (mentionedJids && mentionedJids.length > 0) {
            userToWarn = mentionedJids[0];
        }
        // Check for replied message
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToWarn = message.message.extendedTextMessage.contextInfo.participant;
        }
        
        if (!userToWarn) {
            await sock.sendMessage(chatId, { 
                react: { text: '❌', key: message.key }
            });
            await sock.sendMessage(chatId, { 
                text: '👤 *No User Selected*\n\nPlease mention the user or reply to their message to warn!'
            });
            return;
        }

        await sock.sendMessage(chatId, {
            react: { text: '⏳', key: message.key }
        });

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Read warnings, create empty object if file is empty
            let warnings = {};
            try {
                warnings = JSON.parse(fs.readFileSync(warningsPath, 'utf8'));
            } catch (error) {
                warnings = {};
            }

            // Initialize nested objects if they don't exist
            if (!warnings[chatId]) warnings[chatId] = {};
            if (!warnings[chatId][userToWarn]) warnings[chatId][userToWarn] = 0;
            
            warnings[chatId][userToWarn]++;
            fs.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2));

            const warningMessage = `╭━━━━━━━━━━━━╮
┃  ⚠️ *WARNING*  ┃
╰━━━━━━━━━━━━╯

👤 *User:* @${userToWarn.split('@')[0]}
⚠️ *Count:* ${warnings[chatId][userToWarn]}/3
👑 *By:* @${senderId.split('@')[0]}

📅 *Date:* ${new Date().toLocaleString()}

━━━━━━━━━━━━━━━
${warnings[chatId][userToWarn] >= 3 ? '🚫 *User will be kicked at 3 warnings!*' : '⚠️ *Please follow group rules*'}
━━━━━━━━━━━━━━━`;

            await sock.sendMessage(chatId, { 
                text: warningMessage,
                mentions: [userToWarn, senderId]
            });

            await sock.sendMessage(chatId, {
                react: { text: '⚠️', key: message.key }
            });

            // Auto-kick after 3 warnings
            if (warnings[chatId][userToWarn] >= 3) {
                // Add delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));

                await sock.groupParticipantsUpdate(chatId, [userToWarn], "remove");
                delete warnings[chatId][userToWarn];
                fs.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2));
                
                const kickMessage = `╭━━━━━━━━━━━━╮
┃  🚫 *AUTO-KICK*  ┃
╰━━━━━━━━━━━━╯

👤 *User:* @${userToWarn.split('@')[0]}

━━━━━━━━━━━━━━━
❌ Removed after 3 warnings!
━━━━━━━━━━━━━━━`;

                await sock.sendMessage(chatId, { 
                    text: kickMessage,
                    mentions: [userToWarn]
                });
                
                await sock.sendMessage(chatId, {
                    react: { text: '✅', key: message.key }
                });
            }
        } catch (error) {
            console.error('Error in warn command:', error);
            await sock.sendMessage(chatId, { 
                react: { text: '❌', key: message.key }
            });
            await sock.sendMessage(chatId, { 
                text: '❌ *Failed*\n\nCould not warn user!'
            });
        }
    } catch (error) {
        console.error('Error in warn command:', error);
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
                    react: { text: '❌', key: message.key }
                });
                await sock.sendMessage(chatId, { 
                    text: '❌ *Error*\n\nFailed to warn user. Make sure the bot is admin.'
                });
            } catch (sendError) {
                console.error('Error sending error message:', sendError);
            }
        }
    }
}

module.exports = warnCommand;
