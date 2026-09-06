export function generateViewerHTML(droneName = "Drone Avionics 3D"): string {
  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${droneName} - Oflayn 3D Ko‘ruvchi va Tahrirlovchi</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      user-select: none;
    }
    body, html {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: #0a0f18;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #e2e8f0;
    }
    #app-container {
      position: relative;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
    }
    #canvas-container {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
    }

    /* Top Header Bar */
    .top-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 50px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(15, 23, 42, 0.96);
      backdrop-filter: blur(14px);
      border-bottom: 1px solid rgba(51, 65, 85, 0.8);
      padding: 0 16px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
      z-index: 30;
    }
    .brand-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .telemetry-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 10px;
      font-weight: 700;
      color: #38bdf8;
      background: rgba(14, 165, 233, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.35);
      border-radius: 9999px;
      padding: 2px 8px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .badge-icon-spin {
      display: inline-block;
      font-size: 11px;
      animation: pulse-ring 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    @keyframes pulse-ring {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.15); }
    }
    .header-title {
      font-size: 14px;
      font-weight: 700;
      color: #f8fafc;
      letter-spacing: 0.5px;
      margin: 0;
    }
    .inventory-stat-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: rgba(30, 41, 59, 0.85);
      border: 1px solid rgba(71, 85, 105, 0.6);
      border-radius: 9999px;
      padding: 3px 10px;
      font-size: 11px;
      color: #94a3b8;
    }
    .stat-label {
      color: #94a3b8;
      font-weight: 500;
    }
    .stat-value.highlight {
      color: #38bdf8;
      font-weight: 700;
      font-family: monospace;
    }
    .stat-sub {
      color: #64748b;
      font-size: 10px;
    }
    .brand-badge {
      font-size: 11px;
      background: rgba(14, 165, 233, 0.2);
      color: #38bdf8;
      border: 1px solid rgba(14, 165, 233, 0.4);
      padding: 2px 8px;
      border-radius: 9999px;
      font-weight: 600;
    }

    /* Center Header Tools */
    .header-center-tools {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Mode Switcher Pill */
    .mode-switcher {
      display: flex;
      align-items: center;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid rgba(71, 85, 105, 0.6);
      border-radius: 9999px;
      padding: 3px;
      gap: 2px;
    }
    .mode-btn {
      background: transparent;
      color: #94a3b8;
      border: none;
      border-radius: 9999px;
      padding: 5px 14px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .mode-btn:hover {
      color: #f8fafc;
    }
    .mode-btn.active {
      background: #0284c7;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(2, 132, 199, 0.4);
    }

    /* Gizmo Switcher Pill */
    .gizmo-switcher {
      display: none;
      align-items: center;
      background: rgba(30, 41, 59, 0.85);
      border: 1px solid rgba(71, 85, 105, 0.6);
      border-radius: 8px;
      padding: 2px;
      gap: 2px;
    }
    .gizmo-btn {
      background: transparent;
      color: #cbd5e1;
      border: none;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .gizmo-btn:hover {
      background: rgba(51, 65, 85, 0.8);
      color: #ffffff;
    }
    .gizmo-btn.active {
      background: #0284c7;
      color: #ffffff;
    }
    .gizmo-btn.toggle-subtle {
      border: 1px solid rgba(71, 85, 105, 0.4);
      background: rgba(15, 23, 42, 0.6);
    }
    .scene-quick-group {
      display: none;
      align-items: center;
      background: rgba(30, 41, 59, 0.85);
      border: 1px solid rgba(71, 85, 105, 0.6);
      border-radius: 8px;
      padding: 2px;
      gap: 2px;
    }

    /* Top Right Actions */
    .top-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .hud-stat-item {
      font-size: 12px;
      color: #94a3b8;
    }
    .hud-stat-item strong {
      color: #38bdf8;
      font-weight: 700;
      margin-left: 3px;
    }

    /* Button base */
    .btn {
      background: rgba(30, 41, 59, 0.85);
      color: #cbd5e1;
      border: 1px solid rgba(71, 85, 105, 0.6);
      border-radius: 8px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    .btn:hover {
      background: rgba(51, 65, 85, 0.9);
      color: #ffffff;
      border-color: #38bdf8;
    }
    .btn.active {
      background: rgba(14, 165, 233, 0.25);
      color: #38bdf8;
      border-color: #0284c7;
    }
    .btn-primary {
      background: #0284c7;
      color: #ffffff;
      border-color: #0369a1;
    }
    .btn-primary:hover {
      background: #0369a1;
      border-color: #38bdf8;
    }
    .btn-success {
      background: rgba(16, 185, 129, 0.2);
      color: #6ee7b7;
      border-color: rgba(16, 185, 129, 0.4);
    }
    .btn-success:hover {
      background: rgba(16, 185, 129, 0.35);
      color: #ffffff;
    }
    .btn-danger {
      background: rgba(239, 68, 68, 0.2);
      color: #fca5a5;
      border-color: rgba(239, 68, 68, 0.4);
    }
    .btn-danger:hover {
      background: rgba(239, 68, 68, 0.4);
      color: #ffffff;
    }

    /* Floating Viewport Quick Action HUD (Centered Top) */
    .viewport-quick-tools {
      position: absolute;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 4px;
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(51, 65, 85, 0.8);
      padding: 4px 10px;
      border-radius: 9999px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6);
      z-index: 20;
    }
    .quick-btn {
      background: transparent;
      color: #94a3b8;
      border: none;
      border-radius: 9999px;
      padding: 5px 10px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .quick-btn:hover {
      background: rgba(51, 65, 85, 0.8);
      color: #f8fafc;
    }
    .quick-btn.active {
      background: rgba(14, 165, 233, 0.25);
      color: #38bdf8;
    }

    /* Floating Bottom Controls (Minimalist fallback) */
    .controls-bar {
      display: none;
    }
    .separator {
      width: 1px;
      height: 18px;
      background: rgba(71, 85, 105, 0.6);
      margin: 0 4px;
    }

    /* Left Sidebar (Tabs for Elements, Cables, Pins, Settings) */
    .sidebar {
      position: absolute;
      top: 60px;
      left: 16px;
      bottom: 16px;
      width: 320px;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(51, 65, 85, 0.8);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 15px 35px -5px rgba(0, 0, 0, 0.6);
      z-index: 20;
      overflow: hidden;
      transition: transform 0.25s ease;
    }
    .sidebar.collapsed {
      transform: translateX(-350px);
    }
    .sidebar-tabs {
      display: flex;
      border-bottom: 1px solid rgba(51, 65, 85, 0.8);
      background: rgba(15, 23, 42, 0.6);
    }
    .sidebar-tab-btn {
      flex: 1;
      padding: 10px 4px;
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
      text-align: center;
    }
    .sidebar-tab-btn.active {
      color: #38bdf8;
      border-bottom-color: #0284c7;
      background: rgba(14, 165, 233, 0.08);
    }
    .sidebar-tab-content {
      display: none;
      flex: 1;
      overflow-y: auto;
      padding: 10px;
    }
    .sidebar-tab-content.active {
      display: block;
    }

    .list-item {
      padding: 8px 10px;
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(51, 65, 85, 0.4);
      border-radius: 8px;
      margin-bottom: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .list-item:hover {
      background: rgba(14, 165, 233, 0.15);
      border-color: #0284c7;
    }
    .list-item.selected {
      background: rgba(14, 165, 233, 0.25);
      border-color: #38bdf8;
    }
    .item-title {
      font-size: 12px;
      font-weight: 600;
      color: #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .item-badge {
      font-size: 10px;
      color: #38bdf8;
      font-family: monospace;
    }
    .item-sub {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 3px;
      font-family: monospace;
    }

    /* Right Inspector & Editor Panel (Matches PlacedInspectorPanel) */
    #editor-inspector-panel {
      display: none;
      position: absolute;
      top: 60px;
      right: 16px;
      bottom: 16px;
      width: 340px;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(56, 189, 248, 0.4);
      border-radius: 12px;
      padding: 14px;
      box-shadow: 0 15px 35px -5px rgba(0, 0, 0, 0.6);
      z-index: 25;
      overflow-y: auto;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(51, 65, 85, 0.8);
    }
    .panel-title {
      font-size: 13px;
      font-weight: 700;
      color: #f8fafc;
    }
    .control-row {
      margin-bottom: 10px;
    }
    .control-label {
      font-size: 11px;
      color: #94a3b8;
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
    }
    .coord-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px;
    }
    .coord-input-box {
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid rgba(71, 85, 105, 0.6);
      border-radius: 6px;
      padding: 4px;
      text-align: center;
    }
    .coord-input-box label {
      display: block;
      font-size: 9px;
      color: #38bdf8;
      font-weight: 700;
    }
    .coord-input-box input {
      width: 100%;
      background: transparent;
      border: none;
      color: #f8fafc;
      font-size: 12px;
      font-weight: 600;
      text-align: center;
      outline: none;
      font-family: monospace;
    }
    .step-btn-group {
      display: flex;
      gap: 4px;
      margin-top: 4px;
    }
    .step-btn {
      flex: 1;
      background: rgba(51, 65, 85, 0.5);
      border: 1px solid rgba(71, 85, 105, 0.4);
      color: #cbd5e1;
      font-size: 10px;
      padding: 3px 0;
      border-radius: 4px;
      cursor: pointer;
    }
    .step-btn:hover {
      background: rgba(14, 165, 233, 0.3);
      color: #ffffff;
    }

    /* Color picker & presets */
    .color-preset-btn {
      height: 22px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      cursor: pointer;
      transition: transform 0.15s, border-color 0.15s;
    }
    .color-preset-btn:hover {
      transform: scale(1.15);
      border-color: #ffffff;
    }

    /* Pin list inside inspector */
    .pins-inspector-container {
      margin-top: 10px;
      border-top: 1px solid rgba(51, 65, 85, 0.8);
      padding-top: 10px;
    }
    .pin-row-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 5px 8px;
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(71, 85, 105, 0.4);
      border-radius: 6px;
      margin-bottom: 4px;
      font-size: 11px;
    }
    .pin-type-tag {
      font-size: 9px;
      padding: 1px 5px;
      border-radius: 4px;
      font-weight: 700;
      text-transform: uppercase;
      margin-right: 5px;
    }

    /* Form elements */
    .form-select, .form-input {
      width: 100%;
      background: rgba(30, 41, 59, 0.8);
      border: 1px solid rgba(71, 85, 105, 0.8);
      color: #f8fafc;
      padding: 6px 8px;
      border-radius: 6px;
      font-size: 12px;
      outline: none;
      margin-bottom: 8px;
    }
    .checkbox-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #cbd5e1;
      margin-bottom: 8px;
      cursor: pointer;
    }
    .checkbox-row input {
      accent-color: #0284c7;
      width: 15px;
      height: 15px;
    }

    /* 3D Pin Hover Tooltip */
    #pin-hover-tooltip {
      position: absolute;
      display: none;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(10px);
      border: 1px solid #38bdf8;
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 11px;
      color: #f8fafc;
      pointer-events: none;
      z-index: 50;
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.5);
      white-space: nowrap;
      transform: translate(-50%, -120%);
    }

    /* Catalog Modal */
    #catalog-modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      z-index: 100;
      align-items: center;
      justify-content: center;
    }
    .modal-card {
      background: #0f172a;
      border: 1px solid #0284c7;
      border-radius: 14px;
      width: 580px;
      max-width: 92vw;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
      overflow: hidden;
    }
    .modal-header {
      padding: 14px 18px;
      border-bottom: 1px solid rgba(51, 65, 85, 0.8);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-header h3 {
      font-size: 14px;
      font-weight: 700;
      color: #f8fafc;
    }
    .modal-body {
      padding: 16px;
      overflow-y: auto;
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .catalog-item {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(71, 85, 105, 0.6);
      border-radius: 8px;
      padding: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .catalog-item:hover {
      background: rgba(14, 165, 233, 0.15);
      border-color: #38bdf8;
      transform: translateY(-2px);
    }
    .catalog-item-title {
      font-size: 12px;
      font-weight: 700;
      color: #f8fafc;
    }
    .catalog-item-desc {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 4px;
    }

    /* Loading Status Overlay */
    #viewer-status {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(15, 23, 42, 0.94);
      border: 1px solid rgba(56, 189, 248, 0.5);
      border-radius: 16px;
      padding: 16px 28px;
      font-size: 14px;
      font-weight: 600;
      color: #38bdf8;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
      z-index: 100;
      text-align: center;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
  </style>
</head>
<body>
  <div id="app-container">
    <div id="canvas-container"></div>

    <div id="viewer-status">3D Modellar va Pinlar yuklanmoqda...</div>

    <!-- 3D Pin Hover Tooltip -->
    <div id="pin-hover-tooltip">
      <strong id="tooltip-title">-</strong>
      <div id="tooltip-sub" style="font-size: 10px; color: #94a3b8;">-</div>
    </div>

    <!-- Header Bar -->
    <div class="top-bar">
      <div class="brand-title">
        <span class="telemetry-badge"><span class="badge-icon-spin">🛰️</span> 3D Avionika</span>
        <h1 class="header-title">${droneName}</h1>
        <span class="brand-badge" id="app-badge">Oflayn 3D</span>
      </div>

      <!-- Mode Switcher: Viewer / Editor -->
      <div class="mode-switcher">
        <button id="btn-mode-viewer" class="mode-btn active" onclick="window.DroneViewerApp && window.DroneViewerApp.setMode('viewer')" title="Taqdimot va tekshirish rejimi">
          👁️ Ko‘rish (Viewer)
        </button>
        <button id="btn-mode-editor" class="mode-btn" onclick="window.DroneViewerApp && window.DroneViewerApp.setMode('editor')" title="Joylashuv, kabel va pinlarni tahrirlash">
          ✏️ Tahrirlash (Editor)
        </button>
      </div>

      <!-- 3D Gizmo Mode (Editor only) -->
      <div class="gizmo-switcher" id="gizmo-controls-group">
        <button id="btn-gizmo-translate" class="gizmo-btn active" onclick="window.DroneViewerApp && window.DroneViewerApp.setGizmoMode('translate')" title="Surish (W tugmasi)">
          ✥ Surish (W)
        </button>
        <button id="btn-gizmo-rotate" class="gizmo-btn" onclick="window.DroneViewerApp && window.DroneViewerApp.setGizmoMode('rotate')" title="Burish (E tugmasi)">
          ↺ Burish (E)
        </button>
      </div>

      <!-- Inventory Summary Stat Pill -->
      <div class="inventory-stat-pill" title="Joriy loyiha statistikasi">
        <span class="stat-label">Modullar:</span> <span class="stat-value highlight" id="hud-components-count">0</span>
        <span class="stat-sub">•</span>
        <span class="stat-label">Kabellar:</span> <span class="stat-value highlight" id="hud-cables-count">0</span>
        <span class="stat-sub">•</span>
        <span class="stat-label">Pinlar:</span> <span class="stat-value highlight" id="hud-pins-count">0</span>
      </div>

      <!-- Top Right Actions -->
      <div class="top-actions">
        <!-- Editor Only Action Buttons -->
        <div id="editor-actions-group" style="display: none; align-items: center; gap: 6px;">
          <button class="btn btn-success" onclick="window.DroneViewerApp && window.DroneViewerApp.openCatalogModal()" title="Kutubxonadan yangi avionika moduli qo‘shish">
            ➕ Yangi Element
          </button>
          <button class="btn btn-primary" onclick="window.DroneViewerApp && window.DroneViewerApp.saveProjectLocally()" title="Brauzer xotirasiga saqlash">
            💾 Saqlash
          </button>
          <button class="btn" onclick="window.DroneViewerApp && window.DroneViewerApp.downloadUpdatedZip()" title="Yangi ZIP to‘plamni yuklab olish">
            📥 ZIP eksport
          </button>
          <button class="btn" onclick="window.DroneViewerApp && window.DroneViewerApp.exportProjectJson()" title="JSON faylni yuklab olish">
            📄 JSON
          </button>
        </div>

        <button class="btn" onclick="document.querySelector('.sidebar').classList.toggle('collapsed')" title="Yon panelni ochish/yopish">
          📋 Panel
        </button>
      </div>
    </div>

    <!-- Floating Viewport Quick Action HUD (Matches main application) -->
    <div class="viewport-quick-tools" id="viewport-quick-tools">
      <button class="quick-btn" onclick="window.DroneViewerApp && window.DroneViewerApp.setCameraView('iso')" title="Izometriya ko‘rinishi">📐 Iso</button>
      <button class="quick-btn" onclick="window.DroneViewerApp && window.DroneViewerApp.setCameraView('top')" title="Yuqoridan ko‘rinish">⬆️ Yuqori</button>
      <button class="quick-btn" onclick="window.DroneViewerApp && window.DroneViewerApp.setCameraView('front')" title="Oldindan ko‘rinish">➡️ Old</button>
      <button class="quick-btn" onclick="window.DroneViewerApp && window.DroneViewerApp.setCameraView('side')" title="Yondan ko‘rinish">↗️ Yon</button>
      <div class="separator"></div>
      <button class="quick-btn" id="btn-toggle-wireframe" onclick="window.DroneViewerApp && window.DroneViewerApp.toggleWireframe()" title="Karkas (Wireframe) rejimi">🔲 Karkas</button>
      <button class="quick-btn active" id="btn-toggle-cables" onclick="window.DroneViewerApp && window.DroneViewerApp.toggleCables()" title="Kabellarni ko‘rsatish/yashirish">⚡ Kabellar</button>
      <button class="quick-btn active" id="btn-toggle-pins" onclick="window.DroneViewerApp && window.DroneViewerApp.togglePins()" title="Pinlarni ko‘rsatish/yashirish">📍 Pinlar</button>
      <button class="quick-btn active" id="btn-toggle-flow" onclick="window.DroneViewerApp && window.DroneViewerApp.toggleFlowAnimation()" title="Elektr tok oqimi animatsiyasi">🌊 Oqim</button>
      <div class="separator"></div>
      <button class="quick-btn" onclick="window.DroneViewerApp && window.DroneViewerApp.focusSelected()" title="Tanlangan obyektga qaratish">🎯 Markaz</button>
      <button class="quick-btn" onclick="document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()" title="To‘liq ekran">⛶ Ekran</button>
    </div>

    <!-- Right Floating Inspector & Editor Panel (Matches PlacedInspectorPanel) -->
    <div id="editor-inspector-panel">
      <!-- 1. COMPONENT INSPECTOR VIEW -->
      <div id="inspector-component-view">
        <div class="panel-header">
          <div class="panel-title" id="inspector-name">Element</div>
          <button class="btn" style="padding: 2px 6px; font-size: 10px;" onclick="window.DroneViewerApp && window.DroneViewerApp.clearSelection()">✕</button>
        </div>

        <div style="font-size: 10px; color: #38bdf8; font-family: monospace; margin-bottom: 10px;" id="inspector-id">ID: -</div>

        <!-- Component Position Editor -->
        <div class="control-row">
          <div class="control-label">
            <span>Pozitsiya (X, Y, Z mm)</span>
            <span style="color: #64748b; font-size: 9px;">3D Joylashuv</span>
          </div>
          <div class="coord-grid">
            <div class="coord-input-box">
              <label>X</label>
              <input type="number" id="inp-pos-x" onchange="window.DroneViewerApp && window.DroneViewerApp.onTransformInput()">
            </div>
            <div class="coord-input-box">
              <label>Y</label>
              <input type="number" id="inp-pos-y" onchange="window.DroneViewerApp && window.DroneViewerApp.onTransformInput()">
            </div>
            <div class="coord-input-box">
              <label>Z</label>
              <input type="number" id="inp-pos-z" onchange="window.DroneViewerApp && window.DroneViewerApp.onTransformInput()">
            </div>
          </div>
          <div class="step-btn-group" id="editor-step-buttons">
            <button class="step-btn" onclick="window.DroneViewerApp && window.DroneViewerApp.stepPosition('y', 10)">Y+10</button>
            <button class="step-btn" onclick="window.DroneViewerApp && window.DroneViewerApp.stepPosition('y', -10)">Y-10</button>
            <button class="step-btn" onclick="window.DroneViewerApp && window.DroneViewerApp.stepPosition('x', 10)">X+10</button>
            <button class="step-btn" onclick="window.DroneViewerApp && window.DroneViewerApp.stepPosition('z', 10)">Z+10</button>
          </div>
        </div>

        <!-- Component Rotation (Gradus) Editor -->
        <div class="control-row">
          <div class="control-label">
            <span>Burilish (Rot X, Y, Z °)</span>
            <span style="color: #64748b; font-size: 9px;">Gradus burchaklar</span>
          </div>
          <div class="coord-grid">
            <div class="coord-input-box">
              <label>Rot X°</label>
              <input type="number" id="inp-rot-x" onchange="window.DroneViewerApp && window.DroneViewerApp.onTransformInput()">
            </div>
            <div class="coord-input-box">
              <label>Rot Y°</label>
              <input type="number" id="inp-rot-y" onchange="window.DroneViewerApp && window.DroneViewerApp.onTransformInput()">
            </div>
            <div class="coord-input-box">
              <label>Rot Z°</label>
              <input type="number" id="inp-rot-z" onchange="window.DroneViewerApp && window.DroneViewerApp.onTransformInput()">
            </div>
          </div>
          <div class="step-btn-group">
            <button class="step-btn" onclick="window.DroneViewerApp && window.DroneViewerApp.rotateQuick('y', 90)">↺ Y+90°</button>
            <button class="step-btn" onclick="window.DroneViewerApp && window.DroneViewerApp.rotateQuick('y', -90)">↻ Y-90°</button>
            <button class="step-btn" onclick="window.DroneViewerApp && window.DroneViewerApp.rotateQuick('x', 90)">Rot X 90°</button>
            <button class="step-btn" onclick="window.DroneViewerApp && window.DroneViewerApp.rotateQuick('z', 90)">Rot Z 90°</button>
          </div>
        </div>

        <!-- Component Color Customization -->
        <div class="control-row" id="section-component-color">
          <div class="control-label">
            <span>🎨 Komponent Rangi</span>
            <span style="color: #64748b; font-size: 9px;" id="inspector-color-label">Standart rang</span>
          </div>

          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <div id="inspector-color-preview" style="width: 26px; height: 26px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.3); background-color: #ff6600; flex-shrink: 0;"></div>
            <input type="color" id="inp-component-color" style="flex: 1; height: 28px; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(71, 85, 105, 0.8); border-radius: 6px; cursor: pointer; padding: 2px;" onchange="window.DroneViewerApp && window.DroneViewerApp.onColorInputChange(this.value)">
            <button class="btn" style="padding: 4px 8px; font-size: 11px;" onclick="window.DroneViewerApp && window.DroneViewerApp.resetSelectedInstanceColor()" title="Asl CAD material rangiga qaytarish">↺ Asl</button>
          </div>

          <!-- Color Presets -->
          <div style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 4px; margin-bottom: 8px;">
            <button class="color-preset-btn" style="background-color: #ff6600;" onclick="window.DroneViewerApp && window.DroneViewerApp.setSelectedInstanceColor('#ff6600')" title="Cube Orange (#ff6600)"></button>
            <button class="color-preset-btn" style="background-color: #ef4444;" onclick="window.DroneViewerApp && window.DroneViewerApp.setSelectedInstanceColor('#ef4444')" title="Xavfsizlik Qizil (#ef4444)"></button>
            <button class="color-preset-btn" style="background-color: #0284c7;" onclick="window.DroneViewerApp && window.DroneViewerApp.setSelectedInstanceColor('#0284c7')" title="Aviatsiya Moviy (#0284c7)"></button>
            <button class="color-preset-btn" style="background-color: #10b981;" onclick="window.DroneViewerApp && window.DroneViewerApp.setSelectedInstanceColor('#10b981')" title="Zumrad Yashil (#10b981)"></button>
            <button class="color-preset-btn" style="background-color: #eab308;" onclick="window.DroneViewerApp && window.DroneViewerApp.setSelectedInstanceColor('#eab308')" title="Signal Sariq (#eab308)"></button>
            <button class="color-preset-btn" style="background-color: #a855f7;" onclick="window.DroneViewerApp && window.DroneViewerApp.setSelectedInstanceColor('#a855f7')" title="Siyohrang (#a855f7)"></button>
            <button class="color-preset-btn" style="background-color: #1e293b;" onclick="window.DroneViewerApp && window.DroneViewerApp.setSelectedInstanceColor('#1e293b')" title="To‘q Grafit (#1e293b)"></button>
            <button class="color-preset-btn" style="background-color: #f8fafc;" onclick="window.DroneViewerApp && window.DroneViewerApp.setSelectedInstanceColor('#f8fafc')" title="Oq / Metall (#f8fafc)"></button>
          </div>

          <button id="btn-apply-color-all-offline" class="btn" style="width: 100%; font-size: 10px; padding: 4px 6px; text-align: center; justify-content: center; display: none;" onclick="window.DroneViewerApp && window.DroneViewerApp.applySelectedColorToAll()">
            Barcha bir xil modellarga qo‘llash
          </button>
        </div>

        <!-- Component Electrical Ports & Pins Section -->
        <div class="pins-inspector-container">
          <div class="control-label">
            <span>🔌 Elektr Portlari va Pinlar</span>
            <span style="color: #38bdf8; font-size: 9px;" id="inspector-pins-count">0 ta pin</span>
          </div>
          <div id="inspector-pins-list" style="max-height: 180px; overflow-y: auto; margin-bottom: 8px;"></div>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 6px; margin-top: 14px;">
          <button class="btn active" style="flex: 1;" onclick="window.DroneViewerApp && window.DroneViewerApp.focusSelected()">🎯 Markaz</button>
          <button class="btn" id="btn-duplicate-inst" style="flex: 1;" onclick="window.DroneViewerApp && window.DroneViewerApp.duplicateSelected()">📋 Nusxa</button>
          <button class="btn btn-danger" id="btn-delete-inst" style="flex: 1;" onclick="window.DroneViewerApp && window.DroneViewerApp.deleteSelected()">🗑 O‘chirish</button>
        </div>
      </div>

      <!-- 2. CABLE INSPECTOR VIEW (MATCHES MAIN APP & BREAKOUT CONTROLS) -->
      <div id="inspector-cable-view" style="display: none;">
        <div class="panel-header">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="color: #38bdf8;">⚡</span>
            <div class="panel-title" id="cable-inspector-title">Kabel</div>
            <span class="pin-type-tag" id="cable-inspector-badge" style="background: rgba(14, 165, 233, 0.2); color: #38bdf8; border: 1px solid rgba(14, 165, 233, 0.4);">CAN</span>
          </div>
          <button class="btn" style="padding: 2px 6px; font-size: 10px;" onclick="window.DroneViewerApp && window.DroneViewerApp.clearSelection()">✕</button>
        </div>

        <!-- Endpoints Connection Card -->
        <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(71, 85, 105, 0.6); border-radius: 8px; padding: 10px; margin-bottom: 10px;">
          <div style="font-size: 10px; color: #94a3b8; margin-bottom: 4px;">Bog‘lanish yo‘nalishi:</div>
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px;">
            <div style="flex: 1;">
              <div style="font-weight: 700; color: #38bdf8;" id="cable-from-name">-</div>
              <div style="font-size: 10px; color: #cbd5e1; font-family: monospace;" id="cable-from-pin">-</div>
            </div>
            <div style="padding: 0 8px; color: #64748b; font-weight: bold;">➔</div>
            <div style="flex: 1; text-align: right;">
              <div style="font-weight: 700; color: #10b981;" id="cable-to-name">-</div>
              <div style="font-size: 10px; color: #cbd5e1; font-family: monospace;" id="cable-to-pin">-</div>
            </div>
          </div>
          <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(71, 85, 105, 0.4); padding-top: 6px;">
            <span style="font-size: 10px; color: #94a3b8;">Uzunlik:</span>
            <span style="font-size: 11px; font-weight: 700; color: #f8fafc; font-family: monospace;" id="cable-inspector-length">- mm</span>
          </div>
        </div>

        <!-- Swap Endpoints Button -->
        <button class="btn" style="width: 100%; justify-content: center; margin-bottom: 10px; font-size: 11px;" onclick="window.DroneViewerApp && window.DroneViewerApp.swapSelectedCableEndpoints()">
          ⇄ Uchlarini almashtirish (Swap Endpoints)
        </button>

        <!-- Cable Color Picker -->
        <div class="control-row">
          <div class="control-label">
            <span>🎨 Kabel Rangi</span>
            <span style="color: #64748b; font-size: 9px;" id="cable-color-label">Standart</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <div id="cable-color-preview" style="width: 26px; height: 26px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.3); background-color: #0284c7; flex-shrink: 0;"></div>
            <input type="color" id="inp-cable-color" style="flex: 1; height: 28px; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(71, 85, 105, 0.8); border-radius: 6px; cursor: pointer; padding: 2px;" onchange="window.DroneViewerApp && window.DroneViewerApp.onCableColorChange(this.value)">
          </div>
          <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; margin-bottom: 10px;">
            <button class="color-preset-btn" style="background-color: #38bdf8;" onclick="window.DroneViewerApp && window.DroneViewerApp.onCableColorChange('#38bdf8')" title="CAN (#38bdf8)"></button>
            <button class="color-preset-btn" style="background-color: #ef4444;" onclick="window.DroneViewerApp && window.DroneViewerApp.onCableColorChange('#ef4444')" title="Power (#ef4444)"></button>
            <button class="color-preset-btn" style="background-color: #facc15;" onclick="window.DroneViewerApp && window.DroneViewerApp.onCableColorChange('#facc15')" title="UART (#facc15)"></button>
            <button class="color-preset-btn" style="background-color: #10b981;" onclick="window.DroneViewerApp && window.DroneViewerApp.onCableColorChange('#10b981')" title="Ethernet (#10b981)"></button>
            <button class="color-preset-btn" style="background-color: #a855f7;" onclick="window.DroneViewerApp && window.DroneViewerApp.onCableColorChange('#a855f7')" title="Ribbon (#a855f7)"></button>
            <button class="color-preset-btn" style="background-color: #f97316;" onclick="window.DroneViewerApp && window.DroneViewerApp.onCableColorChange('#f97316')" title="PWM (#f97316)"></button>
          </div>
        </div>

        <!-- Breakout / Multi-Strand Pin Mapping Section (CRUCIAL USER REQUEST) -->
        <div style="background: rgba(14, 165, 233, 0.05); border: 1px solid rgba(14, 165, 233, 0.3); border-radius: 8px; padding: 10px; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <div style="font-size: 11px; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 4px;">
              <span>🌿</span> Ko‘p Tarmoqli Pinlar Taqsimoti
            </div>
            <label class="checkbox-row" style="margin-bottom: 0;">
              <input type="checkbox" id="check-cable-breakout" onchange="window.DroneViewerApp && window.DroneViewerApp.toggleCableBreakout(this.checked)"> Yoqish
            </label>
          </div>
          <div style="font-size: 9px; color: #94a3b8; margin-bottom: 8px;">
            Bir kabeldan bir nechta turli pinlarga tarmoqlanuvchi ulanish (har bir sim alohida pinga ulanadi).
          </div>

          <div id="cable-breakout-details" style="display: none;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
              <div>
                <label style="font-size: 9px; color: #94a3b8; display: block; margin-bottom: 2px;">Rejim</label>
                <select class="form-select" style="margin-bottom: 0;" id="select-cable-breakout-mode" onchange="window.DroneViewerApp && window.DroneViewerApp.setCableBreakoutMode(this.value)">
                  <option value="1-to-N">1-to-N (1 ta ➔ ko‘p)</option>
                  <option value="N-to-1">N-to-1 (ko‘p ➔ 1 ta)</option>
                  <option value="N-to-N">N-to-N (ko‘p ➔ ko‘p)</option>
                </select>
              </div>
              <div>
                <label style="font-size: 9px; color: #94a3b8; display: block; margin-bottom: 2px;">Tarmoqlar soni</label>
                <select class="form-select" style="margin-bottom: 0;" id="select-cable-strand-count" onchange="window.DroneViewerApp && window.DroneViewerApp.setCableStrandCount(parseInt(this.value, 10))">
                  <option value="2">2 ta sim</option>
                  <option value="3">3 ta sim</option>
                  <option value="4">4 ta sim</option>
                  <option value="5">5 ta sim</option>
                  <option value="6">6 ta sim</option>
                  <option value="8">8 ta sim</option>
                </select>
              </div>
            </div>

            <button class="btn" style="width: 100%; justify-content: center; font-size: 10px; padding: 4px; margin-bottom: 8px; background: rgba(14, 165, 233, 0.15); border-color: #0284c7; color: #38bdf8;" onclick="window.DroneViewerApp && window.DroneViewerApp.autoDistributeCablePins()">
              ⚡ Pinlarni avtomatik taqsimlash
            </button>

            <!-- Dynamic per-strand pin mapping rows -->
            <div id="cable-strands-list-container" style="max-height: 180px; overflow-y: auto;"></div>
          </div>
        </div>

        <!-- Delete Cable Button -->
        <button class="btn btn-danger" style="width: 100%; justify-content: center;" onclick="window.DroneViewerApp && window.DroneViewerApp.deleteSelectedCable()">
          🗑 Kabelni O‘chirish
        </button>
      </div>
    </div>

    <!-- Right Sidebar with Tabs -->
    <div class="sidebar">
      <div class="sidebar-tabs">
        <button class="sidebar-tab-btn active" onclick="window.DroneViewerApp && window.DroneViewerApp.switchTab('components')">📦 Elementlar</button>
        <button class="sidebar-tab-btn" onclick="window.DroneViewerApp && window.DroneViewerApp.switchTab('cables')">⚡ Kabellar</button>
        <button class="sidebar-tab-btn" onclick="window.DroneViewerApp && window.DroneViewerApp.switchTab('pins')">📍 Pinlar</button>
        <button class="sidebar-tab-btn" onclick="window.DroneViewerApp && window.DroneViewerApp.switchTab('settings')">⚙️ Sozlama</button>
      </div>

      <!-- Tab 1: Components List -->
      <div class="sidebar-tab-content active" id="tab-components">
        <div style="margin-bottom: 8px; display: flex; gap: 6px;">
          <input type="text" placeholder="Qidiruv..." class="form-input" style="margin-bottom: 0;" id="search-components" oninput="window.DroneViewerApp && window.DroneViewerApp.filterComponents(this.value)">
          <button class="btn btn-success" style="padding: 6px 10px;" onclick="window.DroneViewerApp && window.DroneViewerApp.openCatalogModal()">➕</button>
        </div>
        <div id="sidebar-components-list"></div>
      </div>

      <!-- Tab 2: Cables List & Pin-to-Pin Wiring -->
      <div class="sidebar-tab-content" id="tab-cables">
        <!-- New Cable Pin-to-Pin Adder (In Editor Mode) -->
        <div id="cable-quick-adder" style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 8px; padding: 10px; margin-bottom: 12px;">
          <div style="font-size: 11px; font-weight: 700; color: #38bdf8; margin-bottom: 8px;">🔌 Pin-to-Pin Yangi Kabel Ulash</div>
          
          <label style="font-size: 10px; color: #94a3b8; display: block; margin-bottom: 2px;">Manba (Qayerdan):</label>
          <select id="new-cable-from" class="form-select" onchange="window.DroneViewerApp && window.DroneViewerApp.onCableSourceChanged()"></select>
          
          <label style="font-size: 10px; color: #38bdf8; display: block; margin-bottom: 2px;">Manba Pini (Port):</label>
          <select id="new-cable-from-pin" class="form-select"></select>

          <label style="font-size: 10px; color: #94a3b8; display: block; margin-bottom: 2px; margin-top: 4px;">Qabul qiluvchi (Qayerga):</label>
          <select id="new-cable-to" class="form-select" onchange="window.DroneViewerApp && window.DroneViewerApp.onCableTargetChanged()"></select>

          <label style="font-size: 10px; color: #38bdf8; display: block; margin-bottom: 2px;">Qabul qiluvchi Pini (Port):</label>
          <select id="new-cable-to-pin" class="form-select"></select>

          <label style="font-size: 10px; color: #94a3b8; display: block; margin-bottom: 2px; margin-top: 4px;">Kabel turi:</label>
          <select id="new-cable-type" class="form-select">
            <option value="CAN">CAN Bus (Here3, DronCAN, Sensorlar)</option>
            <option value="Power">Power (Elektr ta'minoti 5V/12V/24V)</option>
            <option value="UART">UART / Telemetriya (HM30, Radio)</option>
            <option value="PWM">PWM / Servo signallari</option>
            <option value="Ethernet">Ethernet / RJ45 (Gimbal, Switch)</option>
            <option value="Airspeed">Airspeed (Silikon havo naychasi)</option>
            <option value="Ribbon">Lentali ko‘p tomirli kabel</option>
          </select>
          
          <label class="checkbox-row">
            <input type="checkbox" id="new-cable-is-ribbon"> Lentali kabel (Ribbon ko‘p tomirli)
          </label>

          <button class="btn btn-primary" style="width: 100%; justify-content: center; padding: 8px 12px; font-weight: 600;" onclick="window.DroneViewerApp && window.DroneViewerApp.createCableFromUI()">
            Ulash (Pinlarni bog‘lash)
          </button>
        </div>

        <div id="sidebar-cables-list"></div>
      </div>

      <!-- Tab 3: Pin Definitions List -->
      <div class="sidebar-tab-content" id="tab-pins">
        <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px;">
          Sahnadagi barcha avionika modullarining elektr pinlari:
        </div>
        <div id="sidebar-pins-summary-list"></div>
      </div>

      <!-- Tab 4: Drone Settings -->
      <div class="sidebar-tab-content" id="tab-settings">
        <div class="control-row">
          <div class="control-label">Dron shaffofligi</div>
          <input type="range" min="0.05" max="1" step="0.05" value="0.45" style="width: 100%; accent-color: #0284c7;" oninput="window.DroneViewerApp && window.DroneViewerApp.setDroneOpacity(parseFloat(this.value))">
        </div>
        <div class="control-row">
          <div class="control-label">Dron rangi</div>
          <select class="form-select" onchange="window.DroneViewerApp && window.DroneViewerApp.setDroneColor(this.value)">
            <option value="original">Asl 3D ranglar</option>
            <option value="#0f172a">Carbon Qora (#0f172a)</option>
            <option value="#0284c7">Avia Moviy (#0284c7)</option>
            <option value="#f97316">Signal Zarg‘aldoq (#f97316)</option>
            <option value="#ffffff">Oq kompozit (#ffffff)</option>
          </select>
        </div>
        <div class="control-row">
          <label class="checkbox-row">
            <input type="checkbox" onchange="window.DroneViewerApp && window.DroneViewerApp.toggleWireframe()"> Karkas (Wireframe) rejimi
          </label>
          <label class="checkbox-row">
            <input type="checkbox" checked onchange="window.DroneViewerApp && window.DroneViewerApp.toggleGrid()"> Koordinatalar to‘ri (Grid)
          </label>
          <label class="checkbox-row">
            <input type="checkbox" checked id="check-show-pins" onchange="window.DroneViewerApp && window.DroneViewerApp.togglePins()"> Barcha elektr pinlarni ko‘rsatish
          </label>
        </div>
      </div>
    </div>

    <!-- Component Catalog Modal -->
    <div id="catalog-modal">
      <div class="modal-card">
        <div class="modal-header">
          <h3>📦 Avionika Modullari Kutubxonasi</h3>
          <button class="btn" style="padding: 2px 6px;" onclick="window.DroneViewerApp && window.DroneViewerApp.closeCatalogModal()">✕</button>
        </div>
        <div class="modal-body" id="catalog-items-grid"></div>
      </div>
    </div>

  </div>

  <!-- 1. Offline Project Data (embedded script tag: zero CORS issues on file:///) -->
  <script src="data/project_data.js"></script>

  <!-- 2. Standalone Three.js Viewer & Editor Engine -->
  <script src="libs/viewer-engine.min.js"></script>
</body>
</html>
`;
}
