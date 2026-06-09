from pathlib import Path
text = Path('index.js').read_text(encoding='utf-8')
needle = '  ctx.reply(\n    `🤖 *ברוך הבא ל-סמי בוט!*\n\n` +\n    `📋 שלח /menu כדי להתחיל\n` +\n    `❓ שלח /help לקבל עזרה\n` +\n    `📞 /clients - רשימת לקוחות`,\n    { parse_mode: \'Markdown\' }\n  );'
print('needle found:', needle in text)
idx = text.find('`📞 /clients - רשימת לקוחות`,')
print('idx', idx)
if idx != -1:
    print(repr(text[idx:idx+200]))
