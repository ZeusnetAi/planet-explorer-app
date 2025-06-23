import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, ImageOverlay } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card } from '@/components/ui/card.jsx';
import 'leaflet/dist/leaflet.css';
import LayerManager from './LayerManager.jsx';

// Fix para ícones do Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Configurações das camadas de mapa
const MAP_LAYERS = {
  light: {
    name: 'Claro',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO'
  },
  dark: {
    name: 'Escuro',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO'
  },
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  satellite: {
    name: 'Satélite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri'
  },
  terrain: {
    name: 'Terreno',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org/">OpenTopoMap</a>'
  }
};

// Componente para controlar o zoom e centro do mapa
const MapController = ({ geojson, previewItem, basemapPreview }) => {
  const map = useMap();
  
  // Memoiza a função de ajuste de bounds para evitar recriações
  const fitBounds = useCallback(() => {
    if (previewItem?.geometry) {
      const layer = L.geoJSON(previewItem.geometry);
      if (layer.getBounds().isValid()) map.fitBounds(layer.getBounds());
    } else if (basemapPreview?.bbox) {
      const [minX, minY, maxX, maxY] = basemapPreview.bbox;
      const bounds = L.latLngBounds([[minY, minX], [maxY, maxX]]);
      if (bounds.isValid()) map.fitBounds(bounds);
    } else if (geojson) {
      const layer = L.geoJSON(geojson);
      if (layer.getBounds().isValid()) map.fitBounds(layer.getBounds());
    }
  }, [geojson, previewItem, basemapPreview, map]);

  useEffect(() => {
    fitBounds();
  }, [fitBounds]);
  
  return null;
};

// Componente para seleção de camadas
const LayerControl = ({ selectedLayer, onLayerChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute top-4 right-4 z-[1000]">
      <Card className="p-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2"
        >
          <Layers className="h-4 w-4" />
          {MAP_LAYERS[selectedLayer].name}
        </Button>
        
        {isOpen && (
          <div className="absolute top-full right-0 mt-2 bg-background border rounded-md shadow-lg p-2 min-w-[150px]">
            {Object.entries(MAP_LAYERS).map(([key, layer]) => (
              <button
                key={key}
                onClick={() => {
                  onLayerChange(key);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-accent transition-colors ${
                  selectedLayer === key ? 'bg-accent text-accent-foreground' : ''
                }`}
              >
                {layer.name}
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

// Componente otimizado para renderizar ImageOverlays
const OptimizedImageOverlays = ({ basemapPreviewItems }) => {
  const map = useMap();
  const imageLayersRef = useRef(new Map());
  
  // Memoiza os dados dos overlays para evitar recriações desnecessárias
  const overlayData = useMemo(() => {
    if (!basemapPreviewItems || basemapPreviewItems.length === 0) return [];
    
    return basemapPreviewItems.map(item => ({
      id: item.id,
      imageUrl: `/api/basemap/quad/preview?mosaic_id=${item.mosaic_id}&quad_id=${item.id}`,
      bounds: [[item.bbox[1], item.bbox[0]], [item.bbox[3], item.bbox[2]]]
    }));
  }, [basemapPreviewItems]);

  // Função para renderizar apenas os overlays visíveis
  const renderVisibleOverlays = useCallback(() => {
    if (!map || overlayData.length === 0) return;
    
    const bounds = map.getBounds();
    const zoom = map.getZoom();
    
    // Remove overlays antigos que não estão mais visíveis
    imageLayersRef.current.forEach((layer, id) => {
      const data = overlayData.find(item => item.id === id);
      if (!data || !bounds.intersects(L.latLngBounds(data.bounds))) {
        map.removeLayer(layer);
        imageLayersRef.current.delete(id);
      }
    });
    
    // Adiciona apenas overlays visíveis
    overlayData.forEach(item => {
      if (!imageLayersRef.current.has(item.id) && bounds.intersects(L.latLngBounds(item.bounds))) {
        // Só renderiza se o zoom for adequado (evita renderizar tiles muito pequenos)
        if (zoom >= 8) {
          const imageOverlay = L.imageOverlay(item.imageUrl, item.bounds, {
            opacity: 1,
            zIndex: 10
          });
          imageOverlay.addTo(map);
          imageLayersRef.current.set(item.id, imageOverlay);
        }
      }
    });
  }, [map, overlayData]);

  useEffect(() => {
    if (!map) return;
    
    // Renderiza overlays quando o mapa carrega
    renderVisibleOverlays();
    
    // Re-renderiza quando o mapa se move
    const handleMoveEnd = () => {
      renderVisibleOverlays();
    };
    
    map.on('moveend', handleMoveEnd);
    map.on('zoomend', handleMoveEnd);
    
    return () => {
      map.off('moveend', handleMoveEnd);
      map.off('zoomend', handleMoveEnd);
      // Limpa todos os overlays ao desmontar
      imageLayersRef.current.forEach(layer => {
        map.removeLayer(layer);
      });
      imageLayersRef.current.clear();
    };
  }, [map, renderVisibleOverlays]);

  return null;
};

// Componente principal do Mapa
const MapDisplay = ({ geojson, previewItem, basemapPreviewItems }) => {
  const [selectedLayer, setSelectedLayer] = useState('light');
  
  // Memoiza o estilo do GeoJSON para evitar recriações
  const geojsonStyle = useMemo(() => ({
    color: '#3b82f6',
    weight: 2,
    fillOpacity: 0.1
  }), []);
  
  const previewStyle = useMemo(() => ({
    color: '#ff7800',
    weight: 2,
    fillOpacity: 0.2
  }), []);

  if (!geojson) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground p-4">
          <MapPin className="mx-auto h-12 w-12" />
          <p className="mt-4 font-medium">Mapa aguardando geometria</p>
          <p className="mt-1 text-sm">Carregue um arquivo para começar.</p>
        </div>
      </div>
    );
  }

  const currentLayer = MAP_LAYERS[selectedLayer];

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[-15.7801, -47.9292]}
        zoom={4}
        style={{ height: '100%', width: '100%' }}
        // Adiciona configurações para melhor performance
        preferCanvas={true}
        zoomControl={false}
      >
        {/* Painel de camadas customizado */}
        <LayerManager />
        <TileLayer 
          url={currentLayer.url} 
          attribution={currentLayer.attribution}
          // Otimizações para tiles
          updateWhenZooming={false}
          updateWhenIdle={true}
        />
        
        {/* GeoJSON com renderização otimizada */}
        <GeoJSON 
          data={geojson} 
          style={() => geojsonStyle}
          // Usa canvas para melhor performance
          renderer={L.canvas({ padding: 0.5 })}
        />
        
        {/* Preview item otimizado */}
        {previewItem && (
          <GeoJSON 
            data={previewItem.geometry} 
            style={() => previewStyle}
            renderer={L.canvas({ padding: 0.5 })}
          />
        )}
        
        {/* Componente otimizado para ImageOverlays */}
        <OptimizedImageOverlays basemapPreviewItems={basemapPreviewItems} />

        <MapController 
          geojson={geojson} 
          previewItem={previewItem} 
          basemapPreview={basemapPreviewItems.length > 0 ? basemapPreviewItems[0] : null} 
        />
      </MapContainer>
      
      <LayerControl 
        selectedLayer={selectedLayer} 
        onLayerChange={setSelectedLayer} 
      />
    </div>
  );
};

export default MapDisplay; 