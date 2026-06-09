from pathlib import Path
text = Path('index.js').read_text(encoding='utf-8')
idx = text.find("bot.command('clients'")
print('idx', idx)
print(repr(text[idx:idx+250]))
