# PFEND1-AV-INDIVIDUAL — LMP3 News (SENAI)

Este é o **projeto original PFEND1-AV-INDIVIDUAL** adaptado para um
gerenciador de notícias de automobilismo da categoria LMP3, mantendo
**Next.js 16 + React 19** e a estrutura **`frontend/src/app`** já existente.

## Requisitos

- Node.js 20.9 ou superior, npm e conexão à internet para instalar dependências.
- O projeto usa **React Bootstrap** (a dependência foi acrescentada).
- A API usa **Express + cors** e salva as notícias em um arquivo JSON local, sem exigir banco de dados.

## Como executar (método mais fácil)

1. Extraia o ZIP.
2. Abra um terminal no diretório **PFEND1-AV-INDIVIDUAL** (onde está este README e o `package.json` principal).
3. Execute:

```bash
npm install
npm run dev
```

Acesse:
- Front-end: http://localhost:3000
- Back-end: http://localhost:3001/api/noticias
- Usuários simulados: http://localhost:3001/api/usuarios

Os comandos acima iniciam os dois serviços (front e back) automaticamente
por meio dos scripts npm workspaces.

## Executar separadamente (se preferir)

Terminal 1, na pasta raiz:

```bash
npm run dev:backend
```

Terminal 2, na mesma pasta raiz:

```bash
npm run dev:frontend
```

Se preferir executar dentro de cada subpasta, use
`cd backend && npm install && npm run dev` e
`cd frontend && npm install && npm run dev` em terminais diferentes.

## Estrutura principal

```
PFEND1-AV-INDIVIDUAL/
├── package.json                  # npm install / npm run dev na raiz
├── scripts/dev.cjs               # executa front e back
├── backend/
│   ├── package.json
│   ├── server.js                 # API Express
│   └── noticias-store.js         # Leitura e gravação do arquivo de notícias
├── database/
│   └── noticias.json             # Notícias e links das imagens salvos
├── frontend/
│   ├── package.json              # Next.js 16 + Bootstrap + react-bootstrap
│   ├── src/app/
│   │   ├── page.jsx              # Listar/cadastrar/editar/excluir notícias
│   │   ├── layout.jsx            # Bootstrap e metadata
│   │   └── globals.css           # Tema escuro e cards responsivos
│   └── public/lmp3.svg           # Ilustração padrão
└── docs/                         # PDF da atividade original
```

Outros arquivos originais do projeto foram preservados.

## Funcionalidades e rotas

- `GET /api/noticias` — listar notícias
- `GET /api/usuarios` — listar dois usuários simulados
- `POST /api/noticias` — cadastrar notícia
- `PUT /api/noticias/:id` — editar notícia
- `DELETE /api/noticias/:id` — excluir notícia

O React Bootstrap monta os cards responsivos e os formulários; `useEffect`
consulta a API, com estado de carregamento e alerta de erro.
Cada notícia aceita até três links de imagens, exibidas em um carrossel
Bootstrap. Os links podem ser preenchidos no cadastro e na edição.

Cadastros, edições e exclusões são salvos automaticamente em
**`database/noticias.json`** antes de a API confirmar a operação. Ao fechar
e iniciar os processos novamente, as notícias e os links são recuperados
desse arquivo. Preserve a pasta `database` ao copiar ou fazer backup do projeto.
Os três exemplos iniciais só são criados quando o arquivo ainda não existe;
uma lista vazia permanece vazia. Se o arquivo estiver inválido, a API informa
o erro sem substituí-lo pelos exemplos.

Os textos das três notícias iniciais são *fictícios e didáticos*, não
reportagens verificadas.

Para testar o salvamento e a recuperação após reiniciar a API, execute
`npm test --workspace backend`. Os testes usam arquivos temporários e não
alteram as notícias do projeto.

## Se der erro em `npm install` ou `npm run dev`

1. Confira se o terminal está na pasta que contém o `package.json` **da raiz**.
2. Confira a instalação do Node e npm:

```bash
node -v
npm -v
```

3. Para instalar dependências, é necessário acesso à internet (React
   Bootstrap, Express e CORS não estavam incluídos no projeto original).
4. Se já houver uma instância do Next ou Express nas portas 3000/3001,
   encerre-a antes de iniciar novamente.
5. Execute `npm install` e depois `npm run dev`; não execute os dois
   comandos ao mesmo tempo.

O `package-lock.json` original dentro de `frontend/` foi mantido para
preservar a estrutura do projeto. O npm atualiza os arquivos de lock
necessários quando a instalação é executada.
