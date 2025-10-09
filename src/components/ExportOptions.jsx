// ExportOptions.jsx - Componente para múltiplas opções de exportação
import React from 'react';
import { Download, FileImage, File, Sparkles } from 'lucide-react';

/**
 * Componente que oferece diferentes opções de exportação para a proposta.
 * - PNG Alta: Qualidade padrão (escala 3x)
 * - PNG Ultra: Máxima qualidade (escala 4x + nitidez)
 * - PDF Paisagem: Formato profissional A4 paisagem
 */
const ExportOptions = ({ onExport, isGenerating = false }) => {
  const options = [
    {
      id: 'pngHigh',
      label: 'PNG Alta',
      icon: FileImage,
      description: 'Qualidade boa, arquivo médio',
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      id: 'pngClean',
      label: 'PNG Limpo',
      icon: Sparkles,
      description: 'Remove todos os overlays, máxima fidelidade',
      color: 'bg-orange-600 hover:bg-orange-700',
    },
    {
      id: 'pngUltra',
      label: 'PNG Ultra',
      icon: Sparkles,
      description: 'Máxima qualidade + nitidez',
      color: 'bg-purple-600 hover:bg-purple-700',
    },
    {
      id: 'pdfLandscape',
      label: 'PDF Paisagem',
      icon: File,
      description: 'Formato profissional A4',
      color: 'bg-green-600 hover:bg-green-700',
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Download className="w-5 h-5" />
        Exportar Proposta
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {options.map((option) => {
          const IconComponent = option.icon;
          return (
            <button
              key={option.id}
              onClick={() => onExport(option.id)}
              disabled={isGenerating}
              className={`
                ${option.color}
                text-white p-4 rounded-lg transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                flex flex-col items-center gap-2 text-center
                hover:shadow-lg transform hover:scale-105 transition-transform
              `}
            >
              <IconComponent className="w-6 h-6" />
              <div>
                <div className="font-semibold">{option.label}</div>
                <div className="text-xs opacity-90">{option.description}</div>
              </div>
            </button>
          );
        })}
      </div>
      
      {isGenerating && (
        <div className="text-center text-sm text-gray-600 dark:text-gray-400 animate-pulse">
          Gerando arquivo... Por favor, aguarde.
        </div>
      )}
      
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p><strong>PNG Alta:</strong> Ideal para compartilhar online (WhatsApp, email)</p>
        <p><strong>PNG Limpo:</strong> Remove todas as tarjas e overlays, fidelidade máxima à tela</p>
        <p><strong>PNG Ultra:</strong> Para impressão ou apresentações importantes</p>
        <p><strong>PDF Paisagem:</strong> Formato padrão para anexar em propostas formais</p>
      </div>
    </div>
  );
};

export default ExportOptions;