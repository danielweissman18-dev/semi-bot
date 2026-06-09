// ====================================
//  סמי בוט – תזמון הודעת בוקר
// ====================================

const cron  = require('node-cron');
const fs    = require('fs');
const config = require('./config');

function getClients() {
  try {
    return JSON.parse(fs.readFileSync('./clients.json', 'utf8'));
  } catch {
    return [];
  }
}

function buildMorningMessage(name) {
  const clients = getClients();
  const today = new Date().toLocaleDateString('he-IL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  let msg = `היי ${name} בוקר טוב ☀️\n`;
  msg += `כאן ${config.botName}, הנה סטטוס הלקוחות היומי שלך:\n`;
  msg += `📅 ${today}\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n\n`;

  if (clients.length === 0) {
    msg += '_אין לקוחות פעילים כרגע._\n\n';
    msg += 'שלח *תפריט* להוספת לקוח ראשון.';
  } else {
    clients.forEach((c, i) => {
      msg += `*${c.name}* – ${c.business}\n`;
      msg += `📝 ${c.status}\n`;
      if (i < clients.length - 1) msg += '\n';
    });
    msg += `\n━━━━━━━━━━━━━━━━━━\n`;
    msg += `סה"כ ${clients.length} לקוחות פעילים 💼`;
  }

  return msg;
}

function startScheduler(client) {
  const [hourStr, minuteStr] = config.morningTime.split(':');
  const hour   = parseInt(hourStr);
  const minute = parseInt(minuteStr);

  // שולח בשעה שהוגדרה בconfig, כל יום
  cron.schedule(`${minute} ${hour} * * *`, async () => {
    console.log(`📨 שולח הודעת בוקר (${config.morningTime})...`);
    try {
      const msg1 = buildMorningMessage(config.name1);
      const msg2 = buildMorningMessage(config.name2);
      await client.sendMessage(`${config.phone1}@c.us`, msg1);
      await client.sendMessage(`${config.phone2}@c.us`, msg2);
      console.log('✅ הודעות בוקר נשלחו בהצלחה!');
    } catch (e) {
      console.error('❌ שגיאה בשליחת הודעת בוקר:', e.message);
    }
  }, { timezone: config.timezone });

  console.log(`⏰ תזמון פעיל – הודעת בוקר כל יום ב-${config.morningTime} (${config.timezone})`);
}

module.exports = { startScheduler, buildMorningMessage };
