import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, ImageOverlay } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card } from '@/components/ui/card.jsx';
import 'leaflet/dist/leaflet.css';

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
  useEffect(() => {
    if (previewItem?.geometry) {
      const layer = L.geoJSON(previewItem.geometry);
      if (layer.getBounds().isValid()) map.fitBounds(layer.getBounds());
    } else if (basemapPreview?.bbox) {
      // Reativa o zoom automático para o basemap
      const [minX, minY, maxX, maxY] = basemapPreview.bbox;
      const bounds = L.latLngBounds([[minY, minX], [maxY, maxX]]);
      if (bounds.isValid()) map.fitBounds(bounds);
    } else if (geojson) {
      const layer = L.geoJSON(geojson);
      if (layer.getBounds().isValid()) map.fitBounds(layer.getBounds());
    }
  }, [geojson, previewItem, basemapPreview, map]);
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

// Componente principal do Mapa
const MapDisplay = ({ geojson, previewItem, basemapPreviewItems }) => {
  const [selectedLayer, setSelectedLayer] = useState('light');

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
      >
        <TileLayer 
          url={currentLayer.url} 
          attribution={currentLayer.attribution} 
        />
        <GeoJSON data={geojson} style={() => ({ color: '#3b82f6', weight: 2, fillOpacity: 0.1 })} />
        {previewItem && <GeoJSON data={previewItem.geometry} style={() => ({ color: '#ff7800', weight: 2, fillOpacity: 0.2 })} />}
        
        {/* Renderiza múltiplos quadros de basemap */}
        {basemapPreviewItems && basemapPreviewItems.map(item => {
          const imageUrl = `/api/basemap/quad/preview?mosaic_id=${item.mosaic_id}&quad_id=${item.id}`;
          const [minX, minY, maxX, maxY] = item.bbox;
          const imageBounds = [[minY, minX], [maxY, maxX]];
          
          return (
            <ImageOverlay
              key={item.id}
              url={imageUrl}
              bounds={imageBounds}
              opacity={1}
              zIndex={10} 
            />
          );
        })}

        <MapController geojson={geojson} previewItem={previewItem} basemapPreview={basemapPreviewItems.length > 0 ? basemapPreviewItems[0] : null} />
      </MapContainer>
      
      <LayerControl 
        selectedLayer={selectedLayer} 
        onLayerChange={setSelectedLayer} 
      />
    </div>
  );
};

export default MapDisplay; 