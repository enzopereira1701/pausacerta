"""Configuração do backend. Tudo vem de variáveis de ambiente (arquivo .env)."""

import os

from dotenv import load_dotenv

load_dotenv()  # lê o arquivo .env da pasta de onde o servidor foi iniciado

FIWARE_HOST = os.getenv("FIWARE_HOST", "localhost")
FIWARE_SERVICE = os.getenv("FIWARE_SERVICE", "pausacerta")
FIWARE_SERVICEPATH = os.getenv("FIWARE_SERVICEPATH", "/coleta")
EQUIPE_ID = os.getenv("EQUIPE_ID", "COL-CAM-07")
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]

# O Node envia a cada 60 s (e na hora quando algo muda): 150 s sem nada = sem conexão
OFFLINE_SEGUNDOS = int(os.getenv("OFFLINE_SEGUNDOS", "150"))
# Leituras buscadas no STH-Comet por atributo, de 100 em 100 (as mais recentes dentro do período)
HISTORICO_MAX = int(os.getenv("HISTORICO_MAX", "1500"))
# Um comando sem resposta do Node por mais que isso aparece como "sem resposta"
ESPERA_COMANDO_S = int(os.getenv("ESPERA_COMANDO_S", "30"))

ORION_URL = f"http://{FIWARE_HOST}:1026"
STH_URL = f"http://{FIWARE_HOST}:8666"

TIPO_ENTIDADE = "EquipeCampo"
ENTIDADE = f"{TIPO_ENTIDADE}:{EQUIPE_ID}"
