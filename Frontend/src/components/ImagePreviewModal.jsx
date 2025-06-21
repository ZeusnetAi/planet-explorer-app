import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Download, X, Calendar, Cloud, MapPin, Satellite, Image } from 'lucide-react'

export function ImagePreviewModal({ item, isOpen, onClose, onDownload }) {
  const [selectedAssetType, setSelectedAssetType] = useState('')
  const [downloading, setDownloading] = useState(false)

  if (!item) return null

  const formatDate = (dateString) => {
    console.log('Data recebida para formatação:', dateString);
    if (!dateString || new Date(dateString).toString() === 'Invalid Date') {
      return 'Data inválida';
    }
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCloudCoverColor = (cloudCover) => {
    if (cloudCover < 10) return 'bg-green-100 text-green-800'
    if (cloudCover < 30) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const handleDownload = async () => {
    if (!selectedAssetType) {
      alert('Selecione um tipo de asset para download')
      return
    }
    
    setDownloading(true)
    try {
      await onDownload(selectedAssetType)
    } finally {
      setDownloading(false)
    }
  }

  // Asset types disponíveis (simulado - na implementação real viria da API)
  const availableAssets = [
    { id: 'ortho_visual', name: 'Visual (RGB)', description: 'Imagem colorida para visualização' },
    { id: 'ortho_analytic_4b', name: 'Analítica 4-bandas', description: 'Dados espectrais para análise' },
    { id: 'ortho_analytic_8b', name: 'Analítica 8-bandas', description: 'Dados espectrais completos' },
    { id: 'ortho_analytic_4b_sr', name: 'Reflectância de Superfície', description: 'Dados corrigidos atmosfericamente' }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Satellite className="h-5 w-5" />
            <span>Detalhes da Imagem</span>
          </DialogTitle>
          <DialogDescription>
            {item.id}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Imagem Preview */}
          <div className="space-y-4">
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={item.properties?.thumbnail_url || item.properties?.preview_url || '/api/placeholder/400/400'}
                alt={`Preview ${item.id}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
              <div className="hidden w-full h-full items-center justify-center text-gray-400">
                <div className="text-center">
                  <Image className="h-16 w-16 mx-auto mb-2" />
                  <p>Preview não disponível</p>
                </div>
              </div>
            </div>
            
            {/* Badges de Informação */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {item.properties?.item_type || 'PSScene'}
              </Badge>
              <Badge className={getCloudCoverColor(item.properties?.cloud_cover ? item.properties.cloud_cover * 100 : 0)}>
                <Cloud className="h-3 w-3 mr-1" />
                {Math.round(item.properties?.cloud_cover ? item.properties.cloud_cover * 100 : 0)}% nuvens
              </Badge>
              {item.properties?.pixel_resolution && (
                <Badge variant="outline">
                  {item.properties.pixel_resolution}m resolução
                </Badge>
              )}
            </div>
          </div>
          
          {/* Informações Detalhadas */}
          <div className="space-y-6">
            {/* Informações Básicas */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Informações Básicas</h3>
              
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Data de Aquisição:</span>
                  <span>{formatDate(item.properties?.acquired || item.properties?.published)}</span>
                </div>
                
                {item.geometry && (
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div>
                      <span className="font-medium">Coordenadas:</span>
                      <div className="text-xs text-gray-600 mt-1">
                        Centro: {item.geometry.coordinates?.[0]?.[0]?.[0]?.toFixed(6)}, {' '}
                        {item.geometry.coordinates?.[0]?.[0]?.[1]?.toFixed(6)}
                      </div>
                    </div>
                  </div>
                )}
                
                {item.properties?.sun_azimuth && (
                  <div>
                    <span className="font-medium">Ângulo Solar:</span> {item.properties.sun_azimuth.toFixed(1)}°
                  </div>
                )}
                
                {item.properties?.sun_elevation && (
                  <div>
                    <span className="font-medium">Elevação Solar:</span> {item.properties.sun_elevation.toFixed(1)}°
                  </div>
                )}
              </div>
            </div>
            
            {/* Download Section */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Download</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Tipo de Asset:</label>
                  <Select value={selectedAssetType} onValueChange={setSelectedAssetType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione o tipo de imagem" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAssets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          <div>
                            <div className="font-medium">{asset.name}</div>
                            <div className="text-xs text-gray-500">{asset.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button
                  onClick={handleDownload}
                  disabled={!selectedAssetType || downloading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {downloading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Preparando Download...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Baixar Imagem
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ImagePreviewModal

