const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');

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

async function blurCommand(sock, chatId, message, quotedMessage) {
    try {
        await sock.sendPresenceUpdate('composing', chatId);
        
        // Get the image to blur
        let imageBuffer;
        
        if (quotedMessage) {
            if (!quotedMessage.imageMessage) {
                await sock.sendMessage(chatId, { 
                    react: { text: '❌', key: message.key }
                });
                await sock.sendMessage(chatId, { 
                    text: '❌ *Invalid Media*\n\nPlease reply to an image message' 
                }, { quoted: message });
                return;
            }
            
            const quoted = {
                message: {
                    imageMessage: quotedMessage.imageMessage
                }
            };
            
            imageBuffer = await downloadMediaMessage(
                quoted,
                'buffer',
                { },
                { }
            );
        } else if (message.message?.imageMessage) {
            imageBuffer = await downloadMediaMessage(
                message,
                'buffer',
                { },
                { }
            );
        } else {
            await sock.sendMessage(chatId, { 
                react: { text: '❌', key: message.key }
            });
            await sock.sendMessage(chatId, { 
                text: '📸 *Image Blur*\n\nPlease reply to an image or send an image with caption `.blur`' 
            }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, {
            react: { text: '⏳', key: message.key }
        });

        // Resize and optimize image
        const resizedImage = await sharp(imageBuffer)
            .resize(800, 800, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: 80 })
            .toBuffer();

        // Apply blur effect
        const blurredImage = await sharp(resizedImage)
            .blur(10)
            .toBuffer();

        // Send the blurred image
        await sock.sendMessage(chatId, {
            image: blurredImage,
            caption: `╭━━━━━━━━━━━━╮
┃  🌫️ *IMAGE BLURRED*  ┃
╰━━━━━━━━━━━━╯

✅ *Successfully blurred!*

━━━━━━━━━━━━━━━
💫 *Knight-Bot Image Tools*
━━━━━━━━━━━━━━━`,
            ...channelInfo
        }, { quoted: message });

        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('Error in blur command:', error);
        await sock.sendMessage(chatId, { 
            react: { text: '❌', key: message.key }
        });
        await sock.sendMessage(chatId, { 
            text: '❌ *Error*\n\nFailed to blur image. Please try again later.' 
        }, { quoted: message });
    }
}

module.exports = blurCommand;
