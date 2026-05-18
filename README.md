# Emergy App APS - UEV

Aplicação web para a APS de Engenharia de Software com cálculo emergético baseado em UEV.

## Lógica implementada

O sistema segue a lógica didática do material de apoio:

1. Ler os dados do inventário (LCI)
2. Classificar cada recurso em **R**, **N** ou **F**
3. Informar o **UEV** de cada recurso
4. Calcular a emergia de cada fluxo com a fórmula:

```text
Emergia = Quantidade × UEV
```

5. Somar todas as emergias para obter a emergia total do processo
6. Calcular os indicadores:

```text
EYR = (R + N + F) / F
ELR = (N + F) / R
ESI = EYR / ELR
```

## Estrutura do projeto

```text
emergy_app_uev/
├── app/
│   ├── __init__.py
│   ├── calculator.py
│   ├── db.py
│   ├── main.py
│   ├── schemas.py
│   ├── services.py
│   ├── static/
│   │   ├── styles.css
│   │   └── app.js
│   └── templates/
│       └── index.html
├── tests/
│   ├── conftest.py
│   ├── test_api.py
│   └── test_calculator.py
├── requirements.txt
└── README.md
```

## Como rodar

### Windows PowerShell

```powershell
python -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python -m uvicorn app.main:app --reload
```

Acesse:

```text
http://127.0.0.1:8001
```

## Como executar testes

```powershell
.\.venv\Scripts\python -m pytest
```

## Exemplo de CSV

```csv
process_id,flow_name,amount,unit,resource_type,uev,notes
1,Eletricidade,100,J,F,200000,Entrada elétrica
1,Água,500,L,R,100000,Água doce
1,Aço,10,g,F,5000000000,Material industrial
```

## Observação importante

Se você já tinha usado uma versão antiga do projeto, apague o arquivo `emergy.db` antigo antes de subir esta versão, porque a estrutura da tabela `flows` mudou.
