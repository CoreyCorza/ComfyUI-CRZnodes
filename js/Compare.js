// ComfyUI.CRZ.Compare - Compare two values and output boolean
import { app } from "../../scripts/app.js";
import { 
    NODE_BACKGROUND_COLOR,
    LABEL_COLOR,
    INACTIVE_LABEL_COLOR,
    VALUE_COLOR,
    INACTIVE_VALUE_COLOR,
    TOGGLE_HEIGHT,
    TOGGLE_CORNER_RADIUS,
    HANDLE_SIZE,
    HANDLE_CORNER_RADIUS,
    HANDLE_PADDING
} from "./CRZConfig.js";

// Compare node dimensions
const COMPARE_WIDTH = 100;
const COMPARE_HEIGHT = 48;

app.registerExtension({
    name: "CRZCompare",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "CRZCompare") {
            // Hide the title bar 
            nodeType.title_mode = LiteGraph.NO_TITLE;
            nodeType.prototype.getTitle = function() { return ""; };
            nodeType.prototype.onDrawTitle = function() { return false; };
            
            // Set fixed size and disable resizing
            nodeType.min_size = [COMPARE_WIDTH, COMPARE_HEIGHT];
            
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) {
                    onNodeCreated.apply(this, arguments);
                }
                
                // Set background color 
                this.bgcolor = NODE_BACKGROUND_COLOR;
                
                // Set fixed size and disable resizing
                this.size = [COMPARE_WIDTH, COMPARE_HEIGHT];
                this.resizable = false;
                
                // Initialize operator widget for syncing with Python
                if (this.widgets && this.widgets.length > 0) {
                    // Find or create the operator widget
                    let operatorWidget = this.widgets.find(w => w.name === "operator");
                    if (!operatorWidget) {
                        operatorWidget = this.addWidget("text", "operator", "=", function(v) {
                            this.properties.operator = v;
                        });
                    }
                    operatorWidget.value = this.properties.operator || "=";
                    operatorWidget.hidden = true;
                    operatorWidget.type = "hidden";
                    
                    // Hide other widgets
                    for (let widget of this.widgets) {
                        if (widget !== operatorWidget) {
                            widget.hidden = true;
                        }
                    }
                } else {
                    // Manually create the operator widget
                    const operatorWidget = this.addWidget("text", "operator", "=", function(v) {
                        this.properties.operator = v;
                    });
                    operatorWidget.hidden = true;
                    operatorWidget.type = "hidden";
                }
                
                // Set input and output labels for clarity
                this.onAdded = function() {
                    if (this.inputs && this.inputs.length >= 2) {
                        this.inputs[0].name = "a";
                        this.inputs[0].localized_name = "A";
                        this.inputs[1].name = "b"; 
                        this.inputs[1].localized_name = "B";
                    }
                    // Hide output socket label but keep the boolean indicator
                    if (this.outputs && this.outputs[0]) {
                        this.outputs[0].name = this.outputs[0].localized_name = "";
                    }
                    
                    // Move widgets off-screen 
                    this.widgets_start_y = -2.4e8 * LiteGraph.NODE_SLOT_HEIGHT;
                };
                
                // Ensure labels are set on configure too
                const originalOnConfigure = this.onConfigure;
                this.onConfigure = function(info) {
                    if (originalOnConfigure) {
                        originalOnConfigure.call(this, info);
                    }
                    if (this.inputs && this.inputs.length >= 2) {
                        this.inputs[0].name = "a";
                        this.inputs[0].localized_name = "A";
                        this.inputs[1].name = "b";
                        this.inputs[1].localized_name = "B";
                    }
                    if (this.outputs && this.outputs[0]) {
                        this.outputs[0].name = this.outputs[0].localized_name = "";
                    }
                };
                
                // Initialize comparison operator property
                this.properties = this.properties || {};
                this.properties.operator = this.properties.operator || "=";
                
                // Double-click handler for configuration
                this.onDblClick = function(e, pos, canvas) {
                    const currentOp = this.properties.operator || "=";
                    
                    canvas.prompt(
                        "Comparison Operator (=, >, <, >=, <=)", 
                        currentOp,
                        function(newOp) {
                            if (newOp && (newOp === "=" || newOp === ">" || newOp === "<" || newOp === ">=" || newOp === "<=")) {
                                this.properties.operator = newOp;
                                
                                // Update the hidden widget to sync with Python
                                const operatorWidget = this.widgets.find(w => w.name === "operator");
                                if (operatorWidget) {
                                    operatorWidget.value = newOp;
                                }
                                
                                // Force redraw to show new operator
                                if (this.graph && this.graph.setDirtyCanvas) {
                                    this.graph.setDirtyCanvas(true);
                                }
                            }
                        }.bind(this),
                        e
                    );
                    return true;
                };
                
                // Mark as CRZ node for connection hiding
                this.isCRZNode = true;
            }
            
            // Override computeSize to force fixed size
            nodeType.prototype.computeSize = function() {
                return [COMPARE_WIDTH, COMPARE_HEIGHT];
            };

            // Custom drawing for the compare visualization
            nodeType.prototype.onDrawForeground = function(ctx) {
                if (this.flags.collapsed) return;
                
                // Get input values for comparison preview
                const inputA = this.inputs?.[0];
                const inputB = this.inputs?.[1];
                const output = this.outputs?.[0];
                
                // Check if inputs are connected
                const aConnected = inputA && inputA.link != null;
                const bConnected = inputB && inputB.link != null;
                const outputConnected = output && output.links && output.links.length > 0;
                
                // Determine if node is active
                const isActive = aConnected || bConnected || outputConnected;
                
                // Choose colors based on active status
                const labelColor = isActive ? LABEL_COLOR : INACTIVE_LABEL_COLOR;
                const valueColor = isActive ? VALUE_COLOR : INACTIVE_VALUE_COLOR;
                
                // Draw result indicator (boolean toggle-style)
                const toggleWidth = 30;
                const toggleHeight = TOGGLE_HEIGHT;
                const toggleLeft = (this.size[0] - toggleWidth) / 2 + 8;
                const toggleY = this.size[1] / 2 - 8;
                
                // Try to get actual comparison result for preview
                let previewResult = false;
                
                if (aConnected && bConnected) {
                    try {
                        // Try to get the actual input values from connected nodes
                        const aLink = this.graph.links[inputA.link];
                        const bLink = this.graph.links[inputB.link];
                        
                        if (aLink && bLink) {
                            const aNode = this.graph.getNodeById(aLink.origin_id);
                            const bNode = this.graph.getNodeById(bLink.origin_id);
                            
                            // Try to get output values (this may not always work)
                            let aValue = null;
                            let bValue = null;
                            
                            // For basic nodes, try to get widget values
                            if (aNode && aNode.widgets && aNode.widgets.length > 0) {
                                aValue = aNode.widgets[0].value;
                            }
                            if (bNode && bNode.widgets && bNode.widgets.length > 0) {
                                bValue = bNode.widgets[0].value;
                            }
                            
                            // If we got both values, compare them based on operator
                            if (aValue !== null && bValue !== null) {
                                const operator = this.properties.operator || "=";
                                switch (operator) {
                                    case ">":
                                        previewResult = (Number(aValue) > Number(bValue));
                                        break;
                                    case "<":
                                        previewResult = (Number(aValue) < Number(bValue));
                                        break;
                                    case ">=":
                                        previewResult = (Number(aValue) >= Number(bValue));
                                        break;
                                    case "<=":
                                        previewResult = (Number(aValue) <= Number(bValue));
                                        break;
                                    case "=":
                                    default:
                                        previewResult = (aValue == bValue);
                                        break;
                                }
                            } else {
                                // Fallback: show true when both connected but can't get values
                                previewResult = true;
                            }
                        }
                    } catch (e) {
                        // If anything fails, show true when both connected
                        previewResult = true;
                    }
                } else {
                    // Not fully connected, show false
                    previewResult = false;
                }
                
                // Draw toggle background
                ctx.fillStyle = isActive ? 
                    (previewResult ? "rgba(106, 194, 65, 0.281)" : "rgba(226, 74, 74, 0.281)") : 
                    "#2b2b2b";
                ctx.beginPath();
                ctx.roundRect(toggleLeft, toggleY, toggleWidth, toggleHeight, TOGGLE_CORNER_RADIUS);
                ctx.fill();
                
                // Draw toggle handle
                const handleX = previewResult ? 
                    toggleLeft + toggleWidth - HANDLE_SIZE - HANDLE_PADDING : 
                    toggleLeft + HANDLE_PADDING;
                const handleY = toggleY + (toggleHeight - HANDLE_SIZE) / 2;
                
                ctx.fillStyle = isActive ? "rgba(122, 122, 122, 0.562)" : "#555";
                ctx.beginPath();
                ctx.roundRect(handleX, handleY, HANDLE_SIZE, HANDLE_SIZE, HANDLE_CORNER_RADIUS);
                ctx.fill();
                
                // Draw the operator text
                const operator = this.properties.operator || "=";
                ctx.fillStyle = labelColor;
                ctx.font = "12px Arial";
                ctx.textAlign = "center";
                // ctx.textBaseline = "middle";
                
                // Position the operator text above the toggle
                const textX = this.size[0] / 2+7;
                const textY = this.size[1] / 2 +4;
                ctx.fillText(operator, textX, textY);
            };
        }
    }
});
