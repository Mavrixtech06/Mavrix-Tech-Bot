const { handleGoodbye } = require('../lib/welcome');
const { isGoodByeOn, getGoodbye } = require('../lib/index');
const fetch = require('node-fetch');

async function goodbyeCommand(sock, chatId, message, match) {
    await sock.sendPresenceUpdate('composing', chatId);
    
    if (!chatId.endsWith('@g.us')) {
        await sock.sendMessage(chatId, { 
            react: { text: '❌', key: message.key }
        });
        await sock.sendMessage(chatId, { 
            text: '👥 *Group Only*\n\nThis command can only be used in groups.' 
        });
        return;
    }

    const text = message.message?.conversation || 
                message.message?.extendedTextMessage?.text || '';
    const matchText = text.split(' ').slice(1).join(' ');

    await handleGoodbye(sock, chatId, message, matchText);
}

async function handleLeaveEvent(sock, id, participants) {
    const isGoodbyeEnabled = await isGoodByeOn(id);
    if (!isGoodbyeEnabled) return;

    const customMessage = await getGoodbye(id);
    const groupMetadata = await sock.groupMetadata(id);
    const groupName = groupMetadata.subject;

    for (const participant of participants) {
        try {
            const participantString = typeof participant === 'string' ? participant : (participant.id || participant.toString());
            const user = participantString.split('@')[0];
            
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
            
            let finalMessage;
            if (customMessage) {
                finalMessage = customMessage
                    .replace(/{user}/g, `@${displayName}`)
                    .replace(/{group}/g, groupName);
            } else {
                finalMessage = `╭━━━━━━━━━━━━╮
┃  👋 *GOODBYE*  ┃
╰━━━━━━━━━━━━╯

💫 *@${displayName}* left the group

📌 *Group:* ${groupName}
👥 *Members:* ${groupMetadata.participants.length}

━━━━━━━━━━━━━━━
We'll miss you! 🌟
━━━━━━━━━━━━━━━`;
            }
            
            try {
                let profilePicUrl = `https://img.pyrocdn.com/dbKUgahg.png`;
                try {
                    const profilePic = await sock.profilePictureUrl(participantString, 'image');
                    if (profilePic) {
                        profilePicUrl = profilePic;
                    }
                } catch (profileError) {
                    console.log('Could not fetch profile picture, using default');
                }
                
                const apiUrl = `https://api.some-random-api.com/welcome/img/2/gaming1?type=leave&textcolor=red&username=${encodeURIComponent(displayName)}&guildName=${encodeURIComponent(groupName)}&memberCount=${groupMetadata.participants.length}&avatar=${encodeURIComponent(profilePicUrl)}`;
                
                const response = await fetch(apiUrl);
                if (response.ok) {
                    const imageBuffer = await response.buffer();
                    
                    await sock.sendMessage(id, {
                        image: imageBuffer,
                        caption: finalMessage,
                        mentions: [participantString]
                    });
                    
                    await sock.sendMessage(id, {
                        react: { text: '👋', key: { remoteJid: id } }
                    });
                    
                    continue;
                }
            } catch (imageError) {
                console.log('Image generation failed, falling back to text');
            }
            
            await sock.sendMessage(id, {
                text: finalMessage,
                mentions: [participantString]
            });
            
            await sock.sendMessage(id, {
                react: { text: '👋', key: { remoteJid: id } }
            });
            
        } catch (error) {
            console.error('Error sending goodbye message:', error);
            const participantString = typeof participant === 'string' ? participant : (participant.id || participant.toString());
            const user = participantString.split('@')[0];
            
            let fallbackMessage;
            if (customMessage) {
                fallbackMessage = customMessage
                    .replace(/{user}/g, `@${user}`)
                    .replace(/{group}/g, groupName);
            } else {
                fallbackMessage = `👋 Goodbye @${user}! We'll miss you!`;
            }
            
            await sock.sendMessage(id, {
                text: fallbackMessage,
                mentions: [participantString]
            });
            
            await sock.sendMessage(id, {
                react: { text: '👋', key: { remoteJid: id } }
            });
        }
    }
}

module.exports = { goodbyeCommand, handleLeaveEvent };
