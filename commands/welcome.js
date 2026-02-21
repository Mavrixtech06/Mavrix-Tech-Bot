const { handleWelcome } = require('../lib/welcome');
const { isWelcomeOn, getWelcome } = require('../lib/index');
const { channelInfo } = require('../lib/messageConfig');
const fetch = require('node-fetch');

async function welcomeCommand(sock, chatId, message, match) {
    // Check if it's a group
    if (!chatId.endsWith('@g.us')) {
        await sock.sendMessage(chatId, { 
            text: "👥 *This command only works in groups!*", 
            quoted: message 
        });
        return;
    }

    // Extract match from message
    const text = message.message?.conversation || 
                message.message?.extendedTextMessage?.text || '';
    const matchText = text.split(' ').slice(1).join(' ');

    await handleWelcome(sock, chatId, message, matchText);
}

async function handleJoinEvent(sock, id, participants) {
    // Check if welcome is enabled for this group
    const isWelcomeEnabled = await isWelcomeOn(id);
    if (!isWelcomeEnabled) return;

    // Get custom welcome message
    const customMessage = await getWelcome(id);

    // Get group metadata
    const groupMetadata = await sock.groupMetadata(id);
    const groupName = groupMetadata.subject;
    const groupDesc = groupMetadata.desc || 'No description available';
    const memberCount = groupMetadata.participants.length;

    // Send welcome message for each new participant
    for (const participant of participants) {
        try {
            // Handle case where participant might be an object or not a string
            const participantString = typeof participant === 'string' ? participant : (participant.id || participant.toString());
            const user = participantString.split('@')[0];
            
            // Get user's display name
            let displayName = user;
            try {
                const contact = await sock.getBusinessProfile(participantString);
                if (contact && contact.name) {
                    displayName = contact.name;
                } else {
                    const groupParticipants = groupMetadata.participants;
                    const userParticipant = groupParticipants.find(p => p.id === participantString);
                    if (userParticipant && userParticipant.name) {
                        displayName = userParticipant.name;
                    }
                }
            } catch (nameError) {
                console.log('Could not fetch display name, using phone number');
            }
            
            // Get join time
            const joinTime = new Date();
            const timeStr = joinTime.toLocaleTimeString();
            const dateStr = joinTime.toLocaleDateString();
            
            // Process custom message with variables
            let finalMessage;
            if (customMessage) {
                finalMessage = customMessage
                    .replace(/{user}/g, `@${displayName}`)
                    .replace(/{group}/g, groupName)
                    .replace(/{description}/g, groupDesc)
                    .replace(/{count}/g, memberCount)
                    .replace(/{time}/g, timeStr)
                    .replace(/{date}/g, dateStr);
            } else {
                // Default welcome message
                finalMessage = `
╭─「 🎉 *WELCOME* 」─╮
│
│  👋 *Hello @${displayName}!*
│
│  ✨ *Welcome to* 
│  📌 *${groupName}*
│
│  👥 *Member #${memberCount}*
│  🕐 *Joined:* ${timeStr}
│  📅 *Date:* ${dateStr}
│
│  📝 *Group Description:*
│  _${groupDesc.slice(0, 100)}${groupDesc.length > 100 ? '...' : ''}_
│
╰──────────────────────╯

🌟 *Please read the rules and enjoy!*
💬 _Feel free to introduce yourself!_`.trim();
            }
            
            // Try to send with image first
            try {
                // Get user profile picture
                let profilePicUrl = 'https://i.imgur.com/iJYx9Pp.png';
                try {
                    const profilePic = await sock.profilePictureUrl(participantString, 'image');
                    if (profilePic) {
                        profilePicUrl = profilePic;
                    }
                } catch (profileError) {
                    console.log('Could not fetch profile picture, using default');
                }
                
                // Construct API URL for welcome image
                const apiUrl = `https://api.some-random-api.com/welcome/img/2/gaming3?type=join&textcolor=green&username=${encodeURIComponent(displayName)}&guildName=${encodeURIComponent(groupName)}&memberCount=${memberCount}&avatar=${encodeURIComponent(profilePicUrl)}`;
                
                // Fetch the welcome image
                const response = await fetch(apiUrl);
                if (response.ok) {
                    const imageBuffer = await response.buffer();
                    
                    // Send welcome image with caption
                    await sock.sendMessage(id, {
                        image: imageBuffer,
                        caption: finalMessage,
                        mentions: [participantString],
                        ...channelInfo
                    });
                    
                    // Send reaction
                    await sock.sendMessage(id, { react: { text: "👋", key: { remoteJid: id } } });
                    continue;
                }
            } catch (imageError) {
                console.log('Image generation failed, falling back to text');
            }
            
            // Send text message
            await sock.sendMessage(id, {
                text: finalMessage,
                mentions: [participantString],
                ...channelInfo
            });
            
        } catch (error) {
            console.error('Error sending welcome message:', error);
            // Fallback to simple text message
            const participantString = typeof participant === 'string' ? participant : (participant.id || participant.toString());
            const user = participantString.split('@')[0];
            
            const fallbackMessage = `
╭─「 👋 *WELCOME* 」─╮
│
│  ✨ @${user}
│  📌 ${groupName}
│  👥 #${memberCount}
│
╰──────────────────────╯

_Glad to have you here!_`.trim();
            
            await sock.sendMessage(id, {
                text: fallbackMessage,
                mentions: [participantString],
                ...channelInfo
            });
        }
    }
}

module.exports = { welcomeCommand, handleJoinEvent };
