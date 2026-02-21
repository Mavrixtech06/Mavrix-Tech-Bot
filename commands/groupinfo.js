async function groupInfoCommand(sock, chatId, msg) {
    try {
        await sock.sendPresenceUpdate('composing', chatId);
        
        await sock.sendMessage(chatId, {
            react: { text: '⏳', key: msg.key }
        });
        
        // Get group metadata
        const groupMetadata = await sock.groupMetadata(chatId);
        
        // Get group profile picture
        let pp;
        try {
            pp = await sock.profilePictureUrl(chatId, 'image');
        } catch {
            pp = 'https://i.imgur.com/2wzGhpF.jpeg';
        }

        // Get admins from participants
        const participants = groupMetadata.participants;
        const groupAdmins = participants.filter(p => p.admin);
        const listAdmin = groupAdmins.map((v, i) => `${i + 1}. @${v.id.split('@')[0]}`).join('\n');
        
        // Get group owner
        const owner = groupMetadata.owner || groupAdmins.find(p => p.admin === 'superadmin')?.id || chatId.split('-')[0] + '@s.whatsapp.net';

        // Format description
        const description = groupMetadata.desc?.toString() || 'No description set';
        const shortDesc = description.length > 50 ? description.substring(0, 50) + '...' : description;

        // Create info text
        const text = `╭━━━━━━━━━━━━╮
┃  👥 *GROUP INFO*  ┃
╰━━━━━━━━━━━━╯

📌 *ID*
├ ${groupMetadata.id}
└─────────────

📛 *Name*
├ ${groupMetadata.subject}
└─────────────

👥 *Members*
├ ${participants.length} total
└─────────────

👑 *Owner*
├ @${owner.split('@')[0]}
└─────────────

🛡️ *Admins*
${listAdmin || '├ None'}
└─────────────

📝 *Description*
├ ${shortDesc}
└─────────────

━━━━━━━━━━━━━━━
💫 *Knight-Bot Group Management*
━━━━━━━━━━━━━━━`;

        // Send the message with image and mentions
        await sock.sendMessage(chatId, {
            image: { url: pp },
            caption: text,
            mentions: [...groupAdmins.map(v => v.id), owner]
        });

        await sock.sendMessage(chatId, {
            react: { text: '✅', key: msg.key }
        });

    } catch (error) {
        console.error('Error in groupinfo command:', error);
        await sock.sendMessage(chatId, { 
            react: { text: '❌', key: msg.key }
        });
        await sock.sendMessage(chatId, { 
            text: '❌ *Error*\n\nFailed to get group info!' 
        });
    }
}

module.exports = groupInfoCommand;
