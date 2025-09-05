// ComfyUI.CRZ.Label
import { app } from "../../scripts/app.js";
import { 
    LABEL_COLOR,
    INACTIVE_LABEL_COLOR
} from "./CRZConfig.js";

// Label node dimensions
const LABEL_WIDTH = 300;
const LABEL_HEIGHT = 27.8;

app.registerExtension({
    name: "CRZLabel",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "CRZLabel") {
            // Hide the title bar
            nodeType.title_mode = LiteGraph.NO_TITLE;
            nodeType.prototype.getTitle = function() { return ""; };
            nodeType.prototype.onDrawTitle = function() { return false; };
            
            // Set fixed size and disable resizing
            nodeType.min_size = [LABEL_WIDTH, LABEL_HEIGHT];
            
            
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) {
                    onNodeCreated.apply(this, arguments);
                }
                
                // Set fixed size and disable resizing
                this.size = [LABEL_WIDTH, LABEL_HEIGHT];
                this.resizable = true;
                this.bgcolor = "rgba(24, 24, 24, 0.281)";
                // Initialize properties
                this.properties = this.properties || {};
                this.properties.label_text = this.properties.label_text || "Label";
                
                // Remove all inputs and outputs
                this.inputs = [];
                this.outputs = [];
                
                // Double-click handler for renaming
                this.onDblClick = function(e, pos, canvas) {
                    const currentText = this.properties.label_text || "Label";
                    
                    canvas.prompt(
                        "Label Text", 
                        currentText,
                        function(newText) {
                            if (newText !== null && newText !== undefined) {
                                this.properties.label_text = newText.trim() || "Label";
                                
                                // Force redraw
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
                return [100, LABEL_HEIGHT];
            };

            nodeType.prototype.onDrawForeground = function(ctx) {
                if (this.flags.collapsed) return;
                
                const labelText = this.properties.label_text || "Label";
                
                // Draw label text centered
                ctx.fillStyle = LABEL_COLOR;
                ctx.font = "14px Arial";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                
                // Center the text in the node
                const centerX = this.size[0] / 2;
                const centerY = this.size[1] / 2 +1;
                
                ctx.fillText(labelText, centerX, centerY);
            };
        }
    }
});
