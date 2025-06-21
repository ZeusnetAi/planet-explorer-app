import os
import tempfile
import zipfile
import geopandas as gpd
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename

shp_bp = Blueprint('shp', __name__)

ALLOWED_EXTENSIONS = {'zip', 'shp', 'shx', 'dbf', 'prj'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@shp_bp.route('/upload-shp', methods=['POST'])
def upload_shp():
    """Upload and process SHP file to extract geometry"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Please upload a ZIP file containing SHP data or individual SHP files.'}), 400
        
        # Create temporary directory
        with tempfile.TemporaryDirectory() as temp_dir:
            filename = secure_filename(file.filename)
            file_path = os.path.join(temp_dir, filename)
            file.save(file_path)
            
            # If it's a ZIP file, extract it
            if filename.lower().endswith('.zip'):
                with zipfile.ZipFile(file_path, 'r') as zip_ref:
                    zip_ref.extractall(temp_dir)
                
                # Find the SHP file in the extracted contents
                shp_files = [f for f in os.listdir(temp_dir) if f.lower().endswith('.shp')]
                if not shp_files:
                    return jsonify({'error': 'No SHP file found in the ZIP archive'}), 400
                
                shp_path = os.path.join(temp_dir, shp_files[0])
            else:
                shp_path = file_path
            
            # Read the shapefile
            try:
                gdf = gpd.read_file(shp_path)
            except Exception as e:
                return jsonify({'error': f'Error reading shapefile: {str(e)}'}), 400
            
            # Convert to WGS84 (EPSG:4326) if needed
            if gdf.crs and gdf.crs.to_epsg() != 4326:
                gdf = gdf.to_crs('EPSG:4326')
            
            # Get the union of all geometries to create a single area of interest
            union_geom = gdf.geometry.unary_union
            
            # Convert to GeoJSON
            if hasattr(union_geom, '__geo_interface__'):
                geometry = union_geom.__geo_interface__
            else:
                # Handle single geometry
                geometry = gdf.iloc[0].geometry.__geo_interface__
            
            # Get bounds for display
            bounds = gdf.total_bounds  # [minx, miny, maxx, maxy]
            
            return jsonify({
                'geometry': geometry,
                'bounds': {
                    'minLng': float(bounds[0]),
                    'minLat': float(bounds[1]),
                    'maxLng': float(bounds[2]),
                    'maxLat': float(bounds[3])
                },
                'feature_count': len(gdf),
                'crs': str(gdf.crs) if gdf.crs else 'Unknown'
            })
            
    except Exception as e:
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@shp_bp.route('/validate-geometry', methods=['POST'])
def validate_geometry():
    """Validate a GeoJSON geometry"""
    try:
        data = request.get_json()
        geometry = data.get('geometry')
        
        if not geometry:
            return jsonify({'error': 'No geometry provided'}), 400
        
        # Try to create a shapely geometry from the GeoJSON
        from shapely.geometry import shape
        geom = shape(geometry)
        
        if not geom.is_valid:
            return jsonify({'error': 'Invalid geometry'}), 400
        
        # Calculate area in square kilometers (approximate)
        # Note: This is a rough calculation for display purposes
        bounds = geom.bounds
        width = bounds[2] - bounds[0]  # longitude difference
        height = bounds[3] - bounds[1]  # latitude difference
        
        # Rough conversion to km² (very approximate)
        area_km2 = abs(width * height * 111.32 * 111.32)  # 111.32 km per degree at equator
        
        return jsonify({
            'valid': True,
            'area_km2': round(area_km2, 2),
            'bounds': {
                'minLng': bounds[0],
                'minLat': bounds[1],
                'maxLng': bounds[2],
                'maxLat': bounds[3]
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Geometry validation failed: {str(e)}'}), 400

