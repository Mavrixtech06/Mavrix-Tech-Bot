const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function ensureGroupAndAdmin(sock, chatId, senderId, message) {
    const isGroup = chatId.endsWith('@g.us');
    if (!isGroup) {
        await sock.sendMessage(chatId, { 
            react: { text: '❌', key: message.key }
        });
        await sock.sendMessage(chatId, { 
            text: '👥 *Group Only*\n\nThis command can only be used in groups.' 
        });
        return { ok: false };
    }
    
    const isAdmin = require('../lib/isAdmin');
    const adminStatus = await isAdmin(sock, chatId, senderId);
    
    if (!adminStatus.isBotAdmin) {
        await sock.sendMessage(chatId, { 
            react: { text: '❌', key: message.key }
        });
        await sock.sendMessage(chatId, { 
            text: '🤖 *Bot Not Admin*\n\nPlease make the bot an admin first.' 
        });
        return { ok: false };
    }
    
    if (!adminStatus.isSenderAdmin) {
        await sock.sendMessage(chatId, { 
            react: { text: '❌', key: message.key }
        });
        await sock.sendMessage(chatId, { 
            text: '👑 *Admin Only*\n\nOnly group admins can use this command.' 
        });
        return { ok: false };
    }
    return { ok: true };
}

async function setGroupDescription(sock, chatId, senderId, text, message) {
    const check = await ensureGroupAndAdmin(sock, chatId, senderId, message);
    if (!check.ok) return;
    
    const desc = (text || '').trim();
    if (!desc) {
        await sock.sendMessage(chatId, { 
            text: '📝 *Usage:* `.setgdesc <description>`\n\n💡 *Example:* `.setgdesc Welcome to our group!`' 
        }, { quoted: message });
        return;
    }
    
    try {
        await sock.sendPresenceUpdate('composing', chatId);
        await sock.sendMessage(chatId, {
            react: { text: '⏳', key: message.key }
        });
        
        await sock.groupUpdateDescription(chatId, desc);
        
        await sock.sendMessage(chatId, { 
            text: '✅ *Success!*\n\nGroup description has been updated.' 
        }, { quoted: message });
        
        await sock.sendMessage(chatId, {
            react: { text: '🎉', key: message.key }
        });
    } catch (e) {
        await sock.sendMessage(chatId, { 
            react: { text: '❌', key: message.key }
        });
        await sock.sendMessage(chatId, { 
            text: '❌ *Failed*\n\nCould not update group description.' 
        }, { quoted: message });
    }
}

async function setGroupName(sock, chatId, senderId, text, message) {
    const check = await ensureGroupAndAdmin(sock, chatId, senderId, message);
    if (!check.ok) return;
    
    const name = (text || '').trim();
    if (!name) {
        await sock.sendMessage(chatId, { 
            text: '📝 *Usage:* `.setgname <new name>`\n\n💡 *Example:* `.setgname Knight Bot Group`' 
        }, { quoted: message });
        return;
    }
    
    try {
        await sock.sendPresenceUpdate('composing', chatId);
        await sock.sendMessage(chatId, {
            react: { text: '⏳', key: message.key }
        });
        
        await sock.groupUpdateSubject(chatId, name);
        
        await sock.sendMessage(chatId, { 
            text: '✅ *Success!*\n\nGroup name has been updated.' 
        }, { quoted: message });
        
        await sock.sendMessage(chatId, {
            react: { text: '🎉', key: message.key }
        });
    } catch (e) {
        await sock.sendMessage(chatId, { 
            react: { text: '❌', key: message.key }
        });
        await sock.sendMessage(chatId, { 
            text: '❌ *Failed*\n\nCould not update group name.' 
        }, { quoted: message });
    }
}

async function setGroupPhoto(sock, chatId, senderId, message) {
    const check = await ensureGroupAndAdmin(sock, chatId, senderId, message);
    if (!check.ok) return;

    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imageMessage = quoted?.imageMessage || quoted?.stickerMessage;
    
    if (!imageMessage) {
        await sock.sendMessage(chatId, { 
            text: '📸 *Usage:* Reply to an image or sticker with `.setgpp`\n\n💡 *Example:* Send an image and reply with `.setgpp`' 
        }, { quoted: message });
        return;
    }
    
    try {
        await sock.sendPresenceUpdate('composing', chatId);
        await sock.sendMessage(chatId, {
            react: { text: '⏳', key: message.key }
        });
        
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        const stream = await downloadContentFromMessage(imageMessage, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        const imgPath = path.join(tmpDir, `gpp_${Date.now()}.jpg`);
        fs.writeFileSync(imgPath, buffer);

        await sock.updateProfilePicture(chatId, { url: imgPath });
        
        try { fs.unlinkSync(imgPath); } catch (_) {}
        
        await sock.sendMessage(chatId, { 
            text: '✅ *Success!*\n\nGroup profile photo has been updated.' 
        }, { quoted: message });
        
        await sock.sendMessage(chatId, {
            react: { text: '🎉', key: message.key }
        });
    } catch (e) {
        await sock.sendMessage(chatId, { 
            react: { text: '❌', key: message.key }
        });
        await sock.sendMessage(chatId, { 
            text: '❌ *Failed*\n\nCould not update group profile photo.' 
        }, { quoted: message });
    }
}

module.exports = {
    setGroupDescription,
    setGroupName,
    setGroupPhoto
};
