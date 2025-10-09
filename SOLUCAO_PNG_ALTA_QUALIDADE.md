# Solução para Exportação de PNG com Alta Qualidade

Este documento apresenta uma solução completa para resolver os problemas com a exportação de imagens PNG da calculadora, incluindo:

1. **Correção de caracteres especiais** (ã, é, ç, etc.)
2. **Correção de elementos sobrepostos** (títulos escondidos atrás de tarjas azuis)
3. **Melhoria na qualidade da imagem** exportada
4. **Preservação de cores e estilos** originais

## 🔧 Como Implementar a Solução

### 1. Crie um Hook Personalizado

Crie um arquivo separado para o hook de download (por exemplo, `useDownloadSummary.js` na pasta `src/hooks/`):

```jsx
import { useCallback } from 'react';
import html2canvas from 'html2canvas';

export const useDownloadSummary = (state, theme, showNotification, novoMensalTotal) => {
  return useCallback(() => {
    const captureElement = document.getElementById('capture-container');
    if (captureElement && html2canvas) {
      // Notifica o usuário que a geração começou
      document.body.classList.add('generating-png');
      showNotification('Gerando imagem da proposta...', 'info');
      
      // Configura opções avançadas para máxima qualidade
      html2canvas(captureElement, {
        scale: 3, // Aumenta a resolução (era 2)
        backgroundColor: theme === 'dark' ? '#0c0c0c' : '#f8fafc',
        width: captureElement.offsetWidth,
        height: captureElement.offsetHeight,
        useCORS: true,
        allowTaint: true,
        logging: false,
        letterRendering: true, // Melhora a renderização de texto
        onclone: (doc) => {
          const clone = doc.getElementById('capture-container');
          if (clone) {
            // 1. Ajustes básicos de layout
            clone.style.padding = '25px'; // Mais espaço para evitar cortes
            clone.style.margin = '0';
            clone.style.boxShadow = 'none';
            
            // 2. Melhora a qualidade do texto
            const textElements = clone.querySelectorAll('p, span, h1, h2, h3, h4, h5, div, label');
            textElements.forEach(el => {
              if (el) {
                // Melhora nitidez do texto
                el.style.textRendering = 'geometricPrecision';
                el.style.fontSmooth = 'always';
                el.style.webkitFontSmoothing = 'antialiased';
                el.style.mozOsxFontSmoothing = 'grayscale';
              }
              
              // Corrige caracteres especiais problemáticos
              if (el.textContent && (el.textContent.includes('�') || el.textContent.includes('ã') || 
                  el.textContent.includes('é') || el.textContent.includes('ç'))) {
                el.textContent = el.textContent
                  .replace(/Gestão de Arquivos|GestÃ£o de Arquivos/g, 'Gestão de Arquivos')
                  .replace(/Controle de Férias|Controle de FÃ©rias/g, 'Controle de Férias')
                  .replace(/Crédito Proporcional|CrÃ©dito Proporcional/g, 'Crédito Proporcional')
                  .replace(/Ponto Virtual/g, 'Ponto Virtual')
                  .replace(/À Vista|Ã€ Vista/g, 'À Vista')
                  .replace(/Bônus de Férias|BÃ´nus de FÃ©rias/g, 'Bônus de Férias')
                  .replace(/Configurações|ConfiguraÃ§Ãµes/g, 'Configurações')
                  .replace(/Cartão|CartÃ£o/g, 'Cartão')
                  .replace(/MÃ³dulos/g, 'Módulos')
                  .replace(/CÃ¡lculo/g, 'Cálculo')
                  .replace(/1Âº MÃªs/g, '1º Mês')
                  .replace(/DiferenÃ§a/g, 'Diferença')
                  .replace(/CrÃ©dito/g, 'Crédito');
              }
            });
            
            // 3. Corrige problema de elementos sobrepostos
            // Ajusta posição e z-index dos títulos
            const titles = clone.querySelectorAll('h1, h2, h3, h4, .card-title');
            titles.forEach(title => {
              if (title) {
                title.style.position = 'relative';
                title.style.zIndex = '50';
                title.style.backgroundColor = 'transparent';
                title.style.textShadow = theme === 'dark' 
                  ? '0px 0px 3px rgba(0,0,0,0.5)' 
                  : '0px 0px 1px rgba(255,255,255,0.8)';
              }
            });
            
            // 4. Ajusta os gradientes que causam sobreposições
            const gradients = clone.querySelectorAll('[class*="bg-gradient"], [class*="backdrop"]');
            gradients.forEach(elem => {
              if (elem) {
                // Preserva a cor base mas remove efeitos complexos
                const computedStyle = getComputedStyle(elem);
                const bgcolor = computedStyle.backgroundColor;
                
                if (bgcolor !== 'rgba(0, 0, 0, 0)') {
                  elem.style.backgroundColor = bgcolor;
                } else {
                  // Se não tem cor definida, usa uma cor baseada no tema
                  elem.style.backgroundColor = theme === 'dark' 
                    ? 'rgba(15, 23, 42, 0.85)' 
                    : 'rgba(248, 250, 252, 0.85)';
                }
                
                // Remove efeitos que interferem na visibilidade
                elem.style.backgroundImage = 'none';
                elem.style.backdropFilter = 'none';
                elem.style.opacity = '1';
              }
            });
            
            // 5. Ajusta os Cards para garantir visibilidade
            const cards = clone.querySelectorAll('.card, [class*="rounded-xl"], [class*="rounded-lg"]');
            cards.forEach(card => {
              if (card) {
                // Garante que bordas sejam visíveis
                if (theme === 'dark') {
                  card.style.borderColor = 'rgba(55, 65, 81, 0.8)';
                } else {
                  card.style.borderColor = 'rgba(226, 232, 240, 0.8)';
                }
                card.style.borderWidth = '1px';
                
                // Garante que o fundo seja sólido
                const bgColor = getComputedStyle(card).backgroundColor;
                if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor.includes('rgba(')) {
                  card.style.backgroundColor = theme === 'dark' 
                    ? 'rgba(23, 23, 23, 1)' 
                    : 'rgba(255, 255, 255, 1)';
                }
              }
            });
            
            // 6. Garante boa visualização das badges e botões
            const interactiveElements = clone.querySelectorAll('.badge, button, [class*="btn"]');
            interactiveElements.forEach(elem => {
              if (elem) {
                elem.style.position = 'relative';
                elem.style.zIndex = '20';
                
                // Garante que texto em botões seja legível
                if (elem.tagName === 'BUTTON' || elem.className.includes('btn')) {
                  elem.style.fontWeight = 'bold';
                }
              }
            });
          }
        }
      }).then(canvas => {
        // Aumentar qualidade da imagem final
        const imgData = canvas.toDataURL('image/png', 1.0); // Qualidade máxima
        
        // Criar link para download
        const link = document.createElement('a');
        link.href = imgData;
        
        // Nome do arquivo personalizado
        const empresaNome = state.clientName ?
          state.clientName.replace(/[^\w\s]/gi, '').replace(/\s+/g, '-').substring(0, 30) :
          'empresa';
        
        // Incluir informações relevantes no nome do arquivo
        const valor = typeof novoMensalTotal === 'number' ? novoMensalTotal.toFixed(2) : '0.00';
        link.download = `proposta-${empresaNome}-${state.newPlan}-R${valor}.png`;
        
        // Iniciar download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Feedback ao usuário
        document.body.classList.remove('generating-png');
        showNotification('Proposta exportada com alta qualidade!', 'success');
      }).catch(err => {
        console.error("Erro ao gerar PNG:", err);
        showNotification('Erro ao gerar a imagem. Tente novamente.', 'error');
        document.body.classList.remove('generating-png');
      });
    } else {
      console.error("html2canvas não encontrado ou elemento alvo não encontrado.");
      showNotification('Erro ao gerar o PNG. Verifique se a biblioteca html2canvas está instalada.', 'error');
    }
  }, [state, theme, showNotification, novoMensalTotal]);
};

export default useDownloadSummary;
```

### 2. Use o Hook no Componente Principal

Substitua a implementação atual da função `handleDownloadSummary` no arquivo `App.jsx` pelo uso do novo hook:

```jsx
// No topo do arquivo, importe o hook
import { useDownloadSummary } from './hooks/useDownloadSummary';

// Dentro do componente App
function App() {
  // ... seu código existente ...
  
  // Substitua sua função handleDownloadSummary por esta:
  const handleDownloadSummary = useDownloadSummary(
    state, 
    theme, 
    showNotification, 
    novoMensalTotal
  );
  
  // ... resto do seu componente ...
}
```

### 3. Adicione um CSS de Suporte

No arquivo `src/index.css` ou `src/App.css`, adicione:

```css
/* Estilos para melhorar a exportação de imagens */
.generating-png {
  cursor: progress;
  pointer-events: none;
}

/* Ajuda a evitar problemas com z-index durante a renderização */
#capture-container {
  position: relative;
  z-index: 10;
  overflow: visible !important;
}
```

## 🚀 Melhorias Implementadas

### 1. Correção de Caracteres Especiais

- Substituição direta dos caracteres problemáticos (ã, é, ç, etc.) por suas versões corretas
- Mapeamento específico para termos comuns que apresentam problemas (ex: "Gestão de Arquivos")

### 2. Correção de Elementos Sobrepostos

- Ajuste de `z-index` para garantir que títulos apareçam acima dos fundos coloridos
- Definição de `position: relative` para corrigir o empilhamento de elementos
- Tratamento especial para gradientes que podem causar sobreposições

### 3. Melhoria na Qualidade da Imagem

- Aumento da escala de renderização de 2 para 3 (50% mais detalhes)
- Utilização de `letterRendering: true` para melhorar a qualidade do texto
- Configuração de alta qualidade no `toDataURL` (1.0)

### 4. Preservação de Cores e Estilos

- Detecção do tema atual e aplicação das cores corretas
- Preservação das cores de fundo originais quando possível
- Adição de bordas sutis para melhorar a separação visual dos elementos

## 📋 Detalhes Técnicos

- **Escala de renderização**: Aumentada de 2 para 3 para melhorar a qualidade
- **Correção de texto**: Aplicação de `textRendering: 'geometricPrecision'` para melhorar a nitidez
- **Problema de z-index**: Corrigido com posicionamento relativo e valores de z-index específicos
- **Caracteres especiais**: Substituição direta no clone DOM antes da renderização
- **Feedback visual**: Adição de notificações e cursor de progresso durante a geração

## 🤔 Problemas Conhecidos e Soluções

1. **Problema**: Caracteres especiais aparecem como "�" ou códigos estranhos  
   **Solução**: Substituição direta no DOM clonado antes da renderização

2. **Problema**: Títulos escondidos atrás de tarjas azuis  
   **Solução**: Ajuste de z-index e posição relativa para os títulos

3. **Problema**: Imagem com qualidade baixa  
   **Solução**: Aumento da escala de renderização e opções de qualidade máxima

4. **Problema**: Elementos com gradientes causam problemas visuais  
   **Solução**: Simplificação dos gradientes no clone DOM, mantendo apenas cores sólidas