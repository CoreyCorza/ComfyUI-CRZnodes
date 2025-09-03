// ComfyUI.CRZ.DashboardTest - Following FloatSlider's exact approach
import { app } from "../../scripts/app.js";
import { 
    NODE_WIDTH, 
    NODE_HEIGHT_MULTIPLIER,
    NODE_PADDING,
    LABEL_LEFT_PADDING,
    TRACK_LEFT_PADDING,
    TRACK_RIGHT_PADDING,
    HANDLE_LEFT_PADDING,
    HANDLE_RIGHT_PADDING,
    VALUE_RIGHT_SHIFT,
    VALUE_RIGHT_OFFSET,
    VALUE_RIGHT_PADDING,
    TRACK_HEIGHT,
    TRACK_WIDTH,
    HANDLE_RADIUS,
    SLIDER_HEIGHT,
    DASHBOARD_LINE_SPACING,
    NODE_BACKGROUND_COLOR,
    LABEL_COLOR,
    VALUE_COLOR,
    TRACK_COLOR,
    HANDLE_BORDER_COLOR,
    INACTIVE_LABEL_COLOR,
    INACTIVE_VALUE_COLOR,
    INACTIVE_TRACK_COLOR,
    INACTIVE_HANDLE_COLOR
} from "./CRZConfig.js";

// Layout constants
const TRACK_VERTICAL_OFFSET = 10;

