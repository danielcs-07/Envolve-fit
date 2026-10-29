## Organização do repositório

As páginas e links públicos foram mantidos na raiz; scripts e estilos foram agrupados em `assets/js/` e `assets/css/`, e os guias estão em `docs/`. Veja [a estrutura completa](docs/ORGANIZACAO.md). **Nenhuma lógica de treino ou regra do Firebase foi modificada nesta reorganização.**

## Ativação segura para vários treinadores

**Não libere novos treinadores antes de seguir [guia de vários treinadores](docs/SEGUNDO-TREINADOR.md).** O cadastro de treinador passará a ser automático com código exclusivo, mas a proteção real dos dados só existirá após publicar as regras novas e vincular os alunos existentes, inclusive a Vitória, ao treinador original.

# Evolve Fit 💪

Plataforma de acompanhamento de treino e evolução para **um treinador** e seus alunos, com interface responsiva e dados sincronizados no Firebase.

**Site:** https://danielcs-07.github.io/Envolve-fit/

## Treino em andamento: minimizar, continuar e copiar série

- O botão **Minimizar** na ficha do aluno deixa o treino em andamento, sem descartar séries, cargas, tempo ou feedback preenchido. A tela inicial exibe um cartão **Continuar** com cronômetro e progresso, visível também nas demais áreas do app.
- Abrir novamente a mesma ficha enquanto está ativa retorna ao preenchimento existente, sem reiniciar o cronômetro. Ao tentar abrir outra ficha, o aluno é avisado e o rascunho anterior é salvo neste aparelho.
- O botão **Repetir série anterior** copia apenas carga e repetições para a série atual. A caixa **Feita** continua exigindo confirmação manual, evitando contabilizar uma série não realizada.
- A sessão ativa é mantida no armazenamento de recuperação atual do app. O recurso **Descartar rascunho** continua disponível quando o usuário quiser limpar deliberadamente o preenchimento, sem apagar registros já concluídos.
- Nenhuma coleção ou regra do Firebase foi modificada nesta atualização. A confiabilidade do rascunho na nuvem depende das regras atuais publicadas no Firebase Console; a cópia local continua sendo a primeira proteção contra perda do preenchimento.

## Navegação moderna — aluno e treinador

- No celular, o menu horizontal foi substituído por uma barra flutuante com **cinco ações fixas** e ícones vetoriais. Ela não exige rolagem horizontal.
- Aluno: Início, Histórico, Treinos (em destaque), Evolução e Mais. Dentro de Mais: Ferramentas e Perfil.
- Treinador: Início, Alunos, Criar (em destaque), Fichas e Mais. Dentro de Mais: Modelos, Histórico, Evolução e Perfil.
- O botão Mais abre uma folha inferior acessível, fechada por toque no fundo, botão de fechar ou Escape, com retorno de foco e suporte a modo escuro.
- No computador, o menu lateral continua disponível com ícones vetoriais e rótulos claros. As ações de navegação reutilizam os botões e manipuladores antigos; não alteram o banco de dados.
- As páginas carregam estilos próprios da navegação ao final da cascata, e o Service Worker utiliza uma nova versão de cache para renovar o visual em instalações PWA.

## Evolve Fit Studio — revisão da interface e Ferramentas

