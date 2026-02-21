const isAdmin = require('../lib/isAdmin');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

async function downloadMediaMessage(message, mediaType) {
    const stream = await downloadContentFromMessage(message, mediaType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    const filePath = path.join(__dirname, '../temp/', `${Date.now()}.${mediaType}`);
    fs.writeFileSync(filePath, buffer);
    return filePath;
}

async function tagCommand(sock, chatId, senderId, messageText, replyMessage, message) {
    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

    if (!isBotAdmin) {
        await sock.sendMessage(chatId, { 
            text: "🤖 *I need to be admin first!*\n_Please make me an admin to use .tag_", 
            quoted: message 
        });
        return;
    }

    if (!isSenderAdmin) {
        const stickerPath = './assets/sticktag.webp';
        if (fs.existsSync(stickerPath)) {
            const stickerBuffer = fs.readFileSync(stickerPath);
            await sock.sendMessage(chatId, { sticker: stickerBuffer }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { 
                text: "👑 *Only admins can use .tag*\n_Here's a sticker instead!_ ✨", 
                quoted: message 
            });
        }
        return;
    }

    await sock.sendPresenceUpdate('composing', chatId);
    
    const groupMetadata = await sock.groupMetadata(chatId);
    const participants = groupMetadata.participants;
    const mentionedJidList = participants.map(p => p.id);
    const groupName = groupMetadata.subject;

    if (replyMessage) {
        let messageContent = {};
        let mediaType = '';

        try {
            // Handle image messages
            if (replyMessage.imageMessage) {
                mediaType = 'image';
                const filePath = await downloadMediaMessage(replyMessage.imageMessage, 'image');
                messageContent = {
                    image: { url: filePath },
                    caption: messageText || replyMessage.imageMessage.caption || `📸 *Message from @${senderId.split('@')[0]}*`,
                    mentions: mentionedJidList
                };
            }
            // Handle video messages
            else if (replyMessage.videoMessage) {
                mediaType = 'video';
                const filePath = await downloadMediaMessage(replyMessage.videoMessage, 'video');
                messageContent = {
                    video: { url: filePath },
                    caption: messageText || replyMessage.videoMessage.caption || `🎥 *Video from @${senderId.split('@')[0]}*`,
                    mentions: mentionedJidList
                };
            }
            // Handle audio messages
            else if (replyMessage.audioMessage) {
                mediaType = 'audio';
                const filePath = await downloadMediaMessage(replyMessage.audioMessage, 'audio');
                messageContent = {
                    audio: { url: filePath },
                    mimetype: 'audio/mpeg',
                    caption: messageText || `🎵 *Audio from @${senderId.split('@')[0]}*`,
                    mentions: mentionedJidList
                };
            }
            // Handle document messages
            else if (replyMessage.documentMessage) {
                mediaType = 'document';
                const filePath = await downloadMediaMessage(replyMessage.documentMessage, 'document');
                messageContent = {
                    document: { url: filePath },
                    fileName: replyMessage.documentMessage.fileName || 'document.pdf',
                    caption: messageText || `📄 *Document from @${senderId.split('@')[0]}*`,
                    mentions: mentionedJidList
                };
            }
            // Handle text messages
            else if (replyMessage.conversation || replyMessage.extendedTextMessage) {
                const originalText = replyMessage.conversation || replyMessage.extendedTextMessage.text;
                messageContent = {
                    text: `
╭─「 📢 *QUOTED MESSAGE* 」─╮
│
│  💬 "${originalText.slice(0, 100)}${originalText.length > 100 ? '...' : ''}"
│
│  👤 *From:* @${senderId.split('@')[0]}
│  📌 *Group:* ${groupName}
│
╰──────────────────────╯

${messageText ? `📝 *Note:* ${messageText}` : ''}`.trim(),
                    mentions: mentionedJidList
                };
            }

            if (Object.keys(messageContent).length > 0) {
                await sock.sendMessage(chatId, messageContent);
                
                // Clean up temp file after sending
                if (mediaType && messageContent[mediaType]?.url) {
                    try {
                        fs.unlinkSync(messageContent[mediaType].url);
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                }
            }
        } catch (error) {
            console.error('Error processing media:', error);
            await sock.sendMessage(chatId, {
                text: "😵 *Failed to process media*\n_Trying text-only tag instead!_",
                mentions: mentionedJidList
            });
            
            // Fallback to text tag
            await sock.sendMessage(chatId, {
                text: messageText || `👋 *Hello everyone!*\n_Message from @${senderId.split('@')[0]}_`,
                mentions: mentionedJidList
            });
        }
    } else {
        await sock.sendMessage(chatId, {
            text: `
╭─「 📢 *GROUP TAG* 」─╮
│
│  ${messageText || '👋 *Hello everyone!*'}
│
│  👥 *Members (${participants.length}):*
│
╰──────────────────────╯

✨ _Tagged by @${senderId.split('@')[0]}_`.trim(),
            mentions: mentionedJidList
        });
    }
    
    // Send reaction
    await sock.sendMessage(chatId, { react: { text: "📢", key: message.key } });
}

module.exports = tagCommand;
