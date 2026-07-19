# Módulo Receitas

Módulo profissional para **emissão, gerenciamento e impressão de receitas médicas**.
Aplicação 100% estática (HTML/CSS/JavaScript) — roda no navegador e publica direto no **GitHub Pages**, sem servidor e sem banco de dados.

O OCR, a leitura de PDF/DOCX e a geração de PDF acontecem **no próprio navegador do usuário**; nenhum arquivo é enviado para servidores.

---

## Funcionalidades

**Aba Receitas** — duas categorias, três modelos:

| Categoria | Modelo |
|---|---|
| Receitas Simples | Receita Simples Clássica |
| Receitas Simples | Receita Simples Renovável |
| Receitas de Controle Especial | Modelo C.E. Mod. 01 |

- Excluir modelos que não serão usados (e restaurá-los depois).
- Cada modelo permite:
  - Ajuste **automático** da altura do carimbo (ou manual, por controle deslizante).
  - Ajuste **automático** da posição da assinatura (ou manual).
  - Alteração de margens (superior, direita, inferior, esquerda).
  - Escolha da fonte.
  - Alteração do tamanho da fonte.
  - Espaçamento entre linhas.
  - Visualização antes de imprimir (pré-visualização ao vivo).
  - Impressão.
  - Exportação em PDF.
  - Salvar como modelo (a formatação e os dados ficam guardados no navegador).

**Aba Importar Receita** — aceita **PDF, DOCX, JPG, PNG** e receitas digitalizadas.
Usa OCR para reconhecer automaticamente **nome do paciente, medicamentos, posologia, médico, CRM e data**, e preenche o formulário para edição.

---

## Como rodar localmente

O reconhecimento de PDF/OCR e o autocomplete usam recursos que **não funcionam abrindo o arquivo direto (`file://`)** — é preciso um servidor local simples:

```bash
# na pasta do projeto
python -m http.server 8080
# depois abra http://localhost:8080/
```

Ou, se preferir Node:

```bash
npx serve .
```

> A geração de PDF, o OCR e a leitura de DOCX carregam bibliotecas por CDN, então é preciso **internet** na primeira vez. Sem internet, o botão *Exportar PDF* cai automaticamente na janela de impressão (opção "Salvar como PDF").

---

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie os arquivos:
   ```bash
   git init
   git add .
   git commit -m "Módulo Receitas"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
   git push -u origin main
   ```
2. No GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. O workflow `.github/workflows/pages.yml` publica o site a cada `push`.
   Em um minuto o endereço aparece em **Settings → Pages** (algo como
   `https://SEU_USUARIO.github.io/SEU_REPO/`).

> Alternativa sem Actions: em **Settings → Pages**, escolha *Deploy from a branch → main → /(root)*.
> O arquivo `.nojekyll` já está incluído para o Pages servir a pasta `assets/` corretamente.

---

## Dados (autocomplete)

Os campos de médico, paciente e medicamento têm autocomplete opcional, lido de CSVs em `data/`
(mesmo formato exportado pelo Digifarma):

```
data/medicos.csv       →  NOME;CRM;UF;CONSELHO;CPF_CNPJ;EMAIL
data/clientes.csv      →  CLIENTE_ID;CLIENTE;CLI_CPF;...;CLI_CIDADE
data/medicamentos.csv  →  NOME;FORMA_FARMACEUTICA;REGISTRO;LISTA
```

Os arquivos incluídos são **apenas exemplos**. Substitua-os pelos seus exports para ter as listas reais.
Se os CSVs não existirem, o sistema funciona normalmente com digitação livre.

---

## Estrutura

```
index.html                     página única (abas Receitas e Importar)
assets/css/app.css             identidade visual e layout da bancada
assets/css/receita.css         a folha A4 e os 3 modelos
assets/js/stamp.js             carimbo gerado (estilo fixo por médico)
assets/js/models.js            definição e render dos 3 modelos
assets/js/format.js            fonte, tamanho, espaçamento, margens,
                               carimbo/assinatura automáticos
assets/js/templates.js         persistência (modelos ocultos, formatação, salvos)
assets/js/importer.js          OCR + leitura de PDF/DOCX + extração de campos
assets/js/export.js            impressão e exportação em PDF
assets/js/app.js               controlador (abas, formulário, preview)
data/*.csv                     dados de exemplo para autocomplete
.github/workflows/pages.yml    deploy automático no GitHub Pages
```

## Requisitos do navegador

Navegador moderno (Chrome, Edge, Firefox, Safari recentes). Para OCR e PDF, internet na primeira carga (bibliotecas via CDN).

---

## Aviso

Ferramenta de apoio à emissão de receitas. A conformidade legal do documento impresso (layout exigido,
vias, campos obrigatórios de controle especial etc.) é responsabilidade do prescritor e deve ser
conferida conforme a legislação vigente.
