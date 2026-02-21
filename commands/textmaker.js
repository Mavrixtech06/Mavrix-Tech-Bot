const mumaker = require('mumaker');

// Base channel info template
const channelInfo = {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363161513685998@newsletter',
        newsletterName: 'KnightBot MD',
        serverMessageId: -1
    }
};

// Style descriptions
const styleInfo = {
    metallic: "✨ Metallic 3D Effect",
    ice: "❄️ Ice Cold Effect",
    snow: "☃️ Snowy Effect",
    impressive: "🎨 Colorful Paint Effect",
    matrix: "💚 Matrix Code Effect",
    light: "💡 Futuristic Light",
    neon: "🌈 Neon Light Effect",
    devil: "😈 Devil Wings Effect",
    purple: "💜 Purple Haze Effect",
    thunder: "⚡ Thunder Strike Effect",
    leaves: "🍃 Green Brush Effect",
    '1917': "📽️ 1917 Vintage Style",
    arena: "🎮 Arena of Valor Cover",
    hacker: "💀 Anonymous Hacker",
    sand: "🏖️ Sand Writing Effect",
    blackpink: "🖤 Blackpink Style",
    glitch: "📺 Digital Glitch Effect",
    fire: "🔥 Flame Lettering Effect"
};

async function textmakerCommand(sock, chatId, message, q, type) {
    try {
        await sock.sendPresenceUpdate('composing', chatId);
        
        if (!q) {
            const styles = Object.keys(styleInfo).map(key => `✦ .${key} - ${styleInfo[key]}`).join('\n');
            
            await sock.sendMessage(chatId, { 
                react: { text: '❓', key: message.key }
            });
            return await sock.sendMessage(chatId, {
                text: `🎨 *TEXT MAKER*\n\n📌 *Usage:* \`.${type} <text>\`\n\n✨ *Available Styles:*\n${styles}\n\n💡 *Example:* \`.metallic Knight\``,
                contextInfo: channelInfo
            });
        }

        // Extract text
        const text = q.split(' ').slice(1).join(' ');

        if (!text) {
            await sock.sendMessage(chatId, { 
                react: { text: '❌', key: message.key }
            });
            return await sock.sendMessage(chatId, {
                text: '❌ *Missing Text*\n\nPlease provide text to generate!\n\n📌 *Example:* `.metallic Knight`',
                contextInfo: channelInfo
            });
        }

        await sock.sendMessage(chatId, {
            react: { text: '⏳', key: message.key }
        });

        try {
            let result;
            switch (type) {
                case 'metallic':
                    result = await mumaker.ephoto("https://en.ephoto360.com/impressive-decorative-3d-metal-text-effect-798.html", text);
                    break;
                case 'ice':
                    result = await mumaker.ephoto("https://en.ephoto360.com/ice-text-effect-online-101.html", text);
                    break;
                case 'snow':
                    result = await mumaker.ephoto("https://en.ephoto360.com/create-a-snow-3d-text-effect-free-online-621.html", text);
                    break;
                case 'impressive':
                    result = await mumaker.ephoto("https://en.ephoto360.com/create-3d-colorful-paint-text-effect-online-801.html", text);
                    break;
                case 'matrix':
                    result = await mumaker.ephoto("https://en.ephoto360.com/matrix-text-effect-154.html", text);
                    break;
                case 'light':
                    result = await mumaker.ephoto("https://en.ephoto360.com/light-text-effect-futuristic-technology-style-648.html", text);
                    break;
                case 'neon':
                    result = await mumaker.ephoto("https://en.ephoto360.com/create-colorful-neon-light-text-effects-online-797.html", text);
                    break;
                case 'devil':
                    result = await mumaker.ephoto("https://en.ephoto360.com/neon-devil-wings-text-effect-online-683.html", text);
                    break;
                case 'purple':
                    result = await mumaker.ephoto("https://en.ephoto360.com/purple-text-effect-online-100.html", text);
                    break;
                case 'thunder':
                    result = await mumaker.ephoto("https://en.ephoto360.com/thunder-text-effect-online-97.html", text);
                    break;
                case 'leaves':
                    result = await mumaker.ephoto("https://en.ephoto360.com/green-brush-text-effect-typography-maker-online-153.html", text);
                    break;
                case '1917':
                    result = await mumaker.ephoto("https://en.ephoto360.com/1917-style-text-effect-523.html", text);
                    break;
                case 'arena':
                    result = await mumaker.ephoto("https://en.ephoto360.com/create-cover-arena-of-valor-by-mastering-360.html", text);
                    break;
                case 'hacker':
                    result = await mumaker.ephoto("https://en.ephoto360.com/create-anonymous-hacker-avatars-cyan-neon-677.html", text);
                    break;
                case 'sand':
                    result = await mumaker.ephoto("https://en.ephoto360.com/write-names-and-messages-on-the-sand-online-582.html", text);
                    break;
                case 'blackpink':
                    result = await mumaker.ephoto("https://en.ephoto360.com/create-a-blackpink-style-logo-with-members-signatures-810.html", text);
                    break;
                case 'glitch':
                    result = await mumaker.ephoto("https://en.ephoto360.com/create-digital-glitch-text-effects-online-767.html", text);
                    break;
                case 'fire':
                    result = await mumaker.ephoto("https://en.ephoto360.com/flame-lettering-effect-372.html", text);
                    break;
                default:
                    return await sock.sendMessage(chatId, {
                        text: '❌ *Invalid Style*\n\nPlease use a valid text generator style.',
                        contextInfo: channelInfo
                    });
            }

            if (!result || !result.image) {
                throw new Error('No image URL received from the API');
            }

            const caption = `╭━━━━━━━━━━━━╮
┃  🎨 *${styleInfo[type] || 'TEXT MAKER'}*  ┃
╰━━━━━━━━━━━━╯

📝 *Text:* ${text}

━━━━━━━━━━━━━━━
💫 Generated by *Knight-Bot*
━━━━━━━━━━━━━━━`;

            await sock.sendMessage(chatId, {
                image: { url: result.image },
                caption: caption,
                contextInfo: channelInfo
            });

            await sock.sendMessage(chatId, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('Error in text generator:', error);
            await sock.sendMessage(chatId, { 
                react: { text: '❌', key: message.key }
            });
            await sock.sendMessage(chatId, {
                text: `❌ *Error*\n\n${error.message}`,
                contextInfo: channelInfo
            });
        }
    } catch (error) {
        console.error('Error in textmaker command:', error);
        await sock.sendMessage(chatId, { 
            react: { text: '❌', key: message.key }
        });
        await sock.sendMessage(chatId, {
            text: '❌ *Error*\n\nAn error occurred. Please try again later.',
            contextInfo: channelInfo
        });
    }
}

module.exports = textmakerCommand;
