const fs = require('fs');
const path = require('path');

const dataFilePath = path.join(__dirname, '..', 'data', 'messageCount.json');

function loadMessageCounts() {
    if (fs.existsSync(dataFilePath)) {
        const data = fs.readFileSync(dataFilePath);
        return JSON.parse(data);
    }
    return {};
}

function saveMessageCounts(messageCounts) {
    fs.writeFileSync(dataFilePath, JSON.stringify(messageCounts, null, 2));
}

function incrementMessageCount(groupId, userId) {
    const messageCounts = loadMessageCounts();

    if (!messageCounts[groupId]) {
        messageCounts[groupId] = {};
    }

    if (!messageCounts[groupId][userId]) {
        messageCounts[groupId][userId] = 0;
    }

    messageCounts[groupId][userId] += 1;

    saveMessageCounts(messageCounts);
}

function topMembers(sock, chatId, isGroup, message) {
    if (!isGroup) {
        sock.sendMessage(chatId, { 
            text: "👥 *This command only works in groups!*", 
            quoted: message 
        });
        return;
    }

    const messageCounts = loadMessageCounts();
    const groupCounts = messageCounts[chatId] || {};

    const sortedMembers = Object.entries(groupCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10); // Get top 10 members

    if (sortedMembers.length === 0) {
        sock.sendMessage(chatId, { 
            text: "📊 *No activity yet*\n_Start chatting to appear on the leaderboard!_", 
            quoted: message 
        });
        return;
    }

    // Calculate total messages
    const totalMessages = Object.values(groupCounts).reduce((a, b) => a + b, 0);
    
    const medals = ['🥇', '🥈', '🥉'];
    let messageText = `
╭─「 🏆 *LEADERBOARD* 」─╮
│
│  📊 *Total Messages:* ${totalMessages}
│  👥 *Active Members:* ${sortedMembers.length}
│
│  *Top Chatters:*
│
`;

    sortedMembers.forEach(([userId, count], index) => {
        const medal = index < 3 ? medals[index] : '   ';
        const percentage = ((count / totalMessages) * 100).toFixed(1);
        const bar = '█'.repeat(Math.floor(percentage / 10)) + '░'.repeat(10 - Math.floor(percentage / 10));
        messageText += `│  ${medal} ${index + 1}. @${userId.split('@')[0]}\n`;
        messageText += `│     └─ 📝 ${count} msgs (${percentage}%)\n`;
        messageText += `│        ${bar}\n`;
        if (index < sortedMembers.length - 1) messageText += `│\n`;
    });

    messageText += `
╰──────────────────────╯

💬 _Keep the conversation going!_`.trim();

    sock.sendMessage(chatId, { 
        text: messageText, 
        mentions: sortedMembers.map(([userId]) => userId),
        quoted: message 
    });
    
    // Send reaction
    sock.sendMessage(chatId, { react: { text: "🏆", key: message.key } });
}

module.exports = { incrementMessageCount, topMembers };
