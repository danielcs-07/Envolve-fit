# Liberação segura de um segundo treinador

Este documento prepara o Evolve Fit para **vários treinadores independentes** no mesmo projeto Firebase, sem expor a Vitória nem outros alunos a profissionais que não os acompanham.

**Atenção:** o repositório só contém o código e as regras de referência. Não é possível publicar as regras do Firestore, criar a conta do treinador ou migrar vínculos alterando apenas arquivos no GitHub.

## Por que a mudança é necessária?

As regras anteriores usam `isTrainer()` para permitir que qualquer treinador ativo leia todas as fichas, usuários, medidas e históricos. Uma conta nova com `role: "trainer"` e `active: true` **não deve ser liberada com essas regras antigas**.

A nova versão usa um único campo de vínculo no documento de cada aluno:

```text
users/{uidDoAluno}
  name: "Nome do aluno"
  email: "aluno@email.com"
  role: "student"
  active: true
  trainerId: "UID_DO_TREINADOR_RESPONSAVEL"
```

O aluno só pode criar o próprio perfil como `student`, com `active: false` e `trainerId` vindo do convite. Nenhum cliente pode alterar o vínculo de um aluno existente; somente uma operação administrativa no Firebase pode transferi-lo.

## Sequência de ativação — siga esta ordem

1. **Antes de qualquer alteração, faça backup do Firestore e anote o UID do treinador atual**, em Firebase Console → Authentication → Users.
2. Em Firestore Database → Data → `users`, abra **cada documento de aluno existente**, inclusive o da Vitória e os pendentes atuais, e adicione `trainerId` (tipo *string*) com o UID do treinador que atualmente o acompanha. **Não altere** `active`, `role`, `email`, fichas, séries ou históricos.
3. Confira se o treinador original tem `users/{uid}` com `role: "trainer"` e `active: true`. **Não** adicione `trainerId` ao documento do próprio treinador.
4. Publique o código desta revisão no GitHub Pages e verifique com o treinador original se consegue listar seus alunos e fichas. Ainda não crie nem ative a conta do segundo treinador.
5. No Firebase Console → Firestore Database → Regras, compare o conteúdo atual com `firestore.session-drafts.rules` desta revisão. Se houver regras ou mudanças exclusivas do console, preserve-as e reconcilie-as antes de publicar. Publique as regras que exigem o vínculo `trainerId`.
6. Teste, com a ferramenta de simulação ou ambiente de testes do Firebase, a permissão de cada treinador: aluno A só deve aparecer para treinador A; B não deve acessar o perfil, as fichas, medidas ou histórico de A, mesmo conhecendo o ID do documento. Confirme que o aluno continua acessando apenas os próprios dados.
7. **Somente após confirmar as regras**, crie a conta do segundo treinador em Authentication → Users → Add user (e-mail e senha inicial). Copie o UID dessa nova conta.
8. Em Firestore Database → Data → `users`, crie o documento com ID **exatamente igual ao UID** do novo treinador. Exemplo:

   ```text
   name: "Nome do treinador"
   email: "email@exemplo.com"
   role: "trainer"
   active: true
   ```

   Os campos `role` e `name` são do tipo *string* e `active` é *boolean*. Crie esse documento **pelo Console**, não por um formulário de cadastro público. Envie uma senha provisória por canal seguro e peça ao treinador para redefini-la.

9. O novo treinador entra pelo mesmo endereço do Evolve Fit, acessa **Meus alunos** e usa **Copiar convite**. Ao abrir o link `index.html?trainer=UID`, o aluno cria a própria conta com vínculo ao treinador. A conta fica pendente (`active: false`) até a aprovação.
10. Teste com um **aluno fictício do segundo treinador** antes de passar o link para alunos reais. Verifique os dois lados: o treinador novo não pode acessar a Vitória, e o original não pode acessar os alunos do novo treinador.

## Compatibilidade e limitações

- Os documentos antigos `workouts`, `trainingLogs` e `measurements` **não precisam ser regravados ou apagados**: os históricos continuam relacionados por `studentId`. Basta atualizar o documento do aluno em `users`.
- Um aluno pertence a **um treinador por vez** nesta versão. Transferências devem ser realizadas por um administrador que examine a situação e o histórico; não há autotransferência pública.
- Treinadores novos **não importam automaticamente** os rascunhos semanais do treinador original. Esse atalho antigo foi removido da interface e da inicialização. Os rascunhos já existentes continuam intactos.
- O novo treinador usa o mesmo painel e os mesmos recursos de modelos, vídeos, fichas e acompanhamento. Ele começa com zero alunos até que alguém seja cadastrado pelo link e aprovado.
- Um treinador pode copiar seu link e repassá-lo a quem desejar. O convite identifica o treinador, **não é uma senha nem autorização automática**: a nova conta permanece pendente e precisa de aprovação.
- A proteção real exige **regras publicadas no Firestore**, não apenas filtros na interface. As regras antigas são abertas demais para liberar outra conta de treinador.
- Este material prepara a revisão para implementação. **Ainda não substitui um teste no Firebase Emulator com as regras publicadas e duas contas de treinador.**

## Verificação rápida após ativação

1. Vitória acessa os mesmos treinos, séries e medidas de antes.
2. Treinador original vê Vitória e os outros alunos que lhe pertencem.
3. Segundo treinador inicia com a lista de alunos vazia.
4. Segundo treinador não acessa documentos da Vitória por ID nem consegue listá-los.
5. Um aluno criado por convite aparece **somente** na fila de aprovação do treinador que o convidou.
6. O segundo treinador publica uma ficha para seu aluno de teste, que consegue visualizar e concluir o treino.
7. Feedback, duração e salvamento dos históricos são avaliados segundo as regras efetivamente implantadas.
