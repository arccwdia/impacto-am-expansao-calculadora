// exportUtils.js - utilitário central de exportação com a abordagem "Maquete Limpa"
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Constrói um HTML limpo e com estilos inline para a exportação.
 * Isso evita problemas de CSS do `html2canvas` com a página principal.
 * @param {string} theme - 'light' ou 'dark'
 * @param {object} state - O objeto de estado da calculadora
 * @param {object} results - O objeto com os resultados dos cálculos
 * @returns {string} - Uma string de HTML pronta para ser renderizada
 */
function createCleanHTMLForExport(theme, state, results) {
    const isDark = theme === 'dark';
    const colors = {
        bg: isDark ? '#111827' : '#FFFFFF',
        cardBg: isDark ? '#1f2937' : '#FFFFFF',
        text: isDark ? '#e5e7eb' : '#374151',
        textSecondary: isDark ? '#9ca3af' : '#6b7280',
        primary: '#2563eb',
        border: isDark ? '#374151' : '#f3f4f6',
        white: '#FFFFFF',
        red: '#ef4444'
    };

    // Funções para formatar os valores monetários
    const formatBRL = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    const formatDiff = (value) => (value >= 0 ? `+${formatBRL(value)}` : formatBRL(value));

    // O HTML da "maquete" com estilos inline para garantir a aparência
    return `
    <div id="clean-export-container" style="padding: 24px; background-color: ${colors.bg}; font-family: Inter, sans-serif; width: 800px;">
        <div style="border: 1px solid ${colors.border}; border-radius: 12px; background-color: ${colors.cardBg}; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);">
            <h2 style="font-size: 18px; font-weight: 600; color: ${colors.text}; margin: 0 0 16px 0;">Resumo</h2>
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${colors.border}; padding-bottom: 16px; margin-bottom: 16px;">
                <div style="font-weight: 600; color: ${colors.text};">
                    <span>${state.currentPlan}</span>
                    <span style="color: ${colors.primary}; margin: 0 8px;">&rarr;</span>
                    <span>${state.newPlan}</span>
                </div>
                <div style="font-weight: 600; color: ${colors.text};">
                    <span>${state.currentEmployees}</span>
                    <span style="color: ${colors.primary}; margin: 0 8px; font-family: 'Courier New', Courier, monospace;">&rarr;</span>
                    <span>${state.newEmployees}</span>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; font-size: 14px;">
                <span style="color: ${colors.textSecondary};">Plano Atual (mensal)</span>
                <span style="font-weight: 600; color: ${colors.text};">${formatBRL(results.mensalAtualEfetivo)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; font-size: 14px;">
                <span style="color: ${colors.textSecondary};">Novo Plano (mensal)</span>
                <span style="font-weight: 600; color: ${colors.text};">${formatBRL(results.novoMensalTotal)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; font-size: 16px; background-color: ${colors.primary}; color: ${colors.white}; border-radius: 8px; margin-top: 8px;">
                <span style="font-weight: 700;">Diferença Mensal</span>
                <span style="font-weight: 700;">${formatDiff(results.diffMensal)}</span>
            </div>
        </div>

        <div style="height: 24px;"></div>

        <div style="border: 1px solid ${colors.border}; border-radius: 12px; background-color: ${colors.cardBg}; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);">
            <h2 style="font-size: 18px; font-weight: 600; color: ${colors.text}; margin: 0 0 16px 0;">Cálculo do 1º Mês</h2>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; font-size: 14px; border-bottom: 1px solid ${colors.border};">
                <span style="color: ${colors.textSecondary};">$ Sistema</span>
                <span style="font-weight: 600; color: ${colors.text};">${formatBRL(results.novoMensalTotal)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; font-size: 14px;">
                <span style="color: ${colors.textSecondary};">Crédito Proporcional</span>
                <span style="font-weight: 600; color: ${colors.red};">-${formatBRL(results.creditoMensal)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; font-size: 18px; background-color: ${colors.primary}; color: ${colors.white}; border-radius: 8px; margin-top: 16px;">
                <span style="font-weight: 700;">Total a Pagar no 1º Mês</span>
                <span style="font-weight: 700;">${formatBRL(results.totalPrimeiroMes)}</span>
            </div>
        </div>
    </div>
    `;
}


/**
 * Função principal de exportação.
 * @param {object} options - Opções como modo, tema, e os dados da calculadora.
 */
export async function exportElement({
  mode = 'pngHigh',
  scale = 3,
  fileBase = 'proposta',
  theme = 'light',
  onProgress = () => {},
  quality = 1.0,
  state,    // O estado atual da calculadora
  results,  // Os resultados calculados
} = {}) {

  if (!state || !results) {
    throw new Error("Os dados 'state' e 'results' da calculadora são necessários para a exportação.");
  }

  onProgress('Preparando captura...');

  // Cria um container temporário e o posiciona fora da tela
  const tempContainer = document.createElement('div');
  tempContainer.id = 'temp-export-render-area';
  tempContainer.style.position = 'absolute';
  tempContainer.style.left = '-9999px';
  tempContainer.style.top = '0px';
  // Preenche o container com a nossa "maquete" de HTML limpo
  tempContainer.innerHTML = createCleanHTMLForExport(theme, state, results);
  document.body.appendChild(tempContainer);
  
  // O elemento a ser capturado agora é o da nossa maquete
  const el = document.getElementById('clean-export-container');
  if (!el) {
    document.body.removeChild(tempContainer);
    throw new Error('Elemento da maquete de exportação não foi encontrado!');
  }

  let canvas;
  try {
      // Tira a "foto" da maquete
      canvas = await html2canvas(el, {
          scale: mode === 'pngHigh' ? 4 : scale, // Aumentei a escala para mais qualidade
          backgroundColor: null, // Fundo já definido no HTML
          useCORS: true,
          allowTaint: true,
      });
  } finally {
      // Garante que o container temporário seja removido, mesmo se houver erro
      document.body.removeChild(tempContainer);
  }

  // A partir daqui, a lógica de salvar o arquivo é a mesma
  if (mode === 'pdfLandscape') {
    onProgress('Gerando PDF...');
    const imgData = canvas.toDataURL('image/png', quality);
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const ratio = canvas.height / canvas.width;
    const imgW = pageW;
    const imgH = imgW * ratio;
    const y = (pageH - imgH) / 2; // Centraliza verticalmente
    pdf.addImage(imgData, 'PNG', 0, y, imgW, imgH, undefined, 'FAST');
    pdf.save(`${fileBase}.pdf`);
    return { type: 'pdf', file: `${fileBase}.pdf` };
  }

  onProgress('Gerando PNG...');
  const pngData = canvas.toDataURL('image/png', quality);
  const link = document.createElement('a');
  link.href = pngData;
  link.download = `${fileBase}-${mode}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return { type: 'png', file: link.download };
}

/**
 * Helper para montar o nome do arquivo.
 */
export function buildFileBase(state, novoMensalTotal) {
  const empresa = state?.clientName ? state.clientName.replace(/[^\w\s]/g,'').trim().replace(/\s+/g,'-').substring(0,30) : 'empresa';
  const plano = state?.newPlan || 'plano';
  const valor = typeof novoMensalTotal === 'number' ? `R${novoMensalTotal.toFixed(2).replace('.',',')}` : 'R0,00';
  const data = new Date().toLocaleDateString('pt-BR').replace(/\//g,'-');
  return `proposta-${empresa}-${plano}-${valor}-${data}`;
}