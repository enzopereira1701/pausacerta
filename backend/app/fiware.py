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


async def _historico_atributo(cliente, atributo: str, desde: str) -> list:
    """Leituras cruas de um atributo no STH-Comet, desde `desde` (as mais recentes, até HISTORICO_MAX)."""
    r = await _pedir(
        cliente, "GET",
        f"{config.STH_URL}/STH/v1/contextEntities/type/{config.TIPO_ENTIDADE}/id/{config.ENTIDADE}/attributes/{atributo}",
        "STH-Comet",
        params={"lastN": config.HISTORICO_MAX, "dateFrom": desde},
    )
    if r.status_code == 404:
        return []  # nada guardado ainda
    if r.status_code != 200:
        raise _erro("STH-Comet", r)
    return dominio.valores_do_sth(r.json())


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