class CRZDashboard {
    constructor(node) {
        this.node = node;
        
        // Initialize properties EXACTLY like FloatSlider
        this.node.properties = this.node.properties || {};
        
        // Initialize 5 sliders with default properties
        for (let i = 1; i <= 5; i++) {
            this.node.properties[`slider${i}_value`] = this.node.properties[`slider${i}_value`] ?? 0.0;
            this.node.properties[`slider${i}_min`] = this.node.properties[`slider${i}_min`] ?? 0.0;
            this.node.properties[`slider${i}_max`] = this.node.properties[`slider${i}_max`] ?? 1.0;
            this.node.properties[`slider${i}_step`] = this.node.properties[`slider${i}_step`] ?? 0.01;
            this.node.properties[`slider${i}_decimals`] = this.node.properties[`slider${i}_decimals`] ?? 2;
            this.node.properties[`slider${i}_name`] = this.node.properties[`slider${i}_name`] ?? `Slider ${i}`;
        }

        // Mouse handling - EXACTLY like FloatSlider
        this.capture = false;
        this.captureSlider = -1;

        this.node.onAdded = function() {
            // Hide widgets and set outputs EXACTLY like FloatSlider
            for (let i = 0; i < 5; i++) {
                if (this.widgets && this.widgets[i]) {
                    this.widgets[i].hidden = true;
                    this.widgets[i].type = "hidden";
                }
                if (this.outputs && this.outputs[i]) {
                    this.outputs[i].name = this.outputs[i].localized_name = "";
                    this.outputs[i].type = "FLOAT";
                }
            }
            this.widgets_start_y = -2.4e8 * LiteGraph.NODE_SLOT_HEIGHT;
        };

        this.node.onConfigure = function() {
            if (this.outputs) {
                for (let i = 0; i < 5; i++) {
                    if (this.outputs[i]) {
                        this.outputs[i].type = "FLOAT";
                    }
                }
            }
        };

        // EXACTLY like FloatSlider
        this.node.onGraphConfigured = function() {
            this.configured = true;
            this.onPropertyChanged();
        };

        // EXACTLY like FloatSlider onPropertyChanged
        this.node.onPropertyChanged = function(propName) {
            if (!this.configured) return;
            
            for (let i = 1; i <= 5; i++) {
                // Ensure decimal places is a valid integer
                this.properties[`slider${i}_decimals`] = Math.floor(this.properties[`slider${i}_decimals`]);
                if (this.properties[`slider${i}_decimals`] < 0) this.properties[`slider${i}_decimals`] = 0;
                if (this.properties[`slider${i}_decimals`] > 10) this.properties[`slider${i}_decimals`] = 10;

                if (isNaN(this.properties[`slider${i}_value`])) this.properties[`slider${i}_value`] = this.properties[`slider${i}_min`];
                if (this.properties[`slider${i}_min`] >= this.properties[`slider${i}_max`]) this.properties[`slider${i}_max`] = this.properties[`slider${i}_min`] + this.properties[`slider${i}_step`];
                if (propName === `slider${i}_min` && this.properties[`slider${i}_value`] < this.properties[`slider${i}_min`]) this.properties[`slider${i}_value`] = this.properties[`slider${i}_min`];
                if (propName === `slider${i}_max` && this.properties[`slider${i}_value`] > this.properties[`slider${i}_max`]) this.properties[`slider${i}_value`] = this.properties[`slider${i}_max`];
                
                // Round to specified decimal places
                const multiplier = Math.pow(10, this.properties[`slider${i}_decimals`]);
                this.properties[`slider${i}_value`] = Math.round(this.properties[`slider${i}_value`] * multiplier) / multiplier;
                
                // Update widget EXACTLY like FloatSlider
                if (this.widgets && this.widgets[i-1]) {
                    this.widgets[i-1].value = this.properties[`slider${i}_value`];
                }
            }
        };

        // EXACTLY like FloatSlider onMouseDown
        this.node.onMouseDown = function(e) {
            if (e.canvasY - this.pos[1] < 0) return false;
            
            for (let i = 0; i < 5; i++) {
                const sliderY = (i * DASHBOARD_LINE_SPACING) + NODE_PADDING;
                const trackLeft = this.size[0] - TRACK_RIGHT_PADDING;
                const trackWidth = TRACK_WIDTH;
                
                // More precise click detection - match exactly with drawing coordinates
                const trackY = sliderY + TRACK_VERTICAL_OFFSET;
                const clickAreaTop = trackY - 8;    // Handle extends 5 pixels above track
                const clickAreaBottom = trackY + 14; // Handle extends 9 pixels below track
                
                // Check if click is in slider area
                if (e.canvasX < this.pos[0] + trackLeft - 5 || e.canvasX > this.pos[0] + trackLeft + trackWidth + 5) continue;
                if (e.canvasY < this.pos[1] + clickAreaTop || e.canvasY > this.pos[1] + clickAreaBottom) continue;

                // EXACTLY like FloatSlider
                this.capture = true;
                this.captureSlider = i;
                this.unlock = false;
                // Try modern pointer API, but don't fall back to deprecated captureInput
                const canvas = this.graph && this.graph.canvas;
                if (canvas && canvas.pointer && typeof canvas.pointer.capture !== 'undefined') {
                    canvas.pointer.capture = this;
                }
                // Note: Removed captureInput fallback to avoid deprecation warning
                // Mouse capture will work through the capture flag and onMouseMove/onMouseUp handlers
                this.valueUpdate(e);
                return true;
            }
            return false;
        };

        // EXACTLY like FloatSlider onMouseMove
        this.node.onMouseMove = function(e, pos, canvas) {
            if (!this.capture) return;
            if (canvas.pointer.isDown === false) { this.onMouseUp(e); return; }
            this.valueUpdate(e);
        };

        // EXACTLY like FloatSlider onMouseUp
        this.node.onMouseUp = function(e) {
            if (!this.capture) return;
            this.capture = false;
            // Clear modern pointer API capture if available
            if (this.graph && this.graph.canvas && this.graph.canvas.pointer && typeof this.graph.canvas.pointer.capture !== 'undefined') {
                this.graph.canvas.pointer.capture = null;
            }
            // Note: Removed captureInput(false) to avoid deprecation warning
            // Update widget like FloatSlider
            if (this.widgets && this.widgets[this.captureSlider]) {
                this.widgets[this.captureSlider].value = this.properties[`slider${this.captureSlider + 1}_value`];
            }
        };

        // EXACTLY like FloatSlider valueUpdate
        this.node.valueUpdate = function(e) {
            if (this.captureSlider < 0) return;
            
            const sliderNum = this.captureSlider + 1;
            const min = this.properties[`slider${sliderNum}_min`];
            const max = this.properties[`slider${sliderNum}_max`];
            const step = this.properties[`slider${sliderNum}_step`];
            const decimals = this.properties[`slider${sliderNum}_decimals`];
            
            const trackLeft = this.size[0] - TRACK_RIGHT_PADDING;
            const trackWidth = TRACK_WIDTH;
            
            let prevValue = this.properties[`slider${sliderNum}_value`];
            let vX = (e.canvasX - this.pos[0] - trackLeft) / trackWidth;

            if (e.ctrlKey) this.unlock = true;
            if (e.shiftKey) {
                let stepSize = step / (max - min);
                vX = Math.round(vX / stepSize) * stepSize;
            }

            vX = Math.max(0, Math.min(1, vX));
            this.properties[`slider${sliderNum}_value`] = min + (max - min) * ((this.unlock) ? vX : vX);

            // Round to specified decimal places
            const multiplier = Math.pow(10, decimals);
            this.properties[`slider${sliderNum}_value`] = Math.round(this.properties[`slider${sliderNum}_value`] * multiplier) / multiplier;

            if (this.properties[`slider${sliderNum}_value`] !== prevValue) {
                // Mark the graph as changed - use correct method name
                if (this.graph && this.graph.setDirtyCanvas) {
                    this.graph.setDirtyCanvas(true);
                } else if (this.graph && this.graph._version !== undefined) {
                    this.graph._version++;
                }
            }
        };

        // EXACTLY like FloatSlider onSelected
        this.node.onSelected = function(e) { this.onMouseUp(e); };

                    this.node.size[1] = (5 * DASHBOARD_LINE_SPACING) + (NODE_PADDING * 2);
    }
}

app.registerExtension({
    name: "CRZ.Dashboard",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name === "CRZDashboard") {
            // Hide the title bar like FloatToInt
            nodeType.title_mode = LiteGraph.NO_TITLE;
            nodeType.prototype.getTitle = function() { return ""; };
            nodeType.prototype.onDrawTitle = function() { return false; };
            
            // Set minimum size
            nodeType.min_size = [NODE_WIDTH, (5 * DASHBOARD_LINE_SPACING) + (NODE_PADDING * 2)];
            
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                onNodeCreated?.apply(this, arguments);
                this.bgcolor = NODE_BACKGROUND_COLOR;
                this.crzDashboard = new CRZDashboard(this);
            };

            nodeType.prototype.onDrawForeground = function(ctx) {
                if (this.flags.collapsed || !this.crzDashboard) return;
                
                // Mark as configured like FloatSlider
                this.configured = true;

                for (let i = 0; i < 5; i++) {
                    const sliderNum = i + 1;
                    const value = this.properties[`slider${sliderNum}_value`] ?? 0.0;
                    const min = this.properties[`slider${sliderNum}_min`] ?? 0.0;
                    const max = this.properties[`slider${sliderNum}_max`] ?? 1.0;
                    const decimals = this.properties[`slider${sliderNum}_decimals`] ?? 2;
                    const name = this.properties[`slider${sliderNum}_name`] ?? `Slider ${sliderNum}`;
                    
                    const sliderY = (i * DASHBOARD_LINE_SPACING) + NODE_PADDING;
                    
                    // Check if this slider should be active (not greyed out)
                    // Active if: name changed from default OR has output connections
                    const isConnected = this.outputs && this.outputs[i] && 
                                       this.outputs[i].links && this.outputs[i].links.length > 0;
                    const hasCustomName = name !== `Slider ${sliderNum}`;
                    const isActive = isConnected || hasCustomName;
                    
                    // Choose colors based on active status
                    const labelColor = isActive ? LABEL_COLOR : INACTIVE_LABEL_COLOR;
                    const valueColor = isActive ? VALUE_COLOR : INACTIVE_VALUE_COLOR;
                    const trackColor = isActive ? TRACK_COLOR : INACTIVE_TRACK_COLOR;
                    const handleColor = isActive ? LABEL_COLOR : INACTIVE_HANDLE_COLOR;
                    
                    // Draw name on the left
                    ctx.fillStyle = labelColor;
                    ctx.font = LiteGraph.NODE_SUBTEXT_SIZE + "px Arial";
                    ctx.textAlign = "left";
                    ctx.fillText(name, LABEL_LEFT_PADDING, sliderY + 15);
                    
                    // Draw value on the right
                    ctx.fillStyle = valueColor;
                    ctx.textAlign = "right";
                    ctx.fillText(value.toFixed(decimals), this.size[0] - VALUE_RIGHT_PADDING, sliderY + 15);
                    
                    // Draw slider track
                    ctx.fillStyle = trackColor;
                    ctx.beginPath();
                    const trackY = sliderY + TRACK_VERTICAL_OFFSET;
                    const trackLeft = this.size[0] - TRACK_RIGHT_PADDING;
                    const trackWidth = TRACK_WIDTH;
                    ctx.roundRect(trackLeft, trackY, trackWidth, TRACK_HEIGHT, 2);
                    ctx.fill();
                    
                    // Draw slider handle as vertical rounded rectangle
                    const sliderPos = (value - min) / (max - min);
                    const handleX = trackLeft + trackWidth * Math.max(0, Math.min(1, sliderPos));
                    const handleY = trackY - 5; // Adjust Y position for vertical rectangle
                    const handleWidth = 8;
                    const handleHeight = 14;
                    
                    ctx.fillStyle = handleColor;
                    ctx.beginPath();
                    ctx.roundRect(handleX - handleWidth/2, handleY, handleWidth, handleHeight, 2);
                    ctx.fill();

                    // Draw handle border
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = this.bgcolor || HANDLE_BORDER_COLOR;
                    ctx.beginPath();
                    ctx.roundRect(handleX - handleWidth/2, handleY, handleWidth, handleHeight, 2);
                    ctx.stroke();
                }
            };

            nodeType.prototype.onDblClick = function(e, pos, canvas) {
                if (this.flags.collapsed || !this.crzDashboard) return false;

                for (let i = 0; i < 5; i++) {
                    const sliderY = this.pos[1] + (i * DASHBOARD_LINE_SPACING) + NODE_PADDING;
                    const sliderNum = i + 1;
                    
                    // Double-click on value area to edit value (like FloatSlider)
                    if (e.canvasX > this.pos[0] + this.size[0] - VALUE_RIGHT_PADDING - 40 &&
                        e.canvasY > sliderY && e.canvasY < sliderY + SLIDER_HEIGHT) {
                        
                        canvas.prompt("value", this.properties[`slider${sliderNum}_value`], function(v) {
                            v = Number(v);
                            if (!isNaN(v)) { 
                                this.properties[`slider${sliderNum}_value`] = v;
                                this.onPropertyChanged(`slider${sliderNum}_value`);
                            }
                        }.bind(this), e);
                        return true;
                    }
                    
                    // Double-click on label area to rename
                    if (e.canvasX > this.pos[0] + LABEL_LEFT_PADDING && 
                        e.canvasX < this.pos[0] + this.size[0] - TRACK_RIGHT_PADDING - 10 &&
                        e.canvasY > sliderY && e.canvasY < sliderY + SLIDER_HEIGHT) {
                        
                        canvas.prompt("Slider Name", this.properties[`slider${sliderNum}_name`], function(newName) {
                            if (newName && newName.trim()) {
                                this.properties[`slider${sliderNum}_name`] = newName.trim();
                                // Notify Dashboard Get nodes after a longer delay to ensure properties are fully updated
                                setTimeout(() => {
                                    this.notifyDashboardGetNodes();
                                }, 300);
                            }
                        }.bind(this), e);
                        return true;
                    }
                    
                    // Double-click on track area to configure
                    const trackLeft = this.pos[0] + this.size[0] - TRACK_RIGHT_PADDING;
                    const trackWidth = TRACK_WIDTH;
                    if (e.canvasX > trackLeft && e.canvasX < trackLeft + trackWidth &&
                        e.canvasY > sliderY + TRACK_VERTICAL_OFFSET - 2 && 
                        e.canvasY < sliderY + TRACK_VERTICAL_OFFSET + TRACK_HEIGHT + 2) {
                        
                        const currentMin = this.properties[`slider${sliderNum}_min`];
                        const currentMax = this.properties[`slider${sliderNum}_max`];
                        const currentStep = this.properties[`slider${sliderNum}_step`];
                        const currentDecimals = this.properties[`slider${sliderNum}_decimals`];
                        
                        const configText = `${currentMin},${currentMax},${currentStep},${currentDecimals}`;
                        
                        canvas.prompt(
                            `Configure Slider ${sliderNum} (min,max,step,decimals)`, 
                            configText, 
                            function(newConfig) {
                                if (newConfig && newConfig.trim()) {
                                    const parts = newConfig.split(',');
                                    if (parts.length === 4) {
                                        const min = parseFloat(parts[0].trim());
                                        const max = parseFloat(parts[1].trim());
                                        const step = parseFloat(parts[2].trim());
                                        const decimals = parseInt(parts[3].trim());
                                        
                                        if (!isNaN(min) && !isNaN(max) && !isNaN(step) && !isNaN(decimals)) {
                                            this.properties[`slider${sliderNum}_min`] = min;
                                            this.properties[`slider${sliderNum}_max`] = max;
                                            this.properties[`slider${sliderNum}_step`] = step;
                                            this.properties[`slider${sliderNum}_decimals`] = decimals;
                                            this.onPropertyChanged(`slider${sliderNum}_min`);
                                        }
                                    }
                                }
                            }.bind(this), 
                            e
                        );
                        return true;
                    }
                }
                return false;
            };

            nodeType.prototype.computeSize = () => [NODE_WIDTH, (5 * DASHBOARD_LINE_SPACING) + (NODE_PADDING * 2)];
            
            // Function to notify Dashboard Get nodes when properties change
            nodeType.prototype.notifyDashboardGetNodes = function() {
                if (this.graph && this.graph.dashboardPropertyListener) {
                    // Notify all Dashboard Get nodes to refresh their dropdowns
                    this.graph.dashboardPropertyListener.forEach(getNode => {
                        if (getNode.refreshDropdowns) {
                            getNode.refreshDropdowns();
                        }
                    });
                }
            };
        }
    }
}); 