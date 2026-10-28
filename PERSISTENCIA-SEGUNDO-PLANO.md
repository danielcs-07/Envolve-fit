# Recuperação de treinos após ficar em segundo plano

## O que foi corrigido no código
- A ficha em andamento é salva no armazenamento local imediatamente ao abrir e após cada alteração.
- Uma versão compacta da ficha fica disponível para reconstruir a tela mesmo que a consulta ao Firestore falhe.
- O histórico e as medidas não bloqueiam mais a recuperação quando apresentam falhas.
- O aluno recupera suas séries e cargas no mesmo navegador após o aplicativo reiniciar.
- O sistema tenta salvar uma cópia temporária no Firestore (coleção `sessionDrafts`), com sincronização após mudanças e ao deixar a página.
- Ao concluir ou descartar, o backup remoto é removido, se possível.

## Passo necessário para a cópia em nuvem funcionar
O código do GitHub **não publica as regras** no Firebase. No projeto de produção `envolve-fit-f584e`, Firestore Database → Regras, as permissões atuais devem ser substituídas pelo texto completo do arquivo `firestore.session-drafts.rules`, depois de revisar e testar. A única coleção nova é `sessionDrafts/{uid}`, acessível exclusivamente ao próprio aluno ativo.

Sem publicar essas regras, o aplicativo continua tentando salvar localmente e recupera fichas locais, mas o backup do servidor permanece indisponível (erro permission-denied tratado).

## Teste recomendado
1. Com conta de aluno de teste, abra um treino e informe cargas e repetições em pelo menos duas séries.
2. Aguarde a mensagem `Progresso salvo neste aparelho e no Firebase` (apenas após publicar as regras e aguardar a confirmação de escrita).
3. Deixe o navegador em segundo plano, encerre a aba e reabra.
4. Confira se o treino em andamento, as cargas e as marcações retornaram.
5. Com o mesmo aluno em outro navegador, confirme se o backup do Firebase é recuperado.
6. Finalize o treino e recarregue. O treino concluído deve aparecer no histórico e não deve voltar como rascunho.

## Limitações
- O sistema não consegue impedir que o sistema operacional encerre abas em segundo plano. Ele recupera dados quando a página retorna.
- O salvamento local pode falhar em navegação privada ou caso o navegador apague seus dados; a cópia na nuvem protege somente após ser ativada.
- O backup é temporário e representa o treino em andamento, não um histórico de rascunhos.
- Apenas conta de aluno usa a nova coleção. Edição de fichas do treinador ainda usa salvamento local, não a nuvem.
- As regras originais desta versão são para um único treinador; **não usar como regras da versão multi-treinador sem revisão de isolamento**.
