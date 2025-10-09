# impacto-am-expansao-calculadora
💰 Calculadora AM | Expansão (impacto-am-expansao-calculadora)
Esta ferramenta foi desenvolvida para o time de Account Management da Impacto Automação com o objetivo de simular o impacto financeiro de cenários de expansão (Upsell) e negociações anuais para clientes ativos.

O uso correto desta calculadora garante assertividade na precificação, clareza na comunicação do MRR (Monthly Recurring Revenue) e transparência na aplicação de créditos e descontos proporcionais.

🎯 Foco Estratégico
Objetivo: Facilitar negociações de Expansão (Módulos e Colaboradores) e Recontratação Anual.

Métrica Principal: Visualização imediata do aumento de MRR (Diferença Mensal).

🛠️ Instalação e Execução Local (Para Desenvolvedores)
Este projeto utiliza React, Tailwind CSS (Shadcn-like) e Vite.

Pré-requisitos: Certifique-se de ter o Node.js e o npm instalados.

Clone o Repositório:

git clone [https://github.com/SUA_ORGANIZACAO/impacto-am-expansao-calculadora.git](https://github.com/SUA_ORGANIZACAO/impacto-am-expansao-calculadora.git)
cd impacto-am-expansao-calculadora

Instale as Dependências:

npm install

Execute o Ambiente de Desenvolvimento:

npm run dev

O projeto estará acessível em http://localhost:5173.

⚙️ Arquivos de Dados Críticos
A lógica de precificação está no arquivo src/price-table.ts.

PRICE_TABLE: Tabela de preços base do sistema por faixa de colaboradores e plano.

MODULES: Valores unitários e rótulos dos módulos (GA, FE, PV).

ANNUAL_DISCOUNTS: Percentuais de desconto para as modalidades de pagamento anuais.

Qualquer alteração na política de preços deve ser refletida primeiro neste arquivo.

💡 Como usar (Guia Rápido AM)
Insira os Dados Atuais: Preencha os campos Colaboradores (atual), Plano atual e o Valor atual (R$) (se for diferente do preço de tabela).

Defina o Novo Cenário: Insira Colaboradores (novo), Novo plano e ative os módulos na seção "Incluir Módulos".

Ajuste o Crédito: Utilize a seção "Crédito" para aplicar a proporcionalidade correta, inserindo as datas de início, fim e alteração.

Analise o Resumo:

Verifique a Diferença Mensal (MRR). Se o valor for positivo, você terá uma Expansão.

No modo Anual, use o bloco "Investimento Anual" para apresentar as opções de desconto ao cliente.

Lembrete: Para o cálculo de crédito anual (Proporcionalidade), certifique-se de informar os módulos que o cliente já possui na seção "Módulos Atuais".