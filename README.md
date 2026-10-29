# Evolve Fit 💙

Aplicativo web instalável (PWA) para **treinadores e alunos**: criação de fichas, acompanhamento dos treinos, evolução e histórico, com dados no Firebase.

**[Abrir o Evolve Fit](https://danielcs-07.github.io/Envolve-fit/)**

## O que o aplicativo oferece

- **Treinador:** cadastro independente, código exclusivo de convite, aprovação de alunos, criação e edição de fichas, modelos reutilizáveis e acompanhamento de resultados.
- **Aluno:** treinos por dia, registro de séries (kg e repetições), descanso, cronômetro, histórico, medidas, gráficos, PR por exercício, comentários e avaliação do treino.
- **Privacidade:** cada treinador acompanha somente os alunos vinculados à sua conta. A proteção efetiva depende das regras publicadas no Firestore.
- **Uso no celular:** layout responsivo e instalação como PWA, com recuperação de treinos em andamento quando o armazenamento estiver disponível.

## Como funcionam os cadastros

1. O treinador cria a própria conta e recebe um código no painel **Meus alunos → Convide seus alunos**.
2. O aluno se cadastra usando o código ou o link de convite daquele treinador.
3. O treinador aprova o aluno. Cada profissional visualiza apenas sua equipe.

## Organização do código

```text
Envolve-fit/
├── index.html                   # Entrada e cadastro
├── treinador.html               # Área do treinador
├── aluno.html                   # Área do aluno
├── offline.html                 # Tela sem conexão
├── sw.js                        # Service Worker (raiz da PWA)
├── manifest.webmanifest         # Instalação do aplicativo
├── app-icon.svg                 # Ícone
├── firestore.session-drafts.rules # Modelo das regras do Firestore
├── assets/
│   ├── css/                     # Aparência e responsividade
│   └── js/                      # Scripts, Firebase, módulos e treinos
├── docs/                        # Guias e histórico técnico
├── tests/                       # Testes automatizados
└── .github/workflows/           # Validação automática
```

O JavaScript das funcionalidades foi **movido sem mudar sua lógica**. As páginas públicas mantêm os mesmos endereços, e as referências de scripts, estilos e cache offline foram atualizadas para as novas pastas.

## Documentação

- [Mapa de arquivos e orientações de manutenção](docs/ORGANIZACAO.md)
- [Configuração segura de vários treinadores](docs/SEGUNDO-TREINADOR.md)
- [Recuperação dos treinos em segundo plano](docs/PERSISTENCIA-SEGUNDO-PLANO.md)
- [Histórico completo das implementações anteriores](docs/HISTORICO-README.md)

## Tecnologias e testes

HTML, CSS e JavaScript (módulos ES), Firebase Authentication e Cloud Firestore, GitHub Pages e PWA.

- Testes de funcionalidades e integridade das referências: `node --test tests/*.test.mjs`.
- Testes de regras de segurança: workflow **Validar regras Firestore** usando o emulador, sem conectar ao banco real.
- A rotina do GitHub Actions valida os arquivos antes da integração com a ramificação principal.

**Atenção:** o arquivo `firestore.session-drafts.rules` é somente o modelo versionado. Alterações no GitHub **não publicam automaticamente** regras no Firebase. Para dados reais, confira e teste as regras no [Firebase Console](https://console.firebase.google.com/project/envolve-fit-f584e/firestore/rules). Nunca publique credenciais administrativas no repositório.
