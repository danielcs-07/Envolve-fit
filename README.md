# Evolve Fit 💪

Plataforma de acompanhamento de treino e evolução para **um treinador** e seus alunos, com interface responsiva e dados sincronizados no Firebase.

**Site:** https://danielcs-07.github.io/Envolve-fit/

## Aluno
- Cria uma conta com e-mail e senha e aguarda aprovação.
- Consulta fichas, calendário semanal e treino recomendado para hoje.
- Registra cargas, repetições e séries concluídas, incluindo treinos parciais.
- Acompanha a duração total do treino, ajusta/pausa/pula o descanso sugerido pelo treinador e assiste aos vídeos de execução, quando fornecidos.
- Ao concluir, pode avaliar com 1 a 5 estrelas, classificar a intensidade e deixar um comentário para o treinador (etapa opcional).
- Acompanha histórico, medidas, recordes pessoais (PR) por exercício, progressão de carga e consistência das últimas quatro semanas.
- Cada PR mostra exercício, dia da ficha (ou dia do registro quando a ficha não existe mais), maior carga, repetições e ganho real desde o recorde anterior. A primeira sessão é o ponto inicial, não um aumento inventado.
- A consistência conta semanas com pelo menos um treino salvo, nas quatro semanas de calendário mais recentes, incluindo a atual; não mede cumprimento de metas de frequência. Os treinos registrados incluem sessões parciais.
- Pode solicitar redefinição de senha pelo próprio e-mail.

## Treinador
- Aprova novos cadastros na seção **Meus alunos**.
- Cria, edita, publica e duplica fichas de treinamento.
- Pesquisa treinos e alunos e usa filtros para localizar registros.
- Consulta evolução individual por aluno, incluindo recordes pessoais por exercício e consistência semanal.
- Vê as notas, a percepção de esforço e os comentários do aluno no histórico e na visão geral.
- Exporta registros filtrados de treino em CSV.

## Como usar
1. O treinador entra com a conta previamente configurada no Firebase Authentication e autorizada na coleção `users` com `role: "trainer"`, `active: true`.
2. O aluno abre a página de login, escolhe **Criar conta** e se cadastra.
3. A conta é criada com `role: "student"` e `active: false`.
4. O treinador aprova o cadastro em **Meus alunos** e publica as fichas escolhendo o aluno destinatário.
5. O aluno abre **Meus treinos**, preenche as séries concluídas, toca em **Concluir treino** e pode avaliar antes de salvar definitivamente.

As fichas com um dia da semana aparecem na agenda. Fichas sem dia específico continuam disponíveis como treinos livres.

## Recuperação de rascunhos ao alternar aplicativos

- **Aluno:** cargas, repetições, séries marcadas, início da sessão e prazo do descanso ficam salvos automaticamente **no armazenamento deste aparelho e navegador**, separados pela conta e pela ficha. Ao recarregar a página, o treino que estava aberto reaparece com o preenchimento recuperado. Fechar o painel não apaga o rascunho; o botão **Descartar rascunho** permite apagá-lo.
- **Treinador:** o criador de fichas recupera campos, exercícios, links de vídeos e observações que ainda não foram salvos no Firebase. Trocar de tela não descarta as edições. Criar outro treino ou limpar a ficha pode pedir confirmação.
- Medidas corporais ainda não enviadas também podem ser recuperadas no formulário do aluno.
- Esses dados são **locais**, não são um backup na nuvem. Expiram após sete dias sem alteração e são apagados ao sair da conta no aplicativo. Evite dispositivos compartilhados.
- Se o navegador bloquear ou limpar os dados do site, ou se você trocar de aparelho, o rascunho local poderá não estar disponível. O Android pode suspender a aplicação em segundo plano; o aplicativo recupera o preenchimento quando a página volta a carregar, mas não executa treinos no servidor durante a suspensão.
- A avaliação ainda não enviada também é recuperada no navegador. Só tocar em **Enviar e finalizar** ou **Pular avaliação**, após conferir as séries, grava o treino concluído no Firebase. **Salvar/Publicar ficha** grava as edições do treinador.

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
- `trainingLogs/{id}`: `studentId`, `workoutId`, `workoutName`, `exercises`, `createdAt`, opcionalmente `durationSeconds` e `feedback` (nota, intensidade e comentário).
- `measurements/{id}`: `studentId`, `weight`, `height`, `createdAt`.

Os recursos novos reutilizam as coleções existentes, sem migração obrigatória.

### Atualizar as regras do Firebase para avaliações

O arquivo `firestore.session-drafts.rules` do repositório foi atualizado para permitir os campos opcionais `durationSeconds` e `feedback`. **Um commit no GitHub não publica regras no Firebase Console.** Antes de usar as avaliações em produção, compare o arquivo do repositório com as regras atualmente publicadas em **Firebase Console → Firestore Database → Regras** e publique uma versão que aceite esses campos e preserve suas proteções atuais.

Até a publicação, o aplicativo mantém a compatibilidade: se as regras rejeitarem o feedback, ele ainda salva as séries com o formato antigo e informa que a avaliação não foi enviada. Dados de avaliações não são enviados silenciosamente. Os registros antigos continuam válidos, sem necessidade de alteração de documentos.

O comentário pode conter informações sensíveis fornecidas voluntariamente pelo aluno. Defina regras claras de acesso, retenção, exclusão e uso desses relatos conforme a LGPD.

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

