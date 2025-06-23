import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Download, Eye, Calendar, Cloud, Satellite, Loader2, Layers, Map } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"

// Componente otimizado para thumbnail com lazy loading
const LazyThumbnail = ({ item, onError }) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isInView, setIsInView] = useState(false);

  // Intersection Observer para lazy loading
  const imageRef = useCallback((node) => {
    if (node !== null) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(node);
    }
  }, []);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageLoading(false);
    setImageError(true);
    onError?.();
  }, [onError]);

  // Memoiza o componente de erro
  const ErrorComponent = useMemo(() => (
    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/50">
      <Satellite className="h-8 w-8" />
      <span className="text-xs mt-1 text-center">Preview indisponível</span>
    </div>
  ), []);

  return (
    <div 
      ref={imageRef}
      className="relative w-32 h-32 sm:w-24 sm:h-24 flex-shrink-0 rounded-md overflow-hidden bg-muted"
    >
      {!imageError ? (
        <>
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          {isInView && (
            <img
              src={item.thumbnail_url}
              alt={`Thumbnail for ${item.id}`}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="lazy"
              decoding="async"
            />
          )}
        </>
      ) : (
        ErrorComponent
      )}
    </div>
  );
};

// Componente otimizado para informações do item
const ItemInfo = ({ item }) => {
  // Memoiza a formatação da data
  const formattedDate = useMemo(() => {
    return new Date(item.properties.acquired).toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  }, [item.properties.acquired]);

  // Memoiza a variante do badge de cobertura de nuvem
  const cloudCoverVariant = useMemo(() => {
    const cloudCover = item.properties.cloud_cover || 0;
    if (cloudCover < 10) return 'success';
    if (cloudCover < 30) return 'warning';
    return 'destructive';
  }, [item.properties.cloud_cover]);

  return (
    <div className="flex-1">
      <div className="flex justify-between items-start">
        <h3 className="font-semibold text-base leading-tight pr-2">{item.id}</h3>
        <Badge variant={cloudCoverVariant}>
          <Cloud className="h-3 w-3 mr-1.5" />
          {Math.round(item.properties.cloud_cover || 0)}%
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
        <div className="flex items-center">
          <Calendar className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
          <span>{formattedDate}</span>
        </div>
        <div className="flex items-center">
          <Layers className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
          <span>{item.properties.item_type}</span>
        </div>
      </div>
    </div>
  );
};

// Componente otimizado para seleção de asset
const AssetSelector = ({ item, selectedAsset, onAssetChange }) => {
  // Memoiza as opções de assets
  const assetOptions = useMemo(() => {
    return item.assets.map(asset => ({
      ...asset,
      key: asset.asset_type
    }));
  }, [item.assets]);

  return (
    <Select onValueChange={onAssetChange} defaultValue={selectedAsset}>
      <SelectTrigger className="w-full sm:w-[180px]">
        <SelectValue placeholder="Selecione um asset" />
      </SelectTrigger>
      <SelectContent>
        {assetOptions.map(asset => (
          <SelectItem key={asset.key} value={asset.asset_type}>
            <div className="flex items-center justify-between w-full">
              <span>{asset.asset_type}</span>
              <Badge 
                variant={asset.status === 'active' ? 'success' : 'outline'} 
                className="ml-4 capitalize"
              >
                {asset.status}
              </Badge>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// Componente otimizado para botões de ação
const ActionButtons = ({ 
  item, 
  selectedAsset, 
  isPreviewingOnMap, 
  isCurrentAssetActivating, 
  isDownloading, 
  onShowOnMap, 
  onPreview, 
  onDownload 
}) => {
  const handleDownloadClick = useCallback(() => {
    onDownload(item, selectedAsset);
  }, [onDownload, item, selectedAsset]);

  const handleShowOnMapClick = useCallback(() => {
    onShowOnMap(item);
  }, [onShowOnMap, item]);

  const handlePreviewClick = useCallback(() => {
    onPreview(item);
  }, [onPreview, item]);

  return (
    <div className="flex space-x-2">
      <Button
        size="sm"
        variant={isPreviewingOnMap ? "secondary" : "outline"}
        onClick={handleShowOnMapClick}
        className="flex-1 sm:flex-auto"
      >
        <Map className="h-4 w-4 mr-1.5" />
        Mapa
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handlePreviewClick}
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
  );
};

export function ImageCard({ item, onDownload, onPreview, onShowOnMap, isActivating, activatingAssets, isPreviewingOnMap }) {
  const [selectedAsset, setSelectedAsset] = useState(
    item.assets.find(a => a.asset_type.includes('visual'))?.asset_type || 
    item.assets[0]?.asset_type || 
    'ortho_visual'
  );
  const [isDownloading, setIsDownloading] = useState(false);

  // Memoiza o status do asset atual
  const isCurrentAssetActivating = useMemo(() => {
    return activatingAssets[`${item.id}-${selectedAsset}`];
  }, [activatingAssets, item.id, selectedAsset]);

  // Memoiza o progresso do download
  const downloadProgress = useMemo(() => {
    return activatingAssets[`${item.id}-${selectedAsset}`]?.progress;
  }, [activatingAssets, item.id, selectedAsset]);

  // Memoiza o status da ativação
  const activationStatus = useMemo(() => {
    return activatingAssets[`${item.id}-${selectedAsset}`]?.status;
  }, [activatingAssets, item.id, selectedAsset]);

  const handleDownloadClick = useCallback(() => {
    onDownload(item, selectedAsset);
    setIsDownloading(true);
  }, [onDownload, item, selectedAsset]);

  return (
    <Card className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 p-4 border transition-colors hover:bg-muted/50">
      <LazyThumbnail 
        item={item} 
        onError={() => console.warn(`Erro ao carregar thumbnail para ${item.id}`)}
      />

      <ItemInfo item={item} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 mt-4">
        <div className="flex-grow sm:flex-grow-0">
          <AssetSelector 
            item={item}
            selectedAsset={selectedAsset}
            onAssetChange={setSelectedAsset}
          />
        </div>
        
        <ActionButtons 
          item={item}
          selectedAsset={selectedAsset}
          isPreviewingOnMap={isPreviewingOnMap}
          isCurrentAssetActivating={isCurrentAssetActivating}
          isDownloading={isDownloading}
          onShowOnMap={onShowOnMap}
          onPreview={onPreview}
          onDownload={handleDownloadClick}
        />
      </div>
      
      {isDownloading && (
        <Progress value={downloadProgress} className="w-full h-1 mt-2" />
      )}
      
      {activationStatus === 'ativação em andamento' && (
        <div className="flex items-center text-xs text-yellow-400 mt-2">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Ativando o asset...
        </div>
      )}
    </Card>
  );
}

export default ImageCard;

