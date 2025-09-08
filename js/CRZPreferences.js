// ComfyUI - CRZ Nodes Preferences
import { app } from "../../scripts/app.js";

// Toggle dashboard and passthrough connections function
const toggleDashboardConnections = () => {
    const prefs = JSON.parse(localStorage.getItem("crz_preferences") || "{}");
    const newValue = !prefs.always_show_dashboard_connections;
    
    const newPrefs = {
        ...prefs,
        always_show_dashboard_connections: newValue,
        always_show_passthrough: newValue
    };
    
    localStorage.setItem("crz_preferences", JSON.stringify(newPrefs));
    window.dispatchEvent(new CustomEvent("crz_preferences_changed", { detail: newPrefs }));
    
    // Force redraw to apply changes immediately
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
    
    // Remove any existing notification first
    const existingNotification = document.getElementById('crz-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Show brief notification
    const notification = document.createElement("div");
    notification.id = 'crz-notification';
    notification.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 100px;
        background: ${newValue ? '#46975e3a' : '#8046973a'};
        color: white;
        padding: 12px 20px;
        border-radius: 20px;
        z-index: 10001;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        transition: opacity 0.3s ease;
    `;
    notification.textContent = `CRZ connections ${newValue ? 'enabled' : 'hidden'}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 2000);
};


app.registerExtension({
    name: "CRZ.Preferences",
    commands: [
        {
            id: "crz_toggle_connections",
            label: "Toggle CRZ Connections",
            function: () => {
                toggleDashboardConnections();
            }
        }
    ],
    keybindings: [
        {
            combo: { key: "`", alt: true },
            commandId: "crz_toggle_connections"
        }
    ],
    async setup() {
        // Register CRZ sidebar tab
        app.extensionManager.registerSidebarTab({
            id: "crz_settings",
            icon: "pi pi-cog",
            title: "CRZ",
            tooltip: "CRZ Nodes Settings",
            type: "custom",
            render: (el) => {
                // Function to render sidebar content
                const renderSidebarContent = () => {
                    // Clear any existing content
                    el.innerHTML = '';
                    
                    // Create container
                    const container = document.createElement('div');
                    container.style.cssText = `
                        padding: 15px;
                        color: #fff;
                        font-family: Arial, sans-serif;
                    `;
                    
                    // Create header
                    const header = document.createElement('h3');
                    header.textContent = 'CRZ Nodes Settings';
                    header.style.cssText = `
                        margin: 0 0 20px 0;
                        color: #fff;
                        font-size: 18px;
                        border-bottom: 1px solid #333;
                        padding-bottom: 10px;
                    `;
                    
                    // Create settings container
                    const settingsContainer = document.createElement('div');
                    settingsContainer.style.cssText = `
                        display: flex;
                        flex-direction: column;
                        gap: 15px;
                    `;
                    
                    // Load current preferences
                    const prefs = JSON.parse(localStorage.getItem("crz_preferences") || "{}");
                
                // Helper to save preferences
                const savePreferences = () => {
                    const newPrefs = {
                        always_show_passthrough: passthroughCheckbox.checked,
                        always_show_dashboard_connections: dashboardCheckbox.checked,
                        show_passthrough_on_hover: passthroughHoverCheckbox.checked,
                        always_show_floating_button: false // Always false since we're using sidebar now
                    };
                    localStorage.setItem("crz_preferences", JSON.stringify(newPrefs));
                    window.dispatchEvent(new CustomEvent("crz_preferences_changed", { detail: newPrefs }));
                    
                    // Force redraw
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
                
                // Create passthrough connections checkbox
                const passthroughContainer = document.createElement('div');
                passthroughContainer.style.cssText = 'display: flex; align-items: center; gap: 8px;';
                
                const passthroughCheckbox = document.createElement('input');
                passthroughCheckbox.type = 'checkbox';
                passthroughCheckbox.id = 'sidebar_passthrough';
                passthroughCheckbox.checked = prefs.always_show_passthrough === true;
                passthroughCheckbox.addEventListener('change', savePreferences);
                
                const passthroughLabel = document.createElement('label');
                passthroughLabel.htmlFor = 'sidebar_passthrough';
                passthroughLabel.textContent = 'Show passthrough connections';
                passthroughLabel.style.cssText = 'color: #fff; cursor: pointer; user-select: none;';
                
                passthroughContainer.appendChild(passthroughCheckbox);
                passthroughContainer.appendChild(passthroughLabel);
                
                // Create dashboard connections checkbox
                const dashboardContainer = document.createElement('div');
                dashboardContainer.style.cssText = 'display: flex; align-items: center; gap: 8px;';
                
                const dashboardCheckbox = document.createElement('input');
                dashboardCheckbox.type = 'checkbox';
                dashboardCheckbox.id = 'sidebar_dashboard';
                dashboardCheckbox.checked = prefs.always_show_dashboard_connections === true;
                dashboardCheckbox.addEventListener('change', savePreferences);
                
                const dashboardLabel = document.createElement('label');
                dashboardLabel.htmlFor = 'sidebar_dashboard';
                dashboardLabel.textContent = 'Show dashboard connections';
                dashboardLabel.style.cssText = 'color: #fff; cursor: pointer; user-select: none;';
                
                dashboardContainer.appendChild(dashboardCheckbox);
                dashboardContainer.appendChild(dashboardLabel);
                
                // Create passthrough hover setting
                const passthroughHoverContainer = document.createElement('div');
                passthroughHoverContainer.style.cssText = 'display: flex; align-items: center; gap: 8px;';
                
                const passthroughHoverCheckbox = document.createElement('input');
                passthroughHoverCheckbox.type = 'checkbox';
                passthroughHoverCheckbox.id = 'sidebar_passthrough_hover';
                passthroughHoverCheckbox.checked = prefs.show_passthrough_on_hover !== false; // Default to true
                passthroughHoverCheckbox.addEventListener('change', savePreferences);
                
                const passthroughHoverLabel = document.createElement('label');
                passthroughHoverLabel.htmlFor = 'sidebar_passthrough_hover';
                passthroughHoverLabel.textContent = 'Show passthrough connections on hover';
                passthroughHoverLabel.style.cssText = 'color: #fff; cursor: pointer; user-select: none;';
                
                passthroughHoverContainer.appendChild(passthroughHoverCheckbox);
                passthroughHoverContainer.appendChild(passthroughHoverLabel);
                
                // Create keyboard shortcuts info
                const shortcutsInfo = document.createElement('div');

                
                // Assemble the UI
                settingsContainer.appendChild(passthroughHoverContainer);
                settingsContainer.appendChild(passthroughContainer);
                settingsContainer.appendChild(dashboardContainer);
                
                
                container.appendChild(header);
                container.appendChild(settingsContainer);

                
                el.appendChild(container);
                };
                
                // Initial render
                renderSidebarContent();
                
                // Listen for refresh events from dialog
                window.addEventListener("crz_sidebar_refresh", renderSidebarContent);
            }
        });
    }
});
