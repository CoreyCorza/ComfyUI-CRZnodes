// ComfyUI - CRZ Passthrough JS Extension
import { app } from "../../scripts/app.js";



app.registerExtension({
    name: "CRZ.Passthrough",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "CRZPassthrough") {
            // Set node properties for minimal visibility
            nodeType.title_mode = LiteGraph.NO_TITLE;
            
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                
                // Set transparent background
                // this.bgcolor = "transparent";
                this.bgcolor = "rgba(24, 24, 24, 0.829)"
                this.color = "transparent";
                this.boxcolor = "transparent";
                
                this.size = [80, 28];
                this.resizable = true;
                
                // Hide input/output labels like other CRZ nodes
                if (this.inputs && this.inputs[0]) {
                    this.inputs[0].localized_name = " ";
                }
                if (this.outputs && this.outputs[0]) {
                    this.outputs[0].localized_name = " ";
                }
                
                // Mark this as a passthrough node for identification
                this.isPassthrough = true;
                this.isHovered = false;
                
                // Load preferences
                this.loadPreferences();
                
                // Help dynamic nodes find their final targets through the passthrough
                this.getPassthroughTarget = function() {
                    // Find what this passthrough outputs to
                    if (this.outputs && this.outputs[0] && this.outputs[0].links) {
                        const linkId = this.outputs[0].links[0];
                        const link = this.graph.links[linkId];
                        if (link) {
                            const targetNode = this.graph.getNodeById(link.target_id);
                            // If target is also a passthrough, recurse
                            if (targetNode && targetNode.isPassthrough && targetNode.getPassthroughTarget) {
                                return targetNode.getPassthroughTarget();
                            }
                            return {
                                node: targetNode,
                                input: targetNode?.inputs?.[link.target_slot]
                            };
                        }
                    }
                    return null;
                };
                
                return r;
            };

            // Add proper initialization handling
            const originalOnConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function(info) {
                if (originalOnConfigure) {
                    originalOnConfigure.call(this, info);
                }
                // Force a property change event to ensure proper initialization
                this.setDirtyCanvas(true, true);
            };

            // Notify connected nodes when our connections change
            const originalOnConnectionsChange = nodeType.prototype.onConnectionsChange;
            nodeType.prototype.onConnectionsChange = function(type, slotIndex, isConnected, linkInfo, ioSlot) {
                if (originalOnConnectionsChange) {
                    originalOnConnectionsChange.call(this, type, slotIndex, isConnected, linkInfo, ioSlot);
                }
                
                // When our output connection changes, notify any upstream dropdowns
                if (type === LiteGraph.OUTPUT && this.inputs && this.inputs[0] && this.inputs[0].link) {
                    const inputLinkId = this.inputs[0].link;
                    const inputLink = this.graph.links[inputLinkId];
                    if (inputLink) {
                        const sourceNode = this.graph.getNodeById(inputLink.origin_id);
                        if (sourceNode && sourceNode.updateComboOptions) {
                            setTimeout(() => {
                                sourceNode.updateComboOptions();
                            }, 100);
                        }
                    }
                }
            };

            const originalOnGraphConfigured = nodeType.prototype.onGraphConfigured;
            nodeType.prototype.onGraphConfigured = function() {
                if (originalOnGraphConfigured) {
                    originalOnGraphConfigured.call(this);
                }
                // Ensure the node is marked as configured
                this.configured = true;
                // Force canvas update
                this.setDirtyCanvas(true, true);
            };

            // Add mouse hover detection for passthrough nodes
            const originalOnMouseEnter = nodeType.prototype.onMouseEnter;
            nodeType.prototype.onMouseEnter = function(e) {
                if (originalOnMouseEnter) {
                    originalOnMouseEnter.call(this, e);
                }
                this.isHovered = true;
                // --- BEGIN: CRZ Passthrough hover logic for show all links ---
                if (this.isPassthrough) {
                    window.CRZ_passthrough_hovered = true;
                    window.CRZ_passthrough_show_all_links = window.CRZ_passthrough_hovered && (window.CRZ_ctrl_held || (e && e.ctrlKey));
                    if (this.graph && this.graph.canvas) {
                        this.graph.canvas.setDirty(true, true);
                    }
                }
                // --- END: CRZ Passthrough hover logic ---
                // Force canvas redraw to show connections
                if (this.graph && this.graph.canvas) {
                    this.graph.canvas.setDirty(true, true);
                }
            };

            const originalOnMouseLeave = nodeType.prototype.onMouseLeave;
            nodeType.prototype.onMouseLeave = function(e) {
                if (originalOnMouseLeave) {
                    originalOnMouseLeave.call(this, e);
                }
                this.isHovered = false;
                // --- BEGIN: CRZ Passthrough hover logic for show all links ---
                if (this.isPassthrough) {
                    window.CRZ_passthrough_hovered = false;
                    window.CRZ_passthrough_show_all_links = false;
                    if (this.graph && this.graph.canvas) {
                        this.graph.canvas.setDirty(true, true);
                    }
                }
                // --- END: CRZ Passthrough hover logic ---
                // Force canvas redraw to hide connections again
                if (this.graph && this.graph.canvas) {
                    this.graph.canvas.setDirty(true, true);
                }
            };

            // Override the onDrawBackground to prevent any node rendering
            nodeType.prototype.onDrawBackground = function(ctx) {
                // Don't draw anything - completely invisible node
            };

            // Override onDrawForeground to display custom title when changed
            nodeType.prototype.onDrawForeground = function(ctx) {
                // Only draw custom title if it's been changed from default
                if (this.title && this.title !== "CRZ Passthrough") {
                    ctx.fillStyle = "rgba(192, 192, 192, 0.829)";
                    ctx.font = "12px Arial";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "bottom";
                    
                    // Draw title above the node
                    const titleY = -5; // Position above the node
                    ctx.fillText(this.title, this.size[0] / 2, titleY);
                }
            };

            // Override computeSize to keep it minimal
            nodeType.prototype.computeSize = function() {
                return [80, 28];
            };
            
            // Load preferences for passthrough behavior
            nodeType.prototype.loadPreferences = function() {
                const prefs = JSON.parse(localStorage.getItem("crz_preferences") || "{}");
                this.alwaysShowConnections = prefs.always_show_passthrough === true;
            };
        }
    },
    
    // Hook into the canvas rendering to hide connections to/from passthrough nodes
    async setup() {
        // Store original method
        const originalRenderLink = LGraphCanvas.prototype.renderLink;
        
        // --- BEGIN: CRZ Passthrough global state and event listeners ---
        window.CRZ_passthrough_show_all_links = false;
        window.CRZ_passthrough_hovered = false;
        window.CRZ_ctrl_held = false;

        window.addEventListener("keydown", (e) => {
            if (e.key === "Control") {
                window.CRZ_ctrl_held = true;
                window.CRZ_passthrough_show_all_links = window.CRZ_passthrough_hovered && window.CRZ_ctrl_held;
                if (LiteGraph && LiteGraph.LGraphCanvas && LiteGraph.LGraphCanvas.active_canvas) {
                    LiteGraph.LGraphCanvas.active_canvas.setDirty(true, true);
                }
            }
        });
        window.addEventListener("keyup", (e) => {
            if (e.key === "Control") {
                window.CRZ_ctrl_held = false;
                window.CRZ_passthrough_show_all_links = false;
                if (LiteGraph && LiteGraph.LGraphCanvas && LiteGraph.LGraphCanvas.active_canvas) {
                    LiteGraph.LGraphCanvas.active_canvas.setDirty(true, true);
                }
            }
        });
        // --- END: CRZ Passthrough global state and event listeners ---
        
        // Listen for preference changes
        window.addEventListener("crz_preferences_changed", (e) => {
            // Update all passthrough nodes when preferences change
            if (LiteGraph && LiteGraph.LGraphCanvas && LiteGraph.LGraphCanvas.active_canvas) {
                const graph = LiteGraph.LGraphCanvas.active_canvas.graph;
                if (graph && graph._nodes_by_id) {
                    Object.values(graph._nodes_by_id).forEach(node => {
                        if (node.isPassthrough && node.loadPreferences) {
                            node.loadPreferences();
                        }
                    });
                }
            }
        });
        
        // Preferences are now handled by CRZPreferences.js
        
        // Helper function to check if a connection is part of a passthrough chain involving a specific node
        function isConnectionInPassthroughChain(link, selectedNode, graph) {
            if (!link || !selectedNode || !graph) return false;
            
            const originNode = graph._nodes_by_id[link.origin_id];
            const targetNode = graph._nodes_by_id[link.target_id];
            
            if (!originNode || !targetNode) return false;
            
            // If either node in this connection is the selected node, it's part of the chain
            if (originNode.id === selectedNode.id || targetNode.id === selectedNode.id) {
                return true;
            }
            
            // If this connection involves a passthrough, check if the passthrough is connected to the selected node
            if (originNode.isPassthrough) {
                // Check if this passthrough has input from the selected node
                if (originNode.inputs) {
                    for (const input of originNode.inputs) {
                        if (input.link) {
                            const inputLink = graph.links[input.link];
                            if (inputLink) {
                                const inputOrigin = graph._nodes_by_id[inputLink.origin_id];
                                if (inputOrigin && inputOrigin.id === selectedNode.id) {
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
            
            if (targetNode.isPassthrough) {
                // Check if this passthrough has output to the selected node
                if (targetNode.outputs) {
                    for (const output of targetNode.outputs) {
                        if (output.links) {
                            for (const linkId of output.links) {
                                const outputLink = graph.links[linkId];
                                if (outputLink) {
                                    const outputTarget = graph._nodes_by_id[outputLink.target_id];
                                    if (outputTarget && outputTarget.id === selectedNode.id) {
                                        return true;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            return false;
        }

        
        // Override the renderLink method to skip passthrough connections (unless hovered)
        LGraphCanvas.prototype.renderLink = function(ctx, a, b, link, skip_border, flow, color, start_dir, end_dir, num_sublinks) {
            // Skip rendering if we can't find the link
            if (!link) return originalRenderLink.call(this, ctx, a, b, link, skip_border, flow, color, start_dir, end_dir, num_sublinks);
            
            // Only apply hiding logic to established connections (not dragging/temporary links)
            // Temporary links during drag operations don't have proper origin_id/target_id
            if (typeof link.origin_id !== 'number' || typeof link.target_id !== 'number') {
                return originalRenderLink.call(this, ctx, a, b, link, skip_border, flow, color, start_dir, end_dir, num_sublinks);
            }
            
            // Get the nodes connected by this link
            let originNode = null;
            let targetNode = null;
            
            if (this.graph && this.graph._nodes_by_id) {
                originNode = this.graph._nodes_by_id[link.origin_id];
                targetNode = this.graph._nodes_by_id[link.target_id];
            }
            
            // Only hide if we have valid nodes and at least one is a passthrough
            if (!originNode || !targetNode) {
                return originalRenderLink.call(this, ctx, a, b, link, skip_border, flow, color, start_dir, end_dir, num_sublinks);
            }
            
            // Check if either node is a passthrough
            const hasPassthroughOrigin = originNode.isPassthrough;
            const hasPassthroughTarget = targetNode.isPassthrough;
            
            // --- BEGIN: CRZ Passthrough link visibility logic ---
            if (hasPassthroughOrigin || hasPassthroughTarget) {
                // Check preferences
                const prefs = JSON.parse(localStorage.getItem("crz_preferences") || "{}");
                const alwaysShow = prefs.always_show_passthrough === true;
                const alwaysHideCRZ = prefs.always_hide_crz_connections === true;
                
                // If "always hide CRZ node connections" is enabled, hide all connections to/from CRZ nodes
                if (alwaysHideCRZ) {
                    const hasCRZOrigin = originNode.isCRZNode;
                    const hasCRZTarget = targetNode.isCRZNode;
                    if (hasCRZOrigin || hasCRZTarget) {
                        return; // Hide the connection
                    }
                }
                
                // If always show is enabled, show all passthrough connections
                if (alwaysShow) {
                    return originalRenderLink.call(this, ctx, a, b, link, skip_border, flow, color, start_dir, end_dir, num_sublinks);
                }
                
                // Show all passthrough links if Ctrl+hover is active
                if (window.CRZ_passthrough_show_all_links) {
                    const originalAlpha = ctx.globalAlpha;
                    ctx.globalAlpha = 1.0;
                    const result = originalRenderLink.call(this, ctx, a, b, link, skip_border, flow, color, start_dir, end_dir, num_sublinks);
                    ctx.globalAlpha = originalAlpha;
                    return result;
                }

                // Show if either passthrough node is hovered
                if ((hasPassthroughOrigin && originNode.isHovered) ||
                    (hasPassthroughTarget && targetNode.isHovered)) {
                    return originalRenderLink.call(this, ctx, a, b, link, skip_border, flow, color, start_dir, end_dir, num_sublinks);
                }

                // Show if either passthrough node is selected
                if (this.selected_nodes) {
                    if ((hasPassthroughOrigin && this.selected_nodes[originNode.id]) ||
                        (hasPassthroughTarget && this.selected_nodes[targetNode.id])) {
                        return originalRenderLink.call(this, ctx, a, b, link, skip_border, flow, color, start_dir, end_dir, num_sublinks);
                    }
                    // Show if this connection is part of a passthrough chain involving any selected node
                    for (const selectedNode of Object.values(this.selected_nodes)) {
                        if (isConnectionInPassthroughChain(link, selectedNode, this.graph)) {
                            return originalRenderLink.call(this, ctx, a, b, link, skip_border, flow, color, start_dir, end_dir, num_sublinks);
                        }
                    }
                }
                // Otherwise, hide the passthrough link
                return;
            }
            // --- END: CRZ Passthrough link visibility logic ---

            // Check if "always hide CRZ node connections" is enabled for non-passthrough connections
            const prefs = JSON.parse(localStorage.getItem("crz_preferences") || "{}");
            const alwaysHideCRZ = prefs.always_hide_crz_connections === true;
            
            if (alwaysHideCRZ) {
                const hasCRZOrigin = originNode.isCRZNode;
                const hasCRZTarget = targetNode.isCRZNode;
                if (hasCRZOrigin || hasCRZTarget) {
                    return; // Hide the connection
                }
            }

            // Otherwise render normally
            return originalRenderLink.call(this, ctx, a, b, link, skip_border, flow, color, start_dir, end_dir, num_sublinks);
        };
        

    }
}); 