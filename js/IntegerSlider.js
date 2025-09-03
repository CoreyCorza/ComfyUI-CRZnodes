// ComfyUI.CRZ.IntegerSlider
import { app } from "../../scripts/app.js";
import { 
    NODE_WIDTH, 
    NODE_HEIGHT_MULTIPLIER,
    LABEL_LEFT_PADDING,
    TRACK_LEFT_PADDING,
    TRACK_RIGHT_PADDING,
    HANDLE_LEFT_PADDING,
    HANDLE_RIGHT_PADDING,
    VALUE_RIGHT_SHIFT,
    VALUE_RIGHT_OFFSET,
    TRACK_HEIGHT,
    TRACK_WIDTH,
    TRACK_CORNER_RADIUS,
    HANDLE_RADIUS,
    HANDLE_WIDTH,
    HANDLE_HEIGHT,
    HANDLE_Y_OFFSET,
    SLIDER_VERTICAL_OFFSET,
    NODE_BACKGROUND_COLOR,
    TRACK_COLOR
} from "./CRZConfig.js";

// Layout constants
const HANDLE_CORNER_RADIUS = 2;

class CRZIntegerSlider
{
    constructor(node)
    {
        this.node = node;
        this.node.properties = this.node.properties || {};
        this.node.properties.value = 5;
        this.node.properties.min = 1;
        this.node.properties.max = 10;
        this.node.properties.step = 1;
        this.node.properties.snap = true;
        this.node.properties.label = "Integer";

        this.node.intpos = { x: 0.2 };
        this.node.size = [NODE_WIDTH, Math.floor(LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER)];
        const fontsize = LiteGraph.NODE_SUBTEXT_SIZE;
        const shX = (this.node.slot_start_y || 0)+fontsize*1.5;
        const shY = LiteGraph.NODE_SLOT_HEIGHT/1.5;
        const shiftLeft = 10;
        const shiftRight = 60;

        this.node.widgets[0].hidden = true;
        this.node.widgets[0].type = "hidden";

        this.node.onAdded = function ()
        {
            this.outputs[0].name = this.outputs[0].localized_name = "";
            // Use same approach as mxToolkit - hide widgets off-screen
            this.widgets_start_y = -2.4e8*LiteGraph.NODE_SLOT_HEIGHT;
            this.intpos.x = Math.max(0, Math.min(1, (this.properties.value-this.properties.min)/(this.properties.max-this.properties.min)));
            if (this.size) if (this.size.length) if (this.size[1] > LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER) this.size[1] = LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER;
            this.outputs[0].type = "INT";
            

        };

        this.node.onConfigure = function ()
        {
            this.outputs[0].type = "INT";
        }

        this.node.onGraphConfigured = function ()
        {
            this.configured = true;
            this.onPropertyChanged();
        }

        this.node.onPropertyChanged = function (propName)
        {
            if (!this.configured) return;
            
            // Ensure all properties are integers
            this.properties.min = Math.floor(this.properties.min);
            this.properties.max = Math.floor(this.properties.max);
            this.properties.step = Math.floor(this.properties.step);
            if (this.properties.step <= 0) this.properties.step = 1;

            if ( isNaN(this.properties.value) ) this.properties.value = this.properties.min;
            if ( this.properties.min >= this.properties.max ) this.properties.max = this.properties.min+this.properties.step;
            if ((propName === "min") && (this.properties.value < this.properties.min)) this.properties.value = this.properties.min;
            if ((propName === "max") && (this.properties.value > this.properties.max)) this.properties.value = this.properties.max;
            
            this.properties.value = Math.floor(this.properties.value);
            this.intpos.x = Math.max(0, Math.min(1, (this.properties.value-this.properties.min)/(this.properties.max-this.properties.min)));
            this.outputs[0].type = "INT";
            this.widgets[0].value = this.properties.value;
        }

        this.node.onDrawForeground = function(ctx)
        {
            this.configured = true;
            if ( this.flags.collapsed ) return false;
            if (this.size[1] > LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER) this.size[1] = LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER;

            // Draw label on the left
            ctx.fillStyle = LiteGraph.NODE_TEXT_COLOR;
            ctx.font = LiteGraph.NODE_SUBTEXT_SIZE + "px Arial";
            ctx.textAlign = "left";
            ctx.fillText(this.properties.label || "Integer Slider", LABEL_LEFT_PADDING, shX);

            // Draw slider track positioned on the right side like Dashboard
            const trackLeft = this.size[0] - TRACK_RIGHT_PADDING;
            
            ctx.fillStyle = TRACK_COLOR;
            ctx.beginPath();
            ctx.roundRect(trackLeft, shY - 1 + SLIDER_VERTICAL_OFFSET, TRACK_WIDTH, TRACK_HEIGHT, TRACK_CORNER_RADIUS);
            ctx.fill();

            // Draw slider handle as vertical rounded rectangle
            const handleX = trackLeft + TRACK_WIDTH * this.intpos.x;
            const handleY = shY - HANDLE_Y_OFFSET + SLIDER_VERTICAL_OFFSET;
            
            ctx.fillStyle = LiteGraph.NODE_TEXT_COLOR;
            ctx.beginPath();
            ctx.roundRect(handleX - HANDLE_WIDTH/2, handleY, HANDLE_WIDTH, HANDLE_HEIGHT, HANDLE_CORNER_RADIUS);
            ctx.fill();

            // Draw handle border
            ctx.lineWidth = 1;
            ctx.strokeStyle = node.bgcolor || LiteGraph.NODE_DEFAULT_BGCOLOR;
            ctx.beginPath();
            ctx.roundRect(handleX - HANDLE_WIDTH/2, handleY, HANDLE_WIDTH, HANDLE_HEIGHT, HANDLE_CORNER_RADIUS);
            ctx.stroke();

            // Draw value on the right
            ctx.fillStyle=LiteGraph.NODE_TEXT_COLOR;
            ctx.font = (fontsize) + "px Arial";
            ctx.textAlign = "center";
            ctx.fillText(this.properties.value, this.size[0] - VALUE_RIGHT_SHIFT + VALUE_RIGHT_OFFSET, shX);
        }

        this.node.onDblClick = function(e, pos, canvas)
        {
            // Double-click on value area to edit value
            if ( e.canvasX > this.pos[0] + this.size[0] - VALUE_RIGHT_SHIFT + 10 )
            {
                canvas.prompt("value", this.properties.value, function(v) {
                    v = Math.floor(Number(v));
                    if (!isNaN(v)) { 
                        this.properties.value = v;
                        this.onPropertyChanged("value");
                    }
                }.bind(this), e);
                return true;
            }
            
            // Double-click on track area to configure
            const trackLeft = this.pos[0] + this.size[0] - TRACK_RIGHT_PADDING;
            if (e.canvasX > trackLeft && e.canvasX < trackLeft + TRACK_WIDTH &&
                e.canvasY > this.pos[1] + shY - 5 + SLIDER_VERTICAL_OFFSET && 
                e.canvasY < this.pos[1] + shY + 10 + SLIDER_VERTICAL_OFFSET) {
                
                const currentMin = this.properties.min;
                const currentMax = this.properties.max;
                const currentStep = this.properties.step;
                
                const configText = `${currentMin},${currentMax},${currentStep}`;
                
                canvas.prompt(
                    "Configure Integer Slider (min,max,step)", 
                    configText, 
                    function(newConfig) {
                        if (newConfig && newConfig.trim()) {
                            const parts = newConfig.split(',');
                            if (parts.length === 3) {
                                const min = parseInt(parts[0].trim());
                                const max = parseInt(parts[1].trim());
                                const step = parseInt(parts[2].trim());
                                
                                if (!isNaN(min) && !isNaN(max) && !isNaN(step)) {
                                    this.properties.min = min;
                                    this.properties.max = max;
                                    this.properties.step = step;
                                    this.onPropertyChanged("min");
                                }
                            }
                        }
                    }.bind(this), 
                    e
                );
                return true;
            }
            
            // Double-click on label area to rename
            if (e.canvasX > this.pos[0] + LABEL_LEFT_PADDING && 
                e.canvasX < this.pos[0] + this.size[0] - TRACK_RIGHT_PADDING - 10 &&
                e.canvasY > this.pos[1] && e.canvasY < this.pos[1] + this.size[1]) {
                
                canvas.prompt("Label", this.properties.label || "Integer Slider", function(newLabel) {
                    if (newLabel && newLabel.trim()) {
                        this.properties.label = newLabel.trim();
                    }
                }.bind(this), e);
                return true;
            }
        }

        this.node.onMouseDown = function(e)
        {
            if ( e.canvasY - this.pos[1] < 0 ) return false;
            // Update hit detection to match the new track position
            const trackLeft = this.size[0] - TRACK_RIGHT_PADDING;
            if ( e.canvasX < this.pos[0]+trackLeft-5 || e.canvasX > this.pos[0]+trackLeft+TRACK_WIDTH+5 ) return false;
            if ( e.canvasY < this.pos[1]+shiftLeft-5 || e.canvasY > this.pos[1]+this.size[1]-shiftLeft+5 ) return false;

            this.capture = true;
            this.unlock = false;
            // Try modern pointer API, but don't fall back to deprecated captureInput
            const canvas = this.graph && this.graph.canvas;
            if (canvas && canvas.pointer && typeof canvas.pointer.capture !== 'undefined') {
                canvas.pointer.capture = this;
            }
            // Note: Removed captureInput fallback to avoid deprecation warning
            this.valueUpdate(e);
            return true;
        }

        this.node.onMouseMove = function(e, pos, canvas)
        {
            if (!this.capture) return;
            if ( canvas.pointer.isDown === false ) { this.onMouseUp(e); return; }
            this.valueUpdate(e);
        }

        this.node.onMouseUp = function(e)
        {
            if (!this.capture) return;
            this.capture = false;
            // Clear modern pointer API capture if available
            if (this.graph && this.graph.canvas && this.graph.canvas.pointer && typeof this.graph.canvas.pointer.capture !== 'undefined') {
                this.graph.canvas.pointer.capture = null;
            }
            // Note: Removed captureInput(false) to avoid deprecation warning
            this.widgets[0].value = this.properties.value;
        }

        this.node.valueUpdate = function(e)
        {
            let prevX = this.properties.value;
            // Update value calculation to match the new track position
            const trackLeft = this.size[0] - TRACK_RIGHT_PADDING;
            let vX = (e.canvasX - this.pos[0] - trackLeft) / TRACK_WIDTH;

            if (e.ctrlKey) this.unlock = true;
            if (e.shiftKey !== this.properties.snap)
            {
                let step = this.properties.step/(this.properties.max - this.properties.min);
                vX = Math.round(vX/step)*step;
            }

            this.intpos.x = Math.max(0, Math.min(1, vX));
            this.properties.value = Math.floor(this.properties.min + (this.properties.max - this.properties.min) * ((this.unlock)?vX:this.intpos.x));

            this.updateThisNodeGraph?.();
            if ( this.properties.value !== prevX ) {
                // Mark the graph as changed - use correct method name
                if (this.graph && this.graph.setDirtyCanvas) {
                    this.graph.setDirtyCanvas(true);
                } else if (this.graph && this.graph._version !== undefined) {
                    this.graph._version++;
                }
            }
        }

        this.node.onSelected = function(e) { this.onMouseUp(e) }
        this.node.computeSize = () => [NODE_WIDTH, Math.floor(LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER)];
    }
}

app.registerExtension(
{
    name: "CRZIntegerSlider",
    async beforeRegisterNodeDef(nodeType, nodeData, _app)
    {
        if (nodeData.name === "CRZIntegerSlider")
        {
            // Hide the title bar like Dashboard
            nodeType.title_mode = LiteGraph.NO_TITLE;
            nodeType.prototype.getTitle = function() { return ""; };
            nodeType.prototype.onDrawTitle = function() { return false; };
            
            // Set minimum size
            nodeType.min_size = [NODE_WIDTH, Math.floor(LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER)];
            
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) onNodeCreated.apply(this, []);
                this.bgcolor = NODE_BACKGROUND_COLOR;
                this.crzIntegerSlider = new CRZIntegerSlider(this);
            }
        }
    }
}); 