# Evolve Fit 3.0 — protótipo de experiência

Esta pasta contém um protótipo **isolado**, usando React, Vite e Motion. Ele demonstra navegação sem recarregamento, entrada/saída de telas animadas, abertura de detalhes em painel lateral, criação de um rascunho demonstrativo e interações na área do aluno.

## Segurança e limitações
- **Não há conexão com Firebase:** todos os nomes, números e treinos exibidos são fictícios.
- O formulário de novo treino modifica apenas o estado React, em memória. Não envia nem altera dados.
- As marcações do aluno também são apenas uma demonstração visual e se perdem ao atualizar a página.
- Não contém login, isolamento de dados entre treinadores, regras Firestore ou migração.
- O aplicativo que já está em `main` e no GitHub Pages continua intacto.
- Só conecte Firebase Authentication/Firestore após portar regras, permissões, testes e salvamento de rascunhos; não reutilize regras de produção sem inspeção.
- O objetivo aqui é **testar a sensação de uso**, antes de reconstruir as funcionalidades reais.

## Testar no computador
Use Node.js 22 ou mais recente:

```sh
cd app-v3
npm install
npm run dev
```

O site de demonstração será servido pelo Vite localmente.

## Hospedar sem GitHub Pages
**Opção recomendada para teste:** Firebase Hosting, preferencialmente em projeto **separado** do Firebase de produção, sem sobrescrever o site oficial.

1. Crie/configure um projeto Firebase de testes e mantenha os dados de produção intactos.
2. Na pasta `app-v3`, instale dependências e execute `npm run build`.
3. Configure Firebase CLI para o projeto **de teste** e confira o ID antes de publicar.
4. Publique **apenas Hosting** (a regra fica em `firebase.json` e aponta para `dist`). Não inclua regras Firestore no deploy.
5. Use um canal de preview ou site exclusivo do protótipo.

Também é possível importar o GitHub em um serviço de deploy que aceite Vite, usando `app-v3` como **Root Directory**, `npm run build` como Build Command e `dist` como Output Directory. Se usar um serviço de preview que publica somente da branch principal, publique esta pasta isolada em um repositório próprio, sem mexer no atual.

## Próximas etapas necessárias para produção
1. Aprovar a experiência e ajustar os fluxos de alunos/treinos com base no feedback real.
2. Separar a camada de dados existente em serviços testáveis; migrar login e permissões preservando UIDs.
3. Migrar módulos em pequenos lotes: treinador, aluno, fichas, sessões e relatórios.
4. Implementar PWA confiável e persistência para retomada do treino após segundo plano.
5. Testar Firestore com dois treinadores independentes, alunos, permissões negativas e restauração após suspender/reabrir.
6. Preparar deploy com domínio novo e mecanismo de reversão antes de descontinuar a versão antiga.

## Dependências
- React 19
- Vite 7
- Motion para React 14 (`AnimatePresence` e animações de layout)
