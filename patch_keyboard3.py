from pathlib import Path
p = Path('index.js')
text = p.read_text(encoding='utf-8')
text = text.replace('\r\n', '\n')
replacements = [
    (
        "bot.command('clients', ctx => {\n  registerChat(ctx);\n  const clients = getClients();\n  if (clients.length === 0) {\n    return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown' });\n  }\n  ctx.reply(`📋 *לקוחות:*\n\n${formatClientList(clients)}`, { parse_mode: 'Markdown' });\n});",
        "bot.command('clients', ctx => {\n  registerChat(ctx);\n  const clients = getClients();\n  if (clients.length === 0) {\n    return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown', ...buildMainKeyboard() });\n  }\n  ctx.reply(`📋 *לקוחות:*\n\n${formatClientList(clients)}`, { parse_mode: 'Markdown', ...buildMainKeyboard() });\n});"
    ),
    (
        "bot.command('status', ctx => {\n  registerChat(ctx);\n  const clients = getClients();\n  const summary = clients.length === 0\n    ? '_אין לקוחות פעילים כרגע._'\n    : clients.map((c, i) => clientSummary(c, i)).join('\\n\\n');\n  ctx.reply(`📊 *סטטוס מהיר*\\n\\n${summary}`, { parse_mode: 'Markdown' });\n});",
        "bot.command('status', ctx => {\n  registerChat(ctx);\n  const clients = getClients();\n  const summary = clients.length === 0\n    ? '_אין לקוחות פעילים כרגע._'\n    : clients.map((c, i) => clientSummary(c, i)).join('\\n\\n');\n  ctx.reply(`📊 *סטטוס מהיר*\\n\\n${summary}`, { parse_mode: 'Markdown', ...buildMainKeyboard() });\n});"
    ),
    (
        "bot.command('addclient', ctx => {\n  registerChat(ctx);\n  const session = getSession(ctx.from.id);\n  session.state = 'add_name';\n  session.data = {};\n  ctx.reply('➕ *הוספת לקוח חדש*\\n\\nמה שם הלקוח / איש הקשר?\\n\\n_שלח /cancel בכל שלב לביטול_', { parse_mode: 'Markdown' });\n});",
        "bot.command('addclient', ctx => {\n  registerChat(ctx);\n  const session = getSession(ctx.from.id);\n  session.state = 'add_name';\n  session.data = {};\n  ctx.reply('➕ *הוספת לקוח חדש*\\n\\nמה שם הלקוח / איש הקשר?\\n\\n_שלח /cancel בכל שלב לביטול_', { parse_mode: 'Markdown', ...buildCancelKeyboard() });\n});"
    ),
    (
        "bot.command('updateclient', ctx => {\n  registerChat(ctx);\n  const clients = getClients();\n  if (clients.length === 0) {\n    return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown' });\n  }\n  const session = getSession(ctx.from.id);\n  session.state = 'update_select';\n  session.data = {};\n  ctx.reply(`📋 בחר לקוח לעדכון סטטוס:\\n\\n${formatClientList(clients)}`, { parse_mode: 'Markdown' });\n});",
        "bot.command('updateclient', ctx => {\n  registerChat(ctx);\n  const clients = getClients();\n  if (clients.length === 0) {\n    return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown', ...buildMainKeyboard() });\n  }\n  const session = getSession(ctx.from.id);\n  session.state = 'update_select';\n  session.data = {};\n  ctx.reply(`📋 בחר לקוח לעדכון סטטוס:\\n\\n${formatClientList(clients)}`, { parse_mode: 'Markdown', ...buildCancelKeyboard() });\n});"
    ),
    (
        "bot.command('quote', ctx => {\n  registerChat(ctx);\n  const clients = getClients();\n  if (clients.length === 0) {\n    return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown' });\n  }\n  const session = getSession(ctx.from.id);\n  session.state = 'quote_select';\n  session.data = {};\n  ctx.reply(`📋 בחר לקוח להצעת מחיר:\\n\\n${formatClientList(clients)}`, { parse_mode: 'Markdown' });\n});",
        "bot.command('quote', ctx => {\n  registerChat(ctx);\n  const clients = getClients();\n  if (clients.length === 0) {\n    return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown', ...buildMainKeyboard() });\n  }\n  const session = getSession(ctx.from.id);\n  session.state = 'quote_select';\n  session.data = {};\n  ctx.reply(`📋 בחר לקוח להצעת מחיר:\\n\\n${formatClientList(clients)}`, { parse_mode: 'Markdown', ...buildCancelKeyboard() });\n});"
    ),
    (
        "bot.command('report', ctx => {\n  registerChat(ctx);\n  const clients = getClients();\n  const text = clients.length === 0\n    ? '_אין לקוחות פעילים כרגע._'\n    : clients.map((c, i) => clientSummary(c, i)).join('\\n\\n');\n  ctx.reply(`📨 *דוח מהיר*\\n\\n${text}`, { parse_mode: 'Markdown' });\n});",
        "bot.command('report', ctx => {\n  registerChat(ctx);\n  const clients = getClients();\n  const text = clients.length === 0\n    ? '_אין לקוחות פעילים כרגע._'\n    : clients.map((c, i) => clientSummary(c, i)).join('\\n\\n');\n  ctx.reply(`📨 *דוח מהיר*\\n\\n${text}`, { parse_mode: 'Markdown', ...buildMainKeyboard() });\n});"
    ),
    (
        "bot.command('models', async ctx => {\n  registerChat(ctx);\n  const models = await fetchAvailableModels();\n  if (models.length === 0) {\n    return ctx.reply('❌ לא הצלחתי לקבל את רשימת המודלים כרגע. נסה שוב מעט מאוחר יותר.', { parse_mode: 'Markdown' });\n  }\n  const list = models.slice(0, 20).map(m => '• `" + m.id + "` - ' + m.name + ' (' + m.provider + ')').join('\\n');\n  ctx.reply(`🧠 *מודלים זמינים*\\n\\n${list}\\n\\nלהפעלת מצב שיחה: /model <model-id>`, { parse_mode: 'Markdown' });\n});",
        "bot.command('models', async ctx => {\n  registerChat(ctx);\n  const models = await fetchAvailableModels();\n  if (models.length === 0) {\n    return ctx.reply('❌ לא הצלחתי לקבל את רשימת המודלים כרגע. נסה שוב מעט מאוחר יותר.', { parse_mode: 'Markdown', ...buildMainKeyboard() });\n  }\n  const list = models.slice(0, 20).map(m => '• `" + m.id + "` - ' + m.name + ' (' + m.provider + ')').join('\\n');\n  ctx.reply(`🧠 *מודלים זמינים*\\n\\n${list}\\n\\nלהפעלת מצב שיחה: /model <model-id>`, { parse_mode: 'Markdown', ...buildMainKeyboard() });\n});"
    ),
    (
        "    if (!raw || raw.toLowerCase() === 'list') {\n      return ctx.reply('📌 שלח /models כדי לראות מספר מודלים, או /model <model-id> כדי לבחור מודל ולהיכנס למצב שיחה.', { parse_mode: 'Markdown' });\n    }\n\n    setChatState(chatId, { model: raw, chatMode: true });",
        "    if (!raw || raw.toLowerCase() === 'list') {\n      return ctx.reply('📌 שלח /models כדי לראות מספר מודלים, או /model <model-id> כדי לבחור מודל ולהיכנס למצב שיחה.', { parse_mode: 'Markdown', ...buildMainKeyboard() });\n    }\n\n    setChatState(chatId, { model: raw, chatMode: true });"
    ),
    (
        "  ctx.reply(`✅ מצב שיחה מופעל עם המודל: *${raw}*\\nשלח הודעה עכשיו. לצאת: /exit-chat`, { parse_mode: 'Markdown' });\n});",
        "  ctx.reply(`✅ מצב שיחה מופעל עם המודל: *${raw}*\\nשלח הודעה עכשיו. לצאת: /exit-chat`, { parse_mode: 'Markdown', ...buildMainKeyboard() });\n});"
    ),
    (
        "  if (['תפריט', 'מנו', 'menu', '0'].includes(lower)) {\n    return ctx.reply(buildQuickReply(), { parse_mode: 'Markdown' });\n  }\n\n  if (['1', 'הוספת לקוח', 'addclient'].includes(lower)) {",
        "  if (['תפריט', 'מנו', 'menu', '0'].includes(lower)) {\n    return ctx.reply(buildQuickReply(), { parse_mode: 'Markdown', ...buildMainKeyboard() });\n  }\n\n  if (['1', 'הוספת לקוח', 'addclient'].includes(lower)) {"
    ),
    (
        "    return ctx.reply('➕ *הוספת לקוח חדש*\\n\\nמה שם הלקוח / איש הקשר?\\n\\n_שלח /cancel בכל שלב לביטול_', { parse_mode: 'Markdown' });\n  }\n\n  if (['2', 'שינוי סטטוס לקוח', 'עדכון סטטוס', 'updateclient'].includes(lower)) {",
        "    return ctx.reply('➕ *הוספת לקוח חדש*\\n\\nמה שם הלקוח / איש הקשר?\\n\\n_שלח /cancel בכל שלב לביטול_', { parse_mode: 'Markdown', ...buildCancelKeyboard() });\n  }\n\n  if (['2', 'שינוי סטטוס לקוח', 'עדכון סטטוס', 'updateclient'].includes(lower)) {"
    ),
    (
        "    return ctx.reply(`📋 בחר לקוח לעדכון סטטוס:\\n\\n${formatClientList(clients)}`, { parse_mode: 'Markdown' });\n  }\n\n  if (['3', 'יצירת הצעת מחיר', 'quote'].includes(lower)) {",
        "    return ctx.reply(`📋 בחר לקוח לעדכון סטטוס:\\n\\n${formatClientList(clients)}`, { parse_mode: 'Markdown', ...buildCancelKeyboard() });\n  }\n\n  if (['3', 'יצירת הצעת מחיר', 'quote'].includes(lower)) {"
    ),
    (
        "    return ctx.reply(`📋 בחר לקוח להצעת מחיר:\\n\\n${formatClientList(clients)}`, { parse_mode: 'Markdown' });\n  }\n\n  \n  if (session.chatMode) {",
        "    return ctx.reply(`📋 בחר לקוח להצעת מחיר:\\n\\n${formatClientList(clients)}`, { parse_mode: 'Markdown', ...buildCancelKeyboard() });\n  }\n\n  \n  if (session.chatMode) {"
    ),
    (
        "  ctx.reply('❓ לא הבנתי. שלח /menu לתפריט או /help לעזרה.', { parse_mode: 'Markdown' });",
        "  ctx.reply('❓ לא הבנתי. שלח /menu לתפריט או /help לעזרה.', { parse_mode: 'Markdown', ...buildMainKeyboard() });"
    )
]
for old, new in replacements:
    if old not in text:
        print('missing replacement:')
        print(repr(old[:200]))
        raise SystemExit(1)
    text = text.replace(old, new, 1)
p.write_text(text.replace('\n', '\r\n'), encoding='utf-8')
print('patched')
