"""
O que o backend precisa lembrar entre um pedido e outro:
  - a configuração confirmada pelo Node (limites, regime, galão, intervalo): o Node não a informa
  - o último envio de cada comando e se o Node já respondeu
  - desde quando a equipe está em pausa (para o cronômetro do painel)

Fica num arquivo JSON pequeno (ESTADO_ARQUIVO), para sobreviver a um reinício do backend.
"""

import copy
import json
import logging
import os
from datetime import timedelta

from . import config, dominio

log = logging.getLogger("pausacerta.memoria")
ARQUIVO = os.getenv("ESTADO_ARQUIVO", "estado_backend.json")


class Memoria:
    def __init__(self, arquivo: str | None = ARQUIVO):
        self.arquivo = arquivo
        self.config = copy.deepcopy(dominio.PADROES)
        self.comandos = {}        # nome -> {valor, status, info, em, confirmadoEm, _antes}
        self.pausa_desde = None   # datetime ou None
        self.identificar_ate = None
        self._carregar()

    # ---------------------------------------------------------- arquivo
    def _carregar(self):
        if not self.arquivo or not os.path.exists(self.arquivo):
            return
        try:
            with open(self.arquivo, encoding="utf-8") as f:
                dados = json.load(f)
            self.config.update({k: v for k, v in dados.get("config", {}).items() if k in self.config})
            self.comandos = dados.get("comandos", {})
        except (OSError, ValueError) as exc:
            log.warning("Não deu para ler %s (%s); começando dos padrões.", self.arquivo, exc)

    def _salvar(self):
        if not self.arquivo:
            return
        try:
            with open(self.arquivo, "w", encoding="utf-8") as f:
                json.dump({"config": self.config, "comandos": self.comandos}, f, ensure_ascii=False, indent=2)
        except OSError as exc:
            log.warning("Não deu para salvar %s (%s).", self.arquivo, exc)

    # ---------------------------------------------------------- comandos
    def registrar_envio(self, nome: str, valor: str, quando, antes):
        """
        Anota o envio. `antes` = instante do <nome>_status lido ANTES do envio: a resposta nova
        é a que tiver outro instante.
        """
        self.comandos[nome] = {"valor": valor, "status": "PENDING", "info": None, "em": dominio.para_iso(quando),
                               "confirmadoEm": None, "_antes": antes}
        if nome == "identify":
            self.identificar_ate = quando + timedelta(seconds=6)
        self._salvar()
        return self.publico(nome)

    def atualizar_com(self, entidade: dict | None, quando):
        """
        Confere no Orion os comandos pendentes. O IoT Agent grava <nome>_status = OK quando o Node responde
        (pcn001@setRegime|ok) e <nome>_info = "ok" ou "erro". Sem resposta em ESPERA_COMANDO_S: SEM_RESPOSTA
        (o comando vai por MQTT sem fila: se o Node estava sem sinal, ele não recebe).
        """
        mudou = False
        for nome, c in self.comandos.items():
            if c["status"] != "PENDING":
                continue
            status, info, instante = dominio.status_do_comando(entidade or {}, nome)
            espera = (quando - dominio.ler_data(c["em"])).total_seconds()
            # resposta nova = o status tem outro instante que antes do envio. Se o IoT Agent não grava
            # instantes (IOTA_TIMESTAMP desligado), aceita o OK depois de 3 s.
            if instante or c.get("_antes"):
                nova = instante != c.get("_antes")
            else:
                nova = espera >= 3
            if status == "OK" and nova:
                ok = str(info).strip().lower() != "erro"
                c.update(status="OK" if ok else "ERROR", info=info, confirmadoEm=dominio.para_iso(quando))
                if ok and nome in dominio.CHAVE_CONFIG:
                    nums = [dominio.numero(p) for p in c["valor"].split(",")]
                    self.config[dominio.CHAVE_CONFIG[nome]] = nums[0] if nome == "setIntervalo" else nums
                mudou = True
            elif status == "ERROR" and nova:
                c.update(status="ERROR", info=info)
                mudou = True
            elif espera > config.ESPERA_COMANDO_S:
                c.update(status="SEM_RESPOSTA")
                mudou = True
        if mudou:
            self._salvar()

    def publico(self, nome: str) -> dict:
        """O envio sem os campos internos (começam com _)."""
        return {k: v for k, v in self.comandos[nome].items() if not k.startswith("_")}

    def comandos_publicos(self) -> dict:
        return {n: self.publico(n) for n in self.comandos}

    # ---------------------------------------------------------- pausa
    def observar_pausa(self, em_pausa: bool, quando):
        """O Node só diz se está em pausa; o backend anota quando a pausa começou (para o cronômetro)."""
        if em_pausa and self.pausa_desde is None:
            self.pausa_desde = quando
        elif not em_pausa:
            self.pausa_desde = None


memoria = Memoria()
