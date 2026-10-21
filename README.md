# Evolve Fit 💪

Plataforma de acompanhamento de treino e evolução para **um treinador** e seus alunos, com interface responsiva e dados sincronizados no Firebase.

**Site:** https://danielcs-07.github.io/Envolve-fit/

## Aluno
- Cria uma conta com e-mail e senha e aguarda aprovação.
- Consulta fichas, calendário semanal e treino recomendado para hoje.
- Registra cargas, repetições e séries concluídas, incluindo treinos parciais.
- Usa um cronômetro de descanso e encontra vídeos de execução quando fornecidos pelo treinador.
- Acompanha histórico, medidas, recordes pessoais (PR) por exercício, progressão de carga e consistência das últimas quatro semanas.
- Cada PR mostra exercício, dia da ficha (ou dia do registro quando a ficha não existe mais), maior carga, repetições e ganho real desde o recorde anterior. A primeira sessão é o ponto inicial, não um aumento inventado.
- A consistência conta semanas com pelo menos um treino salvo, nas quatro semanas de calendário mais recentes, incluindo a atual; não mede cumprimento de metas de frequência. Os treinos registrados incluem sessões parciais.
- Pode solicitar redefinição de senha pelo próprio e-mail.

## Treinador
- Aprova novos cadastros na seção **Meus alunos**.
- Cria, edita, publica e duplica fichas de treinamento.
- Pesquisa treinos e alunos e usa filtros para localizar registros.
- Consulta evolução individual por aluno, incluindo recordes pessoais por exercício e consistência semanal.
- Exporta registros filtrados de treino em CSV.

## Como usar
1. O treinador entra com a conta previamente configurada no Firebase Authentication e autorizada na coleção `users` com `role: "trainer"`, `active: true`.
2. O aluno abre a página de login, escolhe **Criar conta** e se cadastra.
3. A conta é criada com `role: "student"` e `active: false`.
4. O treinador aprova o cadastro em **Meus alunos** e publica as fichas escolhendo o aluno destinatário.
5. O aluno abre **Meus treinos**, preenche as séries concluídas e salva o histórico.

As fichas com um dia da semana aparecem na agenda. Fichas sem dia específico continuam disponíveis como treinos livres.

## Instalação no celular
Em navegadores compatíveis com aplicativos web instaláveis, use **Instalar Evolve Fit** quando a opção aparecer, ou abra o menu do navegador e escolha **Adicionar à tela inicial**. A instalação depende do suporte do navegador e do aparelho.

**Importante:** é necessário ter internet para autenticar, consultar dados e salvar sessões. O modo sem conexão apenas exibe uma mensagem informativa.

## Tecnologias
- HTML, CSS e JavaScript nativo; hospedagem pelo GitHub Pages.
- Firebase Authentication para contas e recuperação de senha.
- Cloud Firestore para perfis, fichas, sessões e medidas.
- Service Worker apenas para arquivos estáticos públicos; não armazena registros privados em cache de páginas.
- Testes automatizados em `tests/` com Node.js via GitHub Actions.

## Estrutura de dados
- `users/{uid}`: `name`, `email`, `role`, `active`.
- `workouts/{id}`: `trainerId`, `studentId`, `status`, `day`, `name`, `description`, `exercises`.
- `trainingLogs/{id}`: `studentId`, `workoutId`, `workoutName`, `exercises`, `createdAt`.
- `measurements/{id}`: `studentId`, `weight`, `height`, `createdAt`.

Os recursos novos reutilizam as coleções existentes, sem migração obrigatória.

## Segurança e produção
**Este projeto usa atualmente o cenário de um treinador.** As regras do Firestore publicadas no Firebase Console precisam ser revisadas se houver vários treinadores: a configuração inicial pode permitir que um treinador consulte registros de alunos de outros. O código-fonte no GitHub **não atualiza automaticamente** as regras publicadas.

Antes de atender alunos reais:
- Confirme as regras de autenticação/autorização diretamente no Firestore.
- Documente como os alunos terão seus dados de treino, peso e altura tratados, conforme a LGPD, e mantenha um canal de suporte.
- Crie uma rotina de backup/exportação e defina os procedimentos de exclusão quando solicitados.
- Faça um teste completo com contas de teste para cadastro, aprovação, publicação, registro e histórico.
- Considere exigir verificação de e-mail para ambientes de produção, com atualização apropriada do fluxo de cadastro e aprovação.

Não armazene chaves administrativas ou credenciais privadas no repositório. O `firebase-config.js` contém apenas a configuração pública do aplicativo web, que deve ser protegida pelas **regras** do Firestore e pela autorização do Firebase.

## Testes
O workflow `Validar Evolve Fit` executa `node --check` nos scripts e `node --test tests/*.test.mjs` a cada pull request e envio à `main`.

