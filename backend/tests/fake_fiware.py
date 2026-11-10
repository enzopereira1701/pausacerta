"""
FIWARE de mentira para os testes: troca as funções de app.fiware por versões em memória,
no mesmo formato que o Orion e o STH-Comet devolvem.
"""

from datetime import timedelta

from app import dominio, fiware


def atributo(tipo, valor, instante=None):
    a = {"type": tipo, "value": valor, "metadata": {}}
    if instante:
        a["metadata"]["TimeInstant"] = {"type": "DateTime", "value": instante}
    return a


def entidade_contrato(quando):
    """A entidade do contrato (docs/api-contrato.md), como o IoT Agent grava: números às vezes como texto."""
    t = dominio.para_iso(quando)
    return {
        "id": "EquipeCampo:COL-CAM-07", "type": "EquipeCampo",
        "TimeInstant": atributo("DateTime", t),
        "temperatura_c": atributo("Number", "34.2", t), "umidade_pct": atributo("Number", 46, t),
        "globo_c": atributo("Number", 47.5, t), "solDireto": atributo("Boolean", "true", t),
        "indiceCalor_c": atributo("Number", 37.5, t), "ibutgEstimado_c": atributo("Number", 30.5, t),
        "estado": atributo("Text", "CRITICO", t), "minutosSemPausa": atributo("Number", "52", t),
        "pausasHoje": atributo("Number", 3, t), "emPausa": atributo("Boolean", "false", t),
        "pausaRecomendada": atributo("Boolean", True, t), "malEstarHoje": atributo("Number", 0, t),
        "galao_pct": atributo("Number", 35, t), "aguaTemp_c": atributo("Number", 31.0, t),
        "aguaAcabaEmMin": atributo("Number", 45, t), "estadoAgua": atributo("Text", "REPOR", t),
        "timestamp": atributo("DateTime", "2026-11-12T12:40:00-03:00", t), "firmware": atributo("Text", "0.2", t),
    }


class FiwareFalso:
    """Guarda a entidade e os comandos recebidos; responde como o Orion e o STH-Comet."""

    def __init__(self, quando):
        self.entidade = entidade_contrato(quando)
        self.enviados = []
        self.fora = False
        self.historico = {}

    async def obter_entidade(self, cliente):
        if self.fora:
            raise fiware.FiwareIndisponivel("Orion não respondeu (teste).")
        return self.entidade

    async def enviar_comando(self, cliente, nome, valor):
        if self.fora:
            raise fiware.FiwareIndisponivel("Orion não respondeu (teste).")
        self.enviados.append((nome, valor))
        self.entidade[f"{nome}_status"] = atributo("commandStatus", "PENDING", "2026-11-12T15:41:00.100Z")

    def node_responde(self, nome, info="ok", instante="2026-11-12T15:41:01.500Z"):
        """O Node publica em cmdexe e o IoT Agent grava status e info."""
        self.entidade[f"{nome}_status"] = atributo("commandStatus", "OK", instante)
        self.entidade[f"{nome}_info"] = atributo("commandResult", info, instante)

    async def obter_historico(self, cliente, desde):
        return {a: self.historico.get(a, []) for a in dominio.HISTORICO}

    def instalar(self, monkey):
        monkey(fiware, "obter_entidade", self.obter_entidade)
        monkey(fiware, "enviar_comando", self.enviar_comando)
        monkey(fiware, "obter_historico", self.obter_historico)


def serie(inicio, passo_s, valores):
    return [(inicio + timedelta(seconds=i * passo_s), v) for i, v in enumerate(valores)]
