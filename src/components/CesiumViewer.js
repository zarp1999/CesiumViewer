import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import * as Cesium from 'cesium';
import { fromArrayBuffer } from 'geotiff';
import './CesiumViewer.css';

// Cesiumの設定
window.CESIUM_BASE_URL = 'https://cdn.jsdelivr.net/npm/cesium@1.111.0/Build/Cesium/';
window.CESIUM_WORKER_URL = 'https://cdn.jsdelivr.net/npm/cesium@1.111.0/Build/Cesium/Workers/';
window.CESIUM_THIRD_PARTY_URL = 'https://cdn.jsdelivr.net/npm/cesium@1.111.0/Build/Cesium/ThirdParty/';

const CesiumViewer = ({ demData, settings, isLoading }) => {
  const cesiumContainer = useRef(null);
  const viewerRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);

  useLayoutEffect(() => {
    if (!cesiumContainer.current || isInitialized) return;

    let isInitializing = false;

    const initializeCesium = async () => {
      if (isInitializing) return;
      isInitializing = true;

      try {
        console.log('Cesiumの初期化を開始...');
        
        // 既存のビューアーがあれば破棄
        if (viewerRef.current && !viewerRef.current.isDestroyed()) {
          viewerRef.current.destroy();
          viewerRef.current = null;
        }
        
        // コンテナのサイズを明示的に設定
        const container = cesiumContainer.current;
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.minHeight = '500px';
        
        // コンテナの実際のサイズを取得
        const rect = container.getBoundingClientRect();
        console.log('コンテナサイズ:', rect.width, 'x', rect.height);
        
        // サイズが0の場合は待機
        if (rect.width === 0 || rect.height === 0) {
          console.log('コンテナサイズが0のため、待機します...');
          setTimeout(() => {
            const newRect = container.getBoundingClientRect();
            console.log('再取得したコンテナサイズ:', newRect.width, 'x', newRect.height);
            if (newRect.width > 0 && newRect.height > 0) {
              isInitializing = false;
              initializeCesium();
            }
          }, 100);
          return;
        }
        
        // Cesiumビューアーの初期化
        const viewer = new Cesium.Viewer(container, {
          terrainProvider: new Cesium.EllipsoidTerrainProvider(),
          timeline: false,
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          sceneModePicker: false,
          selectionIndicator: false,
          navigationHelpButton: false,
          navigationInstructionsInitiallyVisible: false,
          scene3DOnly: true,
          shouldAnimate: false
        });

        // 地球の設定
        viewer.scene.globe.enableLighting = true;
        viewer.scene.globe.dynamicAtmosphereLighting = true;
        viewer.scene.globe.atmosphereLightIntensity = 10.0;
        
        // 地球を表示するように設定
        viewer.scene.globe.show = true;

        // カメラの初期位置設定（より低い高度で開始）
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(139.6917, 35.6895, 10000), // 東京、高度10km
          orientation: {
            heading: 0.0,
            pitch: Cesium.Math.toRadians(-30),
            roll: 0.0
          }
        });

        viewerRef.current = viewer;
        setIsInitialized(true);
        
        // キャンバスサイズを明示的に設定
        const canvas = viewer.canvas;
        if (canvas) {
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          canvas.width = rect.width;
          canvas.height = rect.height;
          console.log('キャンバスサイズを設定:', canvas.width, 'x', canvas.height);
        }
        
        // リサイズイベントを発火して適切なサイズで表示
        setTimeout(() => {
          if (viewerRef.current && !viewerRef.current.isDestroyed()) {
            viewerRef.current.resize();
            console.log('Cesiumのリサイズが完了しました');
          }
        }, 300);
        
        console.log('Cesiumの初期化が完了しました');

      } catch (error) {
        console.error('Cesiumの初期化に失敗しました:', error);
        setError('Cesiumの初期化に失敗しました: ' + error.message);
      } finally {
        isInitializing = false;
      }
    };

    initializeCesium();

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        console.log('Cesiumビューアーを破棄中...');
        viewerRef.current.destroy();
        viewerRef.current = null;
        setIsInitialized(false);
      }
    };
  }, []);

  useEffect(() => {
    if (!viewerRef.current || !demData) return;

    setError(null); // エラーをクリア
    loadDEMData(demData, viewerRef.current, settings);
  }, [demData, settings]);

  // ウィンドウリサイズ時の処理
  useEffect(() => {
    const handleResize = () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadDEMData = async (demData, viewer, settings) => {
    try {
      console.log('DEMデータの読み込みを開始...', demData.name);

      // GeoTIFFファイルの読み込み
      const tiff = await fromArrayBuffer(demData.data);
      const image = await tiff.getImage();
      const rasters = await image.readRasters();
      
      // バウンディングボックスの取得
      const bbox = image.getBoundingBox();
      const [minX, minY, maxX, maxY] = bbox;

      console.log('バウンディングボックス:', bbox);
      console.log('座標範囲 - 経度:', minX, 'to', maxX, '緯度:', minY, 'to', maxY);

      // 高度データの取得
      const heightData = rasters[0];
      const width = image.getWidth();
      const height = image.getHeight();

      console.log(`画像サイズ: ${width}x${height}`);

      // 高度の範囲を計算
      const minHeight = Math.min(...heightData);
      const maxHeight = Math.max(...heightData);
      console.log(`高度範囲: ${minHeight} - ${maxHeight}`);

      // 既存のDEMレイヤーを削除
      const existingLayers = viewer.scene.primitives._primitives.filter(
        primitive => primitive._name === 'DEM_LAYER'
      );
      existingLayers.forEach(layer => viewer.scene.primitives.remove(layer));

      // 高度データから3Dモデルを生成（サンプリングして軽量化）
      const sampleRate = Math.max(1, Math.floor(Math.min(width, height) / 100)); // 最大100x100にサンプリング
      console.log(`サンプリングレート: ${sampleRate}`);
      
      const positions = [];
      const indices = [];
      const uvs = [];
      let vertexIndex = 0;
      const gridWidth = Math.floor((width - 1) / sampleRate) + 1;
      const gridHeight = Math.floor((height - 1) / sampleRate) + 1;

      console.log(`グリッドサイズ: ${gridWidth}x${gridHeight}`);

      for (let y = 0; y < height - sampleRate; y += sampleRate) {
        for (let x = 0; x < width - sampleRate; x += sampleRate) {
          const index = y * width + x;
          const heightValue = heightData[index] * settings.heightScale;

          // 地理座標に変換
          const lon = minX + (x / (width - 1)) * (maxX - minX);
          const lat = minY + (y / (height - 1)) * (maxY - minY);

          // 3D位置を計算
          const position = Cesium.Cartesian3.fromDegrees(lon, lat, heightValue);
          positions.push(position);

          // UV座標
          uvs.push(x / (width - 1), y / (height - 1));

          // インデックス（三角形）
          if (x < width - sampleRate && y < height - sampleRate) {
            const i = vertexIndex;
            const i1 = vertexIndex + gridWidth;
            const i2 = vertexIndex + 1;
            const i3 = vertexIndex + gridWidth + 1;

            // 2つの三角形を追加
            indices.push(i, i1, i2);
            indices.push(i1, i3, i2);
          }
          
          vertexIndex++;
        }
      }

      console.log(`生成された頂点数: ${positions.length}`);
      console.log(`生成されたインデックス数: ${indices.length}`);

      // ジオメトリの作成
      const geometry = new Cesium.Geometry({
        attributes: {
          position: new Cesium.GeometryAttribute({
            componentDatatype: Cesium.ComponentDatatype.DOUBLE,
            componentsPerAttribute: 3,
            values: Cesium.PrimitivePipeline.computeNormal(positions, indices).positions
          }),
          st: new Cesium.GeometryAttribute({
            componentDatatype: Cesium.ComponentDatatype.FLOAT,
            componentsPerAttribute: 2,
            values: uvs
          })
        },
        indices: indices,
        primitiveType: Cesium.PrimitiveType.TRIANGLES,
        boundingSphere: Cesium.BoundingSphere.fromPoints(positions)
      });

      // マテリアルの作成
      const material = new Cesium.Material({
        fabric: {
          type: 'Color',
          uniforms: {
            color: new Cesium.Color(0.5, 0.8, 0.5, settings.opacity)
          }
        }
      });

      // プリミティブの作成
      const primitive = new Cesium.Primitive({
        geometryInstances: new Cesium.GeometryInstance({
          geometry: geometry,
          attributes: {
            color: Cesium.ColorGeometryInstanceAttribute.fromColor(
              new Cesium.Color(0.5, 0.8, 0.5, settings.opacity)
            )
          }
        }),
        appearance: new Cesium.EllipsoidSurfaceAppearance({
          material: material,
          faceForward: false,
          flat: true
        }),
        show: true
      });

      primitive._name = 'DEM_LAYER';
      viewer.scene.primitives.add(primitive);

      // プリミティブが正常に追加されたか確認
      console.log('プリミティブが追加されました。シーン内のプリミティブ数:', viewer.scene.primitives.length);

      // カメラをDEMエリアにフォーカス
      const centerLon = (minX + maxX) / 2;
      const centerLat = (minY + maxY) / 2;
      const centerHeight = (minHeight + maxHeight) / 2 * settings.heightScale;
      const distance = Math.max(1000, centerHeight * 3); // 適切な距離を計算

      console.log(`カメラ位置 - 経度: ${centerLon}, 緯度: ${centerLat}, 高度: ${distance}`);

      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(centerLon, centerLat, distance),
        orientation: {
          heading: 0.0,
          pitch: Cesium.Math.toRadians(-45),
          roll: 0.0
        }
      });

      // シーンの更新を強制
      viewer.scene.requestRender();

      console.log('DEMデータの読み込みが完了しました');
      console.log('DEMレイヤーが表示されているか確認してください');

    } catch (error) {
      console.error('DEMデータの読み込みに失敗しました:', error);
      console.error('エラーの詳細:', error.stack);
      setError('DEMデータの読み込みに失敗しました: ' + error.message);
    }
  };

  return (
    <div className="cesium-viewer">
      <div 
        ref={cesiumContainer} 
        className="cesium-container"
        style={{ 
          width: '100%', 
          height: '100%',
          minHeight: '500px',
          position: 'relative'
        }}
      />
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>DEMデータを読み込み中...</p>
        </div>
      )}
      {error && (
        <div className="error-overlay">
          <div className="error-message">
            <h3>エラーが発生しました</h3>
            <p>{error}</p>
            <button onClick={() => setError(null)}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CesiumViewer;
