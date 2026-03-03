function getFloatingButtonCSS() {
  return `
    .yh-fab-wrapper {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .yh-fab {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: #222222;
      box-shadow: 0 2px 10px rgba(0,0,0,0.4);
      cursor: grab;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.55;
      transition: opacity 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
      padding: 0;
      outline: none;
      user-select: none;
      -webkit-user-select: none;
    }
    .yh-fab:hover {
      opacity: 1;
      transform: scale(1.08);
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    }
    .yh-fab.active {
      opacity: 1;
      box-shadow: 0 0 0 2px #8ab4f8, 0 4px 16px rgba(0,0,0,0.5);
    }
    .yh-fab-icon {
      width: 22px;
      height: 22px;
      object-fit: contain;
      pointer-events: none;
    }

    /* Mini Panel */
    .yh-panel {
      position: absolute;
      bottom: 52px;
      right: 0;
      width: 280px;
      background: #222222;
      border: 1px solid #3a3a3a;
      border-radius: 10px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      color: #ebebeb;
      transform: scale(0.92) translateY(8px);
      opacity: 0;
      pointer-events: none;
      transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
      transform-origin: bottom right;
    }
    .yh-panel.open {
      transform: scale(1) translateY(0);
      opacity: 1;
      pointer-events: auto;
    }

    .yh-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px 10px;
      border-bottom: 1px solid #3a3a3a;
    }
    .yh-panel-branding {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .yh-panel-logo {
      width: 18px;
      height: 18px;
      object-fit: contain;
    }
    .yh-panel-title {
      font-weight: 700;
      font-size: 14px;
      background: linear-gradient(135deg, #8ab4f8, #6ba3ff);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .yh-panel-close {
      cursor: pointer;
      color: #aaa;
      font-size: 14px;
      font-weight: bold;
      line-height: 1;
      padding: 2px 4px;
      border-radius: 4px;
      transition: color 0.15s, background 0.15s;
    }
    .yh-panel-close:hover {
      color: #fff;
      background: #3a3a3a;
    }

    .yh-panel-body {
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .yh-panel-group {
      background: #2a2a2a;
      border-radius: 6px;
    }
    .yh-panel-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      cursor: pointer;
      transition: background 0.15s;
      position: relative;
    }
    .yh-panel-row:hover {
      background: #313131;
    }
    .yh-panel-label-wrap {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .yh-panel-label {
      font-size: 13px;
      font-weight: 500;
      color: #fff;
    }
    .yh-info-wrap {
      position: static;
      display: inline-flex;
      align-items: center;
      height: 13px;
    }
    .yh-info-icon {
      width: 13px;
      height: 13px;
      color: #666;
      cursor: help;
      transition: color 0.15s;
      flex-shrink: 0;
      display: block;
    }
    .yh-info-wrap:hover .yh-info-icon {
      color: #aaa;
    }
    .yh-tooltip {
      visibility: hidden;
      opacity: 0;
      position: absolute;
      bottom: calc(100% + 4px);
      left: 10px;
      right: 10px;
      width: auto;
      background: #333;
      color: #ddd;
      font-size: 11px;
      font-weight: 400;
      line-height: 1.4;
      padding: 6px 10px;
      border-radius: 4px;
      white-space: normal;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      pointer-events: none;
      transition: opacity 0.15s, visibility 0.15s;
      z-index: 10;
    }
    .yh-tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      right: 20px;
      border-width: 4px;
      border-style: solid;
      border-color: #333 transparent transparent transparent;
    }
    .yh-info-wrap:hover .yh-tooltip {
      visibility: visible;
      opacity: 1;
    }
    .yh-panel-slider-row {
      padding: 4px 10px 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .yh-panel-sublabel {
      font-size: 10px;
      font-weight: 600;
      color: #95c4f5;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .yh-panel-slider-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .yh-panel-slider {
      flex: 1;
      height: 3px;
      border-radius: 2px;
      background: #4a4a4a;
      outline: none;
      -webkit-appearance: none;
      appearance: none;
      cursor: pointer;
    }
    .yh-panel-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #ebebeb;
      cursor: pointer;
    }
    .yh-panel-slider::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #ebebeb;
      cursor: pointer;
      border: none;
    }
    .yh-panel-slider-val {
      font-size: 13px;
      font-weight: 600;
      color: #fff;
      min-width: 36px;
      text-align: right;
    }

    /* Toggle */
    .yh-toggle {
      position: relative;
      width: 32px;
      height: 18px;
      flex-shrink: 0;
    }
    .yh-toggle input {
      opacity: 0;
      width: 0;
      height: 0;
      position: absolute;
    }
    .yh-toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: #4a4a4a;
      border-radius: 20px;
      transition: background 0.25s;
    }
    .yh-toggle-slider::before {
      content: "";
      position: absolute;
      height: 12px;
      width: 12px;
      left: 3px;
      bottom: 3px;
      background-color: #ebebeb;
      border-radius: 50%;
      transition: transform 0.25s;
    }
    .yh-toggle input:checked + .yh-toggle-slider {
      background-color: #10b981;
    }
    .yh-toggle input:checked + .yh-toggle-slider::before {
      transform: translateX(14px);
    }

    .yh-date-slider-row .yh-panel-slider-wrap {
      border: 1px solid transparent;
      border-radius: 6px;
      padding: 4px 6px;
    }
    .yh-date-slider-row.yh-date-overlap .yh-panel-slider-wrap {
      border-color: rgba(239, 68, 68, 0.5);
    }
    .yh-date-overlap-warning {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 4px 10px;
      margin: 0 10px 4px;
      border-radius: 4px;
      background-color: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.35);
    }
    .yh-date-overlap-warning svg {
      color: #ef4444;
      flex-shrink: 0;
    }
    .yh-date-overlap-warning span {
      font-size: 10px;
      font-weight: 500;
      color: #ef4444;
      line-height: 1.2;
    }

    .yh-panel-footer {
      padding: 6px 14px 14px;
      border-top: 1px solid #3a3a3a;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .yh-panel-link {
      font-size: 12px;
      color: #8ab4f8;
      text-decoration: none;
      cursor: pointer;
      padding: 2px 0;
      transition: color 0.15s;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .yh-external-icon {
      width: 11px;
      height: 11px;
      flex-shrink: 0;
    }
    .yh-panel-link:hover {
      color: #aac8ff;
      text-decoration: underline;
    }
    .yh-panel-hide-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      padding: 7px 0;
      margin-top: 4px;
      font-size: 12px;
      font-weight: 500;
      color: #ccc;
      background: #333;
      border: 1px solid #4a4a4a;
      border-radius: 6px;
      text-decoration: none;
      cursor: pointer;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }
    .yh-panel-hide-btn:hover {
      background: #3f3f3f;
      color: #fff;
      border-color: #666;
    }
    .yh-hide-icon {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }

    .yh-mode-switch {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .yh-mode-label {
      font-size: 11px;
      color: #9aa0a6;
      flex-shrink: 0;
    }
  `;
}
