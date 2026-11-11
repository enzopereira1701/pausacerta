"""Regras sem rede: leitura, online, comandos e junção do histórico.  python -m unittest discover -s tests -v"""

import os
import unittest
from datetime import datetime, timedelta, timezone

os.environ["ESTADO_ARQUIVO"] = ""  # os testes não gravam arquivo

from app import dominio  # noqa: E402
from tests.fake_fiware import entidade_contrato, serie  # noqa: E402

T0 = datetime(2026, 11, 12, 15, 40, 2, tzinfo=timezone.utc)


class TestLeitura(unittest.TestCase):
    def test_entidade_vira_contrato(self):
        a = dominio.leitura_atual(entidade_contrato(T0))
        self.assertEqual(a["temperatura_c"], 34.2)       # veio como texto "34.2"
        self.assertEqual(a["minutosSemPausa"], 52)        # texto "52" -> inteiro
        self.assertIs(a["solDireto"], True)               # "true" -> True
        self.assertIs(a["emPausa"], False)
        self.assertEqual(a["estado"], "CRITICO")
        self.assertEqual(a["aguaAcabaEmMin"], 45)

    def test_sem_atributos_vira_vazio(self):
        a = dominio.leitura_atual({"id": "x"})
        self.assertIsNone(a["indiceCalor_c"])
        self.assertEqual(a["aguaAcabaEmMin"], -1)
        self.assertEqual(a["galao_pct"], -1)
        self.assertIs(a["emPausa"], False)

    def test_online(self):
        ultima = dominio.momento_da_leitura(entidade_contrato(T0))
        self.assertEqual(ultima, T0.replace(microsecond=0))
        self.assertTrue(dominio.esta_online(ultima, T0 + timedelta(seconds=60), 150))
        self.assertFalse(dominio.esta_online(ultima, T0 + timedelta(seconds=151), 150))
        self.assertFalse(dominio.esta_online(None, T0, 150))

    def test_numero(self):
        self.assertEqual(dominio.numero("37.50"), 37.5)
        self.assertEqual(dominio.numero(" 12 "), 12)
        self.assertIsNone(dominio.numero("nan"))
        self.assertIsNone(dominio.numero(""))
        self.assertIsNone(dominio.numero(True))


class TestPadroes(unittest.TestCase):
    def test_lista_do_ambiente(self):
        os.environ["TESTE_REGIME"] = "20, 3, 1"
        self.assertEqual(dominio._lista_do_ambiente("TESTE_REGIME", [300, 90, 50]), [20, 3, 1])
        os.environ["TESTE_REGIME"] = "20,3"            # faltou número: fica o padrão
        self.assertEqual(dominio._lista_do_ambiente("TESTE_REGIME", [300, 90, 50]), [300, 90, 50])
        os.environ["TESTE_REGIME"] = "abc"
        self.assertEqual(dominio._lista_do_ambiente("TESTE_REGIME", [300, 90, 50]), [300, 90, 50])
        del os.environ["TESTE_REGIME"]
        self.assertEqual(dominio._lista_do_ambiente("TESTE_REGIME", [27, 32, 41]), [27, 32, 41])


class TestComandos(unittest.TestCase):
    def test_validos(self):
        self.assertEqual(dominio.validar_comando("setRegime", "300, 90,50")[0], "300,90,50")
        self.assertEqual(dominio.validar_comando("setLimites", "27,32.5,41")[0], "27,32.5,41")
        self.assertEqual(dominio.validar_comando("identify", "qualquer")[0], "")
        self.assertEqual(dominio.validar_comando("setIntervalo", "60")[0], "60")

    def test_invalidos(self):
        casos = [
            ("setLimites", "32,27,41"),    # não sobe
            ("setRegime", "300,50,90"),    # crítico maior que atenção
            ("setGalao", "45,5,30"),       # cheio maior que vazio
            ("setRegime", "300,90"),       # faltou número
            ("setIntervalo", "abc"),
            ("setIntervalo", "5"),         # abaixo do mínimo
            ("setRegime", "20.5,3,1"),     # segundos quebrados
            ("apagarTudo", ""),
        ]
        for nome, valor in casos:
            with self.subTest(nome=nome, valor=valor), self.assertRaises(ValueError):
                dominio.validar_comando(nome, valor)


class TestHistorico(unittest.TestCase):
    def test_junta_por_proximidade_e_repete_estado(self):
        series = {
            "indiceCalor_c": serie(T0, 60, ["30.1", 31.0, 33.2]),
            # mesmo envio, alguns milissegundos depois
            "temperatura_c": [(d + timedelta(milliseconds=7), v) for d, v in serie(T0, 60, [29, 30, 31])],
            "estado": [(T0 + timedelta(milliseconds=3), "ATENCAO"), (T0 + timedelta(seconds=120, milliseconds=3), "CRITICO")],
            "emPausa": [(T0, "false")],
        }
        linhas = dominio.mesclar_historico(series)
        self.assertEqual(len(linhas), 3)
        self.assertEqual(linhas[0]["indiceCalor_c"], 30.1)
        self.assertEqual(linhas[0]["temperatura_c"], 29)
        self.assertEqual(linhas[1]["estado"], "ATENCAO")   # repetido do anterior
        self.assertEqual(linhas[2]["estado"], "CRITICO")
        self.assertIs(linhas[2]["emPausa"], False)
        self.assertIsNone(linhas[0]["galao_pct"])          # atributo sem leitura fica None
        self.assertTrue(linhas[0]["t"].endswith("Z"))

    def test_limita_quantidade_e_mantem_a_ultima(self):
        series = {"indiceCalor_c": serie(T0, 10, list(range(1000)))}
        linhas = dominio.mesclar_historico(series, maximo=100)
        self.assertLessEqual(len(linhas), 101)
        self.assertEqual(linhas[-1]["indiceCalor_c"], 999)

    def test_resposta_do_sth(self):
        resp = {"contextResponses": [{"contextElement": {"attributes": [{"name": "galao_pct", "values": [
            {"recvTime": "2026-11-10T11:00:52.407Z", "attrValue": "37"},
            {"recvTime": "2026-11-10T11:01:27.426Z", "attrValue": "36"},
        ]}]}}]}
        valores = dominio.valores_do_sth(resp)
        self.assertEqual(len(valores), 2)
        self.assertEqual(valores[1][1], "36")
        self.assertEqual(dominio.valores_do_sth({}), [])

    def test_periodo(self):
        self.assertEqual(dominio.inicio_do_periodo("turno", T0), T0 - timedelta(hours=8))
        with self.assertRaises(ValueError):
            dominio.inicio_do_periodo("semana", T0)


if __name__ == "__main__":
    unittest.main()
