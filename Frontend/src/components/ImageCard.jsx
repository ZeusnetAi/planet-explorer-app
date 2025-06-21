import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Download, Eye, Calendar, Cloud, Satellite, Loader2, Layers, Map } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"

export function ImageCard({ item, onDownload, onPreview, onShowOnMap, isActivating, activatingAssets, isPreviewingOnMap }) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(item.assets.find(a => a.asset_type.includes('visual'))?.asset_type || item.assets[0]?.asset_type || 'ortho_visual');
  const [isDownloading, setIsDownloading] = useState(false);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  const getCloudCoverVariant = (cloudCover) => {
    if (cloudCover < 10) return 'success';
    if (cloudCover < 30) return 'warning';
    return 'destructive';
  }
  
  const handleDownloadClick = () => {
    onDownload(item, selectedAsset);
    setIsDownloading(true);
  };

  const isCurrentAssetActivating = activatingAssets[`${item.id}-${selectedAsset}`];

  return (
    <Card className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 p-4 border transition-colors hover:bg-muted/50">
      <div className="relative w-32 h-32 sm:w-24 sm:h-24 flex-shrink-0 rounded-md overflow-hidden bg-muted">
        {!imageError ? (
          <>
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            <img
              src={item.thumbnail_url}
              alt={`Thumbnail for ${item.id}`}
              className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
              onLoad={() => setImageLoading(false)}
              onError={() => { setImageLoading(false); setImageError(true); }}
            />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/50">
            <Satellite className="h-8 w-8" />
            <span className="text-xs mt-1 text-center">Preview indisponível</span>
          </div>
        )}
      </div>

      <div className="flex-1">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-base leading-tight pr-2">{item.id}</h3>
          <Badge variant={getCloudCoverVariant(item.properties.cloud_cover)}>
            <Cloud className="h-3 w-3 mr-1.5" />
            {Math.round(item.properties.cloud_cover || 0)}%
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
          <div className="flex items-center">
            <Calendar className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
            <span>{formatDate(item.properties.acquired)}</span>
          </div>
          <div className="flex items-center">
            <Layers className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
            <span>{item.properties.item_type}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 mt-4">
          <div className="flex-grow sm:flex-grow-0">
             <Select onValueChange={setSelectedAsset} defaultValue={selectedAsset}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Selecione um asset" />
              </SelectTrigger>
              <SelectContent>
                {item.assets.map(asset => (
                  <SelectItem key={asset.asset_type} value={asset.asset_type}>
                    <div className="flex items-center justify-between w-full">
                      <span>{asset.asset_type}</span>
                      <Badge variant={asset.status === 'active' ? 'success' : 'outline'} className="ml-4 capitalize">{asset.status}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant={isPreviewingOnMap ? "secondary" : "outline"}
              onClick={() => onShowOnMap(item)}
              className="flex-1 sm:flex-auto"
            >
              <Map className="h-4 w-4 mr-1.5" />
              Mapa
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPreview(item)}
              className={`flex-1 sm:flex-auto ${isPreviewingOnMap ? 'text-yellow-400' : 'text-gray-400 hover:text-white'}`}
            >
              <Eye className={`h-4 w-4 mr-1.5 ${isPreviewingOnMap ? 'text-yellow-400' : 'text-gray-400 hover:text-white'}`} />
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadClick}
              className="flex-1 sm:flex-auto"
              disabled={isCurrentAssetActivating || isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : isCurrentAssetActivating ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1.5" />
              )}
              {isCurrentAssetActivating ? 'Ativando...' : isDownloading ? 'Baixando...' : 'Baixar'}
            </Button>
          </div>
        </div>
        {isDownloading && <Progress value={activatingAssets[`${item.id}-${selectedAsset}`]?.progress} className="w-full h-1 mt-2" />}
        {activatingAssets[`${item.id}-${selectedAsset}`]?.status === 'ativação em andamento' && (
          <div className="flex items-center text-xs text-yellow-400 mt-2">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Ativando o asset...
          </div>
        )}
      </div>
    </Card>
  );
}

export default ImageCard;

