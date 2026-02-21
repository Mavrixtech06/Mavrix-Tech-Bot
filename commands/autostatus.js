const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

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

// Path to store auto status configuration
const configPath = path.join(__dirname, '../data/autoStatus.json');

// Initialize config file if it doesn't exist
if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({ 
        enabled: false, 
        reactOn: false 
    }));
}

async function autoStatusCommand(sock, chatId, msg, args) {
    try {
        await sock.sendPresenceUpdate('composing', chatId);
        
        const senderId = msg.key.participant || msg.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        
        if (!msg.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, { 
                react: { text: '❌', key: msg.key }
            });
            await sock.sendMessage(chatId, { 
                text: '👑 *Owner Only*\n\nThis command can only be used by the owner!',
                ...channelInfo
            });
            return;
        }

        // Read current config
        let config = JSON.parse(fs.readFileSync(configPath));

        // If no arguments, show current status
        if (!args || args.length === 0) {
            const status = config.enabled ? '✅ Enabled' : '❌ Disabled';
            const reactStatus = config.reactOn ? '✅ Enabled' : '❌ Disabled';
            
            const statusMessage = `╭━━━━━━━━━━━━╮
┃  📱 *AUTO STATUS*  ┃
╰━━━━━━━━━━━━╯

📊 *Current Settings:*

👁️ *Auto View:* ${status}
💫 *Auto React:* ${reactStatus}

━━━━━━━━━━━━━━━
📌 *Commands:*
├ .autostatus on  - Enable auto view
├ .autostatus off - Disable auto view
├ .autostatus react on  - Enable reactions
└ .autostatus react off - Disable reactions
━━━━━━━━━━━━━━━`;
            
            await sock.sendMessage(chatId, { 
                text: statusMessage,
                ...channelInfo
            });
            return;
        }

        await sock.sendMessage(chatId, {
            react: { text: '⏳', key: msg.key }
        });

        // Handle on/off commands
        const command = args[0].toLowerCase();
        
        if (command === 'on') {
            config.enabled = true;
            fs.writeFileSync(configPath, JSON.stringify(config));
            await sock.sendMessage(chatId, { 
                text: '✅ *Auto Status Enabled!*\n\nBot will now automatically view all contact statuses.',
                ...channelInfo
            });
            await sock.sendMessage(chatId, {
                react: { text: '✅', key: msg.key }
            });
        } else if (command === 'off') {
            config.enabled = false;
            fs.writeFileSync(configPath, JSON.stringify(config));
            await sock.sendMessage(chatId, { 
                text: '❌ *Auto Status Disabled!*\n\nBot will no longer automatically view statuses.',
                ...channelInfo
            });
            await sock.sendMessage(chatId, {
                react: { text: '✅', key: msg.key }
            });
        } else if (command === 'react') {
            // Handle react subcommand
            if (!args[1]) {
                await sock.sendMessage(chatId, { 
                    text: '❌ *Missing Option*\n\nPlease specify on/off for reactions!\n\n📌 *Usage:* `.autostatus react on/off`',
                    ...channelInfo
                });
                return;
            }
            
            const reactCommand = args[1].toLowerCase();
            if (reactCommand === 'on') {
                config.reactOn = true;
                fs.writeFileSync(configPath, JSON.stringify(config));
                await sock.sendMessage(chatId, { 
                    text: '💫 *Status Reactions Enabled!*\n\nBot will now react to status updates with 💚.',
                    ...channelInfo
                });
                await sock.sendMessage(chatId, {
                    react: { text: '✅', key: msg.key }
                });
            } else if (reactCommand === 'off') {
                config.reactOn = false;
                fs.writeFileSync(configPath, JSON.stringify(config));
                await sock.sendMessage(chatId, { 
                    text: '❌ *Status Reactions Disabled!*\n\nBot will no longer react to status updates.',
                    ...channelInfo
                });
                await sock.sendMessage(chatId, {
                    react: { text: '✅', key: msg.key }
                });
            } else {
                await sock.sendMessage(chatId, { 
                    text: '❌ *Invalid Option*\n\nUse: `.autostatus react on/off`',
                    ...channelInfo
                });
            }
        } else {
            await sock.sendMessage(chatId, { 
                text: '❌ *Invalid Command*\n\n📌 *Usage:*\n.autostatus on/off\n.autostatus react on/off',
                ...channelInfo
            });
        }

    } catch (error) {
        console.error('Error in autostatus command:', error);
        await sock.sendMessage(chatId, { 
            react: { text: '❌', key: msg.key }
        });
        await sock.sendMessage(chatId, { 
            text: '❌ *Error*\n\nFailed to manage auto status!\n' + error.message,
            ...channelInfo
        });
    }
}

// Function to check if auto status is enabled
function isAutoStatusEnabled() {
    try {
        const config = JSON.parse(fs.readFileSync(configPath));
        return config.enabled;
    } catch (error) {
        console.error('Error checking auto status config:', error);
        return false;
    }
}

// Function to check if status reactions are enabled
function isStatusReactionEnabled() {
    try {
        const config = JSON.parse(fs.readFileSync(configPath));
        return config.reactOn;
    } catch (error) {
        console.error('Error checking status reaction config:', error);
        return false;
    }
}

// Function to react to status using proper method
async function reactToStatus(sock, statusKey) {
    try {
        if (!isStatusReactionEnabled()) {
            return;
        }

        // Use the proper relayMessage method for status reactions
        await sock.relayMessage(
            'status@broadcast',
            {
                reactionMessage: {
                    key: {
                        remoteJid: 'status@broadcast',
                        id: statusKey.id,
                        participant: statusKey.participant || statusKey.remoteJid,
                        fromMe: false
                    },
                    text: '💚'
                }
            },
            {
                messageId: statusKey.id,
                statusJidList: [statusKey.remoteJid, statusKey.participant || statusKey.remoteJid]
            }
        );
        
        // Silent success - no logging
    } catch (error) {
        console.error('❌ Error reacting to status:', error.message);
    }
}

// Function to handle status updates
async function handleStatusUpdate(sock, status) {
    try {
        if (!isAutoStatusEnabled()) {
            return;
        }

        // Add delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Handle status from messages.upsert
        if (status.messages && status.messages.length > 0) {
            const msg = status.messages[0];
            if (msg.key && msg.key.remoteJid === 'status@broadcast') {
                try {
                    await sock.readMessages([msg.key]);
                    const sender = msg.key.participant || msg.key.remoteJid;
                    
                    // React to status if enabled
                    await reactToStatus(sock, msg.key);
                    
                    // Silent success - no logging
                } catch (err) {
                    if (err.message?.includes('rate-overlimit')) {
                        console.log('⚠️ Rate limit hit, waiting before retrying...');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        await sock.readMessages([msg.key]);
                    } else {
                        throw err;
                    }
                }
                return;
            }
        }

        // Handle direct status updates
        if (status.key && status.key.remoteJid === 'status@broadcast') {
            try {
                await sock.readMessages([status.key]);
                const sender = status.key.participant || status.key.remoteJid;
                
                // React to status if enabled
                await reactToStatus(sock, status.key);
                
                // Silent success - no logging
            } catch (err) {
                if (err.message?.includes('rate-overlimit')) {
                    console.log('⚠️ Rate limit hit, waiting before retrying...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await sock.readMessages([status.key]);
                } else {
                    throw err;
                }
            }
            return;
        }

        // Handle status in reactions
        if (status.reaction && status.reaction.key.remoteJid === 'status@broadcast') {
            try {
                await sock.readMessages([status.reaction.key]);
                const sender = status.reaction.key.participant || status.reaction.key.remoteJid;
                
                // React to status if enabled
                await reactToStatus(sock, status.reaction.key);
                
                // Silent success - no logging
            } catch (err) {
                if (err.message?.includes('rate-overlimit')) {
                    console.log('⚠️ Rate limit hit, waiting before retrying...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await sock.readMessages([status.reaction.key]);
                } else {
                    throw err;
                }
            }
            return;
        }

    } catch (error) {
        console.error('❌ Error in auto status view:', error.message);
    }
}

module.exports = {
    autoStatusCommand,
    handleStatusUpdate
};
