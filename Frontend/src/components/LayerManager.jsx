import React, { useState, useEffect } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';

// Lista de camadas disponíveis
const LAYERS = [
  {
    id: 'embargos-ibama',
    name: 'Embargos IBAMA',
    type: 'geojson',
    url: '/api/embargos',
    color: '#e11d48',
    checked: true
  },
  // Adicione outras camadas aqui futuramente
];

export default function LayerManager() {
  const [activeLayers, setActiveLayers] = useState(
    LAYERS.filter(l => l.checked).map(l => l.id)
  );
  const [layerData, setLayerData] = useState({});
  const map = useMap();

  // Carrega dados das camadas ativas usando proxy para evitar CORS
  useEffect(() => {
    LAYERS.forEach(layer => {
      if (activeLayers.includes(layer.id) && !layerData[layer.id]) {
        const fetchUrl = layer.type === 'geojson' ? layer.url : `/api/proxy-wfs?url=${encodeURIComponent(layer.url)}`;
        fetch(fetchUrl)
          .then(res => res.json())
          .then(data => {
            setLayerData(prev => ({ ...prev, [layer.id]: data }));
          });
      }
    });
    // eslint-disable-next-line
  }, [activeLayers]);

  // Remove dados de camadas desativadas
  useEffect(() => {
    setLayerData(prev => {
      const filtered = {};
      for (const key of Object.keys(prev)) {
        if (activeLayers.includes(key)) filtered[key] = prev[key];
      }
      return filtered;
    });
  }, [activeLayers]);

  // Handler para ativar/desativar camadas
  const handleToggle = (id) => {
    setActiveLayers(prev =>
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    );
  };

  return (
    <div
      className="absolute top-4 left-4 z-[1000] bg-white rounded shadow-lg p-3 min-w-[240px] max-h-[70vh] overflow-y-auto border border-gray-200"
      style={{ color: '#222', fontFamily: 'inherit', fontSize: 15 }}
    >
      <h4 className="font-semibold mb-2" style={{ color: '#222', fontWeight: 600, fontSize: 16 }}>Camadas</h4>
      <ul className="space-y-2">
        {LAYERS.map(layer => (
          <li key={layer.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={activeLayers.includes(layer.id)}
              onChange={() => handleToggle(layer.id)}
              id={`layer-${layer.id}`}
              style={{ accentColor: layer.color, width: 18, height: 18 }}
            />
            <label htmlFor={`layer-${layer.id}`} className="cursor-pointer select-none" style={{ color: '#222', fontWeight: 500 }}>
              <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ background: layer.color, border: '1px solid #aaa' }}></span>
              {layer.name}
            </label>
          </li>
        ))}
      </ul>
      {/* Renderiza as camadas ativas no mapa */}
      {LAYERS.map(layer => (
        activeLayers.includes(layer.id) && layerData[layer.id] ? (
          <GeoJSON
            key={layer.id}
            data={layerData[layer.id]}
            style={{ color: layer.color, weight: 2, fillOpacity: 0.15 }}
            onEachFeature={(feature, layerObj) => {
              if (feature.properties) {
                layerObj.bindPopup(
                  Object.entries(feature.properties)
                    .map(([k, v]) => `<b>${k}:</b> ${v}`)
                    .join('<br/>')
                );
              }
            }}
          />
        ) : null
      ))}
    </div>
  );
} 