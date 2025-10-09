// Exemplo de como integrar o ExportOptions no seu App.jsx
// 
// No topo do arquivo App.jsx, adicione a importação:
// import ExportOptions from './components/ExportOptions';
//
// Substitua o botão de download atual por:

{/* Substitua esta parte no seu App.jsx onde está o botão de download atual */}
{isCalculated && (
  <div className="mt-8">
    <ExportOptions 
      onExport={handleDownloadSummary}
      isGenerating={document.body.classList.contains('generating-png')}
    />
  </div>
)}

{/* 
Alternativamente, se preferir manter o botão antigo e adicionar as opções como extra:

<div className="mt-8 space-y-4">
  <button 
    onClick={() => handleDownloadSummary()}
    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
  >
    Download PNG (Padrão)
  </button>
  
  <details className="border rounded-lg p-4">
    <summary className="cursor-pointer font-semibold mb-4">
      Mais opções de exportação
    </summary>
    <ExportOptions 
      onExport={handleDownloadSummary}
      isGenerating={document.body.classList.contains('generating-png')}
    />
  </details>
</div>
*/}