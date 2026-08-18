# PrivateChat

Prototipo simples de uma plataforma de chat privada. Base funcional e facil de
expandir com servidores, canais, emojis, voice chat, etc. no futuro.

Fluxo implementado:

**Conta → Serial ID → Perfil → Adicionar amigo → Chat privado → Salvar dados**

---

## 1. Instalar o Node.js

Baixe e instale o Node.js (versao 18 ou superior) em https://nodejs.org

Verifique se deu certo:

```bash
node -v
npm -v
```

## 2. Instalar as dependencias

Dentro da pasta do projeto:

```bash
npm install
```

Isso vai instalar: `express`, `express-session`, `socket.io`, `bcryptjs`,
`better-sqlite3` e `multer` (upload de arquivos).

## 3. Iniciar o servidor

```bash
npm start
```

Vai aparecer no terminal:

```
PrivateChat rodando em http://localhost:3000
```

## 4. Abrir no navegador

Acesse: [http://localhost:3000](http://localhost:3000)

Crie uma conta na aba "Criar conta", faca login e comece a usar.

Para testar o chat entre dois usuarios, abra duas abas/navegadores
diferentes (ou uma aba anonima) e crie duas contas.

---

## 5. Onde ficam os arquivos

```text
PrivateChat/
├── public/                → tudo que roda no navegador (frontend)
│   ├── index.html          → estrutura das telas (login, home, friends, chat, settings)
│   ├── style.css           → estilos, temas (dark/light/etc), banners, modal de perfil
│   ├── script.js           → logica do frontend, chamadas para a API, socket.io
│   └── uploads/
│       ├── avatars/         → fotos de perfil enviadas pelos usuarios
│       └── banners/         → banners de perfil enviados pelos usuarios
│
├── server.js              → servidor Express + rotas da API + socket.io + upload
├── db.js                  → conexao com o SQLite e criacao das tabelas
├── serialId.js             → geracao do Serial ID unico (#000000000)
├── database.db             → arquivo do banco SQLite (criado automaticamente)
├── package.json            → dependencias e script de start
└── README.md
```

O banco `database.db` e criado automaticamente na primeira vez que voce roda
`npm start`. Se quiser resetar tudo (apagar contas, amigos e mensagens), basta
apagar esse arquivo (e os `database.db-shm` / `database.db-wal`, se
existirem) e reiniciar o servidor.

## 6. Funcionalidades de aparencia e perfil

- **Icones**: os icones da sidebar e dos botoes sao SVG inline (nao emojis),
  definidos direto no `index.html` (icones fixos) e em um objeto `ICONS` no
  topo do `script.js` (icones usados em listas geradas dinamicamente). Para
  trocar um icone, basta trocar o `<svg>...</svg>` correspondente — todos
  usam `stroke="currentColor"`, entao herdam a cor do texto/tema automatico.

- **Temas**: em Settings → Aparencia, o usuario escolhe entre Escuro, Claro,
  Meia-noite e Floresta, alem de uma cor de destaque customizavel (color
  picker). A escolha fica salva no `localStorage` do navegador. Cada tema e
  apenas um bloco de variaveis CSS em `public/style.css`
  (`[data-theme="nome"] { --bg: ...; --text: ...; }`) — para criar um tema
  novo, copie um bloco existente, ajuste as cores e adicione um botao
  correspondente em `#theme-grid` no `index.html`.

- **Foto de perfil e banner**: agora sao enviados como arquivo de imagem
  (PNG/JPG/WEBP/GIF, ate 5MB para avatar e 8MB para banner), nao mais por
  URL. Os arquivos ficam em `public/uploads/avatars` e
  `public/uploads/banners`, e o caminho relativo e salvo no banco. As rotas
  ficam em `server.js` (`POST /api/upload/avatar`, `POST /api/upload/banner`
  e as versoes `DELETE` para remover).

- **Popout de perfil**: ao clicar no avatar/nome de alguem (em Friends,
  Users ou nas solicitacoes), abre um card modal com banner, avatar, nome,
  Serial ID e bio dessa pessoa — igual ao perfil rapido do Discord. A logica
  fica em `openProfileModal()` no `script.js`, e os botoes de acao mudam
  conforme a relacao (amigo, solicitacao recebida/enviada ou desconhecido).

## 7. Onde modificar cada parte

- **Adicionar um campo novo no usuario (ex: status, tema, etc.)**
  → `db.js` (coluna na tabela `users`) + `server.js` (rotas de perfil) +
  `public/script.js` / `public/index.html` (tela de Settings).

- **Mudar as regras de amizade (ex: permitir amigos em comum, bloquear
  usuarios)**
  → `server.js`, secao `---------- Amigos ----------`.

- **Adicionar servidores/canais no futuro**
  → criar novas tabelas em `db.js` (ex: `servers`, `channels`,
  `channel_messages`), novas rotas em `server.js`, e uma nova view em
  `public/index.html` + `public/script.js` (seguindo o mesmo padrao das
  views existentes: `view-home`, `view-friends`, `view-chat`, etc).

- **Mudar a aparencia (cores, fontes, layout)**
  → `public/style.css`. As cores principais estao centralizadas nas
  variaveis CSS no topo do arquivo (`:root { --bg, --accent, ... }`).

- **Mensagens em tempo real / status online**
  → toda a parte de socket.io esta no final do `server.js` (secao
  `---------- Socket.io ----------`) e em `public/script.js` na funcao
  `connectSocket()`.

---

## Observacoes tecnicas

- As senhas sao armazenadas com hash (`bcryptjs`), nunca em texto puro.
- A sessao do usuario e controlada por cookie (`express-session`).
- O Serial ID tem 9 digitos, e gerado aleatoriamente e tem restricao
  `UNIQUE` no banco de dados, entao nunca se repete.
- Este e um prototipo local: o segredo da sessao em `server.js`
  (`private-chat-dev-secret`) deve ser trocado antes de qualquer uso real
  em producao, e o projeto ainda nao tem HTTPS, rate limiting ou validacoes
  avancadas.
