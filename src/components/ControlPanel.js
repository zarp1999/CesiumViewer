import React from 'react';
import './ControlPanel.css';

const ControlPanel = ({ settings, onSettingsChange, demData }) => {
  const handleHeightScaleChange = (event) => {
    const value = parseFloat(event.target.value);
    onSettingsChange({ heightScale: value });
  };

  const handleOpacityChange = (event) => {
    const value = parseFloat(event.target.value);
    onSettingsChange({ opacity: value });
  };

  const handleWireframeToggle = (event) => {
    onSettingsChange({ showWireframe: event.target.checked });
  };

  const handleTerrainToggle = (event) => {
    onSettingsChange({ showTerrain: event.target.checked });
  };

  const resetView = () => {
    // ビューをリセットする処理（CesiumViewerで実装）
    window.dispatchEvent(new CustomEvent('resetView'));
  };

  const resetSettings = () => {
    onSettingsChange({
      heightScale: 1.0,
      opacity: 0.8,
      showWireframe: false,
      showTerrain: true
    });
  };

  return (
    <div className="control-panel">
      <h3>表示設定</h3>
      
      {demData && (
        <div className="file-info">
          <h4>読み込み済みファイル</h4>
          <p><strong>ファイル名:</strong> {demData.name}</p>
          <p><strong>ファイルサイズ:</strong> {(demData.file.size / 1024 / 1024).toFixed(2)} MB</p>
          <p><strong>ファイル形式:</strong> {demData.type || 'GeoTIFF'}</p>
        </div>
      )}

      <div className="control-group">
        <label htmlFor="heightScale">
          高度スケール: {settings.heightScale.toFixed(1)}x
        </label>
        <input
          id="heightScale"
          type="range"
          min="0.1"
          max="10.0"
          step="0.1"
          value={settings.heightScale}
          onChange={handleHeightScaleChange}
          className="slider"
        />
        <div className="slider-labels">
          <span>0.1x</span>
          <span>10.0x</span>
        </div>
      </div>

      <div className="control-group">
        <label htmlFor="opacity">
          不透明度: {Math.round(settings.opacity * 100)}%
        </label>
        <input
          id="opacity"
          type="range"
          min="0.1"
          max="1.0"
          step="0.1"
          value={settings.opacity}
          onChange={handleOpacityChange}
          className="slider"
        />
        <div className="slider-labels">
          <span>10%</span>
          <span>100%</span>
        </div>
      </div>

      <div className="control-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.showWireframe}
            onChange={handleWireframeToggle}
          />
          <span className="checkmark"></span>
          ワイヤーフレーム表示
        </label>
      </div>

      <div className="control-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.showTerrain}
            onChange={handleTerrainToggle}
          />
          <span className="checkmark"></span>
          地形レイヤー表示
        </label>
      </div>

      <div className="button-group">
        <button 
          className="control-button primary"
          onClick={resetView}
        >
          ビューをリセット
        </button>
        <button 
          className="control-button secondary"
          onClick={resetSettings}
        >
          設定をリセット
        </button>
      </div>

      <div className="help-section">
        <h4>操作方法</h4>
        <ul>
          <li><strong>左クリック + ドラッグ:</strong> 回転</li>
          <li><strong>右クリック + ドラッグ:</strong> パン</li>
          <li><strong>マウスホイール:</strong> ズーム</li>
          <li><strong>中クリック + ドラッグ:</strong> チルト</li>
        </ul>
      </div>
    </div>
  );
};

export default ControlPanel;
