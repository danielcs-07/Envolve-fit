# Evolve Fit — Beta para personal trainers convidados

> Estado: **preparacao tecnica, nao publicado**. O site atual e o Firebase atual nao foram alterados por esta branch.

## Objetivo
Testar gratuitamente por 30 dias com um personal conhecido e um grupo pequeno de alunos, antes de qualquer cobranca.
Cada treinador so pode consultar os usuarios, fichas, historicos e medidas vinculados ao seu proprio UID.

## O que foi preparado
- Cadastro de aluno por link individual `index.html?personal=<UID_DO_TREINADOR>`.
- Solicitacao de acesso de personal por `index.html?beta=personal`, sempre inativa ate liberacao manual no Console.
- Aprovacao de alunos apenas pelo treinador indicado no convite.
- Consultas de alunos, fichas, registros e medidas filtradas por `trainerId`.
- As novas gravacoes de series e medidas incluem `trainerId`.
- `firestore.beta.rules`: regras de permissao que efetivamente protegem o isolamento entre treinadores.
- Testes de unidade e revisao de codigo; **ainda falta validar no emulador do Firebase e na interface**.

## O que NAO fazer
- Nao publicar o arquivo `firestore.beta.rules` no Firebase atual sem migrar os usuarios, historicos e medidas existentes.
- Nao mesclar esta branch na main antes dos testes e da configuracao da hospedagem beta.
- Nao adicionar novos treinadores ativos no ambiente atual.
- Nao enviar senha, token ou chave administrativa pelo chat, por GitHub ou por link.
- Nao anunciar garantia de privacidade ou funcionamento ate concluir os testes negativos de permissao.

## Melhor caminho para um piloto isolado (recomendado)
1. Criar um **novo projeto Firebase apenas para o Beta** (separado de `envolve-fit-f584e`).
2. Ativar Authentication com Email/Senha e Firestore.
3. Copiar as regras completas de `firestore.beta.rules` para Firestore Database > Regras no **novo projeto**.
4. Copiar somente a configuracao publica do novo app web para `firebase-config.js` na copia beta do site (nunca chaves do servidor).
5. Publicar **uma copia separada do site**, ligada ao novo Firebase, em uma URL de testes. O GitHub Pages atual publica apenas a main; esta branch, sozinha, nao cria uma URL beta.
6. Em Authentication, conferir Dominio autorizado do site de teste. Confirmar politicas de privacidade, suporte e consentimento adequado de usuarios reais.

## Primeiro personal conhecido
1. Enviar para o personal **somente a URL de cadastro beta**: `<URL_DO_BETA>/index.html?beta=personal`.
2. Ele cria seu proprio usuario e recebe aviso de liberacao pendente.
3. No Firestore do projeto beta, o administrador localiza seu documento `users/<UID>`, confirma `role: trainer` e muda **apenas `active: true`**. Nenhum usuario comum pode fazer essa mudanca por conta propria pelas regras propostas.
4. O personal entra, abre Meus alunos, copia o link exclusivo de convite e envia a um aluno de teste.
5. O aluno cria conta e aguarda a aprovacao do personal.
6. O personal aprova, cria uma ficha e publica. O aluno salva uma serie, consulta o historico e registra peso e altura.

## Testes obrigatorios ANTES de compartilhar com alunos reais
- Personal A nao consegue listar, abrir, editar ou excluir fichas e medidas do Personal B (testar tambem requisicoes Firestore fora da interface).
- Personal B nao consegue aprovar aluno pendente do Personal A.
- Aluno A nao consegue ver a ficha ou medidas de Aluno B.
- Usuario inativo nao consegue ler nem escrever dados.
- Aluno nao consegue alterar `trainerId` nem `role`.
- Registros de carga, series parciais e medidas sao salvos e aparecem corretamente nas duas visoes.
- Desconectar, recuperar senha, abrir no celular e voltar do segundo plano.
- Verificar o console do navegador e erros de permissao/indices do Firestore.

## Dados antigos no Firebase atual
No projeto existente, contas antigas de alunos nao possuem `trainerId`, e logs/medidas antigos tambem nao.
A beta NAO migra esses documentos automaticamente e esta branch nao os altera.
Se optar por mover a beta para o Firebase atual, faca primeiro um backup e uma migracao com os UIDs reais; valide no emulador e em homologacao, depois publique aplicacao e regras de forma coordenada. No piloto e melhor manter ambientes separados.

## Limites conhecidos
- A aprovacao de personal e manual pelo administrador do Firebase; ainda nao ha painel de administrador proprio.
- O cadastro beta de personal e uma solicitacao nao autenticada por convite: qualquer pessoa com a URL pode solicitar uma conta inativa, mas NAO ganha permissao de treinador automaticamente.
- Um aluno se vincula a um unico personal na criacao; ainda nao ha transferencia entre profissionais.
- Nao ha processamento de pagamentos.
- Regras de seguranca precisam de testes reais no emulador Firestore antes do uso externo; testes de texto nao substituem testes de permissao.
- O GitHub Pages nao cria previews automaticos de pull requests.
- Nao ha funcionalidade offline para treinos, apenas uma pagina informativa.
