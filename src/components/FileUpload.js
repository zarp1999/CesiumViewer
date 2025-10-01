import React, { useRef } from 'react';
import './FileUpload.css';

const FileUpload = ({ onFileUpload, isLoading, error }) => {
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // ファイル形式のチェック（GeoTIFFのみ）
      const allowedTypes = [
        'image/tiff',
        'image/tif'
      ];
      
      const allowedExtensions = ['.tiff', '.tif'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
        alert('サポートされているファイル形式: .tiff, .tif (GeoTIFFのみ)');
        return;
      }

      onFileUpload(file);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileChange({ target: { files: [file] } });
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="file-upload">
      <h3>ファイルアップロード</h3>
      
      <div 
        className="upload-area"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={openFileDialog}
      >
        <div className="upload-content">
          <div className="upload-icon">📁</div>
          <p>GeoTIFFファイルをドラッグ&ドロップ</p>
          <p>または</p>
          <button 
            type="button" 
            className="upload-button"
            disabled={isLoading}
          >
            {isLoading ? '読み込み中...' : 'ファイルを選択'}
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".tiff,.tif"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        disabled={isLoading}
      />

      <div className="file-info">
        <h4>サポートされている形式:</h4>
        <ul>
          <li>GeoTIFF (.tiff, .tif)</li>
        </ul>
        
        <h4>推奨仕様:</h4>
        <ul>
          <li>ファイルサイズ: 100MB以下</li>
          <li>解像度: 1000x1000ピクセル以下</li>
          <li>座標系: WGS84 (EPSG:4326)</li>
        </ul>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
