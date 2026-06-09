from pathlib import Path
p = Path('index.js')
text = p.read_text(encoding='utf-8').replace('\r\n', '\n')

def patch_block(command, old, new):
    start = text.find(f"bot.command('{command}'")
    if start == -1:
        raise SystemExit(f"command {command} not found")
    end = text.find('});', start)
    if end == -1:
        raise SystemExit(f"end of command {command} not found")
    end += 3
    block = text[start:end]
    if old not in block:
        raise SystemExit(f"old pattern not found in {command} block: {repr(old[:80])}")
    return text[:start] + block.replace(old, new, 1) + text[end:]

text = patch_block('clients',
    "return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown' });",
    "return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown', ...buildMainKeyboard() });")
text = patch_block('clients',
    "ctx.reply(`📋 *לקוחות:*\n\n${formatClientList(clients)}`, { parse_mode: 'Markdown' });",
    "ctx.reply(`📋 *לקוחות:*\n\n${formatClientList(clients)}`, { parse_mode: 'Markdown', ...buildMainKeyboard() });")
text = patch_block('status',
    "ctx.reply(`📊 *סטטוס מהיר*\n\n${summary}`, { parse_mode: 'Markdown' });",
    "ctx.reply(`📊 *סטטוס מהיר*\n\n${summary}`, { parse_mode: 'Markdown', ...buildMainKeyboard() });")
text = patch_block('addclient',
    "ctx.reply('➕ *הוספת לקוח חדש*\n\nמה שם הלקוח / איש הקשר?\n\n_שלח /cancel בכל שלב לביטול_', { parse_mode: 'Markdown' });",
    "ctx.reply('➕ *הוספת לקוח חדש*\n\nמה שם הלקוח / איש הקשר?\n\n_שלח /cancel בכל שלב לביטול_', { parse_mode: 'Markdown', ...buildCancelKeyboard() });")
text = patch_block('updateclient',
    "return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown' });",
    "return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown', ...buildMainKeyboard() });")
text = patch_block('updateclient',
    "ctx.reply(`📋 בחר לקוח לעדכון סטטוס:\n\n${formatClientList(clients)}`, { parse_mode: 'Markdown' });",
    "ctx.reply(`📋 בחר לקוח לעדכון סטטוס:\n\n${formatClientList(clients)}`, { parse_mode: 'Markdown', ...buildCancelKeyboard() });")
text = patch_block('quote',
    "return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown' });",
    "return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown', ...buildMainKeyboard() });")
text = patch_block('quote',
    "ctx.reply(`📋 בחר לקוח להצעת מחיר:\n\n${formatClientList(clients)}`, { parse_mode: 'Markdown' });",
    "ctx.reply(`📋 בחר לקוח להצעת מחיר:\n\n${formatClientList(clients)}`, { parse_mode: 'Markdown', ...buildCancelKeyboard() });")
text = patch_block('report',
    "ctx.reply(`📨 *דוח מהיר*\n\n${text}`, { parse_mode: 'Markdown' });",
    "ctx.reply(`📨 *דוח מהיר*\n\n${text}`, { parse_mode: 'Markdown', ...buildMainKeyboard() });")
text = patch_block('models',
    "return ctx.reply('❌ לא הצלחתי לקבל את רשימת המודלים כרגע. נסה שוב מעט מאוחר יותר.', { parse_mode: 'Markdown' });",
    "return ctx.reply('❌ לא הצלחתי לקבל את רשימת המודלים כרגע. נסה שוב מעט מאוחר יותר.', { parse_mode: 'Markdown', ...buildMainKeyboard() });")
text = patch_block('models',
    "ctx.reply(`🧠 *מודלים זמינים*\n\n${list}\n\nלהפעלת מצב שיחה: /model <model-id>`, { parse_mode: 'Markdown' });",
    "ctx.reply(`🧠 *מודלים זמינים*\n\n${list}\n\nלהפעלת מצב שיחה: /model <model-id>`, { parse_mode: 'Markdown', ...buildMainKeyboard() });")
text = patch_block('model',
    "return ctx.reply('📌 שלח /models כדי לראות מספר מודלים, או /model <model-id> כדי לבחור מודל ולהיכנס למצב שיחה.', { parse_mode: 'Markdown' });",
    "return ctx.reply('📌 שלח /models כדי לראות מספר מודלים, או /model <model-id> כדי לבחור מודל ולהיכנס למצב שיחה.', { parse_mode: 'Markdown', ...buildMainKeyboard() });")
text = patch_block('model',
    "ctx.reply(`✅ מצב שיחה מופעל עם המודל: *${raw}*\nשלח הודעה עכשיו. לצאת: /exit-chat`, { parse_mode: 'Markdown' });",
    "ctx.reply(`✅ מצב שיחה מופעל עם המודל: *${raw}*\nשלח הודעה עכשיו. לצאת: /exit-chat`, { parse_mode: 'Markdown', ...buildMainKeyboard() });")

# Patch the conversation fallback and quick menu keyboard in the text handler
menu_start = text.find("if (['תפריט', 'מנו', 'menu', '0'].includes(lower)) {")
if menu_start == -1:
    raise SystemExit('menu fallback not found')
menu_end = text.find('return ctx.reply(buildQuickReply()', menu_start)
old = "return ctx.reply(buildQuickReply(), { parse_mode: 'Markdown' });"
new = "return ctx.reply(buildQuickReply(), { parse_mode: 'Markdown', ...buildMainKeyboard() });"
if old not in text[menu_start:menu_end+200]:
    raise SystemExit('menu fallback line not found')
text = text.replace(old, new, 1)

old = "ctx.reply('❓ לא הבנתי. שלח /menu לתפריט או /help לעזרה.', { parse_mode: 'Markdown' });"
new = "ctx.reply('❓ לא הבנתי. שלח /menu לתפריט או /help לעזרה.', { parse_mode: 'Markdown', ...buildMainKeyboard() });"
if old not in text:
    raise SystemExit('unknown fallback not found')
text = text.replace(old, new, 1)

old = "return ctx.reply('➕ *הוספת לקוח חדש*\n\nמה שם הלקוח / איש הקשר?\n\n_שלח /cancel בכל שלב לביטול_', { parse_mode: 'Markdown' });"
new = "return ctx.reply('➕ *הוספת לקוח חדש*\n\nמה שם הלקוח / איש הקשר?\n\n_שלח /cancel בכל שלב לביטול_', { parse_mode: 'Markdown', ...buildCancelKeyboard() });"
if old not in text:
    raise SystemExit('manual addclient line not found')
text = text.replace(old, new, 1)

old = "return ctx.reply(`📋 בחר לקוח לעדכון סטטוס:\n\n${formatClientList(clients)}`, { parse_mode: 'Markdown' });"
new = "return ctx.reply(`📋 בחר לקוח לעדכון סטטוס:\n\n${formatClientList(clients)}`, { parse_mode: 'Markdown', ...buildCancelKeyboard() });"
if old not in text:
    raise SystemExit('manual updateclient line not found')
text = text.replace(old, new, 1)

old = "return ctx.reply(`📋 בחר לקוח להצעת מחיר:\n\n${formatClientList(clients)}`, { parse_mode: 'Markdown' });"
new = "return ctx.reply(`📋 בחר לקוח להצעת מחיר:\n\n${formatClientList(clients)}`, { parse_mode: 'Markdown', ...buildCancelKeyboard() });"
if old not in text:
    raise SystemExit('manual quote line not found')
text = text.replace(old, new, 1)

p.write_text(text.replace('\n', '\r\n'), encoding='utf-8')
print('patched')
