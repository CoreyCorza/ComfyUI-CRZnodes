import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

// Lightweight in-node interactive SAM click editor, leveraging Impact Pack routes
// (/sam/prepare and /sam/detect). Displays the input image on the node, collects
// clicks, previews the returned mask, and uploads it to input folder, storing
// the filename into hidden widget `mask_path`.

app.registerExtension({
  name: "CRZ.SamClickSegment",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData?.name !== "CRZSamClickSegment") return;

    const MIN_W = 340;
    const MIN_H = 280;

    const origOnNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      origOnNodeCreated?.apply(this, arguments);

      this.size = [Math.max(this.size?.[0] || MIN_W, MIN_W), Math.max(this.size?.[1] || 420, MIN_H)];
      this.resizable = true;

      // Hidden widget for mask path created by UI
      this.widgets = this.widgets || [];
      if (!this.widgets.find((w) => w.name === "mask_path")) {
        const w = this.addCustomWidget({ name: "mask_path", type: "hidden", value: "", draw: () => {} });
        if (w) {
          w.hidden = true;
          w.height = 0;
          w.computeSize = () => [0, 0];
        }
      }

      // State
      this._sam_img = null; // Image()
      this._sam_imgW = 0;
      this._sam_imgH = 0;
      this._sam_points = []; // [ {x,y,positive:boolean} ]
      this._sam_maskImg = null; // Image() mask preview
      this._sam_threshold = 0.7;
      this._sam_brush = 6;
      this._sam_mouse = { x: 0, y: 0, inside: false };
      this._sam_rect = { x: 0, y: 0, w: 0, h: 0 };
      this._sam_isPositive = true; // toggle with +/- like impact
      this._sam_prepareTs = 0;
      this._sam_prepareOk = false;
      this._sam_prepareFailed = false;
      this._sam_detectBusy = false;
      this._sam_detectRetry = 0;
      this._sam_detectTimer = null;
      this._sam_lastPath = null; // { filename, type, subfolder }
      this._sam_prepareToken = 0;
      this._sam_model_name = "auto";

      // Threshold is internal only; no widget used

      // Create a transparent DOM overlay over our draw rect to fully capture mouse events
      if (!this._sam_overlay) {
        const cnv = app?.canvas?.canvas;
        const parent = cnv?.parentElement;
        if (parent) {
          if (getComputedStyle(parent).position === "static") parent.style.position = "relative";
          const ov = document.createElement("div");
          ov.className = "crz-sam-overlay";
          Object.assign(ov.style, {
            position: "absolute",
            left: "0px",
            top: "0px",
            width: "0px",
            height: "0px",
            pointerEvents: "auto",
            background: "transparent",
            zIndex: 999999,
            cursor: "crosshair",
            userSelect: "none",
            WebkitUserSelect: "none",
            touchAction: "none",
          });
          parent.appendChild(ov);
          // Helpers to map overlay coords to node local/image coords
          const overlayToLocal = (evt) => {
            const rect = ov.getBoundingClientRect();
            const px = Math.max(0, Math.min(evt.clientX - rect.left, rect.width));
            const py = Math.max(0, Math.min(evt.clientY - rect.top, rect.height));
            const r = this._sam_rect || { x: 0, y: 0, w: 1, h: 1 };
            const lx = r.x + (rect.width > 0 ? (px / rect.width) * r.w : 0);
            const ly = r.y + (rect.height > 0 ? (py / rect.height) * r.h : 0);
            return [lx, ly];
          };
          const addPointAtEvent = (evt) => {
            if (!this._sam_img) return;
            const localPos = overlayToLocal(evt);
            this._sam_lastLocal = localPos;
            const { x, y } = this._sam_toImage(localPos);
            const positive = this._sam_isPositive;
            this._sam_points.push({ x, y, positive });
            console.log("[CRZ.SamClickSegment] point added (overlay)", { x, y, positive });
            this._sam_scheduleDetect(150);
            app.graph.setDirtyCanvas(true, false);
          };
          const removeNearestAtEvent = (evt) => {
            if (!this._sam_img || !this._sam_points?.length) return;
            const localPos = overlayToLocal(evt);
            this._sam_lastLocal = localPos;
            const { x, y } = this._sam_toImage(localPos);
            let bestIdx = -1, bestD2 = Infinity;
            for (let i = 0; i < this._sam_points.length; i++) {
              const p = this._sam_points[i];
              const dx = p.x - x, dy = p.y - y; const d2 = dx * dx + dy * dy;
              if (d2 < bestD2) { bestD2 = d2; bestIdx = i; }
            }
            if (bestIdx >= 0) {
              const removed = this._sam_points.splice(bestIdx, 1)[0];
              console.log("[CRZ.SamClickSegment] point removed (overlay)", removed);
              this._sam_scheduleDetect(120);
              app.graph.setDirtyCanvas(true, false);
            }
          };
          // Event handlers
          const handleDown = (evt) => {
            try { evt.preventDefault(); evt.stopPropagation(); } catch {}
            // Shift/Alt + LMB = delete nearest
            if (evt.button === 0 && (evt.shiftKey || evt.altKey)) {
              removeNearestAtEvent(evt);
              return;
            }
            if (evt.button === 2) {
              removeNearestAtEvent(evt);
              return;
            }
            if (evt.button === 0) addPointAtEvent(evt);
          };
          ov.addEventListener("pointerdown", handleDown, { capture: true });
          ov.addEventListener("mousedown", handleDown, { capture: true });
          ov.addEventListener("mouseup", (evt) => { try { evt.preventDefault(); evt.stopPropagation(); } catch {} }, { capture: true });
          ov.addEventListener("pointerup", (evt) => { try { evt.preventDefault(); evt.stopPropagation(); } catch {} }, { capture: true });
          ov.addEventListener("auxclick", (evt) => { try { evt.preventDefault(); evt.stopPropagation(); } catch {}; if (evt.button === 2) removeNearestAtEvent(evt); }, { capture: true });
          ov.addEventListener("contextmenu", (evt) => {
            try { evt.preventDefault(); evt.stopPropagation(); } catch {}
            removeNearestAtEvent(evt);
          }, { capture: true });
          ov.addEventListener("mousemove", (evt) => {
            try { evt.preventDefault(); evt.stopPropagation(); } catch {}
            const rect = ov.getBoundingClientRect();
            const px = Math.max(0, Math.min(evt.clientX - rect.left, rect.width));
            const py = Math.max(0, Math.min(evt.clientY - rect.top, rect.height));
            // Map overlay px/py to canvas absolute to render the cursor nicely
            const ds = app?.canvas?.ds; const scale = ds?.scale || 1; const ox = ds?.offset?.[0] || 0; const oy = ds?.offset?.[1] || 0;
            const r = this._sam_rect || { x: 0, y: 0, w: 1, h: 1 };
            const worldX = this.pos[0] + r.x + (r.w * (px / Math.max(1, rect.width)));
            const worldY = this.pos[1] + r.y + (r.h * (py / Math.max(1, rect.height)));
            this._sam_mouse = { x: worldX * scale + ox, y: worldY * scale + oy, inside: true };
            // Track local for key-driven delete
            const lx = r.x + (r.w * (px / Math.max(1, rect.width)));
            const ly = r.y + (r.h * (py / Math.max(1, rect.height)));
            this._sam_lastLocal = [lx, ly];
            app.graph.setDirtyCanvas(true, false);
          });
          ov.addEventListener("mouseleave", () => {
            this._sam_mouse = { x: 0, y: 0, inside: false };
            app.graph.setDirtyCanvas(true, false);
          });
          this._sam_overlay = ov;
        }
      }

      // Model selection widget (forwarded to /sam/prepare)
      if (!this.widgets.find((w) => w.name === "sam_model_name")) {
        const values = ["auto", "vit_h", "vit_l", "vit_b"];
        this.addWidget("combo", "sam_model_name", this._sam_model_name, async (v) => {
          this._sam_model_name = v || "auto";
          // Re-prepare with the new model if we have an image context
          const lp = this._sam_lastPath;
          if (lp && lp.filename) {
            this._sam_points = [];
            this._sam_maskImg = null;
            clearTimeout(this._sam_detectTimer);
            const data = { sam_model_name: this._sam_model_name || "auto", filename: lp.filename, type: lp.type, subfolder: lp.subfolder };
            const token = ++this._sam_prepareToken;
            try {
              const prep = await api.fetchApi("/sam/prepare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
              if (token === this._sam_prepareToken) {
                this._sam_prepareOk = prep.ok;
                this._sam_prepareFailed = !prep.ok;
                this._sam_prepareTs = performance.now();
                app.graph.setDirtyCanvas(true, true);
              }
            } catch (e) {
              if (token === this._sam_prepareToken) {
                this._sam_prepareOk = false;
                this._sam_prepareFailed = true;
                this._sam_prepareTs = performance.now();
              }
            }
          }
        }, { values });
      }

      // Compute size honoring widgets height
      const pad = 8;
      const widgetsHeight = () => {
        const widgets = this.widgets || [];
        let total = 0;
        for (const w of widgets) {
          const hidden = w && (w.hidden === true || w.type === "hidden");
          if (hidden) continue;
          const h = typeof w.height === "number" ? w.height : 28;
          if (h > 0) total += h;
        }
        return total;
      };
      const canvasGap = 40;
      this.computeSize = function () {
        const minH = Math.max(MIN_H, widgetsHeight() + canvasGap + 120);
        return [MIN_W, minH];
      };

      // Load input image (prefer upstream node images)
      const loadInputImage = () => {
        const sanitizeFilename = (n) => (typeof n === "string" ? n.replace(/\s*\[[^\]]*\]\s*$/, "") : n);
        const toURL = (rec) => api.apiURL(`/view?filename=${encodeURIComponent(rec.filename)}&type=${rec.type}&subfolder=${encodeURIComponent(rec.subfolder)}`);
        const findRecord = () => {
          const linkId = this.inputs?.[0]?.link ?? null;
          if (!linkId) return null;
          const link = app.graph.links[linkId];
          if (!link) return null;
          const originNode = app.graph.getNodeById(link.origin_id);
          if (originNode?.images?.[0]) return originNode.images[0];
          return null;
        };
        const rec = findRecord();
        if (!rec) return;
        const url = toURL(rec);
        const img = new Image();
        img.onload = async () => {
          this._sam_img = img;
          this._sam_imgW = img.width;
          this._sam_imgH = img.height;
          // Kick model prepare
          try {
            // Use record info directly instead of parsing URL (api.apiURL may be relative)
            const filename = sanitizeFilename(rec.filename || "");
            const fileType = rec.type || "";
            const subfolder = rec.subfolder || "";
            const data = { sam_model_name: this._sam_model_name || "auto", filename, type: fileType, subfolder };
            console.log("[CRZ.SamClickSegment] /sam/prepare", data);
            try {
              const token = ++this._sam_prepareToken;
              const prep = await api.fetchApi("/sam/prepare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
              if (token === this._sam_prepareToken) {
                this._sam_prepareOk = prep.ok;
                this._sam_prepareFailed = !prep.ok;
                console.log("[CRZ.SamClickSegment] prepare status", prep.status);
              } else {
                console.log("[CRZ.SamClickSegment] prepare response ignored (stale)");
              }
            } catch (e) {
              console.warn("[CRZ.SamClickSegment] prepare fetch error", e);
              this._sam_prepareOk = false;
              this._sam_prepareFailed = true;
            }
            this._sam_prepareTs = performance.now();
            this._sam_detectRetry = 0;
            this._sam_lastPath = { filename, type: fileType, subfolder };
          } catch (_) {}
          app.graph.setDirtyCanvas(true, true);
        };
        img.src = url;
      };

      // Poll for link changes to reload image
      if (!this._sam_poll) {
        let lastLink = this.inputs?.[0]?.link ?? null;
        this._sam_poll = setInterval(() => {
          const curLink = this.inputs?.[0]?.link ?? null;
          if (curLink !== lastLink) {
            lastLink = curLink;
            this._sam_points = [];
            this._sam_maskImg = null;
            if (curLink) loadInputImage();
          }
          // also poll for record change to update rec info and re-prepare if needed
          if (curLink) {
            try {
              const link = app.graph.links[curLink];
              const originNode = app.graph.getNodeById(link.origin_id);
              const rec = originNode?.images?.[0];
              if (rec) {
                const sanitized = (rec.filename || "").replace(/\s*\[[^\]]*\]\s*$/, "");
                const changed = (!this._sam_lastPath) ||
                  sanitized !== this._sam_lastPath.filename ||
                  (rec.subfolder || "") !== (this._sam_lastPath.subfolder || "") ||
                  (rec.type || "") !== (this._sam_lastPath.type || "");
                if (changed) {
                console.log("[CRZ.SamClickSegment] image record changed; preparing SAM again");
                // reset state
                this._sam_points = [];
                this._sam_maskImg = null;
                clearTimeout(this._sam_detectTimer);
                // update display image
                const newUrl = api.apiURL(`/view?filename=${encodeURIComponent(rec.filename)}&type=${rec.type}&subfolder=${encodeURIComponent(rec.subfolder)}`);
                const nimg = new Image();
                nimg.onload = () => { this._sam_img = nimg; this._sam_imgW = nimg.width; this._sam_imgH = nimg.height; app.graph.setDirtyCanvas(true, true); };
                nimg.src = newUrl;
                // prepare and await
                const data = { sam_model_name: this._sam_model_name || "auto", filename: sanitized, type: rec.type, subfolder: rec.subfolder };
                const token = ++this._sam_prepareToken;
                (async () => {
                  try {
                    const prep = await api.fetchApi("/sam/prepare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
                    if (token === this._sam_prepareToken) {
                      this._sam_prepareOk = prep.ok;
                      this._sam_prepareFailed = !prep.ok;
                      this._sam_prepareTs = performance.now();
                      console.log("[CRZ.SamClickSegment] prepare status (change)", prep.status);
                      app.graph.setDirtyCanvas(true, true);
                    }
                  } catch (e) {
                    if (token === this._sam_prepareToken) {
                      this._sam_prepareOk = false;
                      this._sam_prepareFailed = true;
                      this._sam_prepareTs = performance.now();
                      console.warn("[CRZ.SamClickSegment] prepare error (change)", e);
                    }
                  }
                })();
                this._sam_lastPath = { filename: sanitized, type: rec.type, subfolder: rec.subfolder };
                this._sam_prepareOk = false;
                this._sam_prepareFailed = false;
                this._sam_prepareTs = performance.now();
                }
              }
            } catch {}
          }
        }, 400);
      }

      // Mouse interactions
      const origDown = this.onMouseDown;
      // Capture-level DOM listeners to stop Comfy/LiteGraph intercepting clicks inside our canvas area
      if (!this._sam_domCapture) {
        const cnv = app?.canvas?.canvas;
        if (cnv) {
          const swallow = (ev) => {
            try {
              if (ev && ev.preventDefault) ev.preventDefault();
              if (ev && ev.stopImmediatePropagation) ev.stopImmediatePropagation();
              if (ev && ev.stopPropagation) ev.stopPropagation();
              // Some libs also read these flags
              ev.cancelBubble = true;
              ev.returnValue = false;
            } catch {}
          };
          const captureHandler = (e) => {
            try {
              // Compute canvas-space coords
              let cx = 0, cy = 0;
              if (app?.canvas?.convertEventToCanvasOffset) {
                const off = app.canvas.convertEventToCanvasOffset(e);
                cx = off[0]; cy = off[1];
              } else {
                const rect = cnv.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const ds = app?.canvas?.ds;
                const scale = ds?.scale || 1;
                const ox = ds?.offset?.[0] || 0;
                const oy = ds?.offset?.[1] || 0;
                cx = (x - ox) / scale;
                cy = (y - oy) / scale;
              }
              // Node-local position
              const localPos = [cx - this.pos[0], cy - this.pos[1]];
              // Check our interactive rect
              const r = this._sam_computeRect();
              const inside = localPos[0] >= r.x && localPos[0] <= r.x + r.w && localPos[1] >= r.y && localPos[1] <= r.y + r.h;
              if (!inside) return;
              // Block upstream handlers aggressively (capture + immediate)
              swallow(e);
              if (!this._sam_img) return;

              // Handle add/delete points
              const { x, y } = this._sam_toImage(localPos);
              // Right Click = delete nearest point
              if (e.button === 2) {
                if (this._sam_points?.length) {
                  let bestIdx = -1, bestD2 = Infinity;
                  for (let i = 0; i < this._sam_points.length; i++) {
                    const p = this._sam_points[i];
                    const dx = p.x - x, dy = p.y - y; const d2 = dx * dx + dy * dy;
                    if (d2 < bestD2) { bestD2 = d2; bestIdx = i; }
                  }
                  if (bestIdx >= 0) {
                    const removed = this._sam_points.splice(bestIdx, 1)[0];
                    console.log("[CRZ.SamClickSegment] point removed (RMB capture)", removed);
                    this._sam_scheduleDetect(120);
                    app.graph.setDirtyCanvas(true, false);
                  }
                }
                return;
              }

              // Ctrl + Left Click (fallback) = delete nearest point
              if (e.button === 0 && e.ctrlKey) {
                if (this._sam_points?.length) {
                  let bestIdx = -1, bestD2 = Infinity;
                  for (let i = 0; i < this._sam_points.length; i++) {
                    const p = this._sam_points[i];
                    const dx = p.x - x, dy = p.y - y; const d2 = dx * dx + dy * dy;
                    if (d2 < bestD2) { bestD2 = d2; bestIdx = i; }
                  }
                  if (bestIdx >= 0) {
                    const removed = this._sam_points.splice(bestIdx, 1)[0];
                    console.log("[CRZ.SamClickSegment] point removed (Ctrl+LMB capture)", removed);
                    this._sam_scheduleDetect(120);
                    app.graph.setDirtyCanvas(true, false);
                  }
                }
                return;
              }
              if (e.button === 0) {
                const positive = this._sam_isPositive;
                this._sam_points.push({ x, y, positive });
                console.log("[CRZ.SamClickSegment] point added (capture)", { x, y, positive });
                app.graph.setDirtyCanvas(true, false);
                this._sam_scheduleDetect(150);
                return;
              }
            } catch { /* ignore */ }
          };
          // Use pointer events for broader coverage; attach at capture phase
          cnv.addEventListener("pointerdown", captureHandler, true);
          cnv.addEventListener("mousedown", captureHandler, true);
          cnv.addEventListener("click", (ev) => {
            // Swallow follow-up click if it occurred within our rect
            try {
              const off = app?.canvas?.convertEventToCanvasOffset ? app.canvas.convertEventToCanvasOffset(ev) : null;
              if (off) {
                const localPos = [off[0] - this.pos[0], off[1] - this.pos[1]];
                const r = this._sam_computeRect();
                const inside = localPos[0] >= r.x && localPos[0] <= r.x + r.w && localPos[1] >= r.y && localPos[1] <= r.y + r.h;
                if (inside) swallow(ev);
              }
            } catch {}
          }, true);
          cnv.addEventListener("pointerup", (ev) => swallow(ev), true);
          cnv.addEventListener("mouseup", (ev) => swallow(ev), true);
          cnv.addEventListener("dblclick", (ev) => swallow(ev), true);
          cnv.addEventListener("contextmenu", (ev) => {
            try {
              // Compute position and delete nearest point inside rect
              let off = app?.canvas?.convertEventToCanvasOffset ? app.canvas.convertEventToCanvasOffset(ev) : null;
              if (!off) {
                const rect = cnv.getBoundingClientRect();
                off = [ev.clientX - rect.left, ev.clientY - rect.top];
              }
              const ds = app?.canvas?.ds; const scale = ds?.scale || 1; const ox = ds?.offset?.[0] || 0; const oy = ds?.offset?.[1] || 0;
              const cx = app?.canvas?.convertEventToCanvasOffset ? off[0] : (off[0] - ox) / scale;
              const cy = app?.canvas?.convertEventToCanvasOffset ? off[1] : (off[1] - oy) / scale;
              const localPos = [cx - this.pos[0], cy - this.pos[1]];
              const r = this._sam_computeRect();
              const inside = localPos[0] >= r.x && localPos[0] <= r.x + r.w && localPos[1] >= r.y && localPos[1] <= r.y + r.h;
              if (inside) {
                swallow(ev);
                this._sam_removeNearestAtLocal(localPos);
              }
            } catch {}
          }, true);

          // As some builds attach contextmenu on document, also add a capture handler at document level
          const docContextHandler = (ev) => {
            try {
              const off = app?.canvas?.convertEventToCanvasOffset ? app.canvas.convertEventToCanvasOffset(ev) : null;
              if (!off) return;
              const localPos = [off[0] - this.pos[0], off[1] - this.pos[1]];
              const r = this._sam_computeRect();
              const inside = localPos[0] >= r.x && localPos[0] <= r.x + r.w && localPos[1] >= r.y && localPos[1] <= r.y + r.h;
              if (inside) {
                swallow(ev);
                this._sam_removeNearestAtLocal(localPos);
              }
            } catch {}
          };
          document.addEventListener("contextmenu", docContextHandler, true);
          this._sam_domCapture = { cnv, captureHandler };
        }
      }
      this.onMouseDown = function (e, localPos) {
        if (!this._sam_img) return origDown?.apply(this, arguments);
        if (!this._sam_inRect(localPos)) return origDown?.apply(this, arguments);
        // Block ComfyUI/LiteGraph interactions while clicking inside our canvas area
        if (e && e.preventDefault) { try { e.preventDefault(); e.stopPropagation(); } catch {} }
        const { x, y } = this._sam_toImage(localPos);
        // Shift/Alt/Ctrl + Left Click = delete nearest point
        if (e.button === 0 && (e.shiftKey || e.altKey || e.ctrlKey)) {
          const removed = this._sam_removeNearestAtLocal(localPos);
          return removed ? true : true;
        }

        // Left Click = add point with current +/- mode
        if (e.button === 0) {
          const positive = this._sam_isPositive;
          this._sam_points.push({ x, y, positive });
          console.log("[CRZ.SamClickSegment] point added", { x, y, positive });
          app.graph.setDirtyCanvas(true, false);
          this._sam_scheduleDetect(150);
          return true;
        }

        return origDown?.apply(this, arguments);
      };

      const origMove = this.onMouseMove;
      this.onMouseMove = function (e, localPos) {
        this._sam_mouse = { x: localPos[0], y: localPos[1], inside: this._sam_inRect(localPos) };
        app.graph.setDirtyCanvas(true, false);
        return origMove?.apply(this, arguments);
      };

      const origWheel = this.onMouseWheel;
      this.onMouseWheel = function (e, localPos) {
        const over = localPos && localPos[0] >= 0 && localPos[0] <= this.size[0] && localPos[1] >= 0 && localPos[1] <= this.size[1];
        if (!over) return origWheel?.apply(this, arguments);
        if (e && e.ctrlKey) {
          // ctrl+wheel = threshold adjust
          if (e.preventDefault) { try { e.preventDefault(); e.stopPropagation(); } catch {} }
          const delta = Math.sign(e.deltaY);
          const step = 0.02;
          this._sam_threshold = Math.max(0, Math.min(1, this._sam_threshold - delta * step));
          // No threshold widget to sync
          // re-detect with new threshold
          this._sam_detect();
          app.graph.setDirtyCanvas(true, false);
          return true;
        }
        return origWheel?.apply(this, arguments);
      };

      // Key handling: +/- to toggle mode, Delete/Backspace to remove nearest at cursor
      const origKey = this.onKeyDown;
      this.onKeyDown = function (e) {
        if (e?.key === "+") this._sam_isPositive = true;
        if (e?.key === "-") this._sam_isPositive = false;
        if (e?.key === "Delete" || e?.key === "Backspace") {
          try {
            if (this._sam_mouse?.inside) {
              const localPos = [this._sam_mouse.x - this.pos[0], this._sam_mouse.y - this.pos[1]];
              if (this._sam_removeNearestAtLocal(localPos)) {
                if (e.preventDefault) e.preventDefault();
                return true;
              }
            } else if (Array.isArray(this._sam_lastLocal)) {
              if (this._sam_removeNearestAtLocal(this._sam_lastLocal)) {
                if (e.preventDefault) e.preventDefault();
                return true;
              }
            }
          } catch {}
        }
        return origKey?.apply(this, arguments);
      };

      // Extra menu: clear points, upload mask
      const origMenu = this.getExtraMenuOptions;
      this.getExtraMenuOptions = function (_, options) {
        origMenu?.apply(this, arguments);
        options.push({ content: "Clear Points", callback: () => { this._sam_points = []; this._sam_maskImg = null; app.graph.setDirtyCanvas(true, true); } });
        options.push({ content: "Save Mask", callback: async () => { await this._sam_uploadMask(); } });
      };

      // Helpers
      this._sam_computeRect = () => {
        const pad = 8;
        const yOffset = pad + widgetsHeight() + canvasGap;
        const availW = this.size[0] - pad * 2;
        const availH = this.size[1] - yOffset - pad;
        if (!this._sam_img) return { x: pad, y: yOffset, w: Math.max(1, availW), h: Math.max(1, availH) };
        const iw = this._sam_img.width, ih = this._sam_img.height;
        const s = Math.min(availW / iw, availH / ih, 1);
        const w = Math.max(1, Math.floor(iw * s));
        const h = Math.max(1, Math.floor(ih * s));
        const x = pad + (availW - w) / 2;
        const y = yOffset + (availH - h) / 2;
        return { x, y, w, h };
      };
      this._sam_removeNearestAtLocal = (localPos) => {
        if (!this._sam_img || !this._sam_points?.length) return false;
        const { x, y } = this._sam_toImage(localPos);
        let bestIdx = -1, bestD2 = Infinity;
        for (let i = 0; i < this._sam_points.length; i++) {
          const p = this._sam_points[i];
          const dx = p.x - x, dy = p.y - y; const d2 = dx * dx + dy * dy;
          if (d2 < bestD2) { bestD2 = d2; bestIdx = i; }
        }
        if (bestIdx >= 0) {
          const removed = this._sam_points.splice(bestIdx, 1)[0];
          console.log("[CRZ.SamClickSegment] point removed", removed);
          this._sam_scheduleDetect(120);
          app.graph.setDirtyCanvas(true, false);
          return true;
        }
        return false;
      };
      this._sam_inRect = (p) => {
        const r = this._sam_rect;
        return p[0] >= r.x && p[0] <= r.x + r.w && p[1] >= r.y && p[1] <= r.y + r.h;
      };
      this._sam_toImage = (localPos) => {
        const r = this._sam_rect;
        const rx = Math.max(0, Math.min(localPos[0] - r.x, r.w));
        const ry = Math.max(0, Math.min(localPos[1] - r.y, r.h));
        const sx = this._sam_imgW / Math.max(1, r.w);
        const sy = this._sam_imgH / Math.max(1, r.h);
        return { x: Math.round(rx * sx), y: Math.round(ry * sy) };
      };

      this._sam_scheduleDetect = (delayMs = 0) => {
        clearTimeout(this._sam_detectTimer);
        console.log("[CRZ.SamClickSegment] schedule detect in", delayMs, "ms");
        this._sam_detectTimer = setTimeout(() => this._sam_detect(), delayMs);
      };

      this._sam_detect = async () => {
        if (!this._sam_img || this._sam_points.length === 0) return;
        if (this._sam_prepareFailed) { console.warn("[CRZ.SamClickSegment] prepare failed; attempting detect anyway"); }
        if (this._sam_detectBusy) { this._sam_scheduleDetect(150); return; }

        // Ensure at least ~600ms since prepare to allow model load
        const sincePrepare = performance.now() - (this._sam_prepareTs || 0);
        if (sincePrepare < 1200) { console.log("[CRZ.SamClickSegment] waiting for prepare", { prepareOk: this._sam_prepareOk, sincePrepare }); this._sam_scheduleDetect(Math.max(200, 1200 - sincePrepare)); return; }

        this._sam_detectBusy = true;
        try {
          const positives = [];
          const negatives = [];
          for (const p of this._sam_points) {
            const pair = [p.x, p.y];
            if (p.positive) positives.push(pair); else negatives.push(pair);
          }
          const data = { positive_points: positives, negative_points: negatives, threshold: this._sam_threshold };
          console.log("[CRZ.SamClickSegment] /sam/detect", data);
          const resp = await api.fetchApi("/sam/detect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
          if (!resp.ok) {
            const tx = await resp.text().catch(() => "");
            throw new Error(`detect failed: ${resp.status} ${tx}`);
          }
          const blob = await resp.blob();
          const url = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = () => {
            if (this._sam_maskImg && this._sam_maskImg.src) { try { URL.revokeObjectURL(this._sam_maskImg.src); } catch {} }
            this._sam_maskImg = img;
            this._sam_detectRetry = 0;
            console.log("[CRZ.SamClickSegment] mask preview updated", { w: img.width, h: img.height });
            app.graph.setDirtyCanvas(true, true);
            // Auto-upload latest mask so backend has a mask_path during execution
            try { this._sam_uploadMask(); } catch {}
          };
          img.src = url;
        } catch (e) {
          console.warn("[CRZ.SamClickSegment] detect error", e);
          // backoff and retry; do NOT re-prepare here (it restarts async load)
          this._sam_detectRetry = Math.min(30, (this._sam_detectRetry || 0) + 1);
          const backoff = Math.min(5000, 250 * Math.pow(1.4, this._sam_detectRetry));
          this._sam_scheduleDetect(backoff);
        } finally {
          this._sam_detectBusy = false;
        }
      };

      this._sam_uploadMask = async () => {
        if (!this._sam_maskImg) return;
        // Convert mask preview image to alpha mask PNG according to Impact logic (white->transparent, black->opaque)
        const out = document.createElement("canvas");
        out.width = this._sam_maskImg.width; out.height = this._sam_maskImg.height;
        const octx = out.getContext("2d", { willReadFrequently: true });
        octx.drawImage(this._sam_maskImg, 0, 0);
        const id = octx.getImageData(0, 0, out.width, out.height);
        const d = id.data;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          // Impact inverts alpha: non-zero becomes transparent; zero becomes opaque
          d[i + 3] = r ? 0 : 255;
          d[i] = 0; d[i + 1] = 0; d[i + 2] = 0;
        }
        octx.putImageData(id, 0, 0);
        await new Promise((resolve) => {
          out.toBlob(async (blob) => {
            const uniqueName = `sam_mask_${Date.now()}.png`;
            const formData = new FormData();
            formData.append("image", blob, uniqueName);
            formData.append("overwrite", "true");
            formData.append("type", "input");
            console.log("[CRZ.SamClickSegment] uploading mask");
            const resp = await api.fetchApi("/upload/image", { method: "POST", body: formData });
            const data = await resp.json();
            const name = data.name || uniqueName;
            const w = this.widgets.find((w) => w.name === "mask_path");
            if (w) w.value = name;
            console.log("[CRZ.SamClickSegment] mask uploaded", name);
            this.setDirty?.();
            this.setDirtyOutput?.(true);
            app.graph.setDirtyCanvas(true, true);
            resolve();
          }, "image/png");
        });
      };

      // Draw
      const origDrawFg = nodeType.prototype.onDrawForeground;
      nodeType.prototype.onDrawForeground = function (ctx) {
        if (this.flags?.collapsed) return;
        const r = this._sam_computeRect();
        this._sam_rect = r;
        // Update DOM overlay position/size to match draw rect
        try {
          const ov = this._sam_overlay;
          const cnv = app?.canvas?.canvas;
          const ds = app?.canvas?.ds;
          if (ov && cnv && ds) {
            const scale = ds.scale || 1;
            const ox = ds.offset?.[0] || 0;
            const oy = ds.offset?.[1] || 0;
            const left = (this.pos[0] + r.x) * scale + ox;
            const top = (this.pos[1] + r.y) * scale + oy;
            const width = Math.max(1, r.w * scale);
            const height = Math.max(1, r.h * scale);
            // Clamp within canvas bounds
            ov.style.left = `${left}px`;
            ov.style.top = `${top}px`;
            ov.style.width = `${width}px`;
            ov.style.height = `${height}px`;
            ov.style.display = this._sam_img ? "block" : "none";
          }
        } catch {}
        ctx.save();
        ctx.beginPath();
        ctx.rect(r.x, r.y, r.w, r.h);
        ctx.clip();
        ctx.fillStyle = "#000";
        ctx.fillRect(r.x, r.y, r.w, r.h);
        if (this._sam_img) {
          ctx.drawImage(this._sam_img, 0, 0, this._sam_img.width, this._sam_img.height, r.x, r.y, r.w, r.h);
        }
        if (this._sam_maskImg) {
          ctx.globalAlpha = 0.5;
          ctx.drawImage(this._sam_maskImg, 0, 0, this._sam_maskImg.width, this._sam_maskImg.height, r.x, r.y, r.w, r.h);
          ctx.globalAlpha = 1.0;
        }
        // Draw points
        if (this._sam_points?.length) {
          for (const p of this._sam_points) {
            const sx = r.x + (p.x / this._sam_imgW) * r.w;
            const sy = r.y + (p.y / this._sam_imgH) * r.h;
            ctx.beginPath();
            ctx.arc(sx, sy, 4, 0, Math.PI * 2);
            ctx.fillStyle = p.positive ? "blue" : "red";
            ctx.fill();
          }
        }
        // Brush cursor (use +/- to switch mode)
        if (this._sam_mouse.inside) {
          ctx.beginPath();
          ctx.arc(this._sam_mouse.x, this._sam_mouse.y, this._sam_brush / 2, 0, Math.PI * 2);
          ctx.strokeStyle = this._sam_isPositive ? "rgba(0,128,255,0.95)" : "rgba(255,64,64,0.95)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Status text overlay
        ctx.save();
        ctx.fillStyle = "#ddd";
        ctx.font = "12px sans-serif";
        const status = this._sam_prepareFailed
          ? "SAM: prepare failed"
          : (!this._sam_prepareOk ? "SAM: preparing..." : (this._sam_detectBusy ? "SAM: detecting..." : (this._sam_maskImg ? "SAM: ready" : "SAM: idle")));
        ctx.fillText(status, r.x + 6, r.y + 16);
        ctx.restore();
        ctx.restore();

        return origDrawFg?.apply(this, arguments);
      };

      // Initial
      if (this.inputs?.[0]?.link) loadInputImage();
    };
  },
});


