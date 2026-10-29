# Organização do Evolve Fit

Estrutura feita para manter os arquivos fáceis de encontrar **sem alterar a lógica do aplicativo**.

```text
Envolve-fit/
├── index.html                 # Login e cadastro
├── aluno.html                 # Painel do aluno
├── treinador.html             # Painel do treinador
├── offline.html               # Página sem internet
├── sw.js                      # Service Worker: deve ficar na raiz
├── manifest.webmanifest       # Instalação PWA
├── app-icon.svg               # Ícone público
├── firestore.session-drafts.rules # Modelo das regras do Firebase
├── assets/
│   ├── css/                   # Estilos, cores e responsividade
│   └── js/                    # Telas, Firebase, utilitários e treinos
├── docs/                      # Guias de configuração e manutenção
├── tests/                     # Testes automáticos
└── .github/workflows/         # Validação e emulador de segurança
```

## Arquivos principais

- **`assets/js/auth-ui.js`**: login, cadastro de treinador e aluno, código de convite.
- **`assets/js/treinador.js`**: painel, fichas e acompanhamento do treinador.
- **`assets/js/aluno.js`**: sessões, séries, histórico e medidas do aluno.
- **`assets/js/aprovacao.js`**: aprovação de novos alunos.
- **`assets/js/firebase-config.js`**: configuração pública do Firebase Web.
- **`assets/js/*.mjs`**: utilitários reutilizáveis, validações e modelos de treino.
- **`assets/css/`**: arquivos visuais do aplicativo.
- **`sw.js`**: cache offline, na raiz para manter o escopo da PWA.

## Cuidados para futuras alterações

1. Novos scripts e estilos devem ser carregados em HTML usando `assets/js/` ou `assets/css/`.
2. Os imports dentro de `assets/js/` usam caminhos relativos à mesma pasta.
3. Atualize a lista de cache no `sw.js` se adicionar ou renomear recursos necessários offline.
4. Mantenha as páginas `.html`, o `sw.js` e o manifesto na raiz para preservar os links públicos e a instalação do app.
5. Antes de publicar, os testes do GitHub devem passar, incluindo `tests/asset-paths.test.mjs`.
6. O GitHub **não publica regras do Firebase**. O arquivo `firestore.session-drafts.rules` continua na raiz para facilitar comparações e cópias para o Console.

Esta reorganização não modifica contas, treinos, dados do Firestore ou as regras já publicadas no Firebase.
