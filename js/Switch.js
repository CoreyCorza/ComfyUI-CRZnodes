// ComfyUI.CRZ.Switch - Minimal JS for native widget
import { app } from "../../scripts/app.js";
import { 
    NODE_WIDTH, 
    NODE_HEIGHT_MULTIPLIER
} from "./CRZConfig.js";

// Switch node dimensions
const SWITCH_WIDTH = 80;
const SWITCH_HEIGHT = 60;

app.registerExtension({
    name: "CRZSwitch",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "CRZSwitch") {
            // Hide the title bar 
            nodeType.title_mode = LiteGraph.NO_TITLE;
            nodeType.prototype.getTitle = function() { return ""; };
            nodeType.prototype.onDrawTitle = function() { return false; };
            
            // Set fixed size and disable resizing
            nodeType.min_size = [SWITCH_WIDTH, SWITCH_HEIGHT];
            
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) {
                    onNodeCreated.apply(this, arguments);
                }
                
                // Set fixed size and disable resizing
                this.size = [SWITCH_WIDTH, SWITCH_HEIGHT];
                this.resizable = true;
                
                // Hide the boolean widget while keeping it functional
                if (this.widgets && this.widgets[0]) {
                    this.widgets[0].hidden = true;
                    this.widgets_start_y = 44;
                }
                
                // Mark as CRZ node for connection hiding
                this.isCRZNode = true;
                
                // Add property change listener to force redraws when values change
                this.onPropertyChanged = function(name, value, prev_value) {
                    if (this.graph && this.graph.setDirtyCanvas) {
                        this.graph.setDirtyCanvas(true);
                    }
                };
                
                // Add connection change listener to monitor input changes
                this.onConnectionsChange = function(type, slotIndex, isConnected, linkInfo, ioSlot) {
                    if (this.graph && this.graph.setDirtyCanvas) {
                        this.graph.setDirtyCanvas(true);
                    }
                };
                
                // Force continuous updates when boolean input is connected
                this._updateInterval = setInterval(() => {
                    const boolConnected = this.inputs && this.inputs.length >= 3 && this.inputs[2] && this.inputs[2].link !== null;
                    if (boolConnected && this.graph && this.graph.setDirtyCanvas) {
                        this.graph.setDirtyCanvas(true);
                    }
                }, 500); // Update every 100ms when connected, probably not a good idea
                // TODO: Figure something else out
                
                // Cleanup interval when node is removed
                this.onRemoved = function() {
                    if (this._updateInterval) {
                        clearInterval(this._updateInterval);
                    }
                };
                
                // Set input labels for clarity - match Python parameter names
                this.onAdded = function() {
                    if (this.inputs && this.inputs.length >= 2) {
                        // Should only have 2 data inputs now
                        this.inputs[0].name = "true_input";
                        this.inputs[0].localized_name = " ";
                        this.inputs[1].name = "false_input"; 
                        this.inputs[1].localized_name = " ";
                    }
                    // Hide output socket label
                    if (this.outputs && this.outputs[0]) {
                        this.outputs[0].name = this.outputs[0].localized_name = "";
                    }
                };
                
                // Ensure labels are set on configure too
                const originalOnConfigure = this.onConfigure;
                this.onConfigure = function(info) {
                    if (originalOnConfigure) {
                        originalOnConfigure.call(this, info);
                    }
                    if (this.inputs && this.inputs.length >= 2) {
                        this.inputs[0].name = "true_input";
                        this.inputs[0].localized_name = " ";
                        this.inputs[1].name = "false_input";
                        this.inputs[1].localized_name = " ";
                    }
                    if (this.outputs && this.outputs[0]) {
                        this.outputs[0].name = this.outputs[0].localized_name = "";
                    }
                };
            }
            
            // Override computeSize to force fixed size
            nodeType.prototype.computeSize = function() {
                return [SWITCH_WIDTH, SWITCH_HEIGHT];
            };

            nodeType.prototype.onDrawForeground = function(ctx) {
                if (this.flags.collapsed) return;
                
                // Get the boolean value (check connected input first, then widget)
                let switchValue = false;
                
                // Check if boolean input is connected (Switch has 3rd input for boolean)
                const boolConnected = this.inputs && this.inputs.length >= 3 && this.inputs[2] && this.inputs[2].link !== null;
                
                if (boolConnected) {
                    // If connected, get from connected source
                    try {
                        const boolLink = this.graph.links[this.inputs[2].link];
                        if (boolLink) {
                            const sourceNode = this.graph.getNodeById(boolLink.origin_id);
                            if (sourceNode) {
                                // For Compare nodes, try to calculate the comparison result directly
                                if (sourceNode.type === "CRZCompare" || (sourceNode.title && sourceNode.title.includes("Compare"))) {
                                    // Get Compare node's inputs
                                    const inputA = sourceNode.inputs?.[0];
                                    const inputB = sourceNode.inputs?.[1];
                                    
                                    if (inputA && inputB && inputA.link != null && inputB.link != null) {
                                        try {
                                            const aLink = sourceNode.graph.links[inputA.link];
                                            const bLink = sourceNode.graph.links[inputB.link];
                                            
                                            if (aLink && bLink) {
                                                const aNode = sourceNode.graph.getNodeById(aLink.origin_id);
                                                const bNode = sourceNode.graph.getNodeById(bLink.origin_id);
                                                
                                                let aValue = null;
                                                let bValue = null;
                                                
                                                if (aNode && aNode.widgets && aNode.widgets.length > 0) {
                                                    aValue = aNode.widgets[0].value;
                                                }
                                                if (bNode && bNode.widgets && bNode.widgets.length > 0) {
                                                    bValue = bNode.widgets[0].value;
                                                }
                                                
                                                if (aValue !== null && bValue !== null) {
                                                    const operator = sourceNode.properties?.operator || "=";
                                                    switch (operator) {
                                                        case ">":
                                                            switchValue = (Number(aValue) > Number(bValue));
                                                            break;
                                                        case "<":
                                                            switchValue = (Number(aValue) < Number(bValue));
                                                            break;
                                                        case ">=":
                                                            switchValue = (Number(aValue) >= Number(bValue));
                                                            break;
                                                        case "<=":
                                                            switchValue = (Number(aValue) <= Number(bValue));
                                                            break;
                                                        case "=":
                                                        default:
                                                            switchValue = (aValue == bValue);
                                                            break;
                                                    }
                                                } else {
                                                    switchValue = false;
                                                }
                                            }
                                        } catch (e) {
                                            switchValue = false;
                                        }
                                    } else {
                                        switchValue = false;
                                    }
                                } else {
                                    // For other node types, try to get widget value
                                    if (sourceNode.widgets && sourceNode.widgets.length > 0) {
                                        switchValue = !!sourceNode.widgets[0].value;
                                    } else {
                                        switchValue = false;
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        switchValue = false;
                    }
                } else {
                    // If not connected, use internal widget
                    if (this.widgets && this.widgets[0]) {
                        switchValue = !!this.widgets[0].value;
                    }
                }
                
                // Update input socket colors based on switch value
                if (this.inputs && this.inputs.length >= 2) {
                    // True input (first) - active when switchValue is true
                    this.inputs[0].color_on = switchValue ? "#95fd80" : "rgba(90, 90, 90, 1)";
                    this.inputs[0].color_off = switchValue ? "#95fd80" : "rgba(90, 90, 90, 1)";
                    
                    // False input (second) - active when switchValue is false  
                    this.inputs[1].color_on = !switchValue ? "#95fd80" : "rgba(90, 90, 90, 1)";
                    this.inputs[1].color_off = !switchValue ? "#95fd80" : "rgba(90, 90, 90, 1)";
                }
                
                
                // Draw S-curve connection from active input to output
                if (this.inputs && this.inputs.length >= 2 && this.outputs && this.outputs[0]) {
                    const activeInputIndex = switchValue ? 0 : 1; // True=0, False=1
                    
                    // Calculate positions
                    const inputY = LiteGraph.NODE_SLOT_HEIGHT * (activeInputIndex + 0.5) +4;
                    const outputY = LiteGraph.NODE_SLOT_HEIGHT * 0.5 +4;
                    const startX = 8;
                    const endX = this.size[0] -8;
                    
                    // Draw S-curve
                    ctx.strokeStyle = "#95fd80a6";
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(startX, inputY);
                    
                    // S-curve control points
                    const midX = this.size[0] / 2;
                    const cp1X = midX * 1.2;
                    const cp2X = midX * 1.2;
                    
                    ctx.bezierCurveTo(cp1X, inputY, cp2X, outputY, endX, outputY);
                    ctx.stroke();
                }
                
                // Track value changes to force redraws
                if (this._lastSwitchValue !== switchValue) {
                    this._lastSwitchValue = switchValue;
                    // Force a redraw on next frame
                    if (this.graph && this.graph.setDirtyCanvas) {
                        requestAnimationFrame(() => {
                            if (this.graph && this.graph.setDirtyCanvas) {
                                this.graph.setDirtyCanvas(true);
                            }
                        });
                    }
                }
            };

        }
    }
}); 