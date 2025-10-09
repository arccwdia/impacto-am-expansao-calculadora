# Como Implementar a Solução PNG de Alta Qualidade

Esse arquivo contém instruções passo a passo para implementar a solução que corrige os problemas na exportação de PNG do sistema, incluindo caracteres especiais incorretos e elementos sobrepostos.

## Arquivos Criados

Foram criados os seguintes arquivos:

1. `src/hooks/useDownloadSummary.js` - Hook personalizado para exportação PNG de alta qualidade
2. `src/pngExport.css` - Estilos CSS para melhorar a exportação de imagens
3. `SOLUCAO_PNG_ALTA_QUALIDADE.md` - Documentação completa da solução

## Passos de Implementação

### 1. Importar o CSS no Arquivo Principal

Adicione a importação do arquivo CSS no seu arquivo principal (provavelmente `src/App.jsx` ou `src/main.jsx`):

```jsx
// No início do arquivo
import './pngExport.css';
```

### 2. Substituir a Função de Download

No arquivo `src/App.jsx`, faça as seguintes alterações:

1. Importe o hook personalizado:
```jsx
import { useDownloadSummary } from './hooks/useDownloadSummary';
```

2. Substitua a implementação atual da função `handleDownloadSummary` pelo uso do hook:
```jsx
// Dentro do componente principal
const handleDownloadSummary = useDownloadSummary(
  state,
  theme,
  showNotification, // função que mostra notificações (toast)
  novoMensalTotal    // valor total calculado
);
```

### 3. Verificar a Estrutura HTML

Certifique-se de que existe um elemento com o id `capture-container` contendo o conteúdo a ser exportado:

```jsx
<div id="capture-container">
  {/* Conteúdo a ser capturado na imagem */}
</div>
```

Se esse elemento tiver outro id, atualize o hook para usar o id correto.

### 4. Construir e Testar

Após implementar as alterações:

1. Execute `npm run build` para gerar uma nova versão do sistema
2. Teste a exportação de PNG para verificar:
   - Se os caracteres especiais (ã, é, ç) estão sendo exibidos corretamente
   - Se os títulos não estão mais escondidos atrás de tarjas azuis
   - Se a qualidade geral da imagem está melhor

## Solução de Problemas

Se após a implementação os problemas persistirem:

1. Verifique se todos os arquivos estão nos locais corretos
2. Certifique-se de que as importações estão funcionando
3. Verifique se não há erros no console do navegador
4. Para problemas específicos com caracteres, pode ser necessário adicionar mais substituições no hook

## Contato

Se precisar de mais ajuda com a implementação, entre em contato com a equipe de desenvolvimento.