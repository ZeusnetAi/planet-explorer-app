import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Upload, FileText, MapPin, AlertCircle, CheckCircle, Trash2 } from 'lucide-react'

const API_BASE_URL = ''

export function ShpUploader({ onGeometryChange }) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);
    setUploadSuccess(false);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/shp/upload-shp`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ocorreu um erro desconhecido');
      }

      onGeometryChange(data.geometry);
      setUploadSuccess(true);
    } catch (err) {
      setError(err.message);
      onGeometryChange(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    onGeometryChange(null);
    setUploadSuccess(false);
    setError(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
        {!uploadSuccess ? (
             <div className="p-4 border-2 border-dashed rounded-lg text-center">
                <Upload className="mx-auto h-10 w-10 text-gray-400" />
                <Label htmlFor="shp-upload" className="mt-2 block text-sm font-medium text-gray-700 cursor-pointer">
                    Clique para selecionar arquivos
                </Label>
                <p className="text-xs text-gray-500 mt-1">Envie um .zip ou os arquivos .shp, .shx, .dbf, .prj</p>
                <Input
                    id="shp-upload"
                    ref={fileInputRef}
                    type="file"
                    multiple // Permite múltiplos arquivos
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isUploading}
                />
                {isUploading && <p className="text-sm text-blue-500 mt-2">Enviando...</p>}
            </div>
        ) : (
             <div className="p-4 border border-green-300 bg-green-50 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <p className="text-sm font-medium text-green-800">Geometria carregada!</p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        )}

      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  );
}

export default ShpUploader

