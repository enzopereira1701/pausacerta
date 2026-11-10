"""Previa aproximada da tela ILI9341 (240x320), com as mesmas faixas e cores do firmware."""
import os
from PIL import Image, ImageDraw, ImageFont
F = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
def fonte(t): return ImageFont.truetype(F, int(8.6 * t))
C = dict(fundo=(0,0,0), texto=(255,255,255), cinza=(123,125,123), escuro=(33,33,33), verde=(0,252,0),
         verde_e=(0,128,0), amarelo=(255,252,0), laranja=(255,165,0), vermelho=(255,0,0), azul=(0,130,255), ciano=(0,252,255))
def tela(estado, cor_e, txt_e, acao, rec=False, pausa=None, ag=(35, 31, "Acaba em ~45 min", "amarelo")):
    im = Image.new("RGB", (240, 320), C["fundo"]); d = ImageDraw.Draw(im)
    def t(s, x, y, tam, cor): d.text((x, y), s, font=fonte(tam), fill=C[cor])
    def c(s, y, tam, cor):
        w = d.textlength(s, font=fonte(tam)); t(s, max(0, (240 - w) / 2), y, tam, cor)
    d.rectangle([0, 0, 240, 26], fill=C["escuro"]); t("COL-CAM-07", 6, 5, 2, "texto"); t("NUVEM", 200, 9, 1, "verde")
    if pausa:
        d.rounded_rectangle([4, 30, 236, 104], 10, fill=C["verde_e"]); c("EM PAUSA", 36, 3, "texto"); c(pausa, 68, 3, "verde")
        c("Agua e sombra", 112, 2, "texto")
    else:
        d.rounded_rectangle([4, 30, 236, 104], 10, fill=C[cor_e]); c(estado, 42, 4, txt_e); c("calor", 86, 1, txt_e)
        if rec: d.rectangle([0, 106, 240, 136], fill=C["laranja"])
        c(acao, 112, 2 if len(acao) * 12 <= 236 else 1, "fundo" if rec else "texto")
    d.line([0, 140, 240, 140], fill=C["escuro"])
    t("Indice de calor", 6, 145, 1, "cinza"); t("37.5C", 6, 156, 3, cor_e if not pausa else "vermelho")
    t("IBUTG estimado", 132, 145, 1, "cinza"); t("30.5C", 132, 158, 2, "texto")
    t("Ar 34.2C 46%  Globo 47.5C  SOL", 6, 185, 1, "amarelo")
    d.line([0, 204, 240, 204], fill=C["escuro"])
    t("Sem pausa 0/1 min" if pausa else "Sem pausa 52/50 min", 6, 208, 2, "texto")
    pct = 0 if pausa else 100
    d.rectangle([6, 230, 234, 240], outline=C["cinza"]); d.rectangle([8, 232, 8 + 224 * pct // 100, 238], fill=C["vermelho" if pct >= 100 else "verde"])
    t("Pausas hoje: 3    Mal-estar: 0", 6, 246, 1, "cinza")
    d.line([0, 262, 240, 262], fill=C["escuro"])
    t(f"Agua {ag[0]}%", 6, 266, 2, "texto"); t(f"{ag[1]}C", 132, 266, 2, "laranja" if ag[1] > 30 else "ciano")
    if ag[1] > 30: t("QUENTE", 186, 271, 1, "laranja")
    d.rectangle([6, 288, 234, 300], outline=C["cinza"]); d.rectangle([8, 290, 8 + 224 * ag[0] // 100, 298], fill=C[ag[3]])
    t(ag[2], 6, 305, 1, "texto")
    return im
ims = [tela("NORMAL", "verde", "fundo", "Trabalho normal", ag=(88, 24, "Agua ok", "azul")),
       tela("CRITICO", "vermelho", "texto", "PARE NA PROX PARADA", rec=True),
       tela("CRITICO", "vermelho", "texto", "", pausa="02:14", ag=(13, 31, "REPOR AGUA JA", "vermelho"))]
out = Image.new("RGB", (240 * 3 + 40, 340), (40, 40, 40))
for i, im in enumerate(ims): out.paste(im, (10 + i * 250, 10))
out = out.resize((out.width * 2, out.height * 2), Image.NEAREST); out.save(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", "imagens", "previa_tela.png")); print("ok")
