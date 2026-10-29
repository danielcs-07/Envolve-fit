# Cadastro independente de treinadores — Evolve Fit

O Evolve Fit está sendo preparado para que **qualquer profissional convidado a testar a plataforma crie a própria conta como treinador**, sem cadastro manual em Firebase Authentication e sem compartilhar UID com o administrador.

**A alteração está em uma PR de preparação, não foi implantada no Firebase nem liberada aos treinadores.** As regras antigas deixam outros treinadores enxergarem a Vitória; não habilite um novo treinador com elas.

## Como o aplicativo vai funcionar

1. O profissional abre o Evolve Fit, toca em **Criar conta** e seleciona **Sou treinador**.
2. Ele informa nome, e-mail e senha. O Firebase Authentication cria a credencial normalmente.
3. O aplicativo gera automaticamente um código como `EF-ABCDEF234567` (apenas exemplo), usando 12 caracteres aleatórios seguros. Um lote atômico grava **`users/{uid}`** com `role: "trainer"`, `active: true` e `coachCode`, junto com **`trainerCodes/{code}`** que aponta para esse UID.
4. O registro do código no próprio ID do documento, combinado com regras que proíbem sua atualização, **impede códigos iguais para treinadores diferentes**. Colisões raras são rejeitadas e tentadas novamente.
5. O treinador entra com seu e-mail e senha. Em **Meus alunos**, vê seu código e o link para compartilhar. A conta de treinador existente também poderá gerar o próprio código automaticamente.
6. O aluno escolhe **Sou aluno**, digita o código ou usa o link que já o preenche, cria sua conta e aguarda a aprovação.
7. O aluno fica vinculado a um único treinador por `trainerId` e `trainerCode`. **Só esse treinador pode aprovar o aluno e acessar seus históricos, fichas e medidas.**

Um código **não é senha e não dá acesso aos dados**: ele identifica para quem o pedido de cadastro vai. O aluno ainda precisa de credenciais próprias e da aprovação do treinador.

## Preparação única para preservar alunos antigos

**Antes de publicar o novo código e as regras de isolamento em produção:**

1. Faça backup do Firestore e guarde cópia das regras atuais.
2. No Firebase Console, em Authentication → Users, identifique **a conta do treinador responsável pelos alunos que já existem**. O UID pode ser consultado lá; você não precisa enviá-lo ao ChatGPT.
3. Firestore Database → Data → `users`: abra cada **perfil de aluno já existente**, incluindo Vitória, e adicione apenas `trainerId` (string) com o UID do treinador que realmente o acompanha. Não altere `role`, `active`, fichas, histórico, séries ou medidas.
4. Faça deploy do código da PR e publique as novas regras de `firestore.session-drafts.rules` **em uma janela controlada**, após conciliar quaisquer mudanças feitas diretamente no Console. Use o Firebase Emulator, se disponível, para testar segurança antes.
5. Teste com sua conta atual: acesso à Vitória, suas fichas, histórico, rascunhos e medidas. Teste também o botão de geração do próprio código no painel.
6. Crie uma conta de **treinador de teste diretamente pela nova tela**, sem usar Authentication → Add user. Verifique que aparece com código distinto e zero alunos.
7. Cadastre um **aluno de teste** com o código do novo treinador, aprove-o e salve um treino de teste. Confirme que o novo treinador não consegue ler perfis, históricos e medidas da Vitória, nem por consultas nem pelo ID do documento.
8. Só depois envie o link para um treinador real.

## Regras importantes

- Alunos cadastrados novos têm `trainerId` e `trainerCode` validados contra `trainerCodes/{code}`.
- O treinador não pode alterar seu papel para outro, tomar o código de outro profissional ou mudar um aluno de treinador pela interface.
- Os perfis de treinador criados pelo aplicativo têm `active: true` e acesso ao seu **próprio espaço vazio**. O cadastro de treinador é aberto como solicitado; antes de uma expansão pública, recomendo habilitar verificação de e-mail, App Check e proteção antiabuso.
- O código usa 12 caracteres de um alfabeto de 32 caracteres (aproximadamente 60 bits de combinações), é reservado no Firestore e nunca é utilizado como autorização.
- Fichas e históricos antigos **não são recriados**, apenas ficam visíveis ao profissional definido em `users/{aluno}.trainerId`.
- Os treinos não são compartilhados automaticamente: cada documento `workouts` já tem `trainerId` e é limitado a esse responsável pelas novas regras.
- O arquivo de regras no GitHub é apenas uma referência até ser **publicado no Firestore Console**. Alterar o repositório não publica nem testa regras de produção.
- Caso a criação de uma conta no Auth seja concluída e a gravação do perfil falhe por falta de permissão, esse e-mail já terá uma conta de Auth. Será preciso corrigir as regras e concluir ou recuperar o perfil, em vez de criar outra conta.

## Checagem final

A conta original continua com Vitória e os demais alunos vinculados; os profissionais novos começam com zero alunos; códigos são únicos; nenhum treinador vê dados de outro; alunos podem iniciar somente após aprovação; registros e medidas existentes continuam disponíveis.
