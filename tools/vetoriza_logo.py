# Vetoriza o logo do Pausa Certa (PNG com fundo transparente) em caminhos SVG: símbolo, PAUSA e CERTA.
# Uso: python3 vetoriza_logo.py logo.png  ->  logo.json (os caminhos usados em dashboard/src/data/logo.js)
import json, sys
import numpy as np, cv2
from PIL import Image
im = np.array(Image.open(sys.argv[1]).convert('RGBA')).astype(np.float32)
a, g = im[..., 3], im[..., 1]
ESC = 4
def caminhos(mascara_alpha, ox=0, oy=0):
    big = cv2.resize(mascara_alpha, None, fx=ESC, fy=ESC, interpolation=cv2.INTER_CUBIC)
    big = cv2.GaussianBlur(big, (0, 0), 1.2)
    bw = (big > 127).astype(np.uint8)
    cs, hier = cv2.findContours(bw, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    d = []
    for c in cs:
        if cv2.contourArea(c) < 40 * ESC * ESC: continue
        c = cv2.approxPolyDP(c, 1.1, True).reshape(-1, 2) / ESC
        d.append('M' + 'L'.join(f'{x - ox:.1f},{y - oy:.1f}' for x, y in c) + 'Z')
    return ''.join(d)
claro = (g > 85) & (a > 200)
# só componentes grandes (as letras de CERTA), sem pontinhos soltos de borda
n, rot, est, _ = cv2.connectedComponentsWithStats(claro.astype(np.uint8))
claro = np.isin(rot, [i for i in range(1, n) if est[i, cv2.CC_STAT_AREA] > 300])
alpha = a.copy()
H, W = a.shape
# CERTA = pixels verde-claro (e a borda suave ao redor deles)
mclaro = cv2.dilate(claro.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
a_certa = np.where(mclaro, alpha, 0)
a_escuro = np.where(mclaro, 0, alpha)
# separa símbolo (esquerda) e PAUSA (direita) pela coluna vazia entre eles
cols = (a_escuro > 128).sum(0)
vazio = [x for x in range(600, 900) if cols[x] == 0]
corte = vazio[len(vazio) // 2]
a_simb = a_escuro.copy(); a_simb[:, corte:] = 0
a_pausa = a_escuro.copy(); a_pausa[:, :corte] = 0
def caixa(m):
    ys, xs = np.where(m > 128); return [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
out = {'corte': corte}
for nome, m in [('simbolo', a_simb), ('pausa', a_pausa), ('certa', a_certa)]:
    out[nome] = {'caixa': caixa(m), 'd': caminhos(m)}
json.dump(out, open('logo.json', 'w'))
print(corte, {k: (v['caixa'], len(v['d'])) for k, v in out.items() if k != 'corte'})
