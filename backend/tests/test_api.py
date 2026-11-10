"""As rotas que o dashboard usa, com um FIWARE de mentira.  python -m unittest discover -s tests -v"""

import os
import unittest
from datetime import timedelta
from unittest import mock

os.environ["ESTADO_ARQUIVO"] = ""  # os testes não gravam arquivo

from fastapi.testclient import TestClient  # noqa: E402

from app import config, dominio, main  # noqa: E402
from app.memoria import Memoria  # noqa: E402
from tests.fake_fiware import FiwareFalso, serie  # noqa: E402


class TestApi(unittest.TestCase):
    def setUp(self):
        self.agora = dominio.agora()
        self.fw = FiwareFalso(self.agora - timedelta(seconds=20))
        self.trocas = []
        self.fw.instalar(lambda mod, nome, f: self.trocas.append(mock.patch.object(mod, nome, f)))
        self.trocas.append(mock.patch.object(main, "memoria", Memoria(arquivo=None)))
        for t in self.trocas:
            t.start()
        self.memoria = main.memoria
        self.cliente = TestClient(main.app).__enter__()

    def tearDown(self):
        self.cliente.__exit__(None, None, None)
        for t in self.trocas:
            t.stop()

    def test_saude(self):
        self.assertEqual(self.cliente.get("/saude").json()["entidade"], "EquipeCampo:COL-CAM-07")

    def test_equipe(self):
        r = self.cliente.get("/api/equipe")
        self.assertEqual(r.status_code, 200)
        d = r.json()
        self.assertTrue(d["online"])
        self.assertEqual(d["atual"]["estado"], "CRITICO")
        self.assertEqual(d["atual"]["minutosSemPausa"], 52)
        self.assertIsNone(d["pausaDesde"])

    def test_equipe_offline_e_pausa(self):
        self.fw.entidade = FiwareFalso(self.agora - timedelta(seconds=400)).entidade
        self.fw.entidade["emPausa"]["value"] = "true"
        d = self.cliente.get("/api/equipe").json()
        self.assertFalse(d["online"])
        self.assertIsNotNone(d["pausaDesde"])  # anotou o início da pausa

    def test_entidade_inexistente(self):
        self.fw.entidade = None
        r = self.cliente.get("/api/equipe")
        self.assertEqual(r.status_code, 404)
        self.assertIn("provisionar.sh", r.json()["detail"])

    def test_fiware_fora(self):
        self.fw.fora = True
        r = self.cliente.get("/api/equipe")
        self.assertEqual(r.status_code, 502)
        self.assertIn("Orion", r.json()["detail"])

    def test_comando_ate_ok(self):
        r = self.cliente.post("/api/comandos/setRegime", json={"valor": "30, 3, 2"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "PENDING")
        self.assertEqual(self.fw.enviados, [("setRegime", "30,3,2")])
        cfg = self.cliente.get("/api/config").json()
        self.assertEqual(cfg["regime"], [300, 90, 50])          # ainda não confirmado
        self.fw.node_responde("setRegime")
        cfg = self.cliente.get("/api/config").json()
        self.assertEqual(cfg["comandos"]["setRegime"]["status"], "OK")
        self.assertEqual(cfg["regime"], [30, 3, 2])              # confirmado pelo Node
        self.assertNotIn("_antes", cfg["comandos"]["setRegime"])

    def test_resposta_antiga_nao_conta(self):
        self.fw.node_responde("setLimites", instante="2026-11-12T10:00:00.000Z")   # de um envio anterior
        self.cliente.post("/api/comandos/setLimites", json={"valor": "28,33,42"})
        self.fw.node_responde("setLimites", instante="2026-11-12T10:00:00.000Z")   # nada novo
        self.assertEqual(self.cliente.get("/api/config").json()["comandos"]["setLimites"]["status"], "PENDING")

    def test_node_recusa(self):
        self.cliente.post("/api/comandos/setGalao", json={"valor": "5,45,30"})
        self.fw.node_responde("setGalao", info="erro")
        cfg = self.cliente.get("/api/config").json()
        self.assertEqual(cfg["comandos"]["setGalao"]["status"], "ERROR")
        self.assertEqual(cfg["galao"], [5, 45, 30])

    def test_sem_resposta(self):
        self.cliente.post("/api/comandos/identify", json={})
        self.memoria.comandos["identify"]["em"] = dominio.para_iso(self.agora - timedelta(seconds=config.ESPERA_COMANDO_S + 5))
        self.assertEqual(self.cliente.get("/api/config").json()["comandos"]["identify"]["status"], "SEM_RESPOSTA")

    def test_comando_invalido(self):
        r = self.cliente.post("/api/comandos/setLimites", json={"valor": "41,32,27"})
        self.assertEqual(r.status_code, 422)
        self.assertIn("subir", r.json()["detail"])
        self.assertEqual(self.fw.enviados, [])

    def test_identify_marca_identificando(self):
        self.cliente.post("/api/comandos/identify", json={"valor": ""})
        self.assertTrue(self.cliente.get("/api/equipe").json()["identificando"])

    def test_historico(self):
        inicio = self.agora - timedelta(minutes=30)
        self.fw.historico = {"indiceCalor_c": serie(inicio, 60, [30, 31, 32]), "estado": serie(inicio, 60, ["ATENCAO"])}
        d = self.cliente.get("/api/historico?periodo=1h").json()
        self.assertEqual(d["periodo"], "1h")
        self.assertEqual([p["estado"] for p in d["pontos"]], ["ATENCAO"] * 3)
        self.assertEqual(self.cliente.get("/api/historico?periodo=ano").status_code, 422)


if __name__ == "__main__":
    unittest.main()
