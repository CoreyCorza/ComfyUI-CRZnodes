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
                        this.inputs[0].name = "false_input";
                        this.inputs[0].localized_name = "False";
                        this.inputs[1].name = "true_input"; 
                        this.inputs[1].localized_name = "True";
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
                        this.inputs[0].name = "false_input";
                        this.inputs[0].localized_name = "False";
                        this.inputs[1].name = "true_input";
                        this.inputs[1].localized_name = "True";
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

        }
    }
}); 