import React, { useRef, useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!cesiumContainer.current || isInitialized) return;

    try {
      // Cesiumビューアーの初期化
      const viewer = new Cesium.Viewer(cesiumContainer.current, {
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

      // カメラの初期位置設定
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(139.6917, 35.6895, 100000), // 東京
        orientation: {
          heading: 0.0,
          pitch: Cesium.Math.toRadians(-45),
          roll: 0.0
        }
      });

      viewerRef.current = viewer;
      setIsInitialized(true);

    } catch (error) {
      console.error('Cesiumの初期化に失敗しました:', error);
    }

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [isInitialized]);

  useEffect(() => {
    if (!viewerRef.current || !demData) return;

    loadDEMData(demData, viewerRef.current, settings);
  }, [demData, settings]);

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

      // 高度データから3Dモデルを生成
      const positions = [];
      const indices = [];
      const uvs = [];

      for (let y = 0; y < height - 1; y++) {
        for (let x = 0; x < width - 1; x++) {
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
          if (x < width - 1 && y < height - 1) {
            const i = y * width + x;
            const i1 = (y + 1) * width + x;
            const i2 = y * width + (x + 1);
            const i3 = (y + 1) * width + (x + 1);

            // 2つの三角形を追加
            indices.push(i, i1, i2);
            indices.push(i1, i3, i2);
          }
        }
      }

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

      // カメラをDEMエリアにフォーカス
      const centerLon = (minX + maxX) / 2;
      const centerLat = (minY + maxY) / 2;
      const centerHeight = (minHeight + maxHeight) / 2 * settings.heightScale;

      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(centerLon, centerLat, centerHeight * 2),
        orientation: {
          heading: 0.0,
          pitch: Cesium.Math.toRadians(-45),
          roll: 0.0
        }
      });

      console.log('DEMデータの読み込みが完了しました');

    } catch (error) {
      console.error('DEMデータの読み込みに失敗しました:', error);
    }
  };

  return (
    <div className="cesium-viewer">
      <div 
        ref={cesiumContainer} 
        className="cesium-container"
        style={{ width: '100%', height: '100%' }}
      />
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>DEMデータを読み込み中...</p>
        </div>
      )}
    </div>
  );
};

export default CesiumViewer;
