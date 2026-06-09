from pathlib import Path
p = Path('index.js')
text = p.read_text(encoding='utf-8')
replacements = [
    (
        '''bot.command('clients', ctx => {
  registerChat(ctx);
  const clients = getClients();
  if (clients.length === 0) {
    return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown' });
  }
  ctx.reply(`📋 *לקוחות:*

${formatClientList(clients)}`, { parse_mode: 'Markdown' });
});''',
        '''bot.command('clients', ctx => {
  registerChat(ctx);
  const clients = getClients();
  if (clients.length === 0) {
    return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown', ...buildMainKeyboard() });
  }
  ctx.reply(`📋 *לקוחות:*

${formatClientList(clients)}`, { parse_mode: 'Markdown', ...buildMainKeyboard() });
});'''
    ),
    (
        '''bot.command('status', ctx => {
  registerChat(ctx);
  const clients = getClients();
  const summary = clients.length === 0
    ? '_אין לקוחות פעילים כרגע._'
    : clients.map((c, i) => clientSummary(c, i)).join('\n\n');
  ctx.reply(`📊 *סטטוס מהיר*\n\n${summary}`, { parse_mode: 'Markdown' });
});''',
        '''bot.command('status', ctx => {
  registerChat(ctx);
  const clients = getClients();
  const summary = clients.length === 0
    ? '_אין לקוחות פעילים כרגע._'
    : clients.map((c, i) => clientSummary(c, i)).join('\n\n');
  ctx.reply(`📊 *סטטוס מהיר*\n\n${summary}`, { parse_mode: 'Markdown', ...buildMainKeyboard() });
});'''
    ),
    (
        '''bot.command('addclient', ctx => {
  registerChat(ctx);
  const session = getSession(ctx.from.id);
  session.state = 'add_name';
  session.data = {};
  ctx.reply('➕ *הוספת לקוח חדש*\n\nמה שם הלקוח / איש הקשר?\n\n_שלח /cancel בכל שלב לביטול_', { parse_mode: 'Markdown' });
});''',
        '''bot.command('addclient', ctx => {
  registerChat(ctx);
  const session = getSession(ctx.from.id);
  session.state = 'add_name';
  session.data = {};
  ctx.reply('➕ *הוספת לקוח חדש*\n\nמה שם הלקוח / איש הקשר?\n\n_שלח /cancel בכל שלב לביטול_', { parse_mode: 'Markdown', ...buildCancelKeyboard() });
});'''
    ),
    (
        '''bot.command('updateclient', ctx => {
  registerChat(ctx);
  const clients = getClients();
  if (clients.length === 0) {
    return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown' });
  }
  const session = getSession(ctx.from.id);
  session.state = 'update_select';
  session.data = {};
  ctx.reply(`📋 בחר לקוח לעדכון סטטוס:\n\n${formatClientList(clients)}`, { parse_mode: 'Markdown' });
});''',
        '''bot.command('updateclient', ctx => {
  registerChat(ctx);
  const clients = getClients();
  if (clients.length === 0) {
    return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown', ...buildMainKeyboard() });
  }
  const session = getSession(ctx.from.id);
  session.state = 'update_select';
  session.data = {};
  ctx.reply(`📋 בחר לקוח לעדכון סטטוס:\n\n${formatClientList(clients)}`, { parse_mode: 'Markdown', ...buildCancelKeyboard() });
});'''
    ),
    (
        '''bot.command('quote', ctx => {
  registerChat(ctx);
  const clients = getClients();
  if (clients.length === 0) {
    return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown' });
  }
  const session = getSession(ctx.from.id);
  session.state = 'quote_select';
  session.data = {};
  ctx.reply(`📋 בחר לקוח להצעת מחיר:\n\n${formatClientList(clients)}`, { parse_mode: 'Markdown' });
});''',
        '''bot.command('quote', ctx => {
  registerChat(ctx);
  const clients = getClients();
  if (clients.length === 0) {
    return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown', ...buildMainKeyboard() });
  }
  const session = getSession(ctx.from.id);
  session.state = 'quote_select';
  session.data = {};
  ctx.reply(`📋 בחר לקוח להצעת מחיר:\n\n${formatClientList(clients)}`, { parse_mode: 'Markdown', ...buildCancelKeyboard() });
});'''
    ),
    (
        '''bot.command('report', ctx => {
  registerChat(ctx);
  const clients = getClients();
  const text = clients.length === 0
    ? '_אין לקוחות פעילים כרגע._'
    : clients.map((c, i) => clientSummary(c, i)).join('\n\n');
  ctx.reply(`📨 *דוח מהיר*\n\n${text}`, { parse_mode: 'Markdown' });
});''',
        '''bot.command('report', ctx => {
  registerChat(ctx);
  const clients = getClients();
  const text = clients.length === 0
    ? '_אין לקוחות פעילים כרגע._'
    : clients.map((c, i) => clientSummary(c, i)).join('\n\n');
  ctx.reply(`📨 *דוח מהיר*\n\n${text}`, { parse_mode: 'Markdown', ...buildMainKeyboard() });
});'''
    ),
    (
        '''bot.command('models', async ctx => {
  registerChat(ctx);
  const models = await fetchAvailableModels();
  if (models.length === 0) {
    return ctx.reply('❌ לא הצלחתי לקבל את רשימת המודלים כרגע. נסה שוב מעט מאוחר יותר.', { parse_mode: 'Markdown' });
  }
  const list = models.slice(0, 20).map(m => '• `" + m.id + "` - ' + m.name + ' (' + m.provider + ')').join('\n');
  ctx.reply(`🧠 *מודלים זמינים*\n\n${list}\n\nלהפעלת מצב שיחה: /model <model-id>`, { parse_mode: 'Markdown' });
});''',
        '''bot.command('models', async ctx => {
  registerChat(ctx);
  const models = await fetchAvailableModels();
  if (models.length === 0) {
    return ctx.reply('❌ לא הצלחתי לקבל את רשימת המודלים כרגע. נסה שוב מעט מאוחר יותר.', { parse_mode: 'Markdown', ...buildMainKeyboard() });
  }
  const list = models.slice(0, 20).map(m => '• `" + m.id + "` - ' + m.name + ' (' + m.provider + ')').join('\n');
  ctx.reply(`🧠 *מודלים זמינים*\n\n${list}\n\nלהפעלת מצב שיחה: /model <model-id>`, { parse_mode: 'Markdown', ...buildMainKeyboard() });
});'''
    ),
    (
        '''    if (!raw || raw.toLowerCase() === 'list') {
      return ctx.reply('📌 שלח /models כדי לראות מספר מודלים, או /model <model-id> כדי לבחור מודל ולהיכנס למצב שיחה.', { parse_mode: 'Markdown' });
    }

    setChatState(chatId, { model: raw, chatMode: true });''',
        '''    if (!raw || raw.toLowerCase() === 'list') {
      return ctx.reply('📌 שלח /models כדי לראות מספר מודלים, או /model <model-id> כדי לבחור מודל ולהיכנס למצב שיחה.', { parse_mode: 'Markdown', ...buildMainKeyboard() });
    }

    setChatState(chatId, { model: raw, chatMode: true });'''
    ),
    (
        '''  ctx.reply(`✅ מצב שיחה מופעל עם המודל: *${raw}*\nשלח הודעה עכשיו. לצאת: /exit-chat`, { parse_mode: 'Markdown' });
});''',
        '''  ctx.reply(`✅ מצב שיחה מופעל עם המודל: *${raw}*\nשלח הודעה עכשיו. לצאת: /exit-chat`, { parse_mode: 'Markdown', ...buildMainKeyboard() });
});'''
    ),
    (
        '''  if (['תפריט', 'מנו', 'menu', '0'].includes(lower)) {
    return ctx.reply(buildQuickReply(), { parse_mode: 'Markdown' });
  }

  if (['1', 'הוספת לקוח', 'addclient'].includes(lower)) {''',
        '''  if (['תפריט', 'מנו', 'menu', '0'].includes(lower)) {
    return ctx.reply(buildQuickReply(), { parse_mode: 'Markdown', ...buildMainKeyboard() });
  }

  if (['1', 'הוספת לקוח', 'addclient'].includes(lower)) {'''
    ),
    (
        '''    return ctx.reply('➕ *הוספת לקוח חדש*\n\nמה שם הלקוח / איש הקשר?\n\n_שלח /cancel בכל שלב לביטול_', { parse_mode: 'Markdown' });
  }

  if (['2', 'שינוי סטטוס לקוח', 'עדכון סטטוס', 'updateclient'].includes(lower)) {''',
        '''    return ctx.reply('➕ *הוספת לקוח חדש*\n\nמה שם הלקוח / איש הקשר?\n\n_שלח /cancel בכל שלב לביטול_', { parse_mode: 'Markdown', ...buildCancelKeyboard() });
  }

  if (['2', 'שינוי סטטוס לקוח', 'עדכון סטטוס', 'updateclient'].includes(lower)) {'''
    ),
    (
        '''    return ctx.reply(`📋 בחר לקוח לעדכון סטטוס:\n\n${formatClientList(clients)}`, { parse_mode: 'Markdown' });
  }

  if (['3', 'יצירת הצעת מחיר', 'quote'].includes(lower)) {''',
        '''    return ctx.reply(`📋 בחר לקוח לעדכון סטטוס:\n\n${formatClientList(clients)}`, { parse_mode: 'Markdown', ...buildCancelKeyboard() });
  }

  if (['3', 'יצירת הצעת מחיר', 'quote'].includes(lower)) {'''
    ),
    (
        '''    return ctx.reply(`📋 בחר לקוח להצעת מחיר:\n\n${formatClientList(clients)}`, { parse_mode: 'Markdown' });
  }

  
  if (session.chatMode) {''',
        '''    return ctx.reply(`📋 בחר לקוח להצעת מחיר:\n\n${formatClientList(clients)}`, { parse_mode: 'Markdown', ...buildCancelKeyboard() });
  }

  
  if (session.chatMode) {'''
    ),
    (
        '''  ctx.reply('❓ לא הבנתי. שלח /menu לתפריט או /help לעזרה.', { parse_mode: 'Markdown' });''',
        '''  ctx.reply('❓ לא הבנתי. שלח /menu לתפריט או /help לעזרה.', { parse_mode: 'Markdown', ...buildMainKeyboard() });'''
    )
]
for old, new in replacements:
    if old not in text:
        print('missing replacement:')
        print(repr(old[:200]))
        raise SystemExit(1)
    text = text.replace(old, new, 1)
p.write_text(text, encoding='utf-8')
print('patched')
