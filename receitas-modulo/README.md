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

**Aba Listas** — importe seus próprios **CSV de médicos, medicamentos e clientes** para alimentar o autocomplete. As listas ficam salvas no navegador; o separador e a coluna do nome são detectados automaticamente e os acentos corrigidos.

**Aba Carimbo & Fontes** — defina o carimbo do médico por **URL de imagem da internet** ou upload de arquivo (ou mantenha o carimbo automático), e escolha as **fontes** do cabeçalho e da prescrição (inclui fontes do Google e cursivas para o nome do médico). As escolhas ficam salvas no navegador.

**Modelos de receita** — além dos modelos simples, o projeto inclui os principais formatos brasileiros: Simples Clássica, Simples Renovável, Branca em 2 vias, Controle Especial (Mod. 01, Portaria 344/98 e Oficial ANVISA 2.0), Antimicrobiano (faixa azul) e Notificação de Receita "A" (faixa amarela). Há ainda Uso Contínuo (2 vias e enxuta), Veterinária de antimicrobianos (oficial e enxuta, com CRMV e identificação do animal/propriedade) e Odontológica (oficial e enxuta, com CRO) — todos reconstruídos a partir das normas oficiais (ANVISA/MS, CFM, CFMV, CFO). Modelos não usados podem ser ocultados pela aba Receitas.

**Receita Dupla** — duas receitas diferentes numa folha A4 em paisagem; cada lado é independente (modelo, cabeçalho, paciente, medicamentos, fontes, margens e carimbo), com proporção ajustável e opção de puxar a receita da aba Receitas.

**Melhorias de uso:**
- **Tela inicial (Início)** com banner, indicadores (receitas emitidas, modelo mais usado, listas carregadas, modelos salvos), atalhos rápidos e as últimas receitas emitidas. O banner usa `assets/img/hero.png` (arte do Canva); se o arquivo não existir, um banner desenhado em código aparece no lugar.
- **Funciona offline** (PWA): depois da primeira visita com internet, o app abre e funciona sem conexão, e pode ser instalado como aplicativo.
- **Backup/restauração** (aba Listas): exporta tudo — listas, carimbo, assinatura, fontes, modelos salvos, histórico e numeração — num arquivo `.json`, com opção de substituir ou mesclar ao restaurar.
- **Histórico de emitidas**: cada impressão/PDF é registrada e pode ser reaberta, editada e reimpressa.
- **Avisos de campos obrigatórios** por tipo de receita, antes de emitir.
- **Numeração sequencial automática** (Antimicrobiano, Notificação A) e **código de acesso** (Oficial ANVISA).
- **Assinatura separada do carimbo** (imagem por URL ou arquivo), na aba Carimbo & Fontes.

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

Os arquivos incluídos são **apenas exemplos**. Se os CSVs não existirem, o sistema funciona
normalmente com digitação livre.

Há duas formas de alimentar o autocomplete:

1. **Aba "Listas" (recomendado)** — dentro do próprio sistema, escolha seus arquivos `.CSV` de
   médicos, medicamentos e clientes. As listas ficam salvas **no navegador** (nada é enviado a
   servidores) e valem para as próximas vezes, sem precisar mexer no repositório. O separador
   (`;` ou `,`) e a coluna do nome são detectados automaticamente pelo cabeçalho, e a acentuação
   é corrigida mesmo em arquivos no padrão antigo do Windows (ANSI/Latin-1).
2. **Arquivos em `data/`** — substitua os CSVs de exemplo pelos seus exports e publique no
   repositório. Usados como padrão quando ainda não há lista importada pela aba Listas.

> A lista salva pela aba **Listas** tem prioridade sobre o CSV do `data/`. Use o botão **Remover**
> na aba Listas para voltar a usar o arquivo do repositório.

---

## Estrutura

```
index.html                     página única (Início, Receitas, Importar, Listas, Carimbo & Fontes, Dupla)
manifest.webmanifest           configuração do app instalável (PWA)
sw.js                          service worker (funcionamento offline)
assets/icon.svg                ícone do app
assets/css/app.css             identidade visual e layout da bancada
assets/css/receita.css         a folha A4 (retrato e paisagem) e todos os modelos
assets/js/fonts.js             catálogo de fontes (+ Google Fonts)
assets/js/stamp.js             carimbo gerado/por imagem + assinatura
assets/js/models.js            modelos de receita, numeração e obrigatórios
assets/js/format.js            fonte (cabeçalho/corpo), tamanho, espaçamento,
                               margens, carimbo/assinatura automáticos
assets/js/templates.js         persistência, histórico, numeração e backup
assets/js/importer.js          OCR + leitura de PDF/DOCX + extração de campos
assets/js/export.js            impressão e PDF (retrato e paisagem)
assets/js/dupla.js             controlador da Receita Dupla (A4 paisagem)
assets/js/app.js               controlador (abas, formulário, preview, backup)
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
