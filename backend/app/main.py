"""
Pausa Certa Cloud: backend do dashboard de Edge.

Ponte entre o dashboard (React) e o FIWARE:
  - lê a leitura atual da equipe no Orion (porta 1026)
  - lê o histórico no STH-Comet (porta 8666)
  - envia comandos ao Node pelo Orion e acompanha a resposta

Rodar (na pasta backend, com o ambiente virtual ativo):
    uvicorn app.main:app --reload --port 8001
Documentação interativa:  http://127.0.0.1:8001/docs
Formatos de resposta: docs/api-contrato.md (seção 5).
"""

import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from . import config, dominio, fiware
from .memoria import memoria

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s: %(message)s", datefmt="%H:%M:%S")
logging.getLogger("httpx").setLevel(logging.WARNING)  # sem uma linha por pedido a cada 5 s


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI):
    """Um cliente HTTP só para todos os pedidos ao FIWARE (reaproveita as conexões)."""
    async with httpx.AsyncClient(timeout=6.0) as cliente:
        app.state.cliente = cliente
        yield


app = FastAPI(title="Pausa Certa Cloud", version="0.1.0", lifespan=ciclo_de_vida,
              description="Ponte entre o dashboard de Edge e o FIWARE (Orion e STH-Comet).")

# CORS: deixa o dashboard (React) chamar esta API a partir do navegador
app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(fiware.FiwareIndisponivel)
async def fiware_fora(_: Request, exc: fiware.FiwareIndisponivel):
    """FIWARE fora do ar ou com erro: 502 com uma mensagem que o dashboard mostra."""
    return JSONResponse(status_code=502, content={"detail": str(exc)})


def _cliente(request: Request) -> httpx.AsyncClient:
    return request.app.state.cliente


async def _entidade_ou_404(request: Request) -> dict:
    entidade = await fiware.obter_entidade(_cliente(request))
    if entidade is None:
        raise HTTPException(404, f"O Orion ainda não tem a entidade {config.ENTIDADE}. Rode o provisionar.sh e ligue o Node (Wokwi).")
    return entidade


# ================================================================ rotas
@app.get("/saude", tags=["geral"])
async def saude():
    """Confere se a API está no ar e para onde ela aponta."""
    return {"status": "ok", "fiware_host": config.FIWARE_HOST, "service": config.FIWARE_SERVICE,
            "servicepath": config.FIWARE_SERVICEPATH, "entidade": config.ENTIDADE}


@app.get("/api/equipe", tags=["leituras"])
async def equipe(request: Request):
    """Leitura atual da equipe (entidade EquipeCampo no Orion) e se o Node está online."""
    entidade = await _entidade_ou_404(request)
    agora = dominio.agora()
    atual = dominio.leitura_atual(entidade)
    ultima = dominio.momento_da_leitura(entidade)
    memoria.atualizar_com(entidade, agora)
    memoria.observar_pausa(atual["emPausa"], agora)
    return {
        "equipe": config.EQUIPE_ID,
        "entidade": config.ENTIDADE,
        "online": dominio.esta_online(ultima, agora, config.OFFLINE_SEGUNDOS),
        "ultimaLeitura": dominio.para_iso(ultima) if ultima else None,
        "pausaDesde": dominio.para_iso(memoria.pausa_desde) if memoria.pausa_desde else None,
        "identificando": bool(memoria.identificar_ate and agora < memoria.identificar_ate),
        "atual": atual,
    }


@app.get("/api/historico", tags=["leituras"])
async def historico(request: Request, periodo: str = Query("1h", description="1h, turno (8 h) ou 24h")):
    """Histórico do STH-Comet, um pedido por atributo, juntado em linhas por horário (máx. ~360)."""
    try:
        desde = dominio.inicio_do_periodo(periodo, dominio.agora())
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    series = await fiware.obter_historico(_cliente(request), dominio.para_iso(desde))
    return {"periodo": periodo, "pontos": dominio.mesclar_historico(series)}


@app.get("/api/config", tags=["comandos"])
async def ver_config(request: Request):
    """Configuração confirmada pelo Node e o status do último envio de cada comando."""
    if any(c["status"] == "PENDING" for c in memoria.comandos.values()):
        try:
            memoria.atualizar_com(await fiware.obter_entidade(_cliente(request)), dominio.agora())
        except fiware.FiwareIndisponivel:
            pass  # sem o Orion, mostra o que já se sabe
    return {**memoria.config, "comandos": memoria.comandos_publicos()}


class Envio(BaseModel):
    valor: str = ""


@app.post("/api/comandos/{nome}", tags=["comandos"])
async def enviar(nome: str, envio: Envio, request: Request):
    """Envia um comando ao Node (Orion -> IoT Agent -> MQTT). Volta PENDING; o OK aparece em /api/config."""
    try:
        valor, _ = dominio.validar_comando(nome, envio.valor)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    entidade = await _entidade_ou_404(request)
    antes = dominio.status_do_comando(entidade, nome)[2]  # instante da última resposta, antes deste envio
    await fiware.enviar_comando(_cliente(request), nome, valor)
    return memoria.registrar_envio(nome, valor, dominio.agora(), antes)
