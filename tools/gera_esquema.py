"""Gera o esquema de ligacao (logico) do Pausa Certa Node, no mesmo estilo do WineGuard.

Uso: python3 gera_esquema.py  ->  ../hardware/esquema-ligacao.svg e .png (precisa do rsvg-convert)

Cada modulo tem os pinos de sinal virados para o ESP32 (fio reto, na mesma altura do pino do ESP32)
e VCC/GND virados para fora, ate os barramentos de 3V3 e GND nas bordas.
"""
import os, subprocess

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.join(AQUI, "..", "hardware", "esquema-ligacao")

W, H = 2250, 1830
C = dict(fundo="#F5F1EA", caixa="#FBF9F5", borda="#B4531F", titulo="#8A3A12", texto="#1E1E1E",
         sub="#6B655E", esp="#22292F", v33="#D11A1A", gnd="#222222", proto="#ECE5DA")
FONTE = "Inter, DejaVu Sans, sans-serif"

# (titulo, subtitulo, pinos de sinal [(rotulo, pino ESP32, cor)], pinos de alimentacao)
ESQ = [
    ("Sensor DHT22", "Node A · ar: temperatura e umidade", [("DATA", "D16", "#E07B00")], ["VCC", "GND"]),
    ("DS18B20 “Globo”", "Node A · dentro da bola preta", [("DQ", "D4", "#7A4FBF")], ["VCC", "GND"]),
    ("Sensor de luz LDR", "Node A · sol direto", [("AO", "D34", "#2E8B57")], ["VCC", "GND"]),
    ("HC-SR04", "Node C · nível do galão", [("TRIG", "D5", "#1B75BC"), ("ECHO", "D17", "#16A3B8")], ["VCC", "GND"]),
    ("DS18B20 “Água”", "Node C · dentro do galão", [("DQ", "D15", "#8C5A3C")], ["VCC", "GND"]),
]
DIR = [
    ("Tela TFT ILI9341 2,8”", "cabine · SPI", [("CS", "D23", "#C2185B"), ("D/C", "D22", "#6D4C9F"),
     ("MOSI", "D21", "#1B75BC"), ("SCK", "D19", "#16A3B8"), ("LED", "D18", "#E07B00")], ["VCC", "GND"]),
    ("Semáforo (3 LEDs)", "traseira · 220 Ω em cada LED", [("Verde", "D25", "#2E9E3E"),
     ("Amarelo", "D26", "#D4A000"), ("Vermelho", "D27", "#D11A1A")], ["GND"]),
    ("Buzzer", "traseira", [("+", "D33", "#7A4FBF")], ["GND"]),
    ("Botão PAUSA", "Node B · traseira, pull-up interno", [("S", "D2", "#8C5A3C")], ["GND"]),
]

TOPO, GAP, LIN, CAB = 360, 34, 46, 92
BX_L, BX_R, BW = 230, 1580, 440
ESP_X0, ESP_X1 = 905, 1345
R_GND_L, R_V33_L = 120, 160
R_V33_R, R_GND_R = W - 160, W - 120

svg = []
def add(s): svg.append(s)
def txt(x, y, s, tam=22, cor=None, peso=400, anc="start", fam=FONTE):
    add(f'<text x="{x}" y="{y}" font-family="{fam}" font-size="{tam}" font-weight="{peso}" fill="{cor or C["texto"]}" text-anchor="{anc}" dominant-baseline="middle">{s}</text>')
def linha(pts, cor, larg=5):
    p = " ".join(f"{x},{y}" for x, y in pts)
    add(f'<polyline points="{p}" fill="none" stroke="{cor}" stroke-width="{larg}" stroke-linejoin="round" stroke-linecap="round"/>')
def ponto(x, y, cor, r=8):
    add(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{cor}" stroke="#FFFFFF" stroke-width="2.5"/>')

def coluna(mods, lado):
    """Posiciona as caixas e devolve [(caixa, sinais [(y, rotulo, pino, cor)], alim [(y, rotulo)])]."""
    y, out = TOPO, []
    for tit, sub, sinais, alim in mods:
        n = max(len(sinais), len(alim))
        h = CAB + n * LIN + 18
        ys = [y + CAB + i * LIN + LIN / 2 for i in range(n)]
        # sinais centralizados nas linhas; alimentacao de cima para baixo
        off = (n - len(sinais)) // 2
        out.append(((tit, sub, y, h), [(ys[off + i], *s) for i, s in enumerate(sinais)],
                    [(ys[i], a) for i, a in enumerate(alim)]))
        y += h + GAP
    return out, y - GAP

esq, fim_e = coluna(ESQ, "e")
dir_, fim_d = coluna(DIR, "d")
FIM = max(fim_e, fim_d)
ESP_Y0, ESP_Y1 = 200, FIM + 10
BUS_V33, BUS_GND = FIM + 120, FIM + 175

add(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">')
add(f'<rect width="{W}" height="{H}" fill="{C["fundo"]}"/>')
txt(W / 2, 95, "Pausa Certa Node: esquema de ligação", 44, C["titulo"], 700, "middle", "DejaVu Serif, serif")
txt(W / 2, 150, "Esquema lógico: a posição dos pinos na placa é ilustrativa. Tudo é alimentado em 3V3 (nunca 5 V nos módulos).",
    22, C["sub"], 400, "middle")

# protoboard (fundo dos barramentos)
add(f'<rect x="{R_GND_L - 40}" y="{BUS_V33 - 55}" width="{R_GND_R - R_GND_L + 80}" height="{BUS_GND - BUS_V33 + 95}" rx="10" fill="{C["proto"]}" stroke="#DDD3C4" stroke-width="2"/>')
txt(W * 0.73, BUS_V33 - 30, "Protoboard: distribui a alimentação (3V3 e GND) para todos os módulos", 21, C["sub"], 400, "middle")

# trilhos e barramentos
linha([(R_V33_L, TOPO + 20), (R_V33_L, BUS_V33), (R_V33_R, BUS_V33), (R_V33_R, TOPO + 20)], C["v33"], 6)
linha([(R_GND_L, TOPO + 20), (R_GND_L, BUS_GND), (R_GND_R, BUS_GND), (R_GND_R, TOPO + 20)], C["gnd"], 6)
txt(R_V33_L + 22, BUS_V33 - 18, "3V3", 20, C["v33"], 700)
txt(R_V33_L + 22, BUS_GND + 22, "GND", 20, C["gnd"], 700)

# ESP32
add(f'<rect x="{ESP_X0}" y="{ESP_Y0}" width="{ESP_X1 - ESP_X0}" height="{ESP_Y1 - ESP_Y0}" rx="14" fill="{C["esp"]}"/>')
cx = (ESP_X0 + ESP_X1) / 2
txt(cx, ESP_Y0 + 60, "ESP32 DevKit V1", 34, "#FFFFFF", 700, "middle")
txt(cx, ESP_Y0 + 100, "30 pinos", 21, "#B9C2CA", 400, "middle")
txt(cx, ESP_Y0 + 140, "FreeRTOS · Wi-Fi · MQTT", 20, "#8E99A3", 400, "middle")
pv, pg = cx - 80, cx + 80
linha([(pv, ESP_Y1), (pv, BUS_V33)], C["v33"], 6)
linha([(pg, ESP_Y1), (pg, BUS_GND)], C["gnd"], 6)
txt(pv, ESP_Y1 - 30, "3V3", 22, "#FFFFFF", 700, "middle"); txt(pg, ESP_Y1 - 30, "GND", 22, "#FFFFFF", 700, "middle")
ponto(pv, ESP_Y1, C["v33"], 10); ponto(pg, ESP_Y1, "#000000", 10)
ponto(pv, BUS_V33, C["v33"], 10); ponto(pg, BUS_GND, C["gnd"], 10)

def caixa(x, tit, sub, y, h):
    add(f'<rect x="{x}" y="{y}" width="{BW}" height="{h}" rx="10" fill="{C["caixa"]}" stroke="{C["borda"]}" stroke-width="2.5"/>')
    txt(x + BW / 2, y + 34, tit, 25, C["texto"], 700, "middle")
    txt(x + BW / 2, y + 66, sub, 18, C["sub"], 400, "middle")

def resistor(x, y, cor):
    add(f'<rect x="{x - 34}" y="{y - 13}" width="68" height="26" rx="5" fill="#E9DCC8" stroke="{cor}" stroke-width="3"/>')
    txt(x, y + 1, "220 Ω", 15, C["texto"], 700, "middle")

for (tit, sub, y, h), sinais, alim in esq:
    caixa(BX_L, tit, sub, y, h)
    xi, xo = BX_L + BW, BX_L
    for yy, rot, pino, cor in sinais:
        linha([(xi, yy), (ESP_X0, yy)], cor)
        ponto(xi, yy, cor); ponto(ESP_X0, yy, cor, 9)
        txt(xi - 16, yy, rot, 21, C["texto"], 700, "end")
        txt(ESP_X0 + 18, yy, pino, 22, "#FFFFFF", 700)
    for yy, rot in alim:
        trilho, cor = (R_V33_L, C["v33"]) if rot == "VCC" else (R_GND_L, C["gnd"])
        linha([(xo, yy), (trilho, yy)], cor)
        ponto(xo, yy, cor); ponto(trilho, yy, cor, 7)
        txt(xo + 16, yy, rot, 21, C["texto"], 700)

for (tit, sub, y, h), sinais, alim in dir_:
    caixa(BX_R, tit, sub, y, h)
    xi, xo = BX_R, BX_R + BW
    for yy, rot, pino, cor in sinais:
        linha([(ESP_X1, yy), (xi, yy)], cor)
        ponto(ESP_X1, yy, cor, 9); ponto(xi, yy, cor)
        txt(xi + 16, yy, rot, 21, C["texto"], 700)
        txt(ESP_X1 - 18, yy, pino, 22, "#FFFFFF", 700, "end")
        if tit.startswith("Semáforo"):
            resistor((ESP_X1 + xi) / 2, yy, cor)
    for yy, rot in alim:
        trilho, cor = (R_V33_R, C["v33"]) if rot == "VCC" else (R_GND_R, C["gnd"])
        linha([(xo, yy), (trilho, yy)], cor)
        ponto(xo, yy, cor); ponto(trilho, yy, cor, 7)
        txt(xo - 16, yy, rot, 21, C["texto"], 700, "end")

txt(W / 2, BUS_GND + 85, "Na placa: HC-SR04P (versão de 3,3 V) e DS18B20 em módulo com resistor de 4,7 kΩ. "
    "Confira os rótulos impressos nos módulos antes de ligar.", 20, C["sub"], 400, "middle")
add("</svg>")

open(SAIDA + ".svg", "w", encoding="utf-8").write("\n".join(svg))
subprocess.run(["rsvg-convert", "-o", SAIDA + ".png", SAIDA + ".svg"], check=True)
print("ok:", os.path.normpath(SAIDA + ".png"), "altura usada:", BUS_GND + 85)
