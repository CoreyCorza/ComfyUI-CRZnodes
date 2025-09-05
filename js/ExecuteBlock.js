// ComfyUI.CRZ.ExecuteBlock
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

// Execute Block node dimensions
const BLOCK_WIDTH = 80;
const BLOCK_HEIGHT = 48;

app.registerExtension({
    name: "CRZExecuteBlock",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "CRZExecuteBlock") {
            // Hide the title bar
            nodeType.title_mode = LiteGraph.NO_TITLE;
            nodeType.prototype.getTitle = function() { return ""; };
            nodeType.prototype.onDrawTitle = function() { return false; };
            
            // Set fixed size and disable resizing
            nodeType.min_size = [BLOCK_WIDTH, BLOCK_HEIGHT];
            
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) {
                    onNodeCreated.apply(this, arguments);
                }
                
                // Set fixed size and disable resizing
                this.size = [BLOCK_WIDTH, BLOCK_HEIGHT];
                this.resizable = false;
                
                // Hide the boolean widget while keeping the socket functional (like Switch node)
                if (this.widgets && this.widgets[0]) {
                    this.widgets[0].hidden = true;
                }
                
                // Set input and output labels
                this.onAdded = function() {
                    if (this.inputs && this.inputs.length >= 2) {
                        this.inputs[0].name = "input";
                        this.inputs[0].localized_name = " "; 
                        this.inputs[1].name = "bool";
                        this.inputs[1].localized_name = "Bool"; 
                    }
                    if (this.outputs && this.outputs[0]) {
                        this.outputs[0].name = "";
                        this.outputs[0].localized_name = "";
                    }
                    
                    // Move widgets up to eliminate gap
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
                        this.inputs[0].localized_name = " ";  
                        this.inputs[1].name = "bool";
                        this.inputs[1].localized_name = "Bool";  
                    }
                    if (this.outputs && this.outputs[0]) {
                        this.outputs[0].name = "";
                        this.outputs[0].localized_name = "";
                    }
                };
                
                // Mark as CRZ node for connection hiding
                this.isCRZNode = true;
            }
            
            // Override computeSize to force fixed size
            nodeType.prototype.computeSize = function() {
                return [BLOCK_WIDTH, BLOCK_HEIGHT];
            };

            nodeType.prototype.onDrawForeground = function(ctx) {
                if (this.flags.collapsed) return;
                
                // Check if inputs are connected
                const inputConnected = this.inputs[0] && this.inputs[0].link !== null;
                const boolConnected = this.inputs[1] && this.inputs[1].link !== null;
                const outputConnected = this.outputs[0] && this.outputs[0].links && this.outputs[0].links.length > 0;
                
                const isActive = (inputConnected && boolConnected) || outputConnected;
                const labelColor = isActive ? LABEL_COLOR : INACTIVE_LABEL_COLOR;
                
                // Get the boolean value (like Compare node)
                let blockState = false;
                
                if (boolConnected) {
                    // If connected, try to get from connected source (like Compare node)
                    try {
                        const boolLink = this.graph.links[this.inputs[1].link];
                        if (boolLink) {
                            const sourceNode = this.graph.getNodeById(boolLink.origin_id);
                            
                            // Try to get output value from source node
                            if (sourceNode && sourceNode.widgets && sourceNode.widgets.length > 0) {
                                blockState = !!sourceNode.widgets[0].value;
                            } else {
                                // Fallback: show true when connected but can't get value
                                blockState = true;
                            }
                        }
                    } catch (e) {
                        // If anything fails, show true when connected
                        blockState = true;
                    }
                } else {
                    // If not connected, get from the hidden boolean widget
                    if (this.widgets && this.widgets[0]) {
                        blockState = !!this.widgets[0].value;
                    }
                }
                
                // Update output socket color and hide original label (we'll draw custom text)
                if (this.outputs && this.outputs[0]) {
                    this.outputs[0].localized_name = ""; // Hide original label
                    // Grey out the socket when blocked (False)
                    this.outputs[0].color_on = blockState ? "#9A9A9A" : "rgba(61, 61, 61, 1)";
                    this.outputs[0].color_off = blockState ? "#9A9A9A" : "rgba(61, 61, 61, 1)";
                }
                
                // // Draw block indicator (boolean toggle-style)
                // const toggleWidth = 30;
                // const toggleHeight = TOGGLE_HEIGHT;
                // const toggleLeft = (this.size[0] - toggleWidth) / 2 -2;
                // const toggleY = this.size[1] / 2 - 8;
                
                // // Toggle background - green when allowing, red when blocking
                // ctx.fillStyle = isActive ? 
                //     (blockState ? "rgba(106, 194, 65, 0.281)" : "rgba(226, 74, 74, 0.281)") : 
                //     "#2b2b2b";
                // ctx.beginPath();
                // ctx.roundRect(toggleLeft, toggleY, toggleWidth, toggleHeight, TOGGLE_CORNER_RADIUS);
                // ctx.fill();
                
                // // Toggle handle position
                // const leftPos = toggleLeft + HANDLE_PADDING;
                // const rightPos = toggleLeft + toggleWidth - HANDLE_SIZE - HANDLE_PADDING;
                // const handleX = leftPos + (rightPos - leftPos) * (blockState ? 1 : 0);
                // const handleY = toggleY + (toggleHeight - HANDLE_SIZE) / 2;
                
                // ctx.fillStyle = isActive ? "rgba(122, 122, 122, 0.562)" : "#555";
                // ctx.beginPath();
                // ctx.roundRect(handleX, handleY, HANDLE_SIZE, HANDLE_SIZE, HANDLE_CORNER_RADIUS);
                // ctx.fill();
                
                // // Draw custom output label with proper greying
                // if (this.outputs && this.outputs[0]) {
                //     const output = this.outputs[0];
                //     const labelText = blockState ? "Output" : "Output";
                //     const labelColor = blockState ? "#CCCCCC" : "#585858";
                    
                //     // Calculate label position (right side of node)
                //     const labelX = this.size[0] - 18;
                //     const labelY = LiteGraph.NODE_SLOT_HEIGHT * 0.5 + 9;
                    
                //     ctx.fillStyle = labelColor;
                //     ctx.font = "12px Arial";
                //     ctx.textAlign = "right";
                //     ctx.fillText(labelText, labelX, labelY);
                // }
                
                // Draw straight line connection from input to output
                if (this.inputs && this.inputs[0] && this.outputs && this.outputs[0]) {
                    // Calculate positions
                    const inputY = LiteGraph.NODE_SLOT_HEIGHT * 0.5 + 4; // Input socket position
                    const outputY = LiteGraph.NODE_SLOT_HEIGHT * 0.5 + 4; // Output socket position (same level)
                    const startX = 8;
                    const endX = this.size[0] - 8;
                    
                    // Draw straight line - green if allowing, red if blocking
                    ctx.strokeStyle = blockState ? "#95fd80a6" : "#ff4d4da6";
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(startX, inputY);
                    ctx.lineTo(endX, outputY);
                    ctx.stroke();
                }
            };
        }
    }
});
