# Evolve Fit Beta — primeiro treinador convidado

**Estado:** preparação de código. Este branch NÃO altera as regras publicadas no Firestore
nem coloca o beta no GitHub Pages de produção.

## Mudanças propostas
- Cada novo aluno se cadastra por um link individual de convite:
  `index.html?trainer=UID_DO_TREINADOR`.
- O cadastro associa o aluno a `users/{uid}.trainerId`, inicialmente com
  `active: false`.
- Cada treinador aprova somente alunos vinculados ao próprio UID.
- O painel do treinador consulta `users`, `workouts`, `trainingLogs`
  e `measurements` **com filtro de `trainerId`**.
- Históricos e medidas novos carregam `trainerId`; o aluno somente pode
  salvar registros para seu próprio treinador.
- O arquivo `firestore.beta.rules` contém as regras propostas para o
  ambiente do piloto. **Não publicar em produção sem migrar e testar.**

## Checklist pré-lançamento (obrigatório)
1. Fazer exportação/backup do Firestore de produção, registrar o estado
   das regras atuais e criar um projeto Firebase separado para teste.
2. Configurar o ambiente beta (Auth, Firestore, configuração pública)
   e hospedagem de teste sem apontar ao banco de produção.
3. Criar dois usuários do tipo treinador para ensaio. A conta do personal
   convidado é criada inicialmente pelo administrador em Firebase
   Authentication e no documento `users/{UID}`:
   `{name, email, role: "trainer", active: true}`.
   Não dar a ele suas credenciais administrativas.
4. Em uma **cópia** dos dados, preencher `trainerId: UID_DO_TREINADOR_ATUAL`
   nos documentos `users` de alunos existentes e nos seus
   `trainingLogs`/`measurements`. O `trainerId` de `workouts`
   já deve existir — verificar antes de migrar. Não converter outros
   perfis. Não sobrescrever `active`, históricos nem timestamps.
5. Validar as regras `firestore.beta.rules` no Emulator Suite
   (cadastro, aprovação, fichas, finalização, medidas, autorização
   por treinador e tentativas de leitura cruzada). O arquivo de regras
   não é aplicado automaticamente por este repositório.
6. Testar **duas contas de treinadores e dois alunos**, em contas e
   navegadores diferentes: aluno A não pode aparecer para treinador B;
   aluno B não pode aparecer para treinador A; ambos devem registrar
   série, carga, medidas e histórico. Inclua testes negativos de
   alteração manual de UID/trainerId e acesso direto a documentos.
7. Somente depois de um teste isolado bem-sucedido, planejar publicação
   em produção, migração idempotente com backup e possibilidade
   de rollback. Não compartilhar o link do beta com alunos reais antes.

## Notas
- O beta **não tem cobranças** nem auto cadastro de treinadores.
- `UID_DO_TREINADOR` é um identificador de vínculo, **não** uma senha
  nem um token secreto. Aprovação continua obrigatória.
- Um mesmo aluno fica vinculado a apenas um treinador nesse piloto.
- Caso seja necessário mudar de treinador, é necessária uma migração
  autorizada pelo administrador.
- Regras do Firestore não são filtros: consultas de treinador devem
  incluir `where("trainerId", "==", auth.uid)`.
- O código ainda não substitui uma rodada de testes de integração.
