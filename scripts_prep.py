# Подготовка ассетов для сайта (DESIGN.md §8). Исходники в assets/ не меняются.
from PIL import Image, ImageFilter
import glob, io, os

def save_webp(im, path, target_kb=380):
    for q in range(88, 50, -4):
        b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6)
        if b.tell() <= target_kb * 1024: break
    open(path, 'wb').write(b.getvalue()); print(path, im.size, b.tell() // 1024, 'KB q', q)

# Сцены: ~1672x941 -> 2560x1440 Lanczos + лёгкая резкость
SCENES = {'01-cafe-morning': 'kofeynya', '02-cow': 'moloko', '03-spring': 'voda', '04-bar': 'assortiment', '05-cafe-evening': 'zayavka'}
os.makedirs('public/img/scenes', exist_ok=True)
for src, name in SCENES.items():
    im = Image.open(f'assets/scenes/{src}.png').convert('RGB')
    big = im.resize((2560, 1440), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.2, 40, 2))
    save_webp(big, f'public/img/scenes/{name}.webp', 460)

# Эмблема: белый фон -> прозрачность, обрезка по содержимому
lg = Image.open('assets/logo-hd.png').convert('RGBA')
px = lg.load()
for y in range(lg.height):
    for x in range(lg.width):
        r, g, b, _ = px[x, y]
        a = max(0, min(255, (255 - min(r, g, b) - 14) * 3))
        if a == 0: px[x, y] = (0, 0, 0, 0); continue
        k = a / 255
        un = lambda c: max(0, min(255, round((c - 255 * (1 - k)) / k)))
        px[x, y] = (un(r), un(g), un(b), a)
lg = lg.crop(lg.getbbox())
lg.resize((lg.width // 2, lg.height // 2), Image.LANCZOS).save('public/img/logo.png', optimize=True)
print('logo', lg.size)
# favicon: только голова коровы
head = lg.crop((0, 0, round(lg.width * 0.5), round(lg.height * 0.7)))
s = max(head.size); sq = Image.new('RGBA', (s, s)); sq.paste(head, ((s - head.width) // 2, (s - head.height) // 2))
sq.resize((64, 64), Image.LANCZOS).save('public/favicon.png'); print('favicon', head.size)

# Каталог: фото с сайта клиента (372x279) -> x2 Lanczos -> WebP
import glob, os
os.makedirs('public/img/catalog', exist_ok=True)
for f in glob.glob('assets/catalog-site/*.jpg'):
    name = os.path.splitext(os.path.basename(f))[0]
    im = Image.open(f).convert('RGB')
    im.resize((im.width * 2, im.height * 2), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1, 30, 2)).save(f'public/img/catalog/{name}.webp', quality=86, method=6)
    print('catalog', name, im.getpixel((2, 2)), im.getpixel((im.width - 3, im.height - 3)))
