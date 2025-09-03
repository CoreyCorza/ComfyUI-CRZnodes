// ComfyUI.CRZ.BooleanToggle
import { app } from "../../scripts/app.js";
import { 
    NODE_WIDTH, 
    NODE_HEIGHT_MULTIPLIER,
    LABEL_LEFT_PADDING,
    TRACK_RIGHT_PADDING,
    VALUE_RIGHT_PADDING,
    TOGGLE_WIDTH,
    TOGGLE_HEIGHT,
    TOGGLE_CORNER_RADIUS,
    HANDLE_SIZE,
    HANDLE_CORNER_RADIUS,
    HANDLE_PADDING,
    TOGGLE_VERTICAL_OFFSET,
    NODE_BACKGROUND_COLOR,
    TOGGLE_ACTIVE_COLOR,
    TOGGLE_INACTIVE_COLOR,
    HANDLE_COLOR,
    HANDLE_BORDER_ACTIVE,
    HANDLE_BORDER_INACTIVE
} from "./CRZConfig.js";

class CRZBooleanToggle
{
    constructor(node)
    {
        this.node = node;
        this.node.properties = this.node.properties || {};
        this.node.properties.value = false;
        this.node.properties.label = "Boolean";

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
            this.widgets_start_y = -2.4e8*LiteGraph.NODE_SLOT_HEIGHT;
            if (this.size) if (this.size.length) if (this.size[1] > LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER) this.size[1] = LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER;
            this.outputs[0].type = "BOOLEAN";
        };

        this.node.onConfigure = function ()
        {
            this.outputs[0].type = "BOOLEAN";
        }

        this.node.onGraphConfigured = function ()
        {
            this.configured = true;
            this.onPropertyChanged();
        }

        this.node.onPropertyChanged = function (propName)
        {
            if (!this.configured) return;
            
            this.outputs[0].type = "BOOLEAN";
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
            ctx.fillText(this.properties.label || "Boolean Toggle", LABEL_LEFT_PADDING, shX);

            // Draw toggle switch positioned on the right side like Dashboard
            const toggleLeft = this.size[0] - TRACK_RIGHT_PADDING;
            
            // Toggle background
            ctx.fillStyle = this.properties.value ? TOGGLE_ACTIVE_COLOR : TOGGLE_INACTIVE_COLOR;
            ctx.beginPath();
            ctx.roundRect(toggleLeft, shY - TOGGLE_HEIGHT/2 + TOGGLE_VERTICAL_OFFSET, TOGGLE_WIDTH, TOGGLE_HEIGHT, TOGGLE_CORNER_RADIUS);
            ctx.fill();

            // Toggle handle
            const handleX = this.properties.value ? 
                toggleLeft + TOGGLE_WIDTH - HANDLE_SIZE - HANDLE_PADDING : // Right position when true
                toggleLeft + HANDLE_PADDING; // Left position when false
            const handleY = shY - HANDLE_SIZE/2 + TOGGLE_VERTICAL_OFFSET;

            ctx.fillStyle = HANDLE_COLOR;
            ctx.beginPath();
            ctx.roundRect(handleX, handleY, HANDLE_SIZE, HANDLE_SIZE, HANDLE_CORNER_RADIUS);
            ctx.fill();

            // Draw handle border
            ctx.lineWidth = 1;
            ctx.strokeStyle = this.properties.value ? HANDLE_BORDER_ACTIVE : HANDLE_BORDER_INACTIVE;
            ctx.beginPath();
            ctx.roundRect(handleX, handleY, HANDLE_SIZE, HANDLE_SIZE, HANDLE_CORNER_RADIUS);
            ctx.stroke();

            // Draw value on the right
            ctx.fillStyle = LiteGraph.NODE_TEXT_COLOR;
            ctx.font = (fontsize) + "px Arial";
            ctx.textAlign = "center";
            ctx.fillText(this.properties.value ? "true" : "false", this.size[0] - VALUE_RIGHT_PADDING, shX);
        }

        this.node.onDblClick = function(e, pos, canvas)
        {
            // Double-click on value area to toggle value
            if ( e.canvasX > this.pos[0] + this.size[0] - VALUE_RIGHT_PADDING - 20 )
            {
                this.properties.value = !this.properties.value;
                this.onPropertyChanged("value");
                return true;
            }
            
            // Double-click on toggle area to toggle
            const toggleLeft = this.pos[0] + this.size[0] - TRACK_RIGHT_PADDING;
            if (e.canvasX > toggleLeft && e.canvasX < toggleLeft + TOGGLE_WIDTH &&
                e.canvasY > this.pos[1] + shY - TOGGLE_HEIGHT + TOGGLE_VERTICAL_OFFSET && 
                e.canvasY < this.pos[1] + shY + TOGGLE_HEIGHT + TOGGLE_VERTICAL_OFFSET) {
                
                this.properties.value = !this.properties.value;
                this.onPropertyChanged("value");
                return true;
            }
            
            // Double-click on label area to rename
            if (e.canvasX > this.pos[0] + LABEL_LEFT_PADDING && 
                e.canvasX < this.pos[0] + this.size[0] - TRACK_RIGHT_PADDING - 10 &&
                e.canvasY > this.pos[1] && e.canvasY < this.pos[1] + this.size[1]) {
                
                canvas.prompt("Label", this.properties.label || "Boolean Toggle", function(newLabel) {
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
            // Update hit detection to match the toggle position
            const toggleLeft = this.size[0] - TRACK_RIGHT_PADDING;
            if ( e.canvasX < this.pos[0] + toggleLeft - 5 || e.canvasX > this.pos[0] + toggleLeft + TOGGLE_WIDTH + 5 ) return false;
            if ( e.canvasY < this.pos[1] + shiftLeft - 5 || e.canvasY > this.pos[1] + this.size[1] - shiftLeft + 5 ) return false;

            // Toggle the value on click
            this.properties.value = !this.properties.value;
            this.onPropertyChanged("value");
            this.widgets[0].value = this.properties.value;
            
            // Mark the graph as changed
            if (this.graph && this.graph.setDirtyCanvas) {
                this.graph.setDirtyCanvas(true);
            } else if (this.graph && this.graph._version !== undefined) {
                this.graph._version++;
            }
            
            return true;
        }

        this.node.onSelected = function(e) { }
        this.node.computeSize = () => [NODE_WIDTH, Math.floor(LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER)];
    }
}

app.registerExtension(
{
    name: "CRZBooleanToggle",
    async beforeRegisterNodeDef(nodeType, nodeData, _app)
    {
        if (nodeData.name === "CRZBooleanToggle")
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
                this.crzBooleanToggle = new CRZBooleanToggle(this);
                
                // Mark this as a CRZ node for connection hiding
                this.isCRZNode = true;
            }
        }
    }
}); 