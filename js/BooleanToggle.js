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

        // Animation properties - initialize after properties are set
        this.animationProgress = 0;
        this.targetProgress = 0;
        this.animationSpeed = 8; // Higher = faster animation
        this.isAnimating = false;

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
            
            // Sync animation state with actual boolean value on load
            if (this.crzBooleanToggle) {
                this.crzBooleanToggle.animationProgress = this.properties.value ? 1 : 0;
                this.crzBooleanToggle.targetProgress = this.crzBooleanToggle.animationProgress;
                this.crzBooleanToggle.isAnimating = false;
            }
            
            this.onPropertyChanged();
        }

        this.node.onPropertyChanged = function (propName)
        {
            if (!this.configured) return;
            
            this.outputs[0].type = "BOOLEAN";
            this.widgets[0].value = this.properties.value;
            
            // Start animation when value changes
            if (this.crzBooleanToggle && propName === "value") {
                this.crzBooleanToggle.targetProgress = this.properties.value ? 1 : 0;
                this.crzBooleanToggle.startAnimation();
            }
        }

        this.node.onDrawForeground = function(ctx)
        {
            this.configured = true;
            if ( this.flags.collapsed ) return false;
            if (this.size[1] > LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER) this.size[1] = LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER;

            // Update animation if needed
            if (this.crzBooleanToggle) {
                this.crzBooleanToggle.updateAnimation();
            }

            // Draw label on the left
            ctx.fillStyle = LiteGraph.NODE_TEXT_COLOR;
            ctx.font = LiteGraph.NODE_SUBTEXT_SIZE + "px Arial";
            ctx.textAlign = "left";
            ctx.fillText(this.properties.label || "Boolean Toggle", LABEL_LEFT_PADDING, shX);

            // Draw expanded toggle switch - wider and more centered
            const expandedToggleWidth = TOGGLE_WIDTH + 10; // Make it wider
            const toggleLeft = this.size[0] - TRACK_RIGHT_PADDING + 40; // Move it left a bit
            
            // Get animation progress for smooth color transitions
            const progress = this.crzBooleanToggle ? this.crzBooleanToggle.animationProgress : (this.properties.value ? 1 : 0);
            
            // Toggle background - interpolate colors during animation
            const bgColor = this.interpolateColor(TOGGLE_INACTIVE_COLOR, TOGGLE_ACTIVE_COLOR, progress);
            ctx.fillStyle = bgColor;
            ctx.beginPath();
            ctx.roundRect(toggleLeft, shY - TOGGLE_HEIGHT/2 + TOGGLE_VERTICAL_OFFSET, expandedToggleWidth, TOGGLE_HEIGHT, TOGGLE_CORNER_RADIUS);
            ctx.fill();

            // Animated toggle handle position - use expanded width
            const leftPos = toggleLeft + HANDLE_PADDING;
            const rightPos = toggleLeft + expandedToggleWidth - HANDLE_SIZE - HANDLE_PADDING;
            const handleX = leftPos + (rightPos - leftPos) * progress;
            const handleY = shY - HANDLE_SIZE/2 + TOGGLE_VERTICAL_OFFSET;

            ctx.fillStyle = HANDLE_COLOR;
            ctx.beginPath();
            ctx.roundRect(handleX, handleY, HANDLE_SIZE, HANDLE_SIZE, HANDLE_CORNER_RADIUS);
            ctx.fill();

            // Draw handle border - interpolate colors during animation
            const borderColor = this.interpolateColor(HANDLE_BORDER_INACTIVE, HANDLE_BORDER_ACTIVE, progress);
            ctx.lineWidth = 1;
            ctx.strokeStyle = borderColor;
            ctx.beginPath();
            ctx.roundRect(handleX, handleY, HANDLE_SIZE, HANDLE_SIZE, HANDLE_CORNER_RADIUS);
            ctx.stroke();

            // Value text removed - toggle fills the space
        }

        this.node.onDblClick = function(e, pos, canvas)
        {
            // Double-click on expanded toggle area to toggle value
            const expandedToggleWidth = TOGGLE_WIDTH + 10;
            const toggleLeft = this.pos[0] + this.size[0] - TRACK_RIGHT_PADDING + 40;
            if (e.canvasX > toggleLeft && e.canvasX < toggleLeft + expandedToggleWidth)
            {
                this.properties.value = !this.properties.value;
                this.onPropertyChanged("value");
                return true;
            }
            
            // This is now handled by the expanded toggle area above
            
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
            // Update hit detection to match the expanded toggle position
            const expandedToggleWidth = TOGGLE_WIDTH + 10;
            const toggleLeft = this.size[0] - TRACK_RIGHT_PADDING + 40;
            if ( e.canvasX < this.pos[0] + toggleLeft - 5 || e.canvasX > this.pos[0] + toggleLeft + expandedToggleWidth + 5 ) return false;
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
        
        // Add color interpolation method to node
        this.node.interpolateColor = function(color1, color2, t) {
            // Parse rgba colors
            const parseRgba = (color) => {
                const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                if (match) {
                    return {
                        r: parseInt(match[1]),
                        g: parseInt(match[2]),
                        b: parseInt(match[3]),
                        a: match[4] ? parseFloat(match[4]) : 1
                    };
                }
                return { r: 255, g: 255, b: 255, a: 1 }; // fallback to white
            };
            
            const c1 = parseRgba(color1);
            const c2 = parseRgba(color2);
            
            // Interpolate
            const r = Math.round(c1.r + (c2.r - c1.r) * t);
            const g = Math.round(c1.g + (c2.g - c1.g) * t);
            const b = Math.round(c1.b + (c2.b - c1.b) * t);
            const a = c1.a + (c2.a - c1.a) * t;
            
            return `rgba(${r}, ${g}, ${b}, ${a})`;
        };
    }
    
    // Animation methods
    startAnimation() {
        this.isAnimating = true;
        this.animateStep();
    }
    
    animateStep() {
        if (!this.isAnimating) return;
        
        // Request animation frame for smooth animation
        requestAnimationFrame(() => this.animateStep());
        
        // Mark canvas as dirty to trigger redraw
        if (this.node.graph && this.node.graph.setDirtyCanvas) {
            this.node.graph.setDirtyCanvas(true);
        }
    }
    
    updateAnimation() {
        if (Math.abs(this.animationProgress - this.targetProgress) < 0.01) {
            this.animationProgress = this.targetProgress;
            this.isAnimating = false;
            return;
        }
        
        // Smooth easing animation
        const diff = this.targetProgress - this.animationProgress;
        this.animationProgress += diff * (this.animationSpeed * 0.016); // 60fps normalized
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
                
                // Initialize animation state to match current value
                if (this.crzBooleanToggle) {
                    this.crzBooleanToggle.animationProgress = this.properties.value ? 1 : 0;
                    this.crzBooleanToggle.targetProgress = this.crzBooleanToggle.animationProgress;
                    this.crzBooleanToggle.isAnimating = false;
                }
                
                // Mark this as a CRZ node for connection hiding
                this.isCRZNode = true;
            }
        }
    }
}); 