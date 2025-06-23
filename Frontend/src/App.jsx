import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Slider } from '@/components/ui/slider.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Search, Satellite, Download, MapPin, Calendar, Cloud, Filter, Image, Map, Loader2, Layers } from 'lucide-react'
import LocationFilter from './components/LocationFilter.jsx'
import ShpUploader from './components/ShpUploader.jsx'
import ImageCard from './components/ImageCard.jsx'
import ImagePreviewModal from './components/ImagePreviewModal.jsx'
import BasemapDownloader from './components/BasemapDownloader.jsx'
import MapDisplay from './components/MapDisplay.jsx'
import './App.css'
import { toast } from 'react-hot-toast'

const API_BASE_URL = ''

function App() {
  // Estados para busca de cenas
  const [searchParams, setSearchParams] = useState({
    startDate: '',
    endDate: '',
    maxCloudCover: 20,
    itemTypes: ['PSScene'],
    geometry: null
  })
  const [itemTypes, setItemTypes] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [activatingAssets, setActivatingAssets] = useState({})
  const [showMap, setShowMap] = useState(false)
  const [mapPreviewItem, setMapPreviewItem] = useState(null);
  const [basemapPreviewItems, setBasemapPreviewItems] = useState([]);

  // Estados para busca de Basemaps
  const [basemapSeries, setBasemapSeries] = useState([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState('');
  const [basemapQuads, setBasemapQuads] = useState([]);
  const [basemapLoading, setBasemapLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [activeTab, setActiveTab] = useState('basemaps');

  // Memoiza arrays estáticos para evitar recriações
  const years = useMemo(() => Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i), []);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ 
    value: i + 1, 
    name: new Date(0, i).toLocaleString('default', { month: 'long' }) 
  })), []);

  useEffect(() => {
    fetchItemTypes()
    fetchBasemapSeries()
  }, [])

  // Memoiza as funções de fetch para evitar recriações
  const fetchBasemapSeries = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/basemap/series`);
      const data = await response.json();
      if (response.ok) {
        setBasemapSeries(data.series || []);
      } else {
        throw new Error(data.error || 'Falha ao buscar séries de basemap');
      }
    } catch (error) {
      console.error('Erro ao buscar séries de basemap:', error);
    }
  }, []);

  const fetchItemTypes = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/planet/item-types`)
      const data = await response.json()
      if (data && Array.isArray(data.item_types)) {
        setItemTypes(data.item_types)
      } else {
        console.error("Formato inesperado recebido para item_types:", data);
        setItemTypes([]);
      }
    } catch (error) {
      console.error('Erro ao buscar tipos de item:', error)
      setItemTypes([]);
    }
  }, []);

  // Memoiza handlers para evitar recriações
  const handleSeriesChange = useCallback((seriesId) => {
    setSelectedSeriesId(seriesId);
    setBasemapQuads([]);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchParams.geometry) {
      toast.error("Por favor, carregue uma geometria primeiro.");
      return;
    }
    
    const isBasemapTab = !!selectedSeriesId;
    
    if (isBasemapTab) {
      setBasemapLoading(true);
      setBasemapQuads([]);
      setBasemapPreviewItems([]);
    } else {
      setLoading(true);
      setSearchResults([]);
    }

    try {
      let finalResults = [];
      if (isBasemapTab) {
        const mosaicResponse = await fetch(`${API_BASE_URL}/api/basemap/mosaics?series_id=${selectedSeriesId}&year=${selectedYear}&month=${selectedMonth}`);
        
        if (!mosaicResponse.ok) {
          const errorData = await mosaicResponse.json().catch(() => ({ error: 'Não foi possível obter detalhes do erro.' }));
          throw new Error(errorData.error || `Não foi possível encontrar o mosaico para ${selectedMonth}/${selectedYear}.`);
        }
        
        const mosaicData = await mosaicResponse.json();
        const mosaic_id = mosaicData.mosaic_id;

        if (!mosaic_id) {
          throw new Error('Nenhum mosaico correspondente encontrado para a série e período selecionados.');
        }

        const quadsResponse = await fetch(`${API_BASE_URL}/api/basemap/quads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            mosaic_id, 
            geometry: searchParams.geometry,
            series_id: selectedSeriesId
          }),
        });

        if (!quadsResponse.ok) {
           const errorData = await quadsResponse.json();
          throw new Error(errorData.error || 'Falha ao buscar os quads do basemap.');
        }
        finalResults = await quadsResponse.json();
        setBasemapQuads(finalResults);

      } else {
        const payload = {
            geometry: searchParams.geometry,
            item_types: searchParams.itemTypes,
            date_range: {
                start: searchParams.startDate,
                end: searchParams.endDate,
            },
            cloud_cover: {
                lte: searchParams.maxCloudCover / 100,
            }
        };
        const searchResponse = await fetch(`${API_BASE_URL}/api/planet/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!searchResponse.ok) {
            const errorData = await searchResponse.json();
            throw new Error(errorData.error || 'Falha ao buscar imagens.');
        }
        finalResults = await searchResponse.json();
        setSearchResults(finalResults.features || []);
      }
      
      if (finalResults.length === 0) {
        toast.info("Nenhum resultado encontrado para os filtros aplicados.");
      }

    } catch (err) {
      toast.error(err.message);
    } finally {
      if (isBasemapTab) {
        setBasemapLoading(false);
      } else {
        setLoading(false);
      }
    }
  }, [searchParams, selectedSeriesId, selectedYear, selectedMonth]);

  const handleImageDownload = useCallback(async (item, assetType) => {
    const finalAssetType = typeof assetType === 'string' ? assetType : 'ortho_visual';
    const assetId = `${item.id}-${finalAssetType}`;

    setActivatingAssets(prev => ({ ...prev, [assetId]: true }));

    try {
        const pollStatus = async () => {
            const response = await fetch(`${API_BASE_URL}/api/download/status/${item.properties.item_type}/${item.id}/${finalAssetType}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Falha ao verificar status do asset');
            }

            if (data.status === 'active') {
                const downloadUrl = `${API_BASE_URL}/api/download/download/${item.properties.item_type}/${item.id}/${finalAssetType}`;
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = `${item.id}_${finalAssetType}.tif`;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setActivatingAssets(prev => ({ ...prev, [assetId]: false }));
            } else if (data.status === 'activating') {
                setTimeout(pollStatus, 5000); 
            } else {
                throw new Error(`Status inesperado do asset: ${data.status}`);
            }
        };

        await pollStatus();

    } catch (error) {
      console.error('Erro no processo de download:', error);
      alert(`Erro no download: ${error.message}`);
      setActivatingAssets(prev => ({ ...prev, [assetId]: false }));
    }
  }, []);

  const handleImagePreview = useCallback((item) => {
    setSelectedImage(item)
    setPreviewModalOpen(true)
  }, []);

  const handleShowOnMap = useCallback((item) => {
    setShowMap(true);
    setMapPreviewItem(prev => (prev && prev.id === item.id ? null : item));
    setBasemapPreviewItems([]);
  }, []);

  const handleShowBasemapOnMap = useCallback((quad) => {
    setBasemapPreviewItems(prevItems => {
      const isAlreadyInPreview = prevItems.some(item => item.id === quad.id);

      if (isAlreadyInPreview) {
        return prevItems.filter(item => item.id !== quad.id);
      } else {
        return [...prevItems, quad];
      }
    });
  }, []);

  const handleGeometryChange = useCallback((geom) => {
    setSearchParams(prev => ({ ...prev, geometry: geom }));
    setSearchResults([]);
    setBasemapQuads([]);
    setMapPreviewItem(null);
    setBasemapPreviewItems([]);
  }, []);

  const handlePreview = useCallback((itemToToggle) => {
    setPreviewItems(prevItems => {
      const itemExists = prevItems.some(item => item.id === itemToToggle.id);
      if (itemExists) {
        return prevItems.filter(item => item.id !== itemToToggle.id);
      } else {
        return [...prevItems, itemToToggle];
      }
    });
  }, []);

  // Memoiza handlers para mudanças de parâmetros
  const handleStartDateChange = useCallback((value) => {
    setSearchParams(prev => ({ ...prev, startDate: value }));
  }, []);

  const handleEndDateChange = useCallback((value) => {
    setSearchParams(prev => ({ ...prev, endDate: value }));
  }, []);

  const handleCloudCoverChange = useCallback((value) => {
    setSearchParams(prev => ({ ...prev, maxCloudCover: value[0] }));
  }, []);

  const handleItemTypeToggle = useCallback((itemId) => {
    setSearchParams(prev => {
      const newTypes = prev.itemTypes.includes(itemId)
        ? prev.itemTypes.filter(t => t !== itemId)
        : [...prev.itemTypes, itemId];
      return { ...prev, itemTypes: newTypes };
    });
  }, []);

  const handleYearChange = useCallback((value) => {
    setSelectedYear(parseInt(value, 10));
  }, []);

  const handleMonthChange = useCallback((value) => {
    setSelectedMonth(parseInt(value, 10));
  }, []);

  // Memoiza componentes de resultado para evitar re-renderizações
  const searchResultsList = useMemo(() => (
    <div className="space-y-2">
      {searchResults.map((item) => (
        <ImageCard 
          key={item.id} 
          item={item} 
          onDownload={handleImageDownload}
          onPreview={handleImagePreview}
          onShowOnMap={handleShowOnMap} 
          isActivating={false}
          activatingAssets={activatingAssets}
          isPreviewingOnMap={mapPreviewItem?.id === item.id}
        />
      ))}
    </div>
  ), [searchResults, handleImageDownload, handleImagePreview, handleShowOnMap, activatingAssets, mapPreviewItem]);

  const basemapResults = useMemo(() => (
    <BasemapDownloader 
      quads={basemapQuads} 
      onShowOnMap={handleShowBasemapOnMap} 
      basemapPreviewItems={basemapPreviewItems}
    />
  ), [basemapQuads, handleShowBasemapOnMap, basemapPreviewItems]);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <header className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Satellite className="h-6 w-6" />
          <h1 className="text-xl font-bold">Planet API Explorer</h1>
        </div>
        <Badge variant="outline" className="border-green-500/50 text-green-500">API Conectada</Badge>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* PAINEL ESQUERDO */}
        <div className="w-[450px] flex flex-col border-r">
          <div className="p-4 border-b">
            <ShpUploader onGeometryChange={handleGeometryChange} />
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basemaps"><Layers className="w-4 h-4 mr-2" /> Basemaps</TabsTrigger>
                <TabsTrigger value="scenes"><Image className="w-4 h-4 mr-2" /> Imagens</TabsTrigger>
              </TabsList>
              
              {/* Filtros para a aba ativa */}
              <div className="mt-4">
                {activeTab === 'basemaps' && (
                  <Card>
                    <CardHeader><CardTitle>Filtros do Basemap</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="basemap-series">Série do Basemap</Label>
                        <Select onValueChange={handleSeriesChange} value={selectedSeriesId}>
                          <SelectTrigger id="basemap-series">
                            <SelectValue placeholder="Selecione uma série" />
                          </SelectTrigger>
                          <SelectContent>
                            {basemapSeries.map(series => (
                              <SelectItem key={series.id} value={series.id}>{series.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="year">Ano</Label>
                          <Input 
                            id="year" 
                            type="number" 
                            value={selectedYear} 
                            onChange={e => handleYearChange(e.target.value)} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="month">Mês</Label>
                          <Select onValueChange={handleMonthChange} value={selectedMonth.toString()}>
                            <SelectTrigger id="month">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                               {months.map((month) => (
                                <SelectItem key={month.value} value={month.value.toString()}>
                                  {month.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {activeTab === 'scenes' && (
                  <Card>
                    <CardHeader><CardTitle>Filtros de Imagens</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="start-date">Data Inicial</Label>
                          <Input 
                            id="start-date" 
                            type="date" 
                            value={searchParams.startDate} 
                            onChange={e => handleStartDateChange(e.target.value)} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="end-date">Data Final</Label>
                          <Input 
                            id="end-date" 
                            type="date" 
                            value={searchParams.endDate} 
                            onChange={e => handleEndDateChange(e.target.value)} 
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo de Item</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {itemTypes.map((item) => (
                            <Button
                              key={item.id}
                              variant={searchParams.itemTypes.includes(item.id) ? 'secondary' : 'outline'}
                              onClick={() => handleItemTypeToggle(item.id)}
                            >
                              {item.display_name}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="cloud-cover">Cobertura de Nuvens Máx. ({searchParams.maxCloudCover}%)</Label>
                        <Slider
                          id="cloud-cover"
                          min={0}
                          max={100}
                          step={1}
                          value={[searchParams.maxCloudCover]}
                          onValueChange={handleCloudCoverChange}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </Tabs>

            <Button onClick={handleSearch} disabled={loading || basemapLoading || !searchParams.geometry} className="w-full mt-4">
              {(loading || basemapLoading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Buscar {activeTab === 'basemaps' ? 'Quads do Basemap' : 'Imagens'}
            </Button>
            
            {/* Resultados da Busca */}
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Resultados da Busca</h3>
              {activeTab === 'basemaps' ? basemapResults : searchResultsList}
            </div>
          </div>
        </div>

        {/* PAINEL DIREITO */}
        <div className="flex-1 h-full">
          <MapDisplay
            geojson={searchParams.geometry}
            previewItem={mapPreviewItem}
            basemapPreviewItems={basemapPreviewItems}
          />
        </div>
      </main>

      {previewModalOpen && (
        <ImagePreviewModal
          item={selectedImage}
          onClose={() => setPreviewModalOpen(false)}
        />
      )}
    </div>
  )
}

export default App

