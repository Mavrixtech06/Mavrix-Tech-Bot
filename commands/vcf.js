const fs = require('fs');
const path = require('path');

/**
 * Format phone number for VCF
 * @param {string} number - Raw phone number from WhatsApp JID
 * @returns {string} - Formatted international number
 */
const formatPhoneNumber = (number) => {
    // Remove @s.whatsapp.net suffix and any non-numeric characters
    const clean = number.split('@')[0].replace(/\D/g, '');
    return `+${clean}`;
};

/**
 * Extract raw number from JID
 * @param {string} jid - WhatsApp JID
 * @returns {string} - Raw number without @s.whatsapp.net
 */
const getRawNumber = (jid) => {
    return jid.split('@')[0].replace(/\D/g, '');
};

/**
 * Get contact name safely
 * @param {object} participant - Group participant object
 * @param {object} sock - Socket connection (unused but kept for compatibility)
 * @returns {string} - Contact name or number as fallback
 */
const getContactName = (participant) => {
    const number = getRawNumber(participant.id);
    
    // Try to get name from participant object
    // In Baileys, participant might have notify or name property
    let name = participant.notify || 
               participant.name || 
               participant.pushname || 
               number;
    
    // Clean name to remove invalid characters for VCF
    // But ensure we have a string first
    name = (name || number).toString().replace(/[^\w\s.]/g, ' ').replace(/\s+/g, ' ').trim();
    
    // If name is empty after cleaning, use number
    if (!name || name.length < 2) {
        name = number;
    }
    
    return name;
};

/**
 * Generate VCF content from group members
 * @param {Array} participants - Group participants array
 * @param {string} groupName - Name of the group
 * @returns {string} - Complete VCF content
 */
const generateVCF = (participants, groupName) => {
    let vcfContent = '';
    let successCount = 0;
    let failedCount = 0;
    
    // Add group info as first contact (optional but nice)
    vcfContent += 'BEGIN:VCARD\n';
    vcfContent += 'VERSION:3.0\n';
    vcfContent += `FN:📇 ${groupName} (Group)\n`;
    vcfContent += `N:Group;${groupName};;;\n`;
    vcfContent += `NOTE:WhatsApp Group: ${groupName}\n`;
    vcfContent += 'X-CLASS:GROUP\n';
    vcfContent += 'END:VCARD\n\n';
    
    // Process each member
    for (const participant of participants) {
        try {
            // Skip if participant is invalid
            if (!participant || !participant.id) {
                failedCount++;
                continue;
            }
            
            const rawNumber = getRawNumber(participant.id);
            const phoneNumber = formatPhoneNumber(participant.id);
            const name = getContactName(participant);
            
            // Skip if number is invalid (shouldn't happen but just in case)
            if (!rawNumber || rawNumber.length < 5) {
                failedCount++;
                continue;
            }
            
            // Determine admin status for note
            const isAdmin = participant.admin === 'admin' || participant.admin === 'superadmin';
            const adminStatus = isAdmin ? '👑 Admin' : '👤 Member';
            
            // Create VCF v3.0 format with WhatsApp-specific fields
            vcfContent += 'BEGIN:VCARD\n';
            vcfContent += 'VERSION:3.0\n';
            vcfContent += `FN:${name}\n`;
            
            // Split name for structured N field
            const nameParts = name.split(' ');
            const lastName = nameParts.pop() || '';
            const firstName = nameParts.join(' ') || lastName;
            vcfContent += `N:${lastName};${firstName};;;\n`;
            
            // WhatsApp preferred format with waid parameter
            vcfContent += `TEL;TYPE=CELL;TYPE=VOICE;TYPE=PREF;waid=${rawNumber}:${phoneNumber}\n`;
            
            // Add group and role information
            vcfContent += `ORG:${groupName}\n`;
            vcfContent += `ROLE:${adminStatus}\n`;
            vcfContent += `NOTE:Member of ${groupName} | ${adminStatus}\n`;
            
            // Add WhatsApp profile link
            vcfContent += `URL;TYPE=WhatsApp:https://wa.me/${rawNumber}\n`;
            
            // Add timestamp
            const now = new Date().toISOString().split('T')[0];
            vcfContent += `REV:${now}\n`;
            
            vcfContent += 'END:VCARD\n\n';
            
            successCount++;
            
        } catch (err) {
            console.error('Error processing participant:', err);
            failedCount++;
        }
    }
    
    return { vcfContent, successCount, failedCount };
};

/**
 * Main VCF command handler
 * @param {object} sock - Socket connection
 * @param {string} chatId - Chat ID
 * @param {object} message - Message object
 */
