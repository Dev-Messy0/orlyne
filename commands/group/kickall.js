// commands/group/kickall.js
import { getMessages, formatMessage } from '../../Utils/langManager.js';

export default async function kickall(m, dvmsy) {
    const msg = getMessages(m.sender);
    
    if (!m.isGroup) {
        return dvmsy.sendMessage(m.chat, { 
            text: msg.onlyGroup
        });
    }
    
    if (!m.isOwner) {
        return dvmsy.sendMessage(m.chat, { 
            text: msg.onlyOwner
        });
    }

    await dvmsy.sendMessage(m.chat, {
        text: formatMessage(msg.kickall_warning, { prefix: m.prefix })
    });

    if (m.args[0] !== 'CONFIRMER') return;

    const nonAdmins = m.participants.filter(p => 
        !p.admin && 
        !p.id.includes(dvmsy.user.id.split(':')[0]) &&
        p.id !== m.sender
    );

    if (nonAdmins.length === 0) {
        return dvmsy.sendMessage(m.chat, { 
            text: msg.kickall_no_members
        });
    }

    await dvmsy.sendMessage(m.chat, {
        text: formatMessage(msg.kickall_progress, { count: nonAdmins.length })
    });

    let kickedAll = [];
    let failedAll = [];

    for (let i = 0; i < nonAdmins.length; i += 5) {
        const batch = nonAdmins.slice(i, i + 5);
        
        for (let member of batch) {
            try {
                await dvmsy.groupParticipantsUpdate(m.chat, [member.id], "remove");
                kickedAll.push(member.id);
            } catch (error) {
                console.error('Erreur expulsion massive:', error);
                failedAll.push(member.id);
            }
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    let kickAllResult = formatMessage(msg.kickall_result, {
        kicked: kickedAll.length,
        failed: failedAll.length
    });

    await dvmsy.sendMessage(m.chat, { text: kickAllResult });
}