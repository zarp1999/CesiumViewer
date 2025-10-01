import React, { useState, useRef, useEffect } from 'react';
import CesiumViewer from './components/CesiumViewer';
import FileUpload from './components/FileUpload';
import ControlPanel from './components/ControlPanel';
import './App.css';

function App() {
  const [demData, setDemData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewerSettings, setViewerSettings] = useState({
    heightScale: 1.0,
    opacity: 0.8,
    showWireframe: false,
    showTerrain: true
  });

  const handleFileUpload = async (file) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // ファイルの読み込み処理
      const arrayBuffer = await file.arrayBuffer();
      setDemData({
        file: file,
        data: arrayBuffer,
        name: file.name,
        type: file.type
      });
    } catch (err) {
      setError('ファイルの読み込みに失敗しました: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingsChange = (newSettings) => {
    setViewerSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <div className="App">
      <div className="app-header">
        <h1>Cesium GeoTIFF Viewer</h1>
        <p>GeoTIFFファイルをアップロードして3D地形を表示</p>
      </div>
      
      <div className="app-content">
        <div className="sidebar">
          <FileUpload 
            onFileUpload={handleFileUpload}
            isLoading={isLoading}
            error={error}
          />
          
          {demData && (
            <ControlPanel
              settings={viewerSettings}
              onSettingsChange={handleSettingsChange}
              demData={demData}
            />
          )}
        </div>
        
        <div className="viewer-container">
          <CesiumViewer
            demData={demData}
            settings={viewerSettings}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
