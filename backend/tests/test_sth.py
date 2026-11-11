"""Paginação do STH-Comet (no máximo 100 leituras por pedido), com um STH de mentira via httpx."""

import asyncio
import os
import unittest
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs

os.environ["ESTADO_ARQUIVO"] = ""

import httpx  # noqa: E402

from app import config, dominio, fiware  # noqa: E402

T0 = datetime(2026, 11, 11, 11, 0, tzinfo=timezone.utc)


def sth_falso(total, com_total=True):
    """STH que recusa hLimit > 100 (como o de verdade) e devolve leituras numeradas 0..total-1."""
    pedidos = []

    def responder(req: httpx.Request):
        q = {k: v[0] for k, v in parse_qs(req.url.query.decode()).items()}
        pedidos.append(q)
        if "lastN" in q or int(q.get("hLimit", 0)) > 100:
            return httpx.Response(400, json={"error": "Bad Request", "message": "hLimit <= lastN <= config.maxPageSize"})
        inicio, limite = int(q["hOffset"]), int(q["hLimit"])
        valores = [{"recvTime": dominio.para_iso(T0 + timedelta(seconds=i)), "attrValue": i}
                   for i in range(inicio, min(total, inicio + limite))]
        corpo = {"contextResponses": [{"contextElement": {"attributes": [{"name": "x", "values": valores}]}}]}
        cab = {"fiware-total-count": str(total)} if com_total else {}
        return httpx.Response(200, json=corpo, headers=cab)

    return httpx.MockTransport(responder), pedidos


def buscar(transporte):
    async def rodar():
        async with httpx.AsyncClient(transport=transporte) as c:
            return await fiware._historico_atributo(c, "indiceCalor_c", dominio.para_iso(T0))
    return asyncio.run(rodar())


class TestPaginacao(unittest.TestCase):
    def test_poucas_leituras_um_pedido(self):
        t, pedidos = sth_falso(40)
        self.assertEqual([v for _, v in buscar(t)], list(range(40)))
        self.assertEqual(len(pedidos), 1)

    def test_varias_paginas_em_ordem(self):
        t, pedidos = sth_falso(250)
        self.assertEqual([v for _, v in buscar(t)], list(range(250)))
        self.assertTrue(all(int(p["hLimit"]) <= 100 for p in pedidos))

    def test_mais_que_o_maximo_pega_as_mais_recentes(self):
        t, _ = sth_falso(config.HISTORICO_MAX + 330)
        valores = [v for _, v in buscar(t)]
        self.assertEqual(len(valores), config.HISTORICO_MAX)
        self.assertEqual(valores[-1], config.HISTORICO_MAX + 329)

    def test_sem_total_no_cabecalho(self):
        t, _ = sth_falso(230, com_total=False)
        self.assertEqual([v for _, v in buscar(t)], list(range(230)))

    def test_nada_guardado(self):
        t = httpx.MockTransport(lambda req: httpx.Response(404, json={}))
        self.assertEqual(buscar(t), [])


if __name__ == "__main__":
    unittest.main()
