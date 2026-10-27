import pathlib
d = pathlib.Path(__file__).parent
shell = (d / 'shell.html').read_text()
js = '\n'.join((d / f).read_text() for f in ['engine.js', 'art.js', 'sfx.js', 'music.js', 'scene.js', 'net.js', 'app.js'])
out = shell + '\n<script>\n' + js + '\n</script>\n'
(d / 'dist').mkdir(exist_ok=True)
(d / 'dist' / 'midnight-party.html').write_text(out)
print(len(out))
