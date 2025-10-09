// useDownloadSummary.js - Hook personalizado para exportação PNG de alta qualidade
import { useCallback } from 'react';
import html2canvas from 'html2canvas'; // mantido para compat prévia
import { exportElement, buildFileBase } from './exportUtils';

/**
 * Hook personalizado para download de imagem PNG da calculadora com alta qualidade
 * - Corrige problemas de caracteres especiais (ã, é, ç, etc.)
 * - Garante que todos os elementos fiquem visíveis (sem sobreposições)
 * - Maximiza a qualidade da imagem exportada
 * - Preserva as cores e estilos originais
 */
export const useDownloadSummary = (state, theme, showNotification, novoMensalTotal) => {
  // Na versão atual da calculadora, o 'results' é um objeto com os resultados calculados
  // Vamos obter isso do state ou criar um objeto com valores padrão
  return useCallback((mode = 'pngHigh', results) => {
    const base = buildFileBase(state, novoMensalTotal);
    
    // Se o componente não passar os resultados, tentamos extrair do state
    const calculationResults = results || {
      mensalAtualEfetivo: state.currentPrice || 0,
      novoMensalTotal: novoMensalTotal || 0,
      diffMensal: (novoMensalTotal || 0) - (state.currentPrice || 0),
      creditoMensal: state.creditoMensal || 0, 
      totalPrimeiroMes: state.totalPrimeiroMes || novoMensalTotal || 0
    };
    
    const exec = async (exportMode) => {
      try {
        document.body.classList.add('generating-png');
        showNotification(`Exportando (${exportMode})...`, 'info');
        await exportElement({
          mode: exportMode,
          scale: exportMode === 'pngHigh' ? 3 : exportMode === 'pngUltra' ? 4 : exportMode === 'pngClean' ? 3 : 3,
          fileBase: base,
          theme,
          onProgress: (msg) => { /* pode exibir status se quiser */ },
          quality: 1.0,
          state,
          results: calculationResults
        });
        showNotification(`Exportação (${exportMode}) concluída!`, 'success');
      } catch (e) {
        console.error('Falha exportando', exportMode, e);
        showNotification(`Erro na exportação (${exportMode}).`, 'error');
      } finally {
        document.body.classList.remove('generating-png');
      }
    };
    exec(mode);
  }, [state, theme, showNotification, novoMensalTotal]);
};

export default useDownloadSummary;