const axios = require('axios');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const webp = require('node-webpmux');
const crypto = require('crypto');

const ANIMU_BASE = 'https://api.some-random-api.com/animu';

function normalizeType(input) {
    const lower = (input || '').toLowerCase();
    if (lower === 'facepalm' || lower === 'face_palm') return 'face-palm';
    if (lower === 'quote' || lower === 'animu-quote' || lower === 'animuquote') return 'quote';
    return lower;
}

async function sendAnimu(sock, chatId, message, type) {
    await sock.sendPresenceUpdate('composing', chatId);
    
    const endpoint = `${ANIMU_BASE}/${type}`;
    const res = await axios.get(endpoint);
    const data = res.data || {};

    async function convertMediaToSticker(mediaBuffer, isAnimated) {
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        const inputExt = isAnimated ? 'gif' : 'jpg';
        const input = path.join(tmpDir, `animu_${Date.now()}.${inputExt}`);
        const output = path.join(tmpDir, `animu_${Date.now()}.webp`);
        fs.writeFileSync(input, mediaBuffer);

        const ffmpegCmd = isAnimated 
            ? `ffmpeg -y -i "${input}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,fps=15" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 60 -compression_level 6 "${output}"`
            : `ffmpeg -y -i "${input}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${output}"`;

        await new Promise((resolve, reject) => {
            exec(ffmpegCmd, (err) => (err ? reject(err) : resolve()));
        });

        let webpBuffer = fs.readFileSync(output);

        const img = new webp.Image();
        await img.load(webpBuffer);

        const json = {
            'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
            'sticker-pack-name': 'Anime Stickers',
            'emojis': ['🎌']
        };
        const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
        const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
        const exif = Buffer.concat([exifAttr, jsonBuffer]);
        exif.writeUIntLE(jsonBuffer.length, 14, 4);
        img.exif = exif;

        const finalBuffer = await img.save(null);

        try { fs.unlinkSync(input); } catch {}
        try { fs.unlinkSync(output); } catch {}
        return finalBuffer;
    }

    if (data.link) {
        const link = data.link;
        const lower = link.toLowerCase();
        const isGifLink = lower.endsWith('.gif');
        const isImageLink = lower.match(/\.(jpg|jpeg|png|webp)$/);

        if (isGifLink || isImageLink) {
            try {
                await sock.sendMessage(chatId, {
                    react: { text: '🎨', key: message.key }
                });
                
                const resp = await axios.get(link, {
                    responseType: 'arraybuffer',
                    timeout: 15000,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                const mediaBuf = Buffer.from(resp.data);
                const stickerBuf = await convertMediaToSticker(mediaBuf, isGifLink);
                await sock.sendMessage(
                    chatId,
                    { sticker: stickerBuf },
                    { quoted: message }
                );
                
                await sock.sendMessage(chatId, {
                    react: { text: '✅', key: message.key }
                });
                return;
            } catch (error) {
                console.error('Error converting media to sticker:', error);
            }
        }

        try {
            await sock.sendMessage(
                chatId,
                { image: { url: link }, caption: `🎌 *Anime:* ${type}` },
                { quoted: message }
            );
            await sock.sendMessage(chatId, {
                react: { text: '✅', key: message.key }
            });
            return;
        } catch {}
    }
    if (data.quote) {
        await sock.sendMessage(
            chatId,
            { text: `💭 *Anime Quote*\n\n"${data.quote}"` },
            { quoted: message }
        );
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });
        return;
    }

    await sock.sendMessage(
        chatId,
        { text: '❌ Failed to fetch animu.' },
        { quoted: message }
    );
}

async function animeCommand(sock, chatId, message, args) {
    const subArg = args && args[0] ? args[0] : '';
    const sub = normalizeType(subArg);

    const supported = [
        'nom', 'poke', 'cry', 'kiss', 'pat', 'hug', 'wink', 'face-palm', 'quote'
    ];

    try {
        await sock.sendPresenceUpdate('composing', chatId);
        
        if (!sub) {
            try {
                const res = await axios.get(ANIMU_BASE);
                const apiTypes = res.data && res.data.types ? res.data.types.map(s => s.replace('/animu/', '')).join(' ✦ ') : supported.join(' ✦ ');
                await sock.sendMessage(chatId, { 
                    text: `🎌 *Anime Commands*\n\n📌 *Usage:* \`.animu <type>\`\n\n✨ *Available Types:*\n✦ ${apiTypes}\n\n💡 *Example:* \`.animu hug\`` 
                }, { quoted: message });
            } catch {
                await sock.sendMessage(chatId, { 
                    text: `🎌 *Anime Commands*\n\n📌 *Usage:* \`.animu <type>\`\n\n✨ *Available Types:*\n✦ ${supported.join(' ✦ ')}\n\n💡 *Example:* \`.animu hug\`` 
                }, { quoted: message });
            }
            return;
        }

        if (!supported.includes(sub)) {
            await sock.sendMessage(chatId, { 
                react: { text: '❌', key: message.key }
            });
            await sock.sendMessage(chatId, { 
                text: `❌ *Invalid Type*\n\nPlease choose from:\n✦ ${supported.join(' ✦ ')}` 
            }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, {
            react: { text: '⏳', key: message.key }
        });

        await sendAnimu(sock, chatId, message, sub);
    } catch (err) {
        console.error('Error in animu command:', err);
        await sock.sendMessage(chatId, { 
            react: { text: '❌', key: message.key }
        });
        await sock.sendMessage(chatId, { 
            text: '❌ *Error*\n\nAn error occurred while fetching anime content.' 
        }, { quoted: message });
    }
}

module.exports = { animeCommand };
