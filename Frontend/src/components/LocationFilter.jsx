import { useState } from 'react'
import { Label } from '@/components/ui/label.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { MapPin } from 'lucide-react'

// Dados simplificados de estados e municípios brasileiros
const ESTADOS_MUNICIPIOS = {
  'SP': {
    nome: 'São Paulo',
    municipios: {
      'São Paulo': { lat: -23.5505, lng: -46.6333 },
      'Campinas': { lat: -22.9056, lng: -47.0608 },
      'Santos': { lat: -23.9608, lng: -46.3331 },
      'Ribeirão Preto': { lat: -21.1775, lng: -47.8103 },
      'Sorocaba': { lat: -23.5015, lng: -47.4526 }
    }
  },
  'RJ': {
    nome: 'Rio de Janeiro',
    municipios: {
      'Rio de Janeiro': { lat: -22.9068, lng: -43.1729 },
      'Niterói': { lat: -22.8833, lng: -43.1036 },
      'Petrópolis': { lat: -22.5057, lng: -43.1791 },
      'Campos dos Goytacazes': { lat: -21.7648, lng: -41.3370 },
      'Nova Iguaçu': { lat: -22.7592, lng: -43.4511 }
    }
  },
  'MG': {
    nome: 'Minas Gerais',
    municipios: {
      'Belo Horizonte': { lat: -19.9167, lng: -43.9345 },
      'Uberlândia': { lat: -18.9113, lng: -48.2622 },
      'Contagem': { lat: -19.9317, lng: -44.0536 },
      'Juiz de Fora': { lat: -21.7642, lng: -43.3503 },
      'Betim': { lat: -19.9681, lng: -44.1987 }
    }
  },
  'RS': {
    nome: 'Rio Grande do Sul',
    municipios: {
      'Porto Alegre': { lat: -30.0346, lng: -51.2177 },
      'Caxias do Sul': { lat: -29.1678, lng: -51.1794 },
      'Pelotas': { lat: -31.7654, lng: -52.3376 },
      'Canoas': { lat: -29.9177, lng: -51.1844 },
      'Santa Maria': { lat: -29.6842, lng: -53.8069 }
    }
  },
  'PR': {
    nome: 'Paraná',
    municipios: {
      'Curitiba': { lat: -25.4284, lng: -49.2733 },
      'Londrina': { lat: -23.3045, lng: -51.1696 },
      'Maringá': { lat: -23.4205, lng: -51.9331 },
      'Ponta Grossa': { lat: -25.0916, lng: -50.1668 },
      'Cascavel': { lat: -24.9555, lng: -53.4552 }
    }
  },
  'SC': {
    nome: 'Santa Catarina',
    municipios: {
      'Florianópolis': { lat: -27.5954, lng: -48.5480 },
      'Joinville': { lat: -26.3044, lng: -48.8487 },
      'Blumenau': { lat: -26.9194, lng: -49.0661 },
      'São José': { lat: -27.5969, lng: -48.6394 },
      'Criciúma': { lat: -28.6773, lng: -49.3695 }
    }
  },
  'BA': {
    nome: 'Bahia',
    municipios: {
      'Salvador': { lat: -12.9714, lng: -38.5014 },
      'Feira de Santana': { lat: -12.2664, lng: -38.9663 },
      'Vitória da Conquista': { lat: -14.8619, lng: -40.8444 },
      'Camaçari': { lat: -12.6997, lng: -38.3243 },
      'Juazeiro': { lat: -9.4111, lng: -40.4986 }
    }
  },
  'GO': {
    nome: 'Goiás',
    municipios: {
      'Goiânia': { lat: -16.6869, lng: -49.2648 },
      'Aparecida de Goiânia': { lat: -16.8173, lng: -49.2437 },
      'Anápolis': { lat: -16.3281, lng: -48.9530 },
      'Rio Verde': { lat: -17.7975, lng: -50.9269 },
      'Luziânia': { lat: -16.2572, lng: -47.9500 }
    }
  },
  'PA': {
    nome: 'Pará',
    municipios: {
      'Belém': { lat: -1.4558, lng: -48.4902 },
      'Ananindeua': { lat: -1.3656, lng: -48.3722 },
      'Santarém': { lat: -2.4448, lng: -54.7081 },
      'Marabá': { lat: -5.3687, lng: -49.1178 },
      'Pacajá': { lat: -3.8333, lng: -50.6500 },
      'Castanhal': { lat: -1.2939, lng: -47.9261 },
      'Parauapebas': { lat: -6.0675, lng: -49.9022 }
    }
  },
  'AM': {
    nome: 'Amazonas',
    municipios: {
      'Manaus': { lat: -3.1190, lng: -60.0217 },
      'Parintins': { lat: -2.6297, lng: -56.7356 },
      'Itacoatiara': { lat: -3.1431, lng: -58.4444 },
      'Manacapuru': { lat: -3.2997, lng: -60.6203 },
      'Coari': { lat: -4.0856, lng: -63.1411 }
    }
  },
  'MT': {
    nome: 'Mato Grosso',
    municipios: {
      'Cuiabá': { lat: -15.6014, lng: -56.0979 },
      'Várzea Grande': { lat: -15.6467, lng: -56.1325 },
      'Rondonópolis': { lat: -16.4706, lng: -54.6358 },
      'Sinop': { lat: -11.8639, lng: -55.5019 },
      'Tangará da Serra': { lat: -14.6219, lng: -57.5081 }
    }
  }
}

