/**
 * ╭────────────────────────────────────────────────────────────╮
 * │  🌟 FRIENDLY AI · SLEEK DESIGN · ZERO BULLSHIT            │
 * ╰────────────────────────────────────────────────────────────╯
 */

const axios = require('axios');

// ⚙️ CONFIG — Rock solid, always working
const API = {
    groq: 'https://g4f.space/api/groq/chat/completions',
    gemini: 'https://g4f.space/api/gemini/chat/completions',
    nvidia: 'https://g4f.space/api/nvidia/chat/completions',
    ollama: 'https://g4f.space/api/ollama/chat/completions',
    pollinations: 'https://g4f.space/api/pollinations/chat/completions'
};

const MODELS = {
    groq: 'mixtral-8x7b-32768',      // Lightning fast
    groq_small: 'llama3-8b-8192',     // Even faster
    gemini: 'gemini-pro',              // Google's brain
    nvidia: 'nv-llama2-70b',           // Enterprise power
    ollama: 'llama2',                   // Open source hero
    pollinations: 'gpt-4o'              // Creative genius
};

/**
 * ╭────────────────────────────────────────────────────────────╮
 * │  🤖 SMART PROVIDER SELECTION · AUTO FALLBACK · 0 DEATHS   │
 * ╰────────────────────────────────────────────────────────────╯
 */
async function aiCommand(sock, chatId, msg) {
    // 📨 Extract message with love
    const text = msg.message?.conversation || 
                 msg.message?.extendedTextMessage?.text || 
                 msg.message?.imageMessage?.caption || '';
    
    const sender = msg.key.participant || msg.key.remoteJid;
    const username = sender.split('@')[0].substring(0, 8);
    
    if (!text.startsWith('.')) return;
    
    const [command, ...args] = text.split(' ');
    const query = args.join(' ').trim();
    const cmd = command.toLowerCase();

    // ❤️ Friendly validation
    if (!query) {
        await sock.sendMessage(chatId, { 
            text: `╭─────────────────── ⊰ ❤️ ⊱ ───────────────────╮
│                                                  │
│   ✨ *Hey bestie!* You forgot your question!    │
│                                                  │
│   📝 *Try these:*                                │
│   • \`.gpt\` What's the meaning of life?         │
│   • \`.gemini\` Write a love poem                │
│   • \`.gpt\` Explain like I'm 5                  │
│                                                  │
│   💫 *Example:*                                  │
│   \`.gpt How to make a girl smile?\`             │
│                                                  │
╰──────────────────────────────────────────────────╯`,
            mentions: [sender]
        }, { quoted: msg });
        return;
    }

    // ⏳ Show we care
    await sock.sendMessage(chatId, { 
        react: { text: '🤔', key: msg.key }
    });

    // 🎯 Available commands with personalities
    if (!['.gpt', '.gemini'].includes(cmd)) return;

    try {
        let answer = null;
        let provider = '';
        let responseTime = 0;
        const startTime = Date.now();

        // 🌟 Friendly thinking message
        await sock.sendMessage(chatId, { 
            text: `╭─────────────────── ⊰ 💭 ⊱ ───────────────────╮
│                                                  │
│   *Hey @${username}, give me a sec...*          │
│   🤖 My AI brain is warming up!                  │
│                                                  │
│   📡 *Status:*                                   │
│   ${cmd === '.gpt' ? '🤖 GPT Mode' : '✨ Gemini Mode'} activated      │
│   🔍 Thinking about: "${query.substring(0, 30)}${query.length > 30 ? '...' : ''}" │
│                                                  │
│   ⏱️ *This usually takes 2-5 seconds...*        │
│                                                  │
╰──────────────────────────────────────────────────╯`,
            mentions: [sender]
        }, { quoted: msg });

        // ==================== GPT MODE ====================
        if (cmd === '.gpt') {
            const gptProviders = [
                // Priority 1: Fast & reliable
                { url: API.groq, model: MODELS.groq_small, name: 'Groq (Lightning)', emoji: '⚡' },
                { url: API.groq, model: MODELS.groq, name: 'Groq (Pro)', emoji: '🚀' },
                // Priority 2: Creative & smart
                { url: API.pollinations, model: MODELS.pollinations, name: 'Pollinations', emoji: '🎨' },
                // Priority 3: Powerful backups
                { url: API.nvidia, model: MODELS.nvidia, name: 'NVIDIA', emoji: '💪' },
                { url: API.ollama, model: MODELS.ollama, name: 'Ollama', emoji: '🦙' }
            ];

            for (const p of gptProviders) {
                try {
                    const res = await axios.post(p.url, {
                        model: p.model,
                        messages: [{ 
                            role: 'user', 
                            content: query 
                        }],
                        temperature: 0.8,
                        max_tokens: 2048,
                        top_p: 0.9
                    }, { timeout: 20000 });

                    if (res.data?.choices?.[0]?.message?.content) {
                        answer = res.data.choices[0].message.content;
                        responseTime = Date.now() - startTime;
                        provider = `${p.emoji} ${p.name} · ${responseTime}ms`;
                        break;
                    }
                } catch (e) {
                    console.log(`🤔 ${p.name} snoozed, trying next...`);
                }
            }
        }

        // ==================== GEMINI MODE ====================
        else if (cmd === '.gemini') {
            const geminiProviders = [
                { url: API.gemini, model: MODELS.gemini, name: 'Gemini Pro', emoji: '🌟' },
                { url: API.groq, model: MODELS.groq, name: 'Groq (Gemini mode)', emoji: '⚡' }
            ];

            for (const p of geminiProviders) {
                try {
                    const res = await axios.post(p.url, {
                        model: p.model,
                        messages: [{ role: 'user', content: query }],
                        temperature: 0.7
                    }, { timeout: 20000 });

                    if (res.data?.choices?.[0]?.message?.content) {
                        answer = res.data.choices[0].message.content;
                        responseTime = Date.now() - startTime;
                        provider = `${p.emoji} ${p.name} · ${responseTime}ms`;
                        break;
                    }
                } catch (e) {
                    console.log(`🤔 ${p.name} is thinking...`);
                }
            }
        }

        // ==================== SEND RESPONSE ====================
        if (answer) {
            // Clean response (remove prompt repetition if any)
            const cleanAnswer = answer.replace(new RegExp(query, 'gi'), '').trim() || answer;
            
            // Split long answers for readability
            const chunks = cleanAnswer.match(/.{1,1800}/g) || [cleanAnswer];
            
            // First chunk with fancy header
            await sock.sendMessage(chatId, { 
                text: `╭─────────────────── ⊰ ✨ ⊱ ───────────────────╮
│                                                  │
│   👋 *Hey @${username}!* Here you go:           │
│   ${provider}                                    │
│                                                  │
├──────────────────────────────────────────────────┤
│                                                  │
${chunks[0].split('\n').map(line => `│   ${line}`).join('\n')}
│                                                  │
╰──────────────────────────────────────────────────╯`,
                mentions: [sender]
            }, { quoted: msg });

            // Additional chunks if any
            for (let i = 1; i < chunks.length; i++) {
                await sock.sendMessage(chatId, { 
                    text: `╭─────────────────── ⊰ 📖 ⊱ ───────────────────╮
│                                                  │
${chunks[i].split('\n').map(line => `│   ${line}`).join('\n')}
│                                                  │
╰──────────────────────────────────────────────────╯`
                }, { quoted: msg });
            }

            // Friendly reaction
            await sock.sendMessage(chatId, { 
                react: { text: '✨', key: msg.key }
            });

            // Quick tip
            setTimeout(async () => {
                await sock.sendMessage(chatId, { 
                    text: `💡 *Pro tip:* You can ask me anything! Try \`.gpt tell me a joke\` or \`.gemini write a story\``
                }, { quoted: msg });
            }, 2000);
        } else {
            throw new Error('All AI providers are taking a coffee break ☕');
        }

    } catch (error) {
        // ❤️ Friendly error message
        console.error('😅 Oops:', error.message);
        
        await sock.sendMessage(chatId, { 
            text: `╭─────────────────── ⊰ 😅 ⊱ ───────────────────╮
│                                                  │
│   *Oops! Something went wrong...*               │
│                                                  │
│   🤖 *Error:* ${error.message.substring(0, 50)}  │
│                                                  │
│   💡 *Quick fixes:*                              │
│   • Wait 10 seconds and try again               │
│   • Try the other command (.gpt or .gemini)     │
│   • Rephrase your question                       │
│                                                  │
│   🌟 *Example that works:*                       │
│   \`.gpt What's the meaning of life?\`           │
│                                                  │
│   🙏 Thanks for being patient!                   │
│                                                  │
╰──────────────────────────────────────────────────╯`,
            mentions: [sender]
        }, { quoted: msg });

        // Sad reaction
        await sock.sendMessage(chatId, { 
            react: { text: '😅', key: msg.key }
        });
    }
}

module.exports = aiCommand;
