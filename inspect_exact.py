from pathlib import Path
text = Path('index.js').read_text('utf-8')
text_n = text.replace('\r\n', '\n')
idx = text_n.find("bot.command('clients', ctx => {")
print('idx', idx)
if idx != -1:
    print(repr(text_n[idx:idx+400]))
else:
    print('not found')
