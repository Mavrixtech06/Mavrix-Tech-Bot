const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function viewonceCommand(sock, chatId, message) {
    try {
        // Extract quoted imageMessage or videoMessage from your structure
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedImage = quoted?.imageMessage;
        const quotedVideo = quoted?.videoMessage;

        if (!quotedImage && !quotedVideo) {
            return await sock.sendMessage(chatId, { 
                text: "👀 *No view-once media found*\n\n_Please reply to a view-once image or video with .viewonce_", 
                quoted: message 
            });
        }

        await sock.sendPresenceUpdate('composing', chatId);
        await sock.sendMessage(chatId, { 
            text: "```🔓 Unlocking view-once media...```", 
            quoted: message 
        });

        if (quotedImage && quotedImage.viewOnce) {
            // Download and send the image
            const stream = await downloadContentFromMessage(quotedImage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            
            await sock.sendMessage(chatId, { 
                image: buffer, 
                caption: "👀 *View-Once Image*\n\n" + (quotedImage.caption || '_No caption_'),
                quoted: message 
            });
            
            await sock.sendMessage(chatId, { 
                text: "✅ *Successfully unlocked!*", 
                quoted: message 
            });
            
        } else if (quotedVideo && quotedVideo.viewOnce) {
            // Download and send the video
            const stream = await downloadContentFromMessage(quotedVideo, 'video');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            
            await sock.sendMessage(chatId, { 
                video: buffer, 
                caption: "👀 *View-Once Video*\n\n" + (quotedVideo.caption || '_No caption_'),
                quoted: message 
            });
            
            await sock.sendMessage(chatId, { 
                text: "✅ *Successfully unlocked!*", 
                quoted: message 
            });
        }
        
        // Send reaction
        await sock.sendMessage(chatId, { react: { text: "🔓", key: message.key } });
        
    } catch (error) {
        console.error('Error in viewonce command:', error);
        await sock.sendMessage(chatId, { 
            text: "😵 *Failed to unlock media*\n_The media might be expired or corrupted!_", 
            quoted: message 
        });
    }
}

module.exports = viewonceCommand;