- A identidade visual passou por uma revisão completa para remover elementos verdes antigos dos arquivos CSS e do ícone, mantendo uma paleta de azul, grafite e violeta.
- A área **Explorar** foi substituída por **Ferramentas**, com biblioteca pesquisável dos exercícios das fichas publicadas, vídeos já atribuídos, calculadora de anilhas simétricas, estimativa de 1RM por Epley e favoritos de música.
- Links do Spotify aceitos podem abrir um **player oficial incorporado**, iniciado somente por ação do aluno e sujeito às condições de reprodução do Spotify. Os demais serviços continuam usando links externos.
- Na ficha do aluno, a opção **Substituir nesta sessão** usa exercícios já encontrados nas fichas disponíveis e registra a alternativa no rascunho do navegador. Ela não atualiza o documento da ficha do treinador; ao trocar um exercício preenchido, o aluno recebe uma confirmação de perda apenas das séries daquele exercício.
- Gráficos por exercício do aluno e do treinador agora permitem alternar entre carga máxima (kg) e repetições máximas registradas em uma série.
- A visão geral do treinador mostra alunos ativos sem ficha publicada e alunos sem registros nos últimos sete dias. Isso não significa que estejam atrasados: é apenas um indicador informativo.
- A versão não modifica regras do Firestore nem migra registros existentes. **Substituições em rascunho ficam prioritariamente no dispositivo; em caso de troca de aparelho, nem todos os campos de rascunho podem ser recuperados até a atualização das regras.**
- A próxima etapa técnica para múltiplos treinadores exige autenticação/autorização segregadas por treinador e revisão do Firebase Console.

## Evolve Fit Studio — novo design responsivo

- Nova identidade visual com tons de azul, lavanda e verde-água, cartões reformulados e navegação inferior no celular.
- Modo claro, escuro ou automático nas preferências do perfil, salvo somente neste navegador.
- Área **Ferramentas** com biblioteca dos exercícios recebidos, calculadoras de referência, playlist favorita e player oficial incorporado para links compatíveis do Spotify.
- Painel do treinador com atalhos e **Modelos** que preenchem o formulário editável (corpo inteiro, superiores e inferiores) e **não publicam nada automaticamente**.
- O histórico, as fichas, os cronômetros, o feedback, os registros de PR e as medidas continuam usando as estruturas anteriores.
- A reforma **não altera registros existentes do Firestore e não publica regras do Firebase**. Recursos que dependam dos campos novos de feedback/duração ainda exigem revisar e publicar as regras apropriadas no Firebase Console.

## Segurança da atualização
Esta versão altera sobretudo HTML, CSS e JavaScript de apresentação. Modelos somente preenchem um formulário local, e não executam operações no banco até o treinador escolher salvar/publicar. Na passagem para múltiplos treinadores, é obrigatório separar acesso e permissões por treinador nas regras do Firestore antes do lançamento público.

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
- Aprova novos cadastros vinculados ao seu perfil na seção **Meus alunos**; copia seu link individual de convite.
- Cria, edita, publica e duplica fichas de treinamento.
- Pesquisa treinos e alunos e usa filtros para localizar registros.
- Consulta evolução individual por aluno, incluindo recordes pessoais por exercício e consistência semanal.
- Vê as notas, a percepção de esforço e os comentários do aluno no histórico e na visão geral.
- Exporta registros filtrados de treino em CSV.

## Como usar
1. O profissional abre **Criar conta**, seleciona **Sou treinador** e cria o próprio cadastro. O aplicativo gera um `coachCode` exclusivo (ex.: `EF-ABCDEF234567`). **Essa funcionalidade só estará disponível após publicar e validar as novas regras**, conforme [guia de vários treinadores](docs/SEGUNDO-TREINADOR.md).
2. O aluno abre o link de convite ou informa o código do treinador ao selecionar **Sou aluno**.
3. A conta é criada com `role: "student"`, `active: false`, `trainerCode` e `trainerId` do responsável pelo código. O vínculo é validado nas regras do Firestore.
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
- `users/{uid}`: `name`, `email`, `role`, `active`. Treinadores possuem `coachCode`; novos alunos possuem `trainerId` e `trainerCode`.
- `trainerCodes/{codigo}`: `trainerId`, `createdAt`. O documento identifica o treinador dono do código e não pode ser modificado após a criação.
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

Não armazene chaves administrativas ou credenciais privadas no repositório. O `assets/js/firebase-config.js` contém apenas a configuração pública do aplicativo web, que deve ser protegida pelas **regras** do Firestore e pela autorização do Firebase.

## Testes
O workflow `Validar Evolve Fit` executa `node --check` nos scripts e `node --test tests/*.test.mjs` a cada pull request e envio à `main`.

