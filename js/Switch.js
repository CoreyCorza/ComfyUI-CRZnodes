// ComfyUI.CRZ.Switch - Minimal JS for native widget
import { app } from "../../scripts/app.js";
import { 
    NODE_WIDTH, 
    NODE_HEIGHT_MULTIPLIER
} from "./CRZConfig.js";

// Switch node dimensions
const SWITCH_WIDTH = 80;
const SWITCH_HEIGHT = 70;

app.registerExtension({
    name: "CRZSwitch",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "CRZSwitch") {
            // Hide the title bar like other CRZ nodes
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
                
                // Hide the boolean widget while keeping it functional
                if (this.widgets && this.widgets[0]) {
                    this.widgets[0].hidden = true;
                }
                
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
                    // If connected, get from connected source (like ExecuteSwitch)
                    try {
                        const boolLink = this.graph.links[this.inputs[2].link];
                        if (boolLink) {
                            const sourceNode = this.graph.getNodeById(boolLink.origin_id);
                            if (sourceNode && sourceNode.widgets && sourceNode.widgets.length > 0) {
                                switchValue = !!sourceNode.widgets[0].value;
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
                
                // // Draw input labels with dynamic colors
                // if (this.inputs && this.inputs.length >= 2) {
                //     // True input label (first socket)
                //     const trueActive = switchValue;
                //     const trueLabelColor = trueActive ? "#CCCCCC" : "#585858";
                //     const trueLabelX = 18;
                //     const trueLabelY = LiteGraph.NODE_SLOT_HEIGHT * 0.5 + 9;
                    
                //     ctx.fillStyle = trueLabelColor;
                //     ctx.font = "12px Arial";
                //     ctx.textAlign = "left";
                //     ctx.fillText("True", trueLabelX, trueLabelY);
                    
                //     // False input label (second socket)
                //     const falseActive = !switchValue;
                //     const falseLabelColor = falseActive ? "#CCCCCC" : "#585858";
                //     const falseLabelX = 18;
                //     const falseLabelY = LiteGraph.NODE_SLOT_HEIGHT * 1.5 + 9;
                    
                //     ctx.fillStyle = falseLabelColor;
                //     ctx.fillText("False", falseLabelX, falseLabelY);
                // }
                
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
            };

        }
    }
}); 