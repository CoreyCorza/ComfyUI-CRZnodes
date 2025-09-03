// ComfyUI - CRZ Nodes Preferences
import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "CRZ.Preferences",
    async setup() {
        // Show CRZ preferences dialog (standalone function)
        const showCRZPreferencesDialog = () => {
            const dialog = document.createElement("div");
            dialog.id = "crz-preferences-dialog";
            dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 100vw;
                height: 100vh;
                background: rgba(0,0,0,0.5);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                pointer-events: auto;
            `;

            const content = document.createElement("div");
            content.style.cssText = `
                background: #202020;
                border: 1px solid #333;
                border-radius: 8px;
                padding: 20px;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                position: relative;
                box-shadow: 0 4px 20px rgba(0,0,0,0.8);
            `;

            content.innerHTML = `
                <h2 style="color: #fff; margin-top: 0;">CRZ Nodes Preferences</h2>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #fff; display: block; margin-bottom: 5px;">
                        <input type="checkbox" id="always_show_passthrough" style="margin-right: 8px;">
                        Always show passthrough connections
                    </label>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="color: #fff; display: block; margin-bottom: 5px;">
                        <input type="checkbox" id="always_hide_crz_connections" style="margin-right: 8px;">
                        Always hide dashboard connections
                    </label>
                </div>

                <div style="text-align: right;">
                    <button id="save_prefs" style="background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Save</button>
                    <button id="cancel_prefs" style="background: #666; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Close</button>
                </div>
            `;

            dialog.appendChild(content);
            document.body.appendChild(dialog);

            // Load current preferences
            const prefs = JSON.parse(localStorage.getItem("crz_preferences") || "{}");
            content.querySelector("#always_show_passthrough").checked = prefs.always_show_passthrough === true;
            content.querySelector("#always_hide_crz_connections").checked = prefs.always_hide_crz_connections === true;

            // Helper to force all canvases to redraw now
            const forceRedraw = () => {
                try {
                    if (window?.LiteGraph?.LGraphCanvas?.active_canvas) {
                        window.LiteGraph.LGraphCanvas.active_canvas.setDirty(true, true);
                    }
                    if (app?.graph?.list_of_graphcanvas?.length) {
                        for (const gc of app.graph.list_of_graphcanvas) {
                            try { gc.setDirty(true, true); } catch (_) {}
                        }
                    }
                    if (app?.canvas) {
                        try { app.canvas.setDirty(true, true); } catch (_) {}
                    }
                } catch (_) {}
            };

            // Helper to read current UI state and persist
            const persistFromUI = () => {
                const newPrefs = {
                    always_show_passthrough: content.querySelector("#always_show_passthrough").checked,
                    always_hide_crz_connections: content.querySelector("#always_hide_crz_connections").checked
                };
                localStorage.setItem("crz_preferences", JSON.stringify(newPrefs));
                window.dispatchEvent(new CustomEvent("crz_preferences_changed", { detail: newPrefs }));
                forceRedraw();
                setTimeout(forceRedraw, 0);
                setTimeout(forceRedraw, 50);
            };

            // Live update on toggle
            content.querySelector("#always_show_passthrough").addEventListener("change", persistFromUI);
            content.querySelector("#always_hide_crz_connections").addEventListener("change", persistFromUI);

            content.querySelector("#save_prefs").addEventListener("click", () => {
                persistFromUI();
                document.body.removeChild(dialog);
            });

            content.querySelector("#cancel_prefs").addEventListener("click", () => {
                document.body.removeChild(dialog);
            });

            // Close on background click
            dialog.addEventListener("click", (e) => {
                if (e.target === dialog) {
                    document.body.removeChild(dialog);
                }
            });
        };

        // Keyboard shortcut
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+C to open CRZ preferences
            if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                showCRZPreferencesDialog();
            }
        });

        // Add floating button
        const addCRZButton = () => {
            if (document.getElementById('crz-settings-button')) return; // avoid duplicates
            const btn = document.createElement('button');
            btn.id = 'crz-settings-button';
            btn.innerHTML = 'CRZ';
            btn.style.cssText = `
                position: fixed;
                top: 120px;
                right: 20px;
                z-index: 2147483647; /* max */
                background: #3f3f3f5d;
                color: white;
                border: none;
                padding: 6px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 10px;
                font-weight: bold;
                box-shadow: 0 2px 8px rgba(0,0,0,0.35);
                pointer-events: auto;
                opacity: 0.3;
                transition: opacity 120ms ease-in-out;
            `;
            btn.title = 'CRZ Nodes Settings (Ctrl+Shift+C)';
            btn.onclick = () => showCRZPreferencesDialog();
            btn.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
            btn.addEventListener('mouseleave', () => { btn.style.opacity = '0.3'; });
            (document.body || document.documentElement).appendChild(btn);
        };

        // Try immediately, then retry a few times in case UI isn't ready yet
        setTimeout(addCRZButton, 500);
        setTimeout(addCRZButton, 1500);
        setTimeout(addCRZButton, 3000);
    }
});
