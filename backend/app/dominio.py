"""
Regras do Pausa Certa que não dependem de rede (fáceis de testar):
  - converter a entidade EquipeCampo do Orion na leitura que o dashboard espera
  - dizer se o Node está online
  - validar os comandos
  - juntar o histórico do STH-Comet (um pedido por atributo) em linhas por horário
Os nomes dos atributos são os do contrato (docs/api-contrato.md).
"""

from datetime import datetime, timedelta, timezone

# Padrões do firmware (pausacerta_node.ino). O Node não informa a própria configuração:
# o backend começa nestes valores e guarda o que for confirmado depois.
PADROES = {
    "limites": [27, 32, 41],  # índice de calor para ATENÇÃO, CRÍTICO e PERIGO (NOAA)
    "regime": [300, 90, 50],  # pausa mínima (s), máx. sem pausa em ATENÇÃO e em CRÍTICO (min)
    "galao": [5, 45, 30],     # distância cheio (cm), vazio (cm), água quente (°C)
    "intervalo": 60,          # envio periódico (s)
}

# Atributos da leitura atual e o tipo de cada um (o IoT Agent pode entregar números como texto)
NUMEROS = ["temperatura_c", "umidade_pct", "globo_c", "indiceCalor_c", "ibutgEstimado_c", "minutosSemPausa",
           "pausasHoje", "malEstarHoje", "galao_pct", "aguaTemp_c", "aguaAcabaEmMin"]
BOOLEANOS = ["solDireto", "emPausa", "pausaRecomendada"]
TEXTOS = ["estado", "estadoAgua", "timestamp", "firmware"]
INTEIROS = {"minutosSemPausa", "pausasHoje", "malEstarHoje", "galao_pct", "aguaAcabaEmMin"}

# Atributos do histórico (um pedido ao STH-Comet para cada)
HISTORICO = ["temperatura_c", "umidade_pct", "globo_c", "indiceCalor_c", "estado", "emPausa",
             "minutosSemPausa", "galao_pct", "aguaTemp_c"]
# Estes mudam pouco: numa linha sem eles, vale o último valor conhecido
REPETIR = {"estado", "emPausa"}

PERIODOS = {"1h": 3600, "turno": 8 * 3600, "24h": 24 * 3600}

# Comandos do Node: quantos números cada um leva e a regra extra
COMANDOS = {
    "setLimites": {"n": 3, "faixa": (15, 60)},
    "setRegime": {"n": 3, "faixa": (1, 3600)},
    "setGalao": {"n": 3, "faixa": (1, 400)},
    "setIntervalo": {"n": 1, "faixa": (10, 3600)},
    "identify": {"n": 0},
}
CHAVE_CONFIG = {"setLimites": "limites", "setRegime": "regime", "setGalao": "galao", "setIntervalo": "intervalo"}


# ================================================================ datas
def agora() -> datetime:
    return datetime.now(timezone.utc)


def para_iso(d: datetime) -> str:
    """2026-11-12T15:40:02.000Z (formato que o dashboard e o STH-Comet usam)."""
    return d.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.") + f"{d.microsecond // 1000:03d}Z"


def ler_data(texto):
    """Lê datas ISO do Orion/STH ('...Z' ou com fuso). None se não der."""
    if not texto or not isinstance(texto, str):
        return None
    try:
        d = datetime.fromisoformat(texto.replace("Z", "+00:00"))
    except ValueError:
        return None
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


# ================================================================ valores
def numero(v):
    """37.5, "37.5" -> 37.5 ; "", None, "nan" -> None. Inteiros saem sem casa decimal."""
    if v is None or isinstance(v, bool):
        return None
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    if x != x:  # NaN
        return None
    return int(x) if x.is_integer() else x


def booleano(v):
    if isinstance(v, bool):
        return v
    if isinstance(v, str):
        return v.strip().lower() in ("true", "1", "sim")
    if isinstance(v, (int, float)):
        return v != 0
    return False


def valor_do_atributo(atributo):
    """No formato normal do Orion cada atributo é {type, value, metadata}; aqui pega o value."""
    return atributo.get("value") if isinstance(atributo, dict) else atributo


def converter(nome, valor):
    """Converte um atributo para o tipo do contrato."""
    if nome in BOOLEANOS or nome == "emPausa":
        return booleano(valor)
    if nome in NUMEROS:
        n = numero(valor)
        if n is not None and nome in INTEIROS:
            n = int(round(n))
        return n
    return None if valor in (None, "") else str(valor)


# ================================================================ leitura atual
def leitura_atual(entidade: dict) -> dict:
    """Entidade do Orion (formato normal) -> leitura no formato do contrato (keyValues)."""
    atual = {}
    for nome in NUMEROS + BOOLEANOS + TEXTOS:
        atual[nome] = converter(nome, valor_do_atributo(entidade.get(nome)))
    if atual["aguaAcabaEmMin"] is None:
        atual["aguaAcabaEmMin"] = -1
    if atual["galao_pct"] is None:
        atual["galao_pct"] = -1
    return atual


def momento_da_leitura(entidade: dict):
    """Quando chegou a última leitura: o TimeInstant que o IoT Agent grava a cada mensagem."""
    return ler_data(valor_do_atributo(entidade.get("TimeInstant"))) or ler_data(valor_do_atributo(entidade.get("timestamp")))


def esta_online(ultima, quando: datetime, offline_s: int) -> bool:
    return ultima is not None and (quando - ultima).total_seconds() < offline_s


def status_do_comando(entidade: dict, nome: str):
    """(status, info, instante) do comando no Orion: <nome>_status e <nome>_info, gravados pelo IoT Agent."""
    st = entidade.get(f"{nome}_status") or {}
    info = entidade.get(f"{nome}_info") or {}
    instante = None
    if isinstance(st, dict):
        instante = valor_do_atributo((st.get("metadata") or {}).get("TimeInstant"))
    return valor_do_atributo(st), valor_do_atributo(info), instante


# ================================================================ comandos
def validar_comando(nome: str, valor: str):
    """
    Confere o comando antes de mandar ao Node. Devolve (texto_normalizado, lista_de_numeros).
    Lança ValueError com a mensagem para o dashboard.
    """
    regra = COMANDOS.get(nome)
    if regra is None:
        raise ValueError(f"Comando desconhecido: {nome}. Use {', '.join(COMANDOS)}.")
    if regra["n"] == 0:
        return "", []
    partes = [p.strip() for p in str(valor or "").split(",")]
    if len(partes) != regra["n"]:
        raise ValueError(f"{nome} precisa de {regra['n']} número(s) separados por vírgula.")
    nums = [numero(p) for p in partes]
    if any(n is None for n in nums):
        raise ValueError("Use só números (ponto para decimal), separados por vírgula.")
    lo, hi = regra["faixa"]
    if any(n < lo or n > hi for n in nums):
        raise ValueError(f"Os valores de {nome} precisam ficar entre {lo} e {hi}.")
    if nome == "setLimites" and not (nums[0] < nums[1] < nums[2]):
        raise ValueError("Os limites precisam subir: ATENÇÃO < CRÍTICO < PERIGO.")
    if nome == "setRegime" and nums[2] > nums[1]:
        raise ValueError("Em CRÍTICO o limite sem pausa precisa ser menor ou igual ao de ATENÇÃO.")
    if nome == "setGalao" and nums[0] >= nums[1]:
        raise ValueError("A distância com o galão cheio precisa ser menor que com ele vazio.")
    if nome in ("setRegime", "setIntervalo") and any(not float(n).is_integer() for n in nums):
        raise ValueError("Use números inteiros (segundos e minutos).")
    return ",".join(str(n) for n in nums), nums


# ================================================================ histórico
def inicio_do_periodo(periodo: str, quando: datetime) -> datetime:
    if periodo not in PERIODOS:
        raise ValueError(f"Período inválido: use {', '.join(PERIODOS)}.")
    return quando - timedelta(seconds=PERIODOS[periodo])


def valores_do_sth(resposta: dict):
    """Resposta do STH-Comet (formato legado, leituras cruas) -> [(datetime, valor)]."""
    try:
        valores = resposta["contextResponses"][0]["contextElement"]["attributes"][0]["values"]
    except (KeyError, IndexError, TypeError):
        return []
    saida = []
    for v in valores:
        d = ler_data(v.get("recvTime"))
        if d is not None:
            saida.append((d, v.get("attrValue")))
    return saida


def mesclar_historico(series: dict, tolerancia_s: float = 2.0, maximo: int = 360) -> list:
    """
    {atributo: [(datetime, valor)]} -> [{t, atributo: valor, ...}] em ordem de tempo.

    Os atributos de um mesmo envio do Node chegam ao STH com milissegundos de diferença: a junção é por
    PROXIMIDADE (tolerancia_s), não por igualdade exata. estado e emPausa repetem o último valor conhecido
    nas linhas em que não vieram. No fim, no máximo `maximo` linhas (pulando de forma uniforme e
    mantendo sempre a última).
    """
    pontos = []
    for nome, valores in series.items():
        for d, v in valores:
            pontos.append((d, nome, converter(nome, v)))
    pontos.sort(key=lambda p: p[0])

    linhas = []
    for d, nome, v in pontos:
        ultima = linhas[-1] if linhas else None
        if ultima and (d - ultima["_d"]).total_seconds() <= tolerancia_s and nome not in ultima:
            ultima[nome] = v
        else:
            linhas.append({"_d": d, nome: v})

    conhecido = {}
    saida = []
    for linha in linhas:
        for nome in REPETIR:
            if nome in linha:
                conhecido[nome] = linha[nome]
            elif nome in conhecido:
                linha[nome] = conhecido[nome]
        item = {"t": para_iso(linha.pop("_d"))}
        for nome in HISTORICO:
            item[nome] = linha.get(nome)
        if item["emPausa"] is None:
            item["emPausa"] = False
        saida.append(item)

    if len(saida) > maximo:
        passo = len(saida) / maximo
        escolhidos = sorted({int(i * passo) for i in range(maximo)} | {len(saida) - 1})
        saida = [saida[i] for i in escolhidos]
    return saida