export function LocationFilter({ onLocationChange }) {
  const [selectedEstado, setSelectedEstado] = useState('')
  const [selectedMunicipio, setSelectedMunicipio] = useState('')

  const handleEstadoChange = (estado) => {
    setSelectedEstado(estado)
    setSelectedMunicipio('')
    onLocationChange(null)
  }

  const handleMunicipioChange = (municipio) => {
    setSelectedMunicipio(municipio)
    
    if (selectedEstado && municipio) {
      const coords = ESTADOS_MUNICIPIOS[selectedEstado].municipios[municipio]
      if (coords) {
        // Criar uma geometria de ponto com buffer de ~10km para busca
        const buffer = 0.1 // aproximadamente 10km
        const geometry = {
          type: "Polygon",
          coordinates: [[
            [coords.lng - buffer, coords.lat - buffer],
            [coords.lng + buffer, coords.lat - buffer],
            [coords.lng + buffer, coords.lat + buffer],
            [coords.lng - buffer, coords.lat + buffer],
            [coords.lng - buffer, coords.lat - buffer]
          ]]
        }
        onLocationChange(geometry)
      }
    }
  }

  const getMunicipios = () => {
    if (!selectedEstado) return []
    return Object.keys(ESTADOS_MUNICIPIOS[selectedEstado].municipios)
  }

  return (
    <div className="space-y-3">
      <Label className="flex items-center space-x-2">
        <MapPin className="h-4 w-4" />
        <span>Localização</span>
      </Label>
      
      <div className="space-y-2">
        <Select value={selectedEstado} onValueChange={handleEstadoChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o estado" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ESTADOS_MUNICIPIOS).map(([sigla, estado]) => (
              <SelectItem key={sigla} value={sigla}>
                {estado.nome} ({sigla})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={selectedMunicipio} 
          onValueChange={handleMunicipioChange}
          disabled={!selectedEstado}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o município" />
          </SelectTrigger>
          <SelectContent>
            {getMunicipios().map((municipio) => (
              <SelectItem key={municipio} value={municipio}>
                {municipio}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {selectedEstado && selectedMunicipio && (
        <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
          📍 {selectedMunicipio}, {ESTADOS_MUNICIPIOS[selectedEstado].nome}
        </div>
      )}
    </div>
  )
}

export default LocationFilter

