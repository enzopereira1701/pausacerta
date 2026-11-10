"""Gera simulacao/diagram.json com fios em angulo reto e uma previa PNG que conta cruzamentos.

Coordenadas em px do Wokwi (as mesmas do pacote wokwi-elements). Cada fio e uma lista de pontos
absolutos, do pino de origem ao de destino; o script converte para as instrucoes "h"/"v" do Wokwi.
Uso: python3 gera_diagrama.py  ->  ../simulacao/diagram.json e ../docs/imagens/previa_diagrama.png
"""
import json, itertools, os
from PIL import Image, ImageDraw, ImageFont

MM = 3.7795
AQUI = os.path.dirname(os.path.abspath(__file__))

ESP_PINOS = {"VIN": (5, 158.5), "GND.2": (5, 149), "D13": (5, 139.5), "D12": (5, 130.4), "D14": (5, 120),
             "D27": (5, 110.8), "D26": (5, 101), "D25": (5, 91.3), "D33": (5, 81.7), "D32": (5, 72.2),
             "D35": (5, 62.9), "D34": (5, 53.1), "VN": (5, 44), "VP": (5, 34), "EN": (5, 24),
             "3V3": (101.3, 158.5), "GND.1": (101.3, 149), "D15": (101.3, 139.5), "D2": (101.3, 130.4),
             "D4": (101.3, 120), "RX2": (101.3, 110.8), "TX2": (101.3, 101), "D5": (101.3, 91.3),
             "D18": (101.3, 81.7), "D19": (101.3, 72.2), "D21": (101.3, 62.9), "RX0": (101.3, 53.1),
             "TX0": (101.3, 44), "D22": (101.3, 34), "D23": (101.3, 24)}
DS = {"GND": (1.46 * MM, 13 * MM), "DQ": (4 * MM, 13 * MM), "VCC": (6.54 * MM, 13 * MM)}
DHT = {"VCC": (15, 114.9), "SDA": (24.5, 114.9), "NC": (34.1, 114.9), "GND": (43.8, 114.9)}
HC = {"VCC": (71.3, 94.5), "TRIG": (81.3, 94.5), "ECHO": (91.3, 94.5), "GND": (101.3, 94.5)}
BTN = {"1.l": (0, 13), "2.l": (0, 32), "1.r": (67, 13), "2.r": (67, 32)}
OLED = {"GND": (10.1 * MM, 1.71 * MM), "VCC": (12.6 * MM, 1.71 * MM), "SCL": (15.1 * MM, 1.71 * MM), "SDA": (17.7 * MM, 1.71 * MM)}
LDR = {"VCC": (172, 16), "GND": (172, 26), "DO": (172, 35.8), "AO": (172, 45.5)}
LED = {"C": (15, 42), "A": (25, 42)}
BZ = {"1": (27, 84), "2": (37, 84)}
RES = {"1": (0, 5.65), "2": (58.8, 5.65)}

PECAS = {}
def peca(pid, tipo, left, top, w, h, pinos, attrs=None, rotulo=""):
    PECAS[pid] = dict(tipo=tipo, left=left, top=top, w=w, h=h, pinos=pinos, attrs=attrs or {}, rotulo=rotulo)

def P(ref):
    pid, pin = ref.split(":")
    p = PECAS[pid]; x, y = p["pinos"][pin]
    return (round(p["left"] + x, 2), round(p["top"] + y, 2))

FIOS = []
def fio(de, para, cor, *meio, rede=None):
    """meio: pontos intermediarios. Use X(x) / Y(y) para mover so num eixo a partir do ponto anterior."""
    pts = [P(de)]
    for m in meio:
        x0, y0 = pts[-1]
        if isinstance(m, X): pts.append((m.v, y0))
        elif isinstance(m, Y): pts.append((x0, m.v))
        else: pts.append(m)
    b = P(para)
    x0, y0 = pts[-1]
    if abs(x0 - b[0]) > 0.01 and abs(y0 - b[1]) > 0.01:
        raise ValueError(f"ultimo trecho diagonal em {de}->{para}: {(x0, y0)} -> {b}")
    pts.append(b)
    FIOS.append(dict(de=de, para=para, cor=cor, pts=pts, rede=rede or cor))

class X:
    def __init__(s, v): s.v = v
class Y:
    def __init__(s, v): s.v = v

# ============================ LAYOUT ============================
TFT = {"VCC": (48.3, 287.2), "GND": (57.9012, 287.2), "CS": (67.5024, 287.2), "RST": (77.1036, 287.2),
       "D/C": (86.7048, 287.2), "MOSI": (96.306, 287.2), "SCK": (105.9072, 287.2), "LED": (115.5084, 287.2),
       "MISO": (125.1096, 287.2)}
peca("esp", "wokwi-esp32-devkit-v1", 0, 0, 28.2 * MM, 54.053 * MM, ESP_PINOS)

ROW = -40                       # altura dos pinos da fileira da direita
BUS_GND, BUS_3V3 = -360, -375   # barramentos de alimentacao por cima de tudo (a tela e alta)
JOG = -30                       # degrau logo abaixo dos pinos, para entrar pelo lado de baixo

# ---- fileira da direita: tela, galao (nivel), ar, globo, botao, agua ----
peca("tft1", "wokwi-ili9341", 140, ROW - TFT["CS"][1], 46.5 * MM, 77.6 * MM, TFT, {}, "Tela cabine")
peca("hc1", "wokwi-hc-sr04", 345, ROW - HC["TRIG"][1], 45 * MM, 25 * MM, HC, {"distance": "30"}, "Galao (nivel)")
peca("dht1", "wokwi-dht22", 545, ROW - DHT["SDA"][1], 15.1 * MM, 30.885 * MM, DHT, {"temperature": "34.2", "humidity": "46"}, "Ar")
peca("globo1", "board-ds18b20", 620, ROW - DS["DQ"][1], 8.564 * MM, 13.388 * MM, DS, {"temperature": "47.5"}, "Globo")
peca("btn1", "wokwi-pushbutton", 690, ROW - BTN["2.l"][1], 17.802 * MM, 12 * MM, BTN, {"color": "red", "label": "PAUSA"}, "PAUSA")
peca("agua1", "board-ds18b20", 785, ROW - DS["DQ"][1], 8.564 * MM, 13.388 * MM, DS, {"temperature": "24"}, "Agua")

# ---- lado esquerdo: LDR, buzzer e semaforo ----
peca("ldr1", "wokwi-photoresistor-sensor", -50 - LDR["AO"][0], 53.1 - LDR["AO"][1], 45.95 * MM, 16.267 * MM, LDR, {}, "Sol")
YP = 70
peca("bz1", "wokwi-buzzer", -300, YP - BZ["1"][1], 17 * MM, 20 * MM, BZ, {"volume": "0.2"}, "Buzzer")
peca("ledG", "wokwi-led", -370, YP - LED["A"][1], 40, 50, LED, {"color": "limegreen", "label": "NORMAL"}, "")
peca("ledY", "wokwi-led", -440, YP - LED["A"][1], 40, 50, LED, {"color": "yellow", "label": "ATENCAO"}, "")
peca("ledR", "wokwi-led", -510, YP - LED["A"][1], 40, 50, LED, {"color": "red", "label": "CRITICO"}, "")
peca("rG", "wokwi-resistor", -100, 91.3 - RES["1"][1], 15.645 * MM, 3 * MM, RES, {"value": "220"})
peca("rY", "wokwi-resistor", -170, 101 - RES["1"][1], 15.645 * MM, 3 * MM, RES, {"value": "220"})
peca("rR", "wokwi-resistor", -240, 110.8 - RES["1"][1], 15.645 * MM, 3 * MM, RES, {"value": "220"})

# ============================ FIOS ============================
GND_FEED_X, V_FEED_X = 850, 860
def gnd(para, lane, entra_por=None):
    alvo = P(para)
    pts = [X(GND_FEED_X), Y(BUS_GND), X(lane)]
    pts += [Y(JOG), X(alvo[0])] if entra_por == "baixo" else [Y(alvo[1])]
    fio("esp:GND.1", para, "black", *pts, rede="GND")

def gnd_esq(para, lane, altura=-30, entra_por=None):
    """GND.2 -> esquerda por baixo de tudo -> sobe pela borda -> segue na 'altura' -> desce na 'lane'."""
    alvo = P(para)
    pts = [X(-530), Y(altura), X(lane)]
    pts += [Y(JOG), X(alvo[0])] if entra_por == "baixo" else [Y(alvo[1])]
    fio("esp:GND.2", para, "black", *pts, rede="GND")

def v33(para, lane, entra_por=None):
    alvo = P(para)
    pts = [X(V_FEED_X), Y(BUS_3V3), X(lane)]
    pts += [Y(JOG), X(alvo[0])] if entra_por == "baixo" else [Y(alvo[1])]
    fio("esp:3V3", para, "red", *pts, rede="3V3")

# Tela ILI9341 (SPI): CS=D23, D/C=D22, MOSI=D21, SCK=D19, LED (luz de fundo)=D18. RST fica livre (reset por software).
v33("tft1:VCC", 132)                                   # entra pela esquerda, na altura do pino
gnd_esq("tft1:GND", 125, altura=-170, entra_por="baixo")
for pino, sinal, cor in (("D23", "CS", "blue"), ("D22", "D/C", "violet"), ("D21", "MOSI", "orange"),
                         ("D19", "SCK", "gold"), ("D18", "LED", "white")):
    fio(f"esp:{pino}", f"tft1:{sinal}", cor, X(P(f"tft1:{sinal}")[0]))

# HC-SR04 (TRIG=D5, ECHO=TX2/17)
fio("esp:D5", "hc1:TRIG", "orange", X(P("hc1:TRIG")[0]))
fio("esp:TX2", "hc1:ECHO", "gold", X(P("hc1:ECHO")[0]))
v33("hc1:VCC", 330, "baixo")
gnd("hc1:GND", 525, "baixo")

# DHT22 (RX2/16)
fio("esp:RX2", "dht1:SDA", "green", X(P("dht1:SDA")[0]))
v33("dht1:VCC", 535, "baixo")
gnd("dht1:GND", 605, "baixo")

# DS18B20 do globo (D4)
fio("esp:D4", "globo1:DQ", "orange", X(P("globo1:DQ")[0]))
gnd("globo1:GND", 605, "baixo")
v33("globo1:VCC", 660, "baixo")

# Botao de pausa (D2) e DS18B20 da agua (D15)
fio("esp:D2", "btn1:2.l", "white", X(680), Y(P("btn1:2.l")[1]))
gnd("btn1:1.r", 772)
fio("esp:D15", "agua1:DQ", "cyan", X(P("agua1:DQ")[0]))
gnd("agua1:GND", 772, "baixo")
v33("agua1:VCC", 825, "baixo")

# LDR (D34): 3V3 por cima; GND pelo mesmo caminho do GND da tela
fio("esp:D34", "ldr1:AO", "yellow")
v33("ldr1:VCC", -38)
gnd_esq("ldr1:GND", -28, altura=-170)

# Buzzer (D33) e semaforo (verde D25, amarelo D26, vermelho D27), com resistores na linha
fio("esp:D33", "bz1:2", "purple", X(P("bz1:2")[0]))
gnd_esq("bz1:1", -305)
for led, res, pino, cor, lane in (("ledG", "rG", "D25", "green", -378),
                                  ("ledY", "rY", "D26", "gold", -448),
                                  ("ledR", "rR", "D27", "red", -518)):
    fio(f"esp:{pino}", f"{res}:2", cor)
    fio(f"{res}:1", f"{led}:A", cor, X(P(f"{led}:A")[0]))
    gnd_esq(f"{led}:C", lane)

# ============================ SAIDAS ============================
def instrucoes(pts):
    out = []
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        dx, dy = round(x2 - x1, 2), round(y2 - y1, 2)
        if abs(dx) > 0.01: out.append(f"h{dx:g}")
        if abs(dy) > 0.01: out.append(f"v{dy:g}")
    return out

def segmentos():
    segs = []
    for i, f in enumerate(FIOS):
        for a, b in zip(f["pts"], f["pts"][1:]):
            if a != b: segs.append((i, f["rede"], a, b))
    return segs

def cruzamentos():
    res = []
    for (i, ri, a1, b1), (j, rj, a2, b2) in itertools.combinations(segmentos(), 2):
        if i == j or ri == rj: continue
        h1, h2 = abs(a1[1] - b1[1]) < .01, abs(a2[1] - b2[1]) < .01
        if h1 == h2: continue
        (ha, hb), (va, vb) = ((a1, b1), (a2, b2)) if h1 else ((a2, b2), (a1, b1))
        y, x = ha[1], va[0]
        if min(ha[0], hb[0]) < x < max(ha[0], hb[0]) and min(va[1], vb[1]) < y < max(va[1], vb[1]):
            res.append((FIOS[i]["de"] + "->" + FIOS[i]["para"], FIOS[j]["de"] + "->" + FIOS[j]["para"], (round(x), round(y))))
    return res

diagram = {"version": 1, "author": "Pausa Certa - GS 2026.2", "editor": "wokwi",
           "parts": [dict(type=p["tipo"], id=pid, top=round(p["top"], 2), left=round(p["left"], 2), attrs=p["attrs"])
                     for pid, p in PECAS.items()],
           "connections": [["esp:TX0", "$serialMonitor:RX", "", []], ["esp:RX0", "$serialMonitor:TX", "", []]]
                          + [[f["de"], f["para"], f["cor"], instrucoes(f["pts"])] for f in FIOS],
           "dependencies": {}}
destino = os.path.join(AQUI, "..", "simulacao", "diagram.json")
json.dump(diagram, open(destino, "w"), indent=2)

# previa
xs = [p["left"] for p in PECAS.values()] + [p["left"] + p["w"] for p in PECAS.values()] + [x for f in FIOS for x, _ in f["pts"]]
ys = [p["top"] for p in PECAS.values()] + [p["top"] + p["h"] for p in PECAS.values()] + [y for f in FIOS for _, y in f["pts"]]
x0, y0, x1, y1 = min(xs) - 30, min(ys) - 30, max(xs) + 30, max(ys) + 30
S = 1.6
img = Image.new("RGB", (int((x1 - x0) * S), int((y1 - y0) * S)), "#2b2b2b")
d = ImageDraw.Draw(img)
T = lambda x, y: ((x - x0) * S, (y - y0) * S)
for pid, p in PECAS.items():
    d.rectangle([T(p["left"], p["top"]), T(p["left"] + p["w"], p["top"] + p["h"])], outline="#888", fill="#3a3a44")
    d.text(T(p["left"] + 3, p["top"] + 3), pid + (" " + p["rotulo"] if p["rotulo"] else ""), fill="#ddd")
CORES = {"violet": "#c08bff", "gold": "#ffd24a", "cyan": "#38e1ff", "white": "#fff", "purple": "#b05bff"}
for f in FIOS:
    d.line([T(*p) for p in f["pts"]], fill=CORES.get(f["cor"], f["cor"]), width=3)
cr = cruzamentos()
pontos = sorted({c[2] for c in cr})
for (x, y) in pontos:
    cx, cy = T(x, y); d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], outline="#ff3b3b", width=2)
img.save(os.path.join(AQUI, "..", "docs", "imagens", "previa_diagrama.png"))
print(len(FIOS), "fios;", len(pontos), "pontos de cruzamento:", pontos)
for pt in pontos:
    print("  ", pt, sorted({tuple(sorted((c[0], c[1]))) for c in cr if c[2] == pt})[:1])
