import { Card } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Download, Map, Layers } from 'lucide-react';

function BasemapDownloader({ quads, onShowOnMap, basemapPreviewItems }) {

  const handleDownloadQuad = (quad) => {
    // A lógica de download direto pelo navegador não funciona com autenticação,
    // então idealmente isso também chamaria um endpoint do backend.
    // Por enquanto, podemos abrir o link em uma nova aba,
    // o navegador pode pedir login, mas funciona para teste.
    const downloadLink = quad._links.download;
    if (downloadLink) {
        window.open(downloadLink, '_blank');
    } else {
        alert('Link de download não encontrado para este quad.');
    }
  };

  if (!quads || quads.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        <p>Nenhum resultado para exibir. Faça uma busca para começar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {quads.map((quad) => {
         const isThisOnePreviewing = basemapPreviewItems.some(item => item.id === quad.id);
         return (
            <Card key={quad.id} className="flex items-center justify-between p-4">
              <div className="flex items-center">
                <div className="p-2 bg-muted rounded-md mr-4">
                  <Layers className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold">Quad ID: {quad.id}</p>
                  <p className="text-sm text-muted-foreground">Cobertura: {quad.percent_covered}%</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant={isThisOnePreviewing ? "secondary" : "outline"}
                  onClick={() => onShowOnMap(quad)}
                >
                  <Map className="h-4 w-4 mr-1.5" />
                  Mapa
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDownloadQuad(quad)}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </Card>
         )
      })}
    </div>
  );
}

export default BasemapDownloader; 