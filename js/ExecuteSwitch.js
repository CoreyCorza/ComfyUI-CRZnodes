// ComfyUI.CRZ.ExecuteSwitch
import { app } from "../../scripts/app.js";
import { 
    LABEL_COLOR,
    INACTIVE_LABEL_COLOR,
    VALUE_COLOR,
    INACTIVE_VALUE_COLOR,
    TOGGLE_WIDTH,
    TOGGLE_HEIGHT,
    TOGGLE_CORNER_RADIUS,
    HANDLE_SIZE,
    HANDLE_CORNER_RADIUS,
    HANDLE_PADDING,
    TOGGLE_ACTIVE_COLOR,
    TOGGLE_INACTIVE_COLOR,
    HANDLE_COLOR
} from "./CRZConfig.js";

// Execute Switch node dimensions
const SWITCH_WIDTH = 160;
const SWITCH_HEIGHT = 48;

app.registerExtension({
    name: "CRZExecuteSwitch",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "CRZExecuteSwitch") {
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
                this.resizable = false;
                
                // Hide the boolean widget while keeping the socket functional (like Switch node)
                if (this.widgets && this.widgets[0]) {
                    this.widgets[0].hidden = true;
                }
                
                // Set input and output labels
                this.onAdded = function() {
                    if (this.inputs && this.inputs.length >= 2) {
                        this.inputs[0].name = "input";
                        this.inputs[0].localized_name = "Input"; 
                        this.inputs[1].name = "bool";
                        this.inputs[1].localized_name = "Bool"; 
                    }
                    if (this.outputs && this.outputs.length >= 2) {
                        this.outputs[0].name = "";
                        this.outputs[0].localized_name = "";
                        this.outputs[1].name = "";
                        this.outputs[1].localized_name = "";
                    }
                    
                    // Move widgets up by one slot height to eliminate gap
                    this.widgets_start_y = 24;
                };
                
                // Ensure labels are set on configure too
                const originalOnConfigure = this.onConfigure;
                this.onConfigure = function(info) {
                    if (originalOnConfigure) {
                        originalOnConfigure.call(this, info);
                    }
                    if (this.inputs && this.inputs.length >= 2) {
                        this.inputs[0].name = "input";
                        this.inputs[0].localized_name = "Input";  
                        this.inputs[1].name = "bool";
                        this.inputs[1].localized_name = "Bool";  
                    }
                    if (this.outputs && this.outputs.length >= 2) {
                        this.outputs[0].name = "";
                        this.outputs[0].localized_name = "";
                        this.outputs[1].name = "";
                        this.outputs[1].localized_name = "";
                    }
                };
                
                // Mark as CRZ node for connection hiding
                this.isCRZNode = true;
            }
            
            // Override computeSize to force fixed size
            nodeType.prototype.computeSize = function() {
                return [SWITCH_WIDTH, SWITCH_HEIGHT];
            };

            nodeType.prototype.onDrawForeground = function(ctx) {
                if (this.flags.collapsed) return;
                
                // Check if inputs are connected
                const inputConnected = this.inputs[0] && this.inputs[0].link !== null;
                const boolConnected = this.inputs[1] && this.inputs[1].link !== null;
                const outputsConnected = (this.outputs[0] && this.outputs[0].links && this.outputs[0].links.length > 0) ||
                                       (this.outputs[1] && this.outputs[1].links && this.outputs[1].links.length > 0);
                
                const isActive = (inputConnected && boolConnected) || outputsConnected;
                const labelColor = isActive ? LABEL_COLOR : INACTIVE_LABEL_COLOR;
                
                // Get the boolean value (like Compare node)
                let switchState = false;
                
                if (boolConnected) {
                    // If connected, try to get from connected source (like Compare node)
                    try {
                        const boolLink = this.graph.links[this.inputs[1].link];
                        if (boolLink) {
                            const sourceNode = this.graph.getNodeById(boolLink.origin_id);
                            
                            // Try to get output value from source node
                            if (sourceNode && sourceNode.widgets && sourceNode.widgets.length > 0) {
                                switchState = !!sourceNode.widgets[0].value;
                            } else {
                                // Fallback: show true when connected but can't get value
                                switchState = true;
                            }
                        }
                    } catch (e) {
                        // If anything fails, show true when connected
                        switchState = true;
                    }
                } else {
                    // If not connected, get from the hidden boolean widget
                    if (this.widgets && this.widgets[0]) {
                        switchState = !!this.widgets[0].value;
                    }
                }
                
                // Update output socket colors and hide original labels (we'll draw custom text)
                if (this.outputs && this.outputs.length >= 2) {
                    // True output - active when switchState is true
                    this.outputs[0].localized_name = ""; // Hide original label
                    this.outputs[0].color_on = switchState ? "#95fd80" : "rgba(61, 61, 61, 1)";
                    this.outputs[0].color_off = switchState ? "#95fd80" : "rgba(61, 61, 61, 1)";
                    
                    // False output - active when switchState is false
                    this.outputs[1].localized_name = ""; // Hide original label
                    this.outputs[1].color_on = !switchState ? "#95fd80" : "rgba(61, 61, 61, 1)";
                    this.outputs[1].color_off = !switchState ? "#95fd80" : "rgba(61, 61, 61, 1)";
                }
                
                // Draw switch indicator (boolean toggle-style)
                const toggleWidth = 40;
                const toggleHeight = TOGGLE_HEIGHT;
                const toggleLeft = (this.size[0] - toggleWidth) / 2 - 2;
                const toggleY = this.size[1] / 2 - 8;
                
                // Toggle background
                ctx.fillStyle = isActive ? 
                    (switchState ? TOGGLE_ACTIVE_COLOR : TOGGLE_INACTIVE_COLOR) : 
                    "#2b2b2b";
                ctx.beginPath();
                ctx.roundRect(toggleLeft, toggleY, toggleWidth, toggleHeight, TOGGLE_CORNER_RADIUS);
                ctx.fill();
                
                // Toggle handle position
                const leftPos = toggleLeft + HANDLE_PADDING;
                const rightPos = toggleLeft + toggleWidth - HANDLE_SIZE - HANDLE_PADDING;
                const handleX = leftPos + (rightPos - leftPos) * (switchState ? 1 : 0);
                const handleY = toggleY + (toggleHeight - HANDLE_SIZE) / 2;
                
                ctx.fillStyle = isActive ? HANDLE_COLOR : "#555";
                ctx.beginPath();
                ctx.roundRect(handleX, handleY, HANDLE_SIZE, HANDLE_SIZE, HANDLE_CORNER_RADIUS);
                ctx.fill();
                
                // Draw custom output labels with proper greying
                if (this.outputs && this.outputs.length >= 2) {
                    // True output label
                    const trueActive = switchState;
                    const trueLabelColor = trueActive ? "#CCCCCC" : "#585858";
                    const trueLabelX = this.size[0] - 18;
                    const trueLabelY = LiteGraph.NODE_SLOT_HEIGHT * 0.5 + 9;
                    
                    ctx.fillStyle = trueLabelColor;
                    ctx.font = "12px Arial";
                    ctx.textAlign = "right";
                    ctx.fillText("True", trueLabelX, trueLabelY);
                    
                    // False output label
                    const falseActive = !switchState;
                    const falseLabelColor = falseActive ? "#CCCCCC" : "#585858";
                    const falseLabelX = this.size[0] - 18;
                    const falseLabelY = LiteGraph.NODE_SLOT_HEIGHT * 1.5 + 9;
                    
                    ctx.fillStyle = falseLabelColor;
                    ctx.fillText("False", falseLabelX, falseLabelY);
                }

            };
        }
    }
});
