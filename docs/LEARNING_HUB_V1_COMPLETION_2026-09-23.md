# Learning Hub V1 · fechamento funcional

Status: implementado localmente na linha de trabalho `work/viviane-english-80-20-2026-09-23`. Não publicado em produção, não promovido, sem mutação de conteúdo no Supabase e sem chamada paga de voz ou áudio.

## Experiência final da V1

- Interface organizada por pessoa e por curso; Rafael vê ACCA + English, Viviane vê Payroll + English.
- Navegação lateral hierárquica: curso → Part/unidade → aula.
- Cada curso possui Home, Curriculum, Error Bank e Performance próprios.
- A Home de cada curso resume progresso, revisões, Error Bank, tempo restante e próximas unidades.
- A tela de aula usa abas coerentes com o curso:
  - ACCA: Learn, Audio, Practice, Visual, Case, Test, Sources e Professor.
  - English: Learn, Audio, Grammar, Practice, Speaking, Visual, Case, Test, Sources e Professor.
  - Payroll: Learn, Audio, Calculation, Practice, Speaking, Case, Test, Sources e Professor.
- Practice escrito exige uma primeira tentativa, oferece orientação para revisão e libera o modelo após a segunda tentativa.
- Grammar combina resposta por seleção com produção escrita contextual.
- Speaking oferece frase-modelo, reprodução, até três tentativas e comparação local do texto capturado. O Learning Hub não salva áudio ou transcrição no histórico.
- O feedback de fala desta V1 é correspondência de palavras capturadas, não pontuação acústica ou avaliação clínica de sotaque.
- Error Bank apresenta To confirm, Active e Resolved. Um erro isolado não é tratado automaticamente como padrão ativo.

## Conteúdo disponível

- ACCA Financial Reporting: 23 unidades escritas, 111 outcomes mapeados, mini mocks e full mock.
- English do Rafael: 20 unidades, com equilíbrio mensal 50/50 entre cotidiano e técnico.
- English da Viviane: 20 unidades, com alternância semanal 4:1 e equilíbrio mensal 80/20; a parte profissional é Payroll/People Operations, não Finance.
- Payroll da Viviane: sete unidades revisadas sobre RPN/pay date, gross-to-net, benefits/notional pay, corrections, starters/leavers, employee queries e month-end controls.

## Mantido para a fase seguinte

- Aperfeiçoamento do Professor, sem alterar agora sua fronteira de autenticação, memória e avaliação.
- Ativação/produção adicional de Premium Audio.
- Avaliação acústica detalhada de pronúncia.
- Expansão de conteúdo além da V1.

## Validação executada

- Build TypeScript/API/Vite aprovado.
- Todos os testes `node:test` aprovados, incluindo o novo contrato de Payroll.
- Verificação visual automatizada ficou indisponível no ambiente atual porque o executável do navegador não estava instalado e o download foi bloqueado; nenhuma publicação foi usada como alternativa.