const vcfCommand = async (sock, chatId, message) => {
    const isGroup = chatId.endsWith('@g.us');
    
    if (!isGroup) {
        await sock.sendMessage(chatId, {
            text: '❌ This command can only be used in groups!',
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363161513685998@newsletter',
                    newsletterName: 'KnightBot MD',
                    serverMessageId: -1
                }
            }
        }, { quoted: message });
        return;
    }
    
    try {
        // Send initial processing message
        const processingMsg = await sock.sendMessage(chatId, {
            text: '⏳ *Generating VCF file...*\n```\n⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ 0%\n```\nPlease wait while I collect group members information.',
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363161513685998@newsletter',
                    newsletterName: 'KnightBot MD',
                    serverMessageId: -1
                }
            }
        }, { quoted: message });
        
        // Get group metadata
        const groupMetadata = await sock.groupMetadata(chatId);
        const groupName = groupMetadata.subject || 'Unknown Group';
        const participants = groupMetadata.participants || [];
        const totalMembers = participants.length;
        
        if (totalMembers === 0) {
            await sock.sendMessage(chatId, {
                text: '❌ No members found in this group!',
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363161513685998@newsletter',
                        newsletterName: 'KnightBot MD',
                        serverMessageId: -1
                    }
                }
            }, { quoted: message });
            return;
        }
        
        // Update progress
        await sock.sendMessage(chatId, {
            text: '⏳ *Generating VCF file...*\n```\n🟩🟩⬜⬜⬜⬜⬜⬜⬜⬜ 20%\n```\nProcessing group members...',
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363161513685998@newsletter',
                    newsletterName: 'KnightBot MD',
                    serverMessageId: -1
                }
            }
        }, { quoted: processingMsg });
        
        // Generate VCF content
        const { vcfContent, successCount, failedCount } = generateVCF(participants, groupName);
        
        // Update progress
        await sock.sendMessage(chatId, {
            text: '⏳ *Generating VCF file...*\n```\n🟩🟩🟩🟩🟩⬜⬜⬜⬜⬜ 50%\n```\nCreating VCF file...',
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363161513685998@newsletter',
                    newsletterName: 'KnightBot MD',
                    serverMessageId: -1
                }
            }
        }, { quoted: processingMsg });
        
        // Ensure temp directory exists
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Generate safe filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const safeGroupName = groupName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        const filename = `${safeGroupName}_${timestamp}.vcf`;
        const filePath = path.join(tempDir, filename);
        
        // Write VCF file with UTF-8 encoding
        fs.writeFileSync(filePath, vcfContent, 'utf8');
        
        // Update progress
        await sock.sendMessage(chatId, {
            text: '⏳ *Generating VCF file...*\n```\n🟩🟩🟩🟩🟩🟩🟩🟩⬜⬜ 80%\n```\nPreparing to send...',
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363161513685998@newsletter',
                    newsletterName: 'KnightBot MD',
                    serverMessageId: -1
                }
            }
        }, { quoted: processingMsg });
        
        // Read file for sending
        const fileBuffer = fs.readFileSync(filePath);
        
        // Generate stats
        const adminCount = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin').length;
        const memberCount = totalMembers - adminCount;
        
        // Send as document with rich caption
        await sock.sendMessage(chatId, {
            document: fileBuffer,
            mimetype: 'text/vcard',
            fileName: filename,
            caption: `📇 *Group Contacts Export*\n\n` +
                    `━━━━━━━━━━━━━━━━━━\n` +
                    `👥 *Group:* ${groupName}\n` +
                    `📊 *Statistics:*\n` +
                    `├ Total Members: ${totalMembers}\n` +
                    `├ 👑 Admins: ${adminCount}\n` +
                    `├ 👤 Members: ${memberCount}\n` +
                    `└ ✅ Exported: ${successCount}\n` +
                    `━━━━━━━━━━━━━━━━━━\n\n` +
                    `📱 *Compatible with:*\n` +
                    `• ✅ Android (Contacts app)\n` +
                    `• ✅ iOS (Contacts app)\n` +
                    `• ✅ Google Contacts\n` +
                    `• ✅ Outlook\n` +
                    `• ✅ Any VCF importer\n\n` +
                    `💡 *How to import:*\n` +
                    `1. Save this file to your phone\n` +
                    `2. Open Contacts app\n` +
                    `3. Import/Manage contacts\n` +
                    `4. Select this VCF file\n\n` +
                    `_✨ All contacts include WhatsApp numbers with waid parameter for better integration_`,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363161513685998@newsletter',
                    newsletterName: 'KnightBot MD',
                    serverMessageId: -1
                }
            }
        }, { quoted: message });
        
        // Clean up temp file after sending (with safety check)
        setTimeout(() => {
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`🧹 Cleaned up temp file: ${filename}`);
                }
            } catch (err) {
                console.error('Error deleting temp VCF file:', err);
            }
        }, 10000); // 10 seconds delay to ensure file is sent
        
    } catch (error) {
        console.error('Error in vcfCommand:', error);
        await sock.sendMessage(chatId, {
            text: `❌ *Failed to generate VCF file*\n\nError: ${error.message || 'Unknown error'}\n\nPlease try again later.`,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363161513685998@newsletter',
                    newsletterName: 'KnightBot MD',
                    serverMessageId: -1
                }
            }
        }, { quoted: message });
    }
};

module.exports = vcfCommand;
