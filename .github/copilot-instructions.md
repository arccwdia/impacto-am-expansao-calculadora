# Copilot Instructions for impacto-am-expansao-calculadora

## Visão Geral
Esta calculadora foi criada para o time de Account Management da Impacto Automação, simulando cenários de expansão (Upsell) e negociações anuais para clientes ativos. O objetivo principal é calcular o impacto financeiro e facilitar negociações, com foco na visualização do aumento de MRR (Monthly Recurring Revenue).

## Estrutura do Projeto
- **Frontend:** React + Vite + Tailwind CSS (Shadcn-like)
- **Entradas principais:** `src/App.jsx` (lógica e interface)
- **Estilos:** `src/animations.css`, `src/index.css`, `tailwind.config.js`, `postcss.config.js`
- **Configuração:** `vite.config.js`, `manifest.json`, `browserconfig.xml`
- **Dados:** A tabela de preços e regras de negócio são referenciadas no README, mas o arquivo `src/price-table.ts` não está presente. Verifique se está em outro local ou se foi removido.

## Convenções e Padrões
- **MRR e Expansão:** O cálculo da diferença mensal é central. Módulos e colaboradores são tratados como variáveis principais.
- **Crédito Proporcional:** O ajuste de crédito depende das datas de início, fim e alteração, além dos módulos já contratados.
- **Descontos Anuais:** Apresentados no modo anual, com opções de desconto para o cliente.
- **Componentização:** O código segue padrão React funcional, com hooks e uso de bibliotecas como `use-debounce` e `lucide-react`.
- **Estilos:** Tailwind é usado extensivamente, com customizações para animações e responsividade.

## Fluxos de Desenvolvimento
- **Instalação:**
  ```sh
  npm install
  ```
- **Execução local:**
  ```sh
  npm run dev
  ```
- **Build para produção:**
  ```sh
  npm run build
  ```
- **Deploy (GitHub Pages):**
  ```sh
  npm run deploy
  ```
- **Preview:**
  ```sh
  npm run preview
  ```

## Integrações e Dependências
- **Externo:**
  - `html2canvas` para captura de tela
  - `lucide-react` para ícones
  - `use-debounce` para otimização de inputs
- **Interno:**
  - Não há backend; toda lógica é client-side

## Exemplos de Padrões
- **Cálculo de MRR:**
  - O valor é calculado a partir das diferenças entre cenários de colaboradores, planos e módulos.
- **Crédito Proporcional:**
  - O usuário informa datas e módulos para ajuste correto.
- **Descontos:**
  - Percentuais aplicados conforme modalidade anual.

## Observações
- **Arquivo de preços:** Se `src/price-table.ts` não existir, documente onde está a lógica de precificação.
- **Atualizações:** Sempre revise o README para mudanças de regras de negócio.

---

Essas instruções são específicas para agentes de IA que atuam neste repositório. Se algum padrão ou fluxo estiver incompleto ou impreciso, peça feedback ao usuário para ajustes.
