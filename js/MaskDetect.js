// ComfyUI.CRZ.MaskDetect - Compact mask detection node
import { app } from "../../scripts/app.js";

// Mask detect node dimensions (same as passthrough)
const MASK_DETECT_WIDTH = 120;
const MASK_DETECT_HEIGHT = 28;

app.registerExtension({
    name: "CRZMaskDetect",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "CRZMaskDetect") {
            // Hide the title bar like other CRZ nodes
            nodeType.title_mode = LiteGraph.NO_TITLE;
            nodeType.prototype.getTitle = function() { return ""; };
            nodeType.prototype.onDrawTitle = function() { return false; };
            
            // Set fixed size and disable resizing
            nodeType.min_size = [MASK_DETECT_WIDTH, MASK_DETECT_HEIGHT];
            
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) {
                    onNodeCreated.apply(this, arguments);
                }
                
                // Set fixed size and disable resizing
                this.size = [MASK_DETECT_WIDTH, MASK_DETECT_HEIGHT];
                this.resizable = false;
                
                // Set input/output labels
                this.onAdded = function() {
                    if (this.inputs && this.inputs[0]) {
                        this.inputs[0].name = "mask";
                        this.inputs[0].localized_name = "mask";
                    }
                    if (this.outputs && this.outputs[0]) {
                        this.outputs[0].name = "has_mask";
                        this.outputs[0].localized_name = "detected";
                    }
                };
                
                // Ensure labels are set on configure too
                const originalOnConfigure = this.onConfigure;
                this.onConfigure = function(info) {
                    if (originalOnConfigure) {
                        originalOnConfigure.call(this, info);
                    }
                    if (this.inputs && this.inputs[0]) {
                        this.inputs[0].name = "mask";
                        this.inputs[0].localized_name = "mask";
                    }
                    if (this.outputs && this.outputs[0]) {
                        this.outputs[0].name = "has_mask";
                        this.outputs[0].localized_name = "detected";
                    }
                };
            }
            
            // Override computeSize to force fixed size
            nodeType.prototype.computeSize = function() {
                return [MASK_DETECT_WIDTH, MASK_DETECT_HEIGHT];
            };
        }
    }
}); 