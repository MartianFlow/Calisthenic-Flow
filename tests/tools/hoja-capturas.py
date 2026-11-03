# Junta varias capturas en una hoja (una al lado de otra) para revisarlas de un vistazo.
# Uso: python3 tests/tools/hoja-capturas.py salida.png ALTO captura1.png[:y0] captura2.png[:y0] ...
#   ALTO: alto máximo de cada recorte en px; y0: desde qué altura recortar (por defecto 0).
# Ejemplo (tras node tests/tools/auditar-diseno.js):
#   cd test-results/diseno && python3 ../../tests/tools/hoja-capturas.py /tmp/hoja.png 1400 hoy__375-dark.png hoy__375-dark.png:1400
# Con 3 o 4 capturas de 375 px el texto se sigue leyendo bien. Necesita Pillow (PIL).
import sys
from PIL import Image

out, H = sys.argv[1], int(sys.argv[2])
ims = []
for arg in sys.argv[3:]:
    f, _, y0 = arg.partition(':')
    y0 = int(y0 or 0)
    im = Image.open(f).convert('RGB')
    ims.append(im.crop((0, y0, im.width, min(im.height, y0 + H))))
W = sum(i.width for i in ims) + 8 * (len(ims) - 1)
sheet = Image.new('RGB', (W, max(i.height for i in ims)), (255, 0, 255))  # separación magenta
x = 0
for i in ims:
    sheet.paste(i, (x, 0))
    x += i.width + 8
sheet.save(out)
