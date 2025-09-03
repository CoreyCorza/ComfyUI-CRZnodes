// ComfyUI - CRZ Int to Float JS Extension
import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "CRZ.IntToFloat",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "CRZIntToFloat") {
            // Set node properties for transparency
            nodeType.title_mode = LiteGraph.NO_TITLE;
            // nodeType.collapsable = false;
            
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                
                // Set same styling as passthrough node
                this.bgcolor = "rgba(40, 70, 48, 0.829)";
                this.color = "transparent";
                this.boxcolor = "transparent";
                
                // Match passthrough size
                this.size = [80, 28];
                this.resizable = true;
                
                // Hide input/output labels like other CRZ nodes
                if (this.inputs && this.inputs[0]) {
                    this.inputs[0].localized_name = " ";
                }
                if (this.outputs && this.outputs[0]) {
                    this.outputs[0].localized_name = " ";
                }
                
                return r;
            };

            // Override onDrawBackground like mxtoolkit does
            nodeType.prototype.onDrawBackground = function(ctx) {
                // Keep sockets visible - don't make them transparent
                // Just draw the connection line
                const canvas = app.graph.list_of_graphcanvas[0];
                if (this.inputs && this.outputs && this.inputs[0].pos && this.outputs[0].pos) {
                    let linkColor = "#999"; // Default connection color
                    
                    ctx.lineWidth = canvas?.connections_width || 2;
                    ctx.strokeStyle = linkColor;
                    ctx.beginPath();
                    ctx.moveTo(this.inputs[0].pos[0], this.inputs[0].pos[1]);
                    ctx.lineTo(this.outputs[0].pos[0], this.outputs[0].pos[1]);
                    ctx.stroke();
                }
            };

            // Override computeSize
            nodeType.prototype.computeSize = function() {
                return [80, 28];
            };
        }
    }
});
