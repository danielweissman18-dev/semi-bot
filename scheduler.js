// ====================================
//  סמי בוט – תזמון הודעת בוקר ל-Telegram
// ====================================

const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const DATA_DIR = __dirname;
const CHATS_FILE = path.join(DATA_DIR, 'chatIds.json');

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function getChats() {
  return readJson(CHATS_FILE, []);
}

function buildMorningMessage(chatName) {
  const clients = readJson(path.join(__dirname, 'clients.json'), []);
  const today = new Date().toLocaleDateString('he-IL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  let msg = `היי ${chatName} בוקר טוב ☀️\n`;
  msg += `כאן ${config.botName}, הנה סטטוס הלקוחות היומי שלך:\n`;
  msg += `📅 ${today}\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n\n`;

  if (clients.length === 0) {
    msg += '_אין לקוחות פעילים כרגע._\n\n';
    msg += 'שלח /menu להוספת לקוח ראשון.';
  } else {
    clients.forEach((c, i) => {
      msg += `*${c.business}* (${c.name})\n`;
      msg += `📝 ${c.status}\n`;
      if (i < clients.length - 1) msg += '\n';
    });
    msg += `\n━━━━━━━━━━━━━━━━━━\n`;
    msg += `סה"כ ${clients.length} לקוחות פעילים 💼`;
  }

  return msg;
}

function startScheduler(bot) {
  const [hourStr, minuteStr] = config.morningTime.split(':');
  const hour = parseInt(hourStr);
  const minute = parseInt(minuteStr);

  cron.schedule(`${minute} ${hour} * * *`, async () => {
    console.log(`📨 שולח דיווח בוקר (${config.morningTime})...`);
    const chats = getChats();
    if (chats.length === 0) {
      console.log("⚠️ אין צ'ט רשום לשליחת דיווח בוקר. שלח /start בבוט כדי להירשם.");
      return;
    }

    for (const chat of chats) {
      try {
        const message = buildMorningMessage(chat.name || 'משתמש');
        await bot.telegram.sendMessage(chat.id, message, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error(`❌ שגיאה בשליחת דיווח ל-${chat.id}:`, error.message || error);
      }
    }

    console.log('✅ דיווח בוקר נשלח לכל המשתמשים הרשומים.');
  }, { timezone: config.timezone });

  console.log(`⏰ Scheduler פעיל – דיווח בוקר כל יום ב-${config.morningTime} (${config.timezone})`);
}

module.exports = { startScheduler };
