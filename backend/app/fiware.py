"""
Conversa com o FIWARE (Orion e STH-Comet).

Por que o dashboard não chama o FIWARE direto? O FIWARE exige os cabeçalhos fiware-service e
fiware-servicepath e não libera CORS para o navegador. O dashboard fala só com esta API,
e ela fala com o FIWARE. (Mesma ideia do WineGuard.)
"""

import asyncio

import httpx

from . import config, dominio


class FiwareIndisponivel(Exception):
    """Rede caiu, FIWARE fora do ar ou respondeu com erro inesperado."""


def cabecalhos() -> dict:
    return {"fiware-service": config.FIWARE_SERVICE, "fiware-servicepath": config.FIWARE_SERVICEPATH}


async def _pedir(cliente: httpx.AsyncClient, metodo, url, origem, params=None, json=None):
    """Um pedido HTTP; falha de rede vira FiwareIndisponivel. Quem chama confere o status."""
    try:
        return await cliente.request(metodo, url, params=params, json=json, headers=cabecalhos())
    except httpx.HTTPError as exc:
        raise FiwareIndisponivel(f"{origem} não respondeu ({type(exc).__name__}). Confira o FIWARE_HOST e se a instância está ligada.") from exc


def _erro(origem, r):
    return FiwareIndisponivel(f"{origem} respondeu {r.status_code}: {r.text[:200]}")


async def obter_entidade(cliente) -> dict | None:
    """
    A entidade EquipeCampo no Orion, no formato normal (com metadados: o TimeInstant de cada
    atributo, usado para saber quando um comando foi respondido). None se o Node ainda nunca enviou.
    """
    r = await _pedir(cliente, "GET", f"{config.ORION_URL}/v2/entities/{config.ENTIDADE}", "Orion",
                     params={"type": config.TIPO_ENTIDADE})
    if r.status_code == 404:
        return None
    if r.status_code != 200:
        raise _erro("Orion", r)
    return r.json()


PAGINA = 100  # o STH-Comet entrega no máximo 100 leituras por pedido (maxPageSize)


async def _pagina_sth(cliente, atributo: str, desde: str, inicio: int):
    """Uma página (até 100 leituras, da mais antiga para a mais nova) a partir da posição `inicio`."""
    r = await _pedir(
        cliente, "GET",
        f"{config.STH_URL}/STH/v1/contextEntities/type/{config.TIPO_ENTIDADE}/id/{config.ENTIDADE}/attributes/{atributo}",
        "STH-Comet",
        params={"hLimit": PAGINA, "hOffset": inicio, "dateFrom": desde, "count": "true"},
    )
    if r.status_code == 404:
        return [], 0  # nada guardado ainda
    if r.status_code != 200:
        raise _erro("STH-Comet", r)
    valores = dominio.valores_do_sth(r.json())
    total = r.headers.get("fiware-total-count")
    return valores, int(total) if total and total.isdigit() else None


async def _historico_atributo(cliente, atributo: str, desde: str) -> list:
    """
    Leituras cruas de um atributo no STH-Comet desde `desde`, de 100 em 100.
    Com o total em mãos (cabeçalho fiware-total-count), busca só as HISTORICO_MAX mais recentes, em paralelo.
    """
    primeira, total = await _pagina_sth(cliente, atributo, desde, 0)
    if total is None:
        # STH sem o total: segue página a página até vir uma incompleta
        valores, inicio = list(primeira), PAGINA
        while len(primeira) == PAGINA and len(valores) < config.HISTORICO_MAX:
            primeira, _ = await _pagina_sth(cliente, atributo, desde, inicio)
            valores += primeira
            inicio += PAGINA
        return valores[-config.HISTORICO_MAX:]
    if total <= PAGINA:
        return primeira
    comeco = max(0, total - config.HISTORICO_MAX)
    paginas = await asyncio.gather(*[_pagina_sth(cliente, atributo, desde, i) for i in range(comeco, total, PAGINA)])
    return [v for valores, _ in paginas for v in valores]


async def obter_historico(cliente, desde: str) -> dict:
    """Todos os atributos do histórico de uma vez (em paralelo). Devolve {atributo: [(data, valor)]}."""
    respostas = await asyncio.gather(*[_historico_atributo(cliente, a, desde) for a in dominio.HISTORICO])
    return dict(zip(dominio.HISTORICO, respostas))


async def enviar_comando(cliente, nome: str, valor: str):
    """API -> Orion -> IoT Agent -> MQTT -> ESP32. O Node responde em cmdexe e o IoT Agent grava <nome>_status."""
    r = await _pedir(
        cliente, "PATCH", f"{config.ORION_URL}/v2/entities/{config.ENTIDADE}/attrs", "Orion",
        params={"type": config.TIPO_ENTIDADE},
        json={nome: {"type": "command", "value": valor}},
    )
    if r.status_code not in (200, 204):
        raise _erro("Orion", r)
