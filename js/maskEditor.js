import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

let lastBrushSize = 50; // Remember brush size across panels

// === Mask Editor Node Constants ===
const MASK_EDITOR_NODE_DEFAULT_WIDTH = 300;
const MASK_EDITOR_NODE_DEFAULT_HEIGHT = 300;
const MASK_EDITOR_PANEL_POSITION_MODE = "side"; // "side" for left/right, "vertical" for top/bottom

// Creates the editor panel
function createEditorPanel(node, imageSrc, callback, maskSrc = null) {
  // Before creating the panel, remove any existing panel with the same ID
  document.querySelectorAll('#crz-mask-editor-panel').forEach(panel => panel.remove());
  const panel = document.createElement("div");
  panel.id = "crz-mask-editor-panel";
  panel.innerHTML = `
    <div class="crz-mask-editor-panel-content">
      <div id="crz-mask-editor-panel-body">
        <canvas id="crz-mask-panel-canvas"></canvas>
      </div>
     <div id="crz-mask-editor-panel-footer">
         <button id="crz-mask-editor-panel-clear-btn" class="crz-mask-editor-panel-clear-btn">Clear Mask</button>
         <button id="crz-mask-editor-panel-close-btn">&times;</button>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  const canvas = panel.querySelector("#crz-mask-panel-canvas");
  const ctx = canvas.getContext("2d");
  const image = new Image();

  // Create a drawing canvas on top
  const drawCanvas = document.createElement('canvas');
  const drawCtx = drawCanvas.getContext('2d');
  let isDrawing = false;
  let isErasing = false;
  let lastX = 0;
  let lastY = 0;
  
  // Create a preview canvas for brush size
  const previewCanvas = document.createElement('canvas');
  const previewCtx = previewCanvas.getContext('2d');

  // Remove panel brush slider UI and rely on wheel for sizing
  const brushSizeSlider = null;
  let brushSize = lastBrushSize;

  image.onload = () => {
    // Limit panel size for performance and usability
    const max_width = 500;
    const scale = max_width / image.width;
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;
    drawCanvas.width = canvas.width;
    drawCanvas.height = canvas.height;
    
    previewCanvas.width = canvas.width;
    previewCanvas.height = canvas.height;

    canvas.parentElement.style.position = 'relative';
    drawCanvas.style.position = 'absolute';
    drawCanvas.style.left = '0px';
    drawCanvas.style.top = '0px';
    canvas.parentElement.appendChild(drawCanvas);

    // Position preview canvas
    previewCanvas.style.position = 'absolute';
    previewCanvas.style.left = '0px';
    previewCanvas.style.top = '0px';
    previewCanvas.style.cursor = 'crosshair';
    canvas.parentElement.appendChild(previewCanvas);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // If a maskSrc is provided, load and draw it onto drawCanvas
    if (maskSrc) {
      const maskImg = new Image();
      maskImg.onload = () => {
        // Clear the drawCanvas before drawing the mask
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        // Draw the mask at the same scale as the drawCanvas, fully opaque
        drawCtx.drawImage(maskImg, 0, 0, drawCanvas.width, drawCanvas.height);
        // After drawing, update the preview overlay
        updateMaskPreview();
      };
      maskImg.src = maskSrc;
    } else {
      // If no mask, just update preview
      updateMaskPreview();
    }
  };
  image.src = imageSrc;

  // Function to update the preview overlay with a semi-transparent mask
  function updateMaskPreview() {
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    // Always draw the image as the base layer
    previewCtx.drawImage(canvas, 0, 0);
    // Draw the mask as a semi-transparent overlay
    previewCtx.save();
    previewCtx.globalAlpha = 0.5; // 50% opacity for preview
    previewCtx.drawImage(drawCanvas, 0, 0);
    previewCtx.globalAlpha = 1.0;
    previewCtx.restore();
  }

  function updateBrushPreview(e) {
    updateMaskPreview();
    previewCtx.beginPath();
    previewCtx.arc(e.offsetX, e.offsetY, brushSize / 2, 0, 2 * Math.PI);
    previewCtx.strokeStyle = 'rgba(255, 255, 255, 1)';
    previewCtx.lineWidth = 1;
    previewCtx.stroke();
  }

  function draw(e) {
    if (!isDrawing) return;
    drawCtx.strokeStyle = isErasing ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 1)';
    drawCtx.lineJoin = 'round';
    drawCtx.lineCap = 'round';
    drawCtx.lineWidth = brushSize;

    drawCtx.beginPath();
    drawCtx.moveTo(lastX, lastY);
    drawCtx.lineTo(e.offsetX, e.offsetY);
    drawCtx.stroke();
    [lastX, lastY] = [e.offsetX, e.offsetY];
    updateMaskPreview();
  }

  function stopDrawing() {
    isDrawing = false;
    updateMaskPreview();
    window.removeEventListener('mouseup', stopDrawing);
    window.removeEventListener('mousemove', windowDrawMove);
  }

  function windowDrawMove(e) {
    // Convert window mouse coordinates to canvas coordinates
    const rect = previewCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Only draw if inside canvas bounds
    if (x >= 0 && y >= 0 && x < previewCanvas.width && y < previewCanvas.height) {
      draw({ offsetX: x, offsetY: y });
      updateBrushPreview({ offsetX: x, offsetY: y });
    } else {
      draw({ offsetX: x, offsetY: y }); // Allow drawing off edge for smooth finish
      updateMaskPreview();
    }
  }

  previewCanvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    isErasing = (e.button === 2); // Right mouse button = erase
    [lastX, lastY] = [e.offsetX, e.offsetY];
    window.addEventListener('mouseup', stopDrawing);
    window.addEventListener('mousemove', windowDrawMove);
  });
  // Only use canvas mousemove for brush preview when not drawing
  previewCanvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) updateBrushPreview(e);
  });
  // No longer stop drawing on mouseleave; only stop on mouseup (anywhere)
  previewCanvas.addEventListener('mouseleave', () => {
    if (!isDrawing) updateMaskPreview();
  });
  // Block right-click context menu on previewCanvas
  previewCanvas.addEventListener('contextmenu', (e) => e.preventDefault());

  previewCanvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    let newBrushSize;
    if (e.deltaY < 0) {
      newBrushSize = Math.min(200, parseInt(brushSize) + 5);
    } else {
      newBrushSize = Math.max(1, parseInt(brushSize) - 5);
    }
    brushSize = newBrushSize;
    lastBrushSize = brushSize;
    updateBrushPreview(e);
  });

  // Refactored mask saving logic
  async function saveMaskAndClose() {
    // Create a full-resolution mask canvas
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = image.width;
    maskCanvas.height = image.height;
    const maskCtx = maskCanvas.getContext('2d');
    
    maskCtx.fillStyle = 'black';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    
    // Scale the drawing up to the original image size
    const scale = image.width / drawCanvas.width;
    maskCtx.save();
    maskCtx.scale(scale, scale);
    maskCtx.drawImage(drawCanvas, 0, 0);
    maskCtx.restore();

    return new Promise((resolve) => {
      maskCanvas.toBlob(async (blob) => {
        const uniqueName = `mask_${Date.now()}.png`;
        const formData = new FormData();
        formData.append('image', blob, uniqueName);
        formData.append('overwrite', 'true');
        formData.append('type', 'input');
        const resp = await api.fetchApi("/upload/image", { method: "POST", body: formData });
        const data = await resp.json();
        callback(data.name || uniqueName);
        // Mark node and output as dirty so ComfyUI re-runs the workflow
        if (node.setDirty) node.setDirty();
        if (node.setDirtyOutput) node.setDirtyOutput(true);
        app.graph.setDirtyCanvas(true, true);
        if (panel._moveCheckInterval) {
          clearInterval(panel._moveCheckInterval);
          panel._moveCheckInterval = null;
        }
        panel.remove();
        node.editorPanel = null;
        resolve();
      });
    });
  }

  panel.querySelector("#crz-mask-editor-panel-close-btn").onclick = () => {
    if (panel._moveCheckInterval) {
      clearInterval(panel._moveCheckInterval);
      panel._moveCheckInterval = null;
    }
    saveMaskAndClose();
  };

  // Add clear mask button logic
  panel.querySelector("#crz-mask-editor-panel-clear-btn").onclick = () => {
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    updateMaskPreview();
  };

  // Attach saveMaskAndClose to the panel for access in onDeselected
  panel.saveMaskAndClose = saveMaskAndClose;

  return panel;
}

// Function to update the panel's position
function updatePanelPosition(node, panel) {
    const canvasRect = app.canvas.canvas.getBoundingClientRect();
    const nodeBounding = node.getBounding();

    const panelStyle = window.getComputedStyle(panel);
    const panelWidth = parseFloat(panelStyle.width);
    const panelHeight = parseFloat(panelStyle.height);

    // Get pan/offset and zoom/scale
    const offset = app.canvas.ds.state.offset; // [x, y]
    const scale = app.canvas.ds.state.scale;   // number

    // Node position in graph space
    const nodeRightX = nodeBounding[0] + nodeBounding[2];
    const nodeLeftX = nodeBounding[0];
    const nodeCenterY = nodeBounding[1] + nodeBounding[3] / 2;
    const nodeCenterX = nodeBounding[0] + nodeBounding[2] / 2;
    const nodeBottomY = nodeBounding[1] + nodeBounding[3];

    let left, top;
    if (MASK_EDITOR_PANEL_POSITION_MODE === "side") {
        // Side (left/right) positioning
        left = canvasRect.left + (nodeRightX + offset[0]) * scale + 10; // right of node
        top = canvasRect.top + (nodeCenterY + offset[1]) * scale - panelHeight / 2;
        // If not enough space on the right, put it to the left
        if (left + panelWidth > canvasRect.right) {
            left = canvasRect.left + (nodeLeftX + offset[0]) * scale - panelWidth - 10;
        }
        // Clamp to canvas
        if (left < canvasRect.left) left = canvasRect.left;
        if (top < canvasRect.top) top = canvasRect.top;
        if (top + panelHeight > canvasRect.bottom) top = canvasRect.bottom - panelHeight;
    } else {
        // Vertical (top/bottom) positioning
        left = canvasRect.left + (nodeCenterX + offset[0]) * scale - panelWidth / 2;
        top = canvasRect.top + (nodeBottomY + offset[1]) * scale + 10;
        // If panel would go below canvas, position it above the node instead
        if (top + panelHeight > canvasRect.bottom) {
            top = canvasRect.top + (nodeBounding[1] + offset[1]) * scale - panelHeight - 10;
        }
        // Clamp to canvas
        if (left < canvasRect.left) left = canvasRect.left;
        if (top < canvasRect.top) top = canvasRect.top;
        if (left + panelWidth > canvasRect.right) left = canvasRect.right - panelWidth;
    }

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
}


// Inject CSS for the panel
const style = document.createElement('style');
style.textContent = `
  #crz-mask-editor-panel {
    position: absolute;
    z-index: 1000;
    background-color: #222222;
    border: 1px solid #7a38c5;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  #crz-mask-editor-panel-body {
    text-align: center;
  }
  #crz-mask-panel-canvas {
    border: 0px solid #000000;
    border-radius: 4px;
    background-color: #000;
  }
  #crz-mask-editor-panel-footer { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    gap: 10px;
  }
  .crz-mask-editor-brush-controls { 
    display: flex; 
    align-items: center; 
    gap: 5px; 
    color: #e2e2e2;
  }
  #crz-mask-editor-panel-close-btn, #crz-mask-editor-panel-save-btn {
    padding: 5px 10px;
    border-radius: 4px;
    border: 1px solid #666666;
    background-color: #444444;
    color: #e2e2e2;
    cursor: pointer;
  }
  #crz-mask-editor-panel-close-btn:hover, #crz-mask-editor-panel-save-btn:hover {
    background-color: #555555;
  }
  .crz-mask-editor-panel-clear-btn {
    padding: 5px 10px;
    border-radius: 4px;
    border: 1px solid #686868;
    background-color: #424242;
    color: #fff;
    font-weight: bold;
    cursor: pointer;
    margin-right: 8px;
  }
  .crz-mask-editor-panel-clear-btn:hover {
    background-color: #c23535;
    border-color: #b83535;
  }
`;
document.head.appendChild(style);


app.registerExtension({
  name: "CRZ.CRZMaskEditor",
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    if (nodeData.name === "CRZMaskEditor") {
      // If inline mode is enabled, skip legacy popup implementation entirely
      if (typeof window !== 'undefined' && window.CRZ_MASK_INLINE === true) return;
      
      const onNodeCreated = nodeType.prototype.onNodeCreated;
      nodeType.prototype.onNodeCreated = function () {
        onNodeCreated?.apply(this, arguments);

        this.widgets = this.widgets || [];

        // Remove the old button widget if it exists from a previous version
        const buttonWidget = this.widgets.find(w => w.name === "Edit Mask");
        if(buttonWidget) this.widgets.splice(this.widgets.indexOf(buttonWidget), 1);

        // Hidden widget to store the uploaded mask path (do not consume vertical space)
        if (!this.widgets.find(w => w.name === "mask_path")) {
            const hiddenW = this.addCustomWidget({ name: "mask_path", type: "hidden", value: "", draw: () => {} });
            if (hiddenW) {
              hiddenW.hidden = true;
              hiddenW.height = 0;
              hiddenW.computeSize = () => [0, 0];
            }
        }

        // Set initial node size and make resizable
        this.size = [MASK_EDITOR_NODE_DEFAULT_WIDTH, MASK_EDITOR_NODE_DEFAULT_HEIGHT];
        this.resizable = false;
        // Clamp minimum size to constants only; do not depend on current size
        this.computeSize = function() {
          return [MASK_EDITOR_NODE_DEFAULT_WIDTH, MASK_EDITOR_NODE_DEFAULT_HEIGHT];
        };

        // --- Mask preview logic ---
        this.maskPreviewImg = null;
        this.maskPreviewUrl = null;
        this.updateMaskPreview = () => {
          const maskPathWidget = this.widgets.find(w => w.name === "mask_path");
          if (maskPathWidget && maskPathWidget.value) {
            // Clean up old URL
            if (this.maskPreviewUrl) {
              URL.revokeObjectURL(this.maskPreviewUrl);
              this.maskPreviewUrl = null;
            }
            // Load the mask image as a blob for preview
            fetch(api.apiURL(`/view?filename=${encodeURIComponent(maskPathWidget.value)}&type=input&subfolder=`))
              .then(resp => resp.blob())
              .then(blob => {
                this.maskPreviewUrl = URL.createObjectURL(blob);
                const img = new window.Image();
                img.onload = () => {
                  this.maskPreviewImg = img;
                  app.graph.setDirtyCanvas(true, true);
                };
                img.src = this.maskPreviewUrl;
              });
          } else {
            this.maskPreviewImg = null;
            if (this.maskPreviewUrl) {
              URL.revokeObjectURL(this.maskPreviewUrl);
              this.maskPreviewUrl = null;
            }
            app.graph.setDirtyCanvas(true, true);
          }
        };
        // Initial preview load
        this.updateMaskPreview();

        // --- Single polling interval for input link changes and node movement ---
        let lastInputLink = this.inputs[0] ? this.inputs[0].link : null;
        let lastNodePos = [this.pos[0], this.pos[1]];
        let moveStoppedTimeout = null;
        let panelWasOpenBeforeMove = false;

        // Flag to distinguish initial load from user action
        this._crz_is_loading = true;
        setTimeout(() => { this._crz_is_loading = false; }, 500);

        setInterval(() => {
          // --- Input link change ---
          const currentLink = this.inputs[0] ? this.inputs[0].link : null;
          if (currentLink !== lastInputLink) {
            lastInputLink = currentLink;
            if (currentLink) {
              // Clear previous mask
              const maskPathWidget = this.widgets.find(w => w.name === "mask_path");
              if (maskPathWidget) maskPathWidget.value = "";
              this.updateMaskPreview && this.updateMaskPreview();
              if (this.editorPanel) {
                this.editorPanel.remove();
                this.editorPanel = null;
              }
              // Only open panel if not during initial load
              if (!this._crz_is_loading) {
                this.onSelected && this.onSelected();
                if (app && app.canvas && typeof app.canvas.selectNode === 'function') {
                  app.canvas.selectNode(this, true);
                }
              }
            }
          }

          // --- Node movement ---
          const currentPos = [this.pos[0], this.pos[1]];
          if (currentPos[0] !== lastNodePos[0] || currentPos[1] !== lastNodePos[1]) {
            // Node is moving
            if (this.editorPanel) {
              this.editorPanel.remove();
              this.editorPanel = null;
              panelWasOpenBeforeMove = true;
            }
            // Reset the move stopped timer
            if (moveStoppedTimeout) clearTimeout(moveStoppedTimeout);
            // Store the position at the start of the timer
            const posAtTimeoutStart = [...currentPos];
            moveStoppedTimeout = setTimeout(() => {
              // Only reopen if the position hasn't changed since the timer started
              if (this.pos[0] === posAtTimeoutStart[0] && this.pos[1] === posAtTimeoutStart[1] && panelWasOpenBeforeMove) {
                panelWasOpenBeforeMove = false;
                this.onSelected && this.onSelected();
              }
            }, 200);
          }
          lastNodePos = [...currentPos];
        }, 100);
      };

      // When the node is selected, create and show the editor panel
      nodeType.prototype.onSelected = function() {
        if (app && app.canvas) {
          const sel = app.canvas.selected_nodes;
          // Allow if no selection info, or if only this node is selected
          if (sel && Object.keys(sel).length > 0) {
            const keys = Object.keys(sel);
            const idStr = String(this.id);
            const idNum = typeof this.id === 'number' ? this.id : parseInt(this.id);
            if (!(keys.length === 1 && (keys[0] === idStr || keys[0] == idNum))) {
              return;
            }
          }
        }
        if (this._crz_panel_closed_by_move) {
          this._crz_panel_closed_by_move = false;
          return;
        }
        // Remove all panels with the same ID from the DOM
        document.querySelectorAll('#crz-mask-editor-panel').forEach(panel => panel.remove());
        this.editorPanel = null;

        const inputLink = this.inputs[0].link;
        if (!inputLink) return;

        const link = app.graph.links[inputLink];
        const originNode = app.graph.getNodeById(link.origin_id);
        
        let imageSrc = null;
        if (originNode.images && originNode.images.length > 0) {
             const imageName = originNode.images[0].filename;
             const imageType = originNode.images[0].type;
             const subfolder = originNode.images[0].subfolder;
             imageSrc = api.apiURL(`/view?filename=${encodeURIComponent(imageName)}&type=${imageType}&subfolder=${encodeURIComponent(subfolder)}`);
        }
        
        if (!imageSrc) return;

        // Get mask path if it exists
        let maskSrc = null;
        const maskPathWidget = this.widgets.find(w => w.name === "mask_path");
        if (maskPathWidget && maskPathWidget.value) {
          // Assume mask is always type 'input' and subfolder '' (empty) as per upload
          maskSrc = api.apiURL(`/view?filename=${encodeURIComponent(maskPathWidget.value)}&type=input&subfolder=`);
        }

        this.editorPanel = createEditorPanel(this, imageSrc, (maskFilename) => {
            const maskPathWidget = this.widgets.find(w => w.name === "mask_path");
            if(maskPathWidget) maskPathWidget.value = maskFilename;
            // Update mask preview when mask changes
            this.updateMaskPreview && this.updateMaskPreview();
        }, maskSrc);
        updatePanelPosition(this, this.editorPanel);
      };

      // When the node is deselected, remove the panel and save
      nodeType.prototype.onDeselected = function() {
        if (this.editorPanel) {
          // Save before removing
          const panel = this.editorPanel;
          if (panel.saveMaskAndClose) {
            panel.saveMaskAndClose();
          } else {
            panel.remove();
          }
          this.editorPanel = null;
        }
      };

      // When the node is dragged/moved, close the panel
      nodeType.prototype.onDrag = function(event) {
        if (this.editorPanel) {
          this.editorPanel.remove();
          this.editorPanel = null;
        }
      };

      // Keep the panel attached to the node when the graph is moved
      const onDrawForeground = nodeType.prototype.onDrawForeground;
      nodeType.prototype.onDrawForeground = function(ctx) {
        onDrawForeground?.apply(this, arguments);
        if (this.flags && this.flags.collapsed) return;
        if (this.editorPanel) {
            updatePanelPosition(this, this.editorPanel);
        }
        // Draw mask preview thumbnail if available
        if (this.maskPreviewImg) {
          const pad = 8;
          // Calculate y offset: widget heights + padding (title height set to 0)
          let yOffset = pad;
          if (this.widgets && this.widgets.length > 0) {
            yOffset += this.widgets.length * 28;
          }
          // Calculate available width and height for the preview
          const availableW = this.size[0] - pad * 2;
          const availableH = this.size[1] - yOffset - pad;
          // Maintain aspect ratio
          const imgW = this.maskPreviewImg.width;
          const imgH = this.maskPreviewImg.height;
          const scale = Math.min(availableW / imgW, availableH / imgH, 1);
          const w = imgW * scale;
          const h = imgH * scale;
          // Center the preview horizontally
          const x = pad + (availableW - w) / 2;
          // Get blur value from widget
          let blurValue = 0;
          const blurWidget = this.widgets && this.widgets.find(w => w.name === "blur");
          if (blurWidget && typeof blurWidget.value !== 'undefined') {
            blurValue = parseFloat(blurWidget.value) || 0;
          }
          // Apply scaling factor to preview blur
          const previewBlur = blurValue * 0.25; // Adjust this factor as needed
          // Draw blurred mask onto offscreen canvas
          const offscreen = document.createElement('canvas');
          offscreen.width = w;
          offscreen.height = h;
          const offCtx = offscreen.getContext('2d');
          offCtx.filter = `blur(${previewBlur}px)`;
          offCtx.drawImage(this.maskPreviewImg, 0, 0, w, h);
          offCtx.filter = 'none';
          // Draw onto node canvas, clipped to preview rect
          ctx.save();
          ctx.globalAlpha = 1.0;
          ctx.beginPath();
          ctx.rect(x, yOffset, w, h);
          ctx.clip();
          // Draw black background
          ctx.fillStyle = '#000';
          ctx.fillRect(x, yOffset, w, h);
          // Draw blurred mask preview
          ctx.drawImage(offscreen, x, yOffset);
          ctx.restore();
        }
      };

      // Serialize the mask path
      const onSerialize = nodeType.prototype.onSerialize;
      nodeType.prototype.onSerialize = function(o) {
        onSerialize?.apply(this, arguments);
        if (this.widgets) {
            const maskPathWidget = this.widgets.find(w => w.name === "mask_path");
            if (maskPathWidget) {
                o.widgets_values = o.widgets_values || [];
                // Ensure array is long enough
                while(o.widgets_values.length <= this.widgets.indexOf(maskPathWidget)) {
                    o.widgets_values.push(null);
                }
                o.widgets_values[this.widgets.indexOf(maskPathWidget)] = maskPathWidget.value;
                // Update preview if mask_path changes
                this.updateMaskPreview && this.updateMaskPreview();
            }
        }
      };
    }
  },
}); 

// Inline drawing overlay: draw mask directly on the node (no popups)
app.registerExtension({
  name: "CRZ.CRZMaskEditor.Inline",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== "CRZMaskEditor") return;
    // Enable inline mode flag so legacy extension can opt-out
    if (typeof window !== 'undefined') window.CRZ_MASK_INLINE = true;
    // Track last pointer for positioning popovers near cursor
    if (typeof window !== 'undefined' && !window._crz_colorMouseInit) {
      window._crz_colorMouseInit = true;
      const track = (e) => { window._crz_lastPointer = { x: e.clientX, y: e.clientY }; };
      document.addEventListener('pointerdown', track, true);
      document.addEventListener('pointermove', track, true);
    }

    const MIN_W = 320;
    const MIN_H = 240;

    const origOnNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      origOnNodeCreated?.apply(this, arguments);

      // Sizing
      this.size = [Math.max(this.size?.[0] || MIN_W, MIN_W), Math.max(this.size?.[1] || 380, MIN_H)];
      this.resizable = true;
      // Helper to compute visible widget vertical height
      this._crz_calcWidgetsHeight = () => {
        const widgets = this.widgets || [];
        let total = 0;
        for (const w of widgets) {
          const hidden = (w && (w.hidden === true || w.type === 'hidden'));
          if (hidden) continue;
          const h = (typeof w.height === 'number') ? w.height : 28;
          if (h > 0) total += h;
        }
        return total;
      };
      const _CRZ_WIDGET_CANVAS_GAP = 46; // visual gap between widgets and image canvas
      // Ensure the node can be resized down after being enlarged: define a
      // minimum size independent of the current size and content.
      this.computeSize = function() {
        const pad = 8;
        const widgetsHeight = this._crz_calcWidgetsHeight();
        const minHeight = Math.max(MIN_H, widgetsHeight + _CRZ_WIDGET_CANVAS_GAP + 120);
        return [MIN_W, minHeight];
      };

      // State
      this._crz_img = null;
      this._crz_imgW = 0;
      this._crz_imgH = 0;
      this._crz_mask = document.createElement("canvas");
      this._crz_mask_ctx = this._crz_mask.getContext("2d");
      this._crz_isDrawing = false;
      this._crz_isErasing = false; // hold Shift to erase
      this._crz_brush = (typeof window !== 'undefined' && window._crz_lastBrushSize) || 50;
      this._crz_mouse = { x: 0, y: 0, inside: false };
      this._crz_rect = { x: 0, y: 0, w: 0, h: 0 };
      this._crz_hasMask = false;
      this._crz_maskUploadToken = 0;
      this._crz_previewColor = '#ff0000';
      this._crz_opacity = 0.5;
      this._crz_uploadBlackMask = async () => {
        const token = ++this._crz_maskUploadToken;
        const bw = this._crz_imgW || 8;
        const bh = this._crz_imgH || 8;
        const black = document.createElement("canvas");
        black.width = bw; black.height = bh;
        const bctx = black.getContext("2d");
        // Use fully transparent background to represent "no mask"
        bctx.clearRect(0, 0, black.width, black.height);
        await new Promise((resolve) => {
          black.toBlob(async (blob) => {
            const uniqueName = `mask_${Date.now()}_black.png`;
            const formData = new FormData();
            formData.append("image", blob, uniqueName);
            formData.append("overwrite", "true");
            formData.append("type", "input");
            const resp = await api.fetchApi("/upload/image", { method: "POST", body: formData });
            const data = await resp.json();
            // Always set the new black path if this upload is the latest
            if (token !== this._crz_maskUploadToken) { resolve(); return; }
            const name = data.name || uniqueName;
            const maskPathWidget = this.widgets.find(w => w.name === "mask_path");
            if (maskPathWidget) maskPathWidget.value = name;
            if (this.setDirty) this.setDirty();
            if (this.setDirtyOutput) this.setDirtyOutput(true);
            app.graph.setDirtyCanvas(true, true);
            resolve();
          }, "image/png");
        });
      };

      // Ensure hidden mask_path widget exists (no vertical space)
      this.widgets = this.widgets || [];
      if (!this.widgets.find(w => w.name === "mask_path")) {
        const hiddenW = this.addCustomWidget({ name: "mask_path", type: "hidden", value: "", draw: () => {} });
        if (hiddenW) { hiddenW.hidden = true; hiddenW.height = 0; hiddenW.computeSize = () => [0, 0]; }
      }
      // Hidden mask color for persistence (no vertical space)
      if (!this.widgets.find(w => w.name === "mask_color")) {
        const hiddenC = this.addCustomWidget({ name: "mask_color", type: "hidden", value: this._crz_previewColor, draw: () => {} });
        if (hiddenC) { hiddenC.hidden = true; hiddenC.height = 0; hiddenC.computeSize = () => [0, 0]; }
      } else {
        const mc = this.widgets.find(w => w.name === "mask_color");
        if (mc && typeof mc.value === 'string' && mc.value.trim()) this._crz_previewColor = mc.value.trim();
      }

      // Disable legacy preview pipeline on this node completely (avoid stray colored box)
      this.maskPreviewImg = null;
      if (this.maskPreviewUrl) { try { URL.revokeObjectURL(this.maskPreviewUrl); } catch(_){} }
      this.maskPreviewUrl = null;
      this.updateMaskPreview = () => {
        this.maskPreviewImg = null;
        if (this.maskPreviewUrl) { try { URL.revokeObjectURL(this.maskPreviewUrl); } catch(_){} }
        this.maskPreviewUrl = null;
        app.graph.setDirtyCanvas(true, true);
      };

      // Brush widget removed; use mouse wheel over the node to change brush size

      // (swatch removed)

      // Mask Color picker (button opens native <input type="color">)
      const colorWidget = this.addWidget?.('button', 'Mask Color', null);
      if (colorWidget) {
        colorWidget.serialize = false;
        colorWidget.callback = (v, widget) => {
          const picker = document.createElement('input');
          picker.type = 'color';
          picker.value = this._crz_previewColor || '#ff00ff';
          picker.style.position = 'fixed';
          picker.style.zIndex = 1001;
          // Position near mouse pointer if available, otherwise near widget rect
          let px = (window._crz_lastPointer?.x ?? 0) + 8;
          let py = (window._crz_lastPointer?.y ?? 0) + 8;
          if (!window._crz_lastPointer) {
            // Fallback: compute widget position on screen
            try {
              const canvasRect = app.canvas.canvas.getBoundingClientRect();
              const offset = app.canvas.ds.state.offset; // graph pan
              const scale = app.canvas.ds.state.scale;   // zoom
              // Rough y offset for widgets area
              const pad = 8;
              let yOffset = pad + (this.widgets?.indexOf(widget) ?? 0) * 28 + 16;
              const left = canvasRect.left + (this.pos[0] + offset[0]) * scale + 24;
              const top = canvasRect.top + (this.pos[1] + offset[1]) * scale + yOffset;
              px = left; py = top;
            } catch(_){}
          }
          // Replace with hidden off-screen picker to avoid stray swatches
          picker.style.left = '-10000px';
          picker.style.top = '-10000px';
          picker.style.opacity = '0';
          picker.style.pointerEvents = 'none';
          picker.style.width = '1px';
          picker.style.height = '1px';
          document.body.appendChild(picker);
          const cleanup = () => { try { picker.remove(); } catch(_){} };
          picker.addEventListener('input', () => {
            this._crz_previewColor = picker.value;
            const mc = this.widgets.find(w => w.name === 'mask_color');
            if (mc) mc.value = this._crz_previewColor;
            app.graph.setDirtyCanvas(true, true);
          });
          picker.addEventListener('change', cleanup, { once: true });
          picker.addEventListener('blur', cleanup, { once: true });
          if (picker.showPicker) { try { picker.showPicker(); } catch(_) { picker.click(); } }
          else { picker.click(); }
        };
      }

      // Opacity widget
      const opacityWidget = this.addWidget?.('number', 'Mask Opacity', this._crz_opacity, (v, widget, node) => {
        const host = node || this;
        const val = Math.max(0, Math.min(1, Number(v)));
        host._crz_opacity = isFinite(val) ? val : 0.5;
        app.graph.setDirtyCanvas(true, true);
      }, { min: 0, max: 1, step: 0.05 });
      // Force initial sync so displayed value matches the actual drawing opacity
      if (opacityWidget) {
        const initVal = Number(opacityWidget.value);
        if (!isFinite(initVal) || initVal === undefined || initVal === null) {
          opacityWidget.value = this._crz_opacity;
        } else {
          this._crz_opacity = Math.max(0, Math.min(1, initVal));
        }
      }

      // Helper to clear everything
      this._crz_clearAll = async (host) => {
        const n = host || this;
        try { console.log("[CRZMaskEditor] clearAll:start", { nodeId: n.id }); } catch(_){}
        try { n._crz_mask_ctx.clearRect(0, 0, n._crz_mask.width, n._crz_mask.height); } catch(_){}
        n._crz_hasMask = false;
        n._crz_maskUploadToken++;
        const maskPathWidget = n.widgets.find(w => w.name === "mask_path");
        if (maskPathWidget) {
          maskPathWidget.value = "";
          try { console.log("[CRZMaskEditor] mask_path cleared"); } catch(_){}
        }
        // Force black mask upload to overwrite any previous on-disk mask
        await n._crz_uploadBlackMask();
        // Kill any legacy preview assets
        n.maskPreviewImg = null;
        if (n.maskPreviewUrl) { try { URL.revokeObjectURL(n.maskPreviewUrl); } catch(_){} }
        n.maskPreviewUrl = null;
        n.updateMaskPreview && n.updateMaskPreview();
        n.setDirty && n.setDirty();
        n.setDirtyOutput && n.setDirtyOutput(true);
        app.graph.setDirtyCanvas(true, true);
        try { console.log("[CRZMaskEditor] clearAll:done"); } catch(_){}
      };

      // Clear widget
      const clearWidget = this.addWidget?.("button", "Clear Mask", null);
      if (clearWidget) {
        clearWidget.serialize = false;
        clearWidget.callback = async (v, widget, node) => {
          try { console.log("[CRZMaskEditor] Clear button pressed", { nodeId: this.id }); } catch(_){}
          const host = node || this;
          await host._crz_clearAll(host);
        };
      }
      

      // Convert any loaded mask image (which may be black/white RGB) into an alpha mask
      this._crz_importMaskFromImage = (img) => {
        this._crz_syncMaskSize();
        const w = this._crz_mask.width, h = this._crz_mask.height;
        const tmp = document.createElement('canvas');
        tmp.width = w; tmp.height = h;
        const tctx = tmp.getContext('2d');
        tctx.drawImage(img, 0, 0, w, h);
        const id = tctx.getImageData(0, 0, w, h);
        const data = id.data;
        let any = false;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          // Use luminance/max to decide alpha; treat white=mask, black=background
          const lum = Math.max(r, g, b);
          data[i] = 255; data[i+1] = 255; data[i+2] = 255; // white
          data[i+3] = lum; // alpha from brightness
          if (lum > 0) any = true;
        }
        tctx.putImageData(id, 0, 0);
        this._crz_mask_ctx.clearRect(0, 0, w, h);
        this._crz_mask_ctx.drawImage(tmp, 0, 0);
        this._crz_hasMask = any;
      };

      // Load an image for editing. Prefer this node's own output image (if available),
      // then fall back to the upstream origin node image.
      const loadFromInput = () => {
        // Helper to turn a record into a URL
        const toURL = (rec) => api.apiURL(`/view?filename=${encodeURIComponent(rec.filename)}&type=${rec.type}&subfolder=${encodeURIComponent(rec.subfolder)}`);

        // Helper to find a usable image record for this node
        const findRecord = () => {
          // 1) Prefer this node's own images (if backend provided an IMAGE output saved by UI)
          if (this.images && this.images.length > 0) return this.images[0];
          // 2) Direct upstream node images
          const linkId = this.inputs?.[0]?.link ?? null;
          if (!linkId) return null;
          const link = app.graph.links[linkId];
          if (!link) return null;
          const originNode = app.graph.getNodeById(link.origin_id);
          if (originNode?.images?.[0]) return originNode.images[0];
          // 3) Any sibling node (e.g., Preview Image) connected to the same origin/slot that has images
          const originId = link.origin_id; const originSlot = link.origin_slot;
          for (const lid in app.graph.links) {
            const L = app.graph.links[lid];
            if (!L) continue;
            if (L.origin_id === originId && L.origin_slot === originSlot) {
              const tgt = app.graph.getNodeById(L.target_id);
              if (tgt?.images?.[0]) return tgt.images[0];
            }
          }
          return null;
        };

        const rec = findRecord();
        if (!rec) return;

        const url = toURL(rec);
        const img = new Image();
        img.onload = () => {
          this._crz_img = img;
          this._crz_imgW = img.width;
          this._crz_imgH = img.height;
          this._crz_syncMaskSize();
          // try load existing mask_path into mask canvas
          const maskPathWidget = this.widgets.find(w => w.name === "mask_path");
          if (maskPathWidget?.value) {
            const murl = api.apiURL(`/view?filename=${encodeURIComponent(maskPathWidget.value)}&type=input&subfolder=`);
            const m = new Image();
            m.onload = () => {
              this._crz_importMaskFromImage(m);
              app.graph.setDirtyCanvas(true, true);
            };
            m.src = murl;
          } else {
            this._crz_mask_ctx.clearRect(0, 0, this._crz_mask.width, this._crz_mask.height);
            this._crz_hasMask = false;
          }
          app.graph.setDirtyCanvas(true, true);
        };
        img.src = url;
      };

      // poll for input link and image changes (reuses existing interval if any; harmless)
      if (!this._crz_inline_poll) {
        let lastLink = this.inputs?.[0]?.link ?? null;
        let lastImgKey = null;
        this._crz_inline_poll = setInterval(() => {
          const curLink = this.inputs?.[0]?.link ?? null;
          if (curLink !== lastLink) {
            lastLink = curLink;
            if (curLink) {
              const maskPathWidget = this.widgets.find(w => w.name === "mask_path");
              if (maskPathWidget) maskPathWidget.value = "";
              loadFromInput();
            }
          }
          // Recompute current record key using the same strategy as loader
          let curRec = null;
          // Try own image first
          if (this.images && this.images[0]) curRec = this.images[0];
          // If none, attempt sibling preview
          if (!curRec && this.inputs?.[0]?.link) {
            const L = app.graph.links[this.inputs[0].link];
            if (L) {
              const originId = L.origin_id; const originSlot = L.origin_slot;
              for (const lid in app.graph.links) {
                const LL = app.graph.links[lid];
                if (LL && LL.origin_id === originId && LL.origin_slot === originSlot) {
                  const tgt = app.graph.getNodeById(LL.target_id);
                  if (tgt?.images?.[0]) { curRec = tgt.images[0]; break; }
                }
              }
            }
          }
          const curImgKey = curRec ? `${curRec.filename}|${curRec.subfolder}|${curRec.type}` : null;
          if (curImgKey !== lastImgKey) {
            lastImgKey = curImgKey;
            if (curImgKey) loadFromInput();
          }
        }, 300);
      }

      // prevent popup opening
      this.onSelected = function () { /* no-op for inline editing */ };

      // Mouse handlers
      const origDown = this.onMouseDown;
      this.onMouseDown = function (e, localPos, gc) {
        if (this.flags?.collapsed) return origDown?.apply(this, arguments);
        if (!this._crz_img) return origDown?.apply(this, arguments);
        this._crz_syncMaskSize();
        if (this._crz_inRect(localPos)) {
          gc?.canvas?.ownerDocument?.activeElement?.blur?.();
          this._crz_isDrawing = true;
          // right mouse button or shift = eraser
          this._crz_isErasing = (e.button === 2) || (e.shiftKey === true);
          const r = this._crz_rect;
          const x = localPos[0] - r.x;
          const y = localPos[1] - r.y;
          const ctx2 = this._crz_mask_ctx;
          ctx2.save();
          if (this._crz_isErasing) {
            ctx2.globalCompositeOperation = 'destination-out';
            ctx2.beginPath();
            ctx2.arc(x, y, this._crz_brush / 2, 0, Math.PI * 2);
            ctx2.fill();
          } else {
            ctx2.globalCompositeOperation = 'source-over';
            ctx2.fillStyle = '#ffffff';
            ctx2.beginPath();
            ctx2.arc(x, y, this._crz_brush / 2, 0, Math.PI * 2);
            ctx2.fill();
          }
          ctx2.restore();
          this._crz_last = { x, y };
          this._crz_hasMask = true;
          app.graph.setDirtyCanvas(true, false);
          return true;
        }
        return origDown?.apply(this, arguments);
      };

      const origMove = this.onMouseMove;
      this.onMouseMove = function (e, localPos) {
        const inside = this._crz_inRect(localPos);
        this._crz_mouse = { x: localPos[0], y: localPos[1], inside };
        // Update eraser state live from buttons if dragging
        if (this._crz_isDrawing) {
          if (e && typeof e.buttons === 'number') {
            this._crz_isErasing = (e.buttons & 2) === 2; // RMB pressed
          }
        }
        if (this._crz_isDrawing) {
          this._crz_lineTo(localPos);
          return true;
        }
        app.graph.setDirtyCanvas(true, false);
        return origMove?.apply(this, arguments);
      };

      const origUp = this.onMouseUp;
      this.onMouseUp = function () {
        if (this._crz_isDrawing) {
          this._crz_isDrawing = false;
          this._crz_last = null;
          this._crz_uploadMask();
          return true;
        }
        return origUp?.apply(this, arguments);
      };

      const origWheel = this.onMouseWheel;
      this.onMouseWheel = function (e, localPos) {
        // Change brush size when hovering anywhere over this node bounds
        const overNode = localPos && (localPos[0] >= 0 && localPos[0] <= this.size[0] && localPos[1] >= 0 && localPos[1] <= this.size[1]);
        if (overNode) {
          if (e && e.preventDefault) { try { e.preventDefault(); e.stopPropagation(); } catch(_){} }
          const delta = Math.sign(e.deltaY);
          const step = e.ctrlKey ? 10 : 5;
          const next = Math.max(1, Math.min(200, this._crz_brush - delta * step));
          this._crz_brush = next;
          if (typeof window !== 'undefined') window._crz_lastBrushSize = next;
          app.graph.setDirtyCanvas(true, false);
          return true;
        }
        return origWheel?.apply(this, arguments);
      };

      // Capture wheel/contextmenu on the main canvas to prevent graph zoom/menu when interacting on this node
      const canvasEl = app?.canvas?.canvas;
      if (canvasEl && !this._crz_domHooksAttached) {
        this._crz_domHooksAttached = true;
        const toLocal = (ev) => {
          const rect = canvasEl.getBoundingClientRect();
          const scale = app.canvas.ds.state.scale;
          const offset = app.canvas.ds.state.offset; // [x,y]
          const gx = (ev.clientX - rect.left) / scale - offset[0];
          const gy = (ev.clientY - rect.top) / scale - offset[1];
          return [gx - this.pos[0], gy - this.pos[1]];
        };
        this._crz_wheelHandler = (ev) => {
          const lp = toLocal(ev);
          const overNode = lp[0] >= 0 && lp[0] <= this.size[0] && lp[1] >= 0 && lp[1] <= this.size[1];
          if (!overNode) return;
          ev.preventDefault();
          ev.stopPropagation();
          const delta = Math.sign(ev.deltaY);
          const step = ev.ctrlKey ? 10 : 5;
          const next = Math.max(1, Math.min(200, this._crz_brush - delta * step));
          this._crz_brush = next;
          if (typeof window !== 'undefined') window._crz_lastBrushSize = next;
          app.graph.setDirtyCanvas(true, false);
        };
        this._crz_ctxMenuHandler = (ev) => {
          const lp = toLocal(ev);
          const overNode = lp[0] >= 0 && lp[0] <= this.size[0] && lp[1] >= 0 && lp[1] <= this.size[1];
          if (!overNode) return;
          // If right-click inside node, allow our RMB erase without graph context menu
          ev.preventDefault();
          ev.stopPropagation();
        };
        // Native RMB draw support (LiteGraph may not dispatch RMB to node)
        this._crz_pointerDownHandler = (ev) => {
          if (ev.button !== 2) return; // only RMB
          const lp = toLocal(ev);
          const overNode = lp[0] >= 0 && lp[0] <= this.size[0] && lp[1] >= 0 && lp[1] <= this.size[1];
          if (!overNode) return;
          ev.preventDefault(); ev.stopPropagation();
          this._crz_syncMaskSize();
          this._crz_isDrawing = true; this._crz_isErasing = true;
          // update brush preview position
          this._crz_mouse = { x: lp[0], y: lp[1], inside: this._crz_inRect(lp) };
          const r = this._crz_rect;
          const x = Math.max(0, Math.min(lp[0] - r.x, this._crz_mask.width));
          const y = Math.max(0, Math.min(lp[1] - r.y, this._crz_mask.height));
          const ctx2 = this._crz_mask_ctx;
          ctx2.save();
          ctx2.globalCompositeOperation = 'destination-out';
          ctx2.beginPath();
          ctx2.arc(x, y, this._crz_brush / 2, 0, Math.PI * 2);
          ctx2.fill();
          ctx2.restore();
          this._crz_last = { x, y };
          this._crz_hasMask = true;
          app.graph.setDirtyCanvas(true, false);
          const moveHandler = (mv) => {
            const lpm = toLocal(mv);
            const over = lpm[0] >= 0 && lpm[0] <= this.size[0] && lpm[1] >= 0 && lpm[1] <= this.size[1];
            if (!this._crz_isDrawing) return;
            if (over) {
              this._crz_isErasing = true;
              // Update brush preview position while dragging
              this._crz_mouse = { x: lpm[0], y: lpm[1], inside: this._crz_inRect(lpm) };
              this._crz_lineTo(lpm);
            }
            app.graph.setDirtyCanvas(true, false);
            mv.preventDefault(); mv.stopPropagation();
          };
          const upHandler = (up) => {
            this._crz_isDrawing = false; this._crz_isErasing = false; this._crz_last = null;
            window.removeEventListener('pointermove', moveHandler, true);
            window.removeEventListener('pointerup', upHandler, true);
            // Persist updated mask to disk so output socket reflects erasures
            try { this._crz_uploadMask && this._crz_uploadMask(); } catch(_){}
            up.preventDefault(); up.stopPropagation();
          };
          window.addEventListener('pointermove', moveHandler, true);
          window.addEventListener('pointerup', upHandler, true);
        };
        canvasEl.addEventListener('wheel', this._crz_wheelHandler, { capture: true, passive: false });
        canvasEl.addEventListener('contextmenu', this._crz_ctxMenuHandler, { capture: true });
        canvasEl.addEventListener('pointerdown', this._crz_pointerDownHandler, { capture: true });
      }

      // Draw directly in node
      const origDrawFg = nodeType.prototype.onDrawForeground;
      nodeType.prototype.onDrawForeground = function (ctx) {
        // Do not call original foreground draw to avoid legacy mask preview overlay
        if (this.flags?.collapsed) return;

        const { x, y, w, h } = this._crz_computeRect();
        this._crz_rect = { x, y, w, h };
        if (w <= 0 || h <= 0) return;
        this._crz_syncMaskSize();

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        ctx.fillStyle = "#000";
        ctx.fillRect(x, y, w, h);
        if (this._crz_img) {
          ctx.drawImage(this._crz_img, 0, 0, this._crz_img.width, this._crz_img.height, x, y, w, h);
        }

        // blur preview factor from blur widget
        let blurVal = 0;
        const blurWidget = this.widgets?.find(w => w.name === "blur");
        if (blurWidget && typeof blurWidget.value !== 'undefined') blurVal = parseFloat(blurWidget.value) || 0;
        const previewBlur = blurVal * 0.25;
        if (this._crz_hasMask) {
          const tint = document.createElement('canvas');
          tint.width = w; tint.height = h;
          const tctx = tint.getContext('2d');
          tctx.drawImage(this._crz_mask, 0, 0, this._crz_mask.width, this._crz_mask.height, 0, 0, w, h);
          tctx.globalCompositeOperation = 'source-in';
          tctx.fillStyle = this._crz_previewColor || '#ff00ff';
          tctx.fillRect(0, 0, w, h);
          if (previewBlur > 0) {
            const off = document.createElement('canvas');
            off.width = w; off.height = h;
            const octx = off.getContext('2d');
            octx.filter = `blur(${previewBlur}px)`;
            octx.drawImage(tint, 0, 0);
            octx.filter = 'none';
            ctx.globalAlpha = this._crz_opacity ?? 0.5;
            ctx.drawImage(off, x, y);
            ctx.globalAlpha = 1.0;
          } else {
            ctx.globalAlpha = this._crz_opacity ?? 0.5;
            ctx.drawImage(tint, x, y);
            ctx.globalAlpha = 1.0;
          }
        }

        // Brush circle
        if (this._crz_mouse.inside) {
          ctx.beginPath();
          ctx.arc(this._crz_mouse.x, this._crz_mouse.y, this._crz_brush / 2, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255,255,255,0.9)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        ctx.restore();
      };

      // Add extra context menu option as a fallback clear route
      const origMenu = nodeType.prototype.getExtraMenuOptions;
      nodeType.prototype.getExtraMenuOptions = function (_, options) {
        origMenu?.apply(this, arguments);
        options.push({ content: "Reset Mask (Hard)", callback: async () => { await this._crz_clearAll(this); } });
      };

      // helpers
      this._crz_computeRect = () => {
        const pad = 8;
        let yOffset = pad + this._crz_calcWidgetsHeight() + _CRZ_WIDGET_CANVAS_GAP;
        const availW = this.size[0] - pad * 2;
        const availH = this.size[1] - yOffset - pad;
        if (availW <= 0 || availH <= 0 || !this._crz_img) return { x: pad, y: yOffset, w: Math.max(1, availW), h: Math.max(1, availH) };
        const iw = this._crz_img.width, ih = this._crz_img.height;
        const s = Math.min(availW / iw, availH / ih, 1);
        const w = Math.max(1, Math.floor(iw * s));
        const h = Math.max(1, Math.floor(ih * s));
        const x = pad + (availW - w) / 2;
        const y = yOffset + (availH - h) / 2;
        return { x, y, w, h };
      };

      this._crz_syncMaskSize = () => {
        const { w, h } = this._crz_computeRect();
        const W = Math.max(1, Math.floor(w));
        const H = Math.max(1, Math.floor(h));
        if (this._crz_mask.width === W && this._crz_mask.height === H) return;
        const old = this._crz_mask;
        const newC = document.createElement("canvas");
        newC.width = W; newC.height = H;
        const nctx = newC.getContext("2d");
        if (old.width && old.height) nctx.drawImage(old, 0, 0, old.width, old.height, 0, 0, W, H);
        this._crz_mask = newC;
        this._crz_mask_ctx = nctx;
      };

      this._crz_inRect = (p) => {
        const r = this._crz_rect; return p[0] >= r.x && p[0] <= r.x + r.w && p[1] >= r.y && p[1] <= r.y + r.h;
      };

      // swatch helpers removed

      this._crz_lineTo = (localPos) => {
        const r = this._crz_rect; const x = localPos[0] - r.x; const y = localPos[1] - r.y;
        const ctx2 = this._crz_mask_ctx;
        ctx2.save();
        ctx2.lineJoin = "round"; ctx2.lineCap = "round"; ctx2.lineWidth = this._crz_brush;
        if (this._crz_isErasing) {
          ctx2.globalCompositeOperation = 'destination-out';
          ctx2.strokeStyle = 'rgba(0,0,0,1)';
        } else {
          ctx2.globalCompositeOperation = 'source-over';
          ctx2.strokeStyle = '#ffffff';
        }
        if (!this._crz_last) this._crz_last = { x, y };
        ctx2.beginPath(); ctx2.moveTo(this._crz_last.x, this._crz_last.y); ctx2.lineTo(x, y); ctx2.stroke();
        ctx2.restore();
        this._crz_last = { x, y };
        this._crz_hasMask = true;
        app.graph.setDirtyCanvas(true, false);
      };

      this._crz_uploadMask = async () => {
        const token = ++this._crz_maskUploadToken;
        if (!this._crz_imgW || !this._crz_imgH) return;
        const out = document.createElement("canvas");
        out.width = this._crz_imgW; out.height = this._crz_imgH;
        const octx = out.getContext("2d");
        // Keep transparent background so unmasked areas remain alpha=0
        octx.clearRect(0, 0, out.width, out.height);
        octx.imageSmoothingEnabled = true; octx.imageSmoothingQuality = "high";
        octx.drawImage(this._crz_mask, 0, 0, this._crz_mask.width, this._crz_mask.height, 0, 0, out.width, out.height);
        await new Promise((resolve) => {
          out.toBlob(async (blob) => {
            const uniqueName = `mask_${Date.now()}.png`;
            const formData = new FormData();
            formData.append("image", blob, uniqueName);
            formData.append("overwrite", "true");
            formData.append("type", "input");
            const resp = await api.fetchApi("/upload/image", { method: "POST", body: formData });
            const data = await resp.json();
            if (token === this._crz_maskUploadToken && this._crz_hasMask) {
              const name = data.name || uniqueName;
              const maskPathWidget = this.widgets.find(w => w.name === "mask_path");
              if (maskPathWidget) maskPathWidget.value = name;
              if (this.setDirty) this.setDirty();
              if (this.setDirtyOutput) this.setDirtyOutput(true);
              app.graph.setDirtyCanvas(true, true);
            }
            resolve();
          }, "image/png");
        });
      };

      // initial load (self image preferred)
      if ((this.images && this.images[0]) || this.inputs?.[0]?.link) loadFromInput();
    };
  },
});