// ComfyUI.CRZ.DashboardNode - Single dynamic slider based on connections
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
    INACTIVE_HANDLE_COLOR,
    TOGGLE_WIDTH,
    TOGGLE_HEIGHT,
    TOGGLE_CORNER_RADIUS,
    HANDLE_SIZE,
    HANDLE_CORNER_RADIUS,
    HANDLE_PADDING,
    TOGGLE_VERTICAL_OFFSET,
    TOGGLE_ACTIVE_COLOR,
    TOGGLE_INACTIVE_COLOR,
    HANDLE_COLOR,
    HANDLE_BORDER_ACTIVE,
    HANDLE_BORDER_INACTIVE,
    DROPDOWN_BG_COLOR,
    DROPDOWN_BG_COLOR_INACTIVE,
} from "./CRZConfig.js";

// Layout constants
const TRACK_VERTICAL_OFFSET = 10;

class CRZDashboardNode {
    constructor(node) {
        this.node = node;
        
        // Initialize properties for single slider
        this.node.properties = this.node.properties || {};
        
        // Initialize single slider with default properties
        this.node.properties.slider_value = this.node.properties.slider_value ?? 0.0;
        this.node.properties.slider_min = this.node.properties.slider_min ?? 0.0;
        this.node.properties.slider_max = this.node.properties.slider_max ?? 1.0;
        this.node.properties.slider_step = this.node.properties.slider_step ?? 0.01;
        this.node.properties.slider_decimals = this.node.properties.slider_decimals ?? 2;
        this.node.properties.slider_name = this.node.properties.slider_name ?? "Placeholder";
        this.node.properties.slider_type = this.node.properties.slider_type ?? "FLOAT";
        this.node.properties.slider_options = this.node.properties.slider_options ?? [""];
        this.node.properties.slider_selected_index = this.node.properties.slider_selected_index ?? 0;

        // Mouse handling
        this.capture = false;
        this.captureSlider = -1;

        // Boolean toggle animation properties
        this.booleanAnimationProgress = 0;
        this.booleanTargetProgress = 0;
        this.booleanAnimationSpeed = 8; // Higher = faster animation
        this.isBooleanAnimating = false;

        this.node.onAdded = function() {
            // Hide widget and set output
            if (this.widgets && this.widgets[0]) {
                this.widgets[0].hidden = true;
                this.widgets[0].type = "hidden";
            }
            if (this.outputs && this.outputs[0]) {
                this.outputs[0].name = this.outputs[0].localized_name = "";
                this.outputs[0].type = "*"; // Use any type to allow FLOAT, INT, and BOOLEAN connections
            }
            this.widgets_start_y = -2.4e8 * LiteGraph.NODE_SLOT_HEIGHT;
        };

        this.node.onConfigure = function() {
            if (this.outputs && this.outputs[0]) {
                this.outputs[0].type = "*"; // Always use any type
            }
        };

        this.node.onGraphConfigured = function() {
            this.configured = true;
            
            // Sync boolean animation state with actual value on load
            if (this.crzDashboardNode && this.properties.slider_type === "BOOLEAN") {
                this.crzDashboardNode.booleanAnimationProgress = this.properties.slider_value ? 1 : 0;
                this.crzDashboardNode.booleanTargetProgress = this.crzDashboardNode.booleanAnimationProgress;
                this.crzDashboardNode.isBooleanAnimating = false;
            }
            
            this.onPropertyChanged();
            this.updateSliderTypeFromConnections();
        };

        // Property changed handler
        this.node.onPropertyChanged = function(propName) {
            if (!this.configured) return;
            
            const sliderType = this.properties.slider_type ?? "FLOAT";
            
            if (sliderType === "INT") {
                // INTEGER SLIDER LOGIC
                this.properties.slider_min = Math.floor(this.properties.slider_min);
                this.properties.slider_max = Math.floor(this.properties.slider_max);
                this.properties.slider_step = Math.floor(this.properties.slider_step);
                if (this.properties.slider_step <= 0) this.properties.slider_step = 1;
                this.properties.slider_decimals = 0;

                if (isNaN(this.properties.slider_value)) this.properties.slider_value = this.properties.slider_min;
                if (this.properties.slider_min >= this.properties.slider_max) this.properties.slider_max = this.properties.slider_min + this.properties.slider_step;
                if (propName === 'slider_min' && this.properties.slider_value < this.properties.slider_min) this.properties.slider_value = this.properties.slider_min;
                if (propName === 'slider_max' && this.properties.slider_value > this.properties.slider_max) this.properties.slider_value = this.properties.slider_max;
                
                // Round to integer
                this.properties.slider_value = Math.floor(this.properties.slider_value);
            } else if (sliderType === "BOOLEAN") {
                // BOOLEAN TOGGLE LOGIC
                this.properties.slider_value = Boolean(this.properties.slider_value);
                this.properties.slider_decimals = 0;
                
                // Start animation when boolean value changes
                if (this.crzDashboardNode && propName === "slider_value") {
                    this.crzDashboardNode.booleanTargetProgress = this.properties.slider_value ? 1 : 0;
                    this.crzDashboardNode.startBooleanAnimation();
                }
            } else if (sliderType === "COMBO") {
                // COMBO DROPDOWN LOGIC
                const options = this.properties.slider_options || [""];
                const selectedIndex = this.properties.slider_selected_index || 0;
                
                // Ensure selected index is valid
                if (selectedIndex >= options.length) {
                    this.properties.slider_selected_index = 0;
                }
                
                // Set value to selected option
                this.properties.slider_value = options[this.properties.slider_selected_index] || "";
            } else {
                // FLOAT SLIDER LOGIC
                this.properties.slider_decimals = Math.floor(this.properties.slider_decimals);
                if (this.properties.slider_decimals < 0) this.properties.slider_decimals = 0;
                if (this.properties.slider_decimals > 10) this.properties.slider_decimals = 10;

                if (isNaN(this.properties.slider_value)) this.properties.slider_value = this.properties.slider_min;
                if (this.properties.slider_min >= this.properties.slider_max) this.properties.slider_max = this.properties.slider_min + this.properties.slider_step;
                if (propName === 'slider_min' && this.properties.slider_value < this.properties.slider_min) this.properties.slider_value = this.properties.slider_min;
                if (propName === 'slider_max' && this.properties.slider_value > this.properties.slider_max) this.properties.slider_value = this.properties.slider_max;
                
                // Round to specified decimal places
                const multiplier = Math.pow(10, this.properties.slider_decimals);
                this.properties.slider_value = Math.round(this.properties.slider_value * multiplier) / multiplier;
            }
            
            // Update widget with proper type-aware value
            if (this.widgets && this.widgets[0]) {
                let value = this.properties.slider_value;
                
                if (sliderType === "INT") {
                    this.widgets[0].value = Math.round(value);
                } else if (sliderType === "BOOLEAN") {
                    this.widgets[0].value = value ? true : false;
                } else if (sliderType === "COMBO") {
                    this.widgets[0].value = String(value);
                } else {
                    this.widgets[0].value = value;
                }
            }
        };

        // Tooltip state
        this.node.showTooltip = false;
        this.node.tooltipText = "";

        // Mouse leave handler
        this.node.onMouseLeave = function(e) {
            this.showTooltip = false;
            if (this.tooltipElement) {
                this.tooltipElement.style.display = 'none';
            }
            return false;
        };

        // Cleanup tooltip when node is removed
        this.node.onRemoved = function() {
            if (this.tooltipElement) {
                this.tooltipElement.remove();
                this.tooltipElement = null;
            }
        };

        // Mouse event handlers
        this.node.onMouseDown = function(e) {
            if (e.canvasY - this.pos[1] < 0) return false;
            
            const sliderType = this.properties.slider_type ?? "FLOAT";
            const sliderY = NODE_PADDING;
            const trackLeft = this.size[0] - TRACK_RIGHT_PADDING;
            
            if (sliderType === "COMBO") {
                // COMBO DROPDOWN LOGIC (matching Dropdown.js)
                const dropdownWidth = TRACK_WIDTH + 45; // Make it wider for text
                const dropdownLeft = trackLeft; // Adjust left position to match drawing
                const dropdownY = sliderY + TRACK_VERTICAL_OFFSET - 8;
                const dropdownHeight = 16;
                
                // Check if click is in dropdown area
                if (e.canvasX < this.pos[0] + dropdownLeft || e.canvasX > this.pos[0] + dropdownLeft + dropdownWidth) return false;
                if (e.canvasY < this.pos[1] + dropdownY || e.canvasY > this.pos[1] + dropdownY + dropdownHeight) return false;

                // Show dropdown context menu (matching Dropdown.js)
                const options = this.properties.slider_options || [""];
                if (options.length > 1) {
                    const menu = new LiteGraph.ContextMenu(options, {
                        event: e,
                        callback: (value) => {
                            this.properties.slider_selected_index = options.indexOf(value);
                            this.properties.slider_value = value;
                            this.onPropertyChanged('slider_value');
                            
                            // Update widget with proper string value
                            if (this.widgets && this.widgets[0]) {
                                this.widgets[0].value = String(value);
                            }
                            
                            // Mark the graph as changed
                            if (this.graph && this.graph.setDirtyCanvas) {
                                this.graph.setDirtyCanvas(true);
                            } else if (this.graph && this.graph._version !== undefined) {
                                this.graph._version++;
                            }
                        }
                    });
                }
                
                return true;
            } else if (sliderType === "BOOLEAN") {
                // BOOLEAN TOGGLE LOGIC - expanded toggle
                const expandedToggleWidth = TOGGLE_WIDTH + 10;
                const expandedToggleLeft = this.size[0] - TRACK_RIGHT_PADDING + 40;
                const trackY = sliderY + TRACK_VERTICAL_OFFSET;
                const clickAreaTop = trackY - TOGGLE_HEIGHT;
                const clickAreaBottom = trackY + TOGGLE_HEIGHT;
                
                // Check if click is in expanded toggle area
                if (e.canvasX < this.pos[0] + expandedToggleLeft || e.canvasX > this.pos[0] + expandedToggleLeft + expandedToggleWidth) return false;
                if (e.canvasY < this.pos[1] + clickAreaTop || e.canvasY > this.pos[1] + clickAreaBottom) return false;

                // Toggle the boolean value
                this.properties.slider_value = !this.properties.slider_value;
                this.onPropertyChanged('slider_value');
                
                // Update widget with proper boolean value
                if (this.widgets && this.widgets[0]) {
                    this.widgets[0].value = this.properties.slider_value ? true : false;
                }
                
                // Mark the graph as changed
                if (this.graph && this.graph.setDirtyCanvas) {
                    this.graph.setDirtyCanvas(true);
                } else if (this.graph && this.graph._version !== undefined) {
                    this.graph._version++;
                }
                
                return true;
            } else {
                // SLIDER LOGIC (INT/FLOAT)
                const trackWidth = TRACK_WIDTH;
                const trackY = sliderY + TRACK_VERTICAL_OFFSET;
                const clickAreaTop = trackY - 8;
                const clickAreaBottom = trackY + 14;
                
                // Check if click is in slider area (updated for new positioning)
                if (e.canvasX < this.pos[0] + trackLeft || e.canvasX > this.pos[0] + trackLeft + trackWidth) return false;
                if (e.canvasY < this.pos[1] + clickAreaTop || e.canvasY > this.pos[1] + clickAreaBottom) return false;
                
                this.captureSlider = 0;
                this.capture = true;
                this.valueUpdate(e);
                
                return true;
            }
        };

        this.node.onMouseMove = function(e, pos, canvas) {
            // Handle tooltip logic when not capturing
            if (!this.capture) {
                if (e.canvasY - this.pos[1] < 0) return false;
                
                const sliderType = this.properties.slider_type ?? "FLOAT";
                const sliderY = NODE_PADDING;
                const trackLeft = this.size[0] - TRACK_RIGHT_PADDING;
                
                if (sliderType === "COMBO") {
                    // COMBO DROPDOWN TOOLTIP LOGIC
                    const dropdownWidth = TRACK_WIDTH + 45;
                    const dropdownLeft = trackLeft;
                    const dropdownY = sliderY + TRACK_VERTICAL_OFFSET - 8;
                    const dropdownHeight = 16;
                    
                    const isInDropdown = e.canvasX >= this.pos[0] + dropdownLeft && 
                                       e.canvasX <= this.pos[0] + dropdownLeft + dropdownWidth &&
                                       e.canvasY >= this.pos[1] + dropdownY && 
                                       e.canvasY <= this.pos[1] + dropdownY + dropdownHeight;
                    
                    if (isInDropdown) {
                        this.showTooltip = true;
                        this.tooltipText = this.properties.slider_value || "";
                        // Store the mouse event for later use
                        this.lastMouseEvent = e;
                    } else {
                        this.showTooltip = false;
                    }
                } else {
                    this.showTooltip = false;
                }
                
                return false;
            }
            
            // Handle slider dragging when capturing
            if (canvas.pointer.isDown === false) { this.onMouseUp(e); return; }
            this.valueUpdate(e);
        };

        this.node.onMouseUp = function(e) {
            if (!this.capture) return;
            this.capture = false;
            this.captureSlider = -1;
            
            // Update widget with proper type-aware value
            if (this.widgets && this.widgets[0]) {
                const sliderType = this.properties.slider_type || "FLOAT";
                let value = this.properties.slider_value;
                
                if (sliderType === "INT") {
                    this.widgets[0].value = Math.round(value);
                } else if (sliderType === "BOOLEAN") {
                    this.widgets[0].value = value ? true : false;
                } else if (sliderType === "COMBO") {
                    this.widgets[0].value = String(value);
                } else {
                    this.widgets[0].value = value;
                }
            }
        };

        this.node.valueUpdate = function(e) {
            if (this.captureSlider < 0) return;
            
            const min = this.properties.slider_min;
            const max = this.properties.slider_max;
            const step = this.properties.slider_step;
            const decimals = this.properties.slider_decimals;
            
            const trackLeft = this.size[0] - TRACK_RIGHT_PADDING;
            const trackWidth = TRACK_WIDTH;
            
            let prevValue = this.properties.slider_value;
            let vX = (e.canvasX - this.pos[0] - trackLeft) / trackWidth;

            if (e.ctrlKey) this.unlock = true;
            if (e.shiftKey) {
                let stepSize = step / (max - min);
                vX = Math.round(vX / stepSize) * stepSize;
            }

            vX = Math.max(0, Math.min(1, vX));
            this.properties.slider_value = min + (max - min) * vX;

            // Apply step constraint first
            if (step > 0) {
                this.properties.slider_value = Math.round((this.properties.slider_value - min) / step) * step + min;
            }

            // Then apply type-specific rounding
            const sliderType = this.properties.slider_type || "FLOAT";
            if (sliderType === "INT") {
                this.properties.slider_value = Math.round(this.properties.slider_value);
            } else {
                const multiplier = Math.pow(10, decimals);
                this.properties.slider_value = Math.round(this.properties.slider_value * multiplier) / multiplier;
            }

            if (this.graph && this.graph.setDirtyCanvas) {
                this.graph.setDirtyCanvas(true);
            } else if (this.graph && this.graph._version !== undefined) {
                this.graph._version++;
            }
        };

        // Update slider type from connections
        this.node.updateSliderTypeFromConnections = function() {
            if (!this.outputs || !this.outputs[0] || !this.outputs[0].links) {
                return;
            }

            const output = this.outputs[0];
            if (!output.links || output.links.length === 0) {
                return;
            }

            for (const linkId of output.links) {
                if (!this.graph || !this.graph.links[linkId]) continue;
                
                const link = this.graph.links[linkId];
                const targetNode = this.graph.getNodeById(link.target_id);
                
                if (!targetNode || !targetNode.inputs || !targetNode.inputs[link.target_slot]) continue;
                
                let targetInput = targetNode.inputs[link.target_slot];
                let detectedType = targetInput.type;

                // Handle passthrough nodes (using Dropdown's proven method)
                let finalTargetNode = targetNode;
                let finalTargetInput = targetInput;
                
                if (targetNode.isPassthrough && targetNode.getPassthroughTarget) {
                    const passthroughTarget = targetNode.getPassthroughTarget();
                    if (passthroughTarget) {
                        finalTargetNode = passthroughTarget.node;
                        finalTargetInput = passthroughTarget.input;
                        detectedType = finalTargetInput.type;
                    }
                } else if (targetNode.isPassthrough && targetNode.outputs && targetNode.outputs[0] && targetNode.outputs[0].links) {
                    for (const passthroughLinkId of targetNode.outputs[0].links) {
                        if (!this.graph.links[passthroughLinkId]) continue;
                        
                        const passthroughLink = this.graph.links[passthroughLinkId];
                        const passthroughTargetNode = this.graph.getNodeById(passthroughLink.target_id);
                        
                        if (passthroughTargetNode && passthroughTargetNode.inputs && passthroughTargetNode.inputs[passthroughLink.target_slot]) {
                            finalTargetNode = passthroughTargetNode;
                            finalTargetInput = passthroughTargetNode.inputs[passthroughLink.target_slot];
                            detectedType = finalTargetInput.type;
                            break;
                        }
                    }
                }

                // Check for ComboBox (using Dropdown's proven methods)
                let comboOptions = null;
                
                // Method 1: Try to get from target widget
                const targetWidget = finalTargetNode.widgets?.find(w => w.name === finalTargetInput.name);
                if (targetWidget && targetWidget.options?.values) {
                    comboOptions = targetWidget.options.values;
                }
                
                // Method 2: Try to get from target node's constructor
                if (!comboOptions) {
                    const nodeConstructor = finalTargetNode.constructor;
                    if (nodeConstructor && nodeConstructor.nodeData) {
                        const inputDef = nodeConstructor.nodeData.input?.required?.[finalTargetInput.name] || 
                                       nodeConstructor.nodeData.input?.optional?.[finalTargetInput.name];
                        if (inputDef && Array.isArray(inputDef[0])) {
                            comboOptions = inputDef[0];
                        }
                    }
                }
                
                // Method 3: Try global app nodeData
                if (!comboOptions && app.nodeData && app.nodeData[finalTargetNode.type]) {
                    const nodeDef = app.nodeData[finalTargetNode.type];
                    const inputDef = nodeDef.input?.required?.[finalTargetInput.name] || 
                                   nodeDef.input?.optional?.[finalTargetInput.name];
                    if (inputDef && Array.isArray(inputDef[0])) {
                        comboOptions = inputDef[0];
                    }
                }

                // Update slider type based on detected type
                if (comboOptions && comboOptions.length > 0) {
                    // ComboBox detected - highest priority
                    this.properties.slider_type = "COMBO";
                    this.properties.slider_options = [...comboOptions];
                    // Set value to first option if current value is not in options
                    const currentValue = this.properties.slider_value;
                    if (!comboOptions.includes(currentValue)) {
                        this.properties.slider_value = comboOptions[0] || "";
                        this.properties.slider_selected_index = 0;
                        // Update the widget with the new string value
                        this.onPropertyChanged('slider_value');
                    } else {
                        this.properties.slider_selected_index = comboOptions.indexOf(currentValue);
                    }
                    // Force property change notification
                    this.onPropertyChanged('slider_type');
                } else if (!comboOptions && detectedType === "INT" && this.properties.slider_type !== "INT") {
                    this.properties.slider_type = "INT";
                    this.properties.slider_min = 0;
                    this.properties.slider_max = 10;
                    this.properties.slider_step = 1;
                    this.properties.slider_decimals = 0;
                    this.properties.slider_value = Math.round(this.properties.slider_value);
                } else if (!comboOptions && detectedType === "BOOLEAN" && this.properties.slider_type !== "BOOLEAN") {
                    this.properties.slider_type = "BOOLEAN";
                    this.properties.slider_value = this.properties.slider_value > 0.5 ? true : false;
                    // Force property change notification
                    this.onPropertyChanged('slider_type');
                } else if (!comboOptions && (detectedType === "FLOAT" || detectedType === "*") && this.properties.slider_type !== "FLOAT") {
                    this.properties.slider_type = "FLOAT";
                    this.properties.slider_min = 0.0;
                    this.properties.slider_max = 1.0;
                    this.properties.slider_step = 0.01;
                    this.properties.slider_decimals = 2;
                    this.properties.slider_value = parseFloat(this.properties.slider_value);
                }
                
                break; // Only check first connection
            }
        };

        this.node.size = [300, Math.floor(LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER)];
    }

    // Boolean animation methods
    startBooleanAnimation() {
        this.isBooleanAnimating = true;
        this.animateBooleanStep();
    }
    
    animateBooleanStep() {
        if (!this.isBooleanAnimating) return;
        
        // Request animation frame for smooth animation
        requestAnimationFrame(() => this.animateBooleanStep());
        
        // Mark canvas as dirty to trigger redraw
        if (this.node.graph && this.node.graph.setDirtyCanvas) {
            this.node.graph.setDirtyCanvas(true);
        }
    }
    
    updateBooleanAnimation() {
        if (Math.abs(this.booleanAnimationProgress - this.booleanTargetProgress) < 0.01) {
            this.booleanAnimationProgress = this.booleanTargetProgress;
            this.isBooleanAnimating = false;
            return;
        }
        
        // Smooth easing animation
        const diff = this.booleanTargetProgress - this.booleanAnimationProgress;
        this.booleanAnimationProgress += diff * (this.booleanAnimationSpeed * 0.016); // 60fps normalized
    }

    // Color interpolation method for rgba colors
    interpolateColor(color1, color2, t) {
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
    }
}

app.registerExtension({
    name: "CRZ.DashboardNode",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name === "CRZDashboardNode") {
            // Hide the title bar
            nodeType.title_mode = LiteGraph.NO_TITLE;
            nodeType.prototype.getTitle = function() { return ""; };
            nodeType.prototype.onDrawTitle = function() { return false; };

            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                onNodeCreated?.apply(this, arguments);
                this.bgcolor = NODE_BACKGROUND_COLOR;
                
                // Initialize and hide the widget 
                if (this.widgets && this.widgets[0]) {
                    // Set initial value from properties
                    this.widgets[0].value = this.properties.slider_value || 0.0;
                    this.widgets[0].hidden = true;
                    this.widgets[0].type = "hidden";
                } else {
                    // Manually create the widget if it doesn't exist
                    this.addWidget("number", "slider", 0.0, function(v) {
                        this.properties.slider_value = v;
                    });
                    if (this.widgets && this.widgets[0]) {
                        this.widgets[0].hidden = true;
                        this.widgets[0].type = "hidden";
                    }
                }
                
                // Simple hiding 
                this.onAdded = function() {
                    this.outputs[0].name = this.outputs[0].localized_name = "";
                    this.widgets_start_y = -2.4e8*LiteGraph.NODE_SLOT_HEIGHT;
                    
                    if (this.widgets && this.widgets[0]) {
                        this.widgets[0].hidden = true;
                        this.widgets[0].type = "hidden";
                    }
                };
                
                this.crzDashboardNode = new CRZDashboardNode(this);
                
                // Initialize boolean animation state to match current value
                if (this.crzDashboardNode && this.properties.slider_type === "BOOLEAN") {
                    this.crzDashboardNode.booleanAnimationProgress = this.properties.slider_value ? 1 : 0;
                    this.crzDashboardNode.booleanTargetProgress = this.crzDashboardNode.booleanAnimationProgress;
                    this.crzDashboardNode.isBooleanAnimating = false;
                }

                // Mark as CRZ node for connection hiding
                this.isCRZNode = true;
            };

            // Force the node to use explicit width - min
            nodeType.prototype.computeSize = () => [NODE_WIDTH-100, Math.floor(LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER)];

            nodeType.prototype.onDrawForeground = function(ctx) {
                if (this.flags.collapsed || !this.crzDashboardNode) return;
                
                // Height snapping - prevent vertical resize
                if (this.size[1] > LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER) {
                    this.size[1] = LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER;
                }
                
                // Mark as configured
                this.configured = true;

                // Update boolean animation if needed
                if (this.crzDashboardNode && this.properties.slider_type === "BOOLEAN") {
                    this.crzDashboardNode.updateBooleanAnimation();
                }

                const value = this.properties.slider_value ?? 0.0;
                const min = this.properties.slider_min ?? 0.0;
                const max = this.properties.slider_max ?? 1.0;
                const decimals = this.properties.slider_decimals ?? 2;
                const name = this.properties.slider_name ?? "Placeholder";
                const type = this.properties.slider_type ?? "FLOAT";
                
                const sliderY = NODE_PADDING;
                
                // Check if this slider should be active (not greyed out)
                const isConnected = this.outputs && this.outputs[0] && 
                                   this.outputs[0].links && this.outputs[0].links.length > 0;
                const hasCustomName = name !== "Placeholder";
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
                
                if (type === "COMBO") {
                    // COMBO DROPDOWN DRAWING (matching Dropdown.js styling)
                    const options = this.properties.slider_options || [""];
                    const selectedIndex = this.properties.slider_selected_index || 0;
                    const selectedValue = options[selectedIndex] || "";
                    
                    // Draw dropdown area - wider for ComboBox text
                    const dropdownWidth = TRACK_WIDTH + 45; // Make it wider for text
                    const dropdownLeft = this.size[0] - TRACK_RIGHT_PADDING; // Adjust left position
                    const dropdownY = sliderY + TRACK_VERTICAL_OFFSET - 8;
                    const dropdownHeight = 16;
                    const cornerRadius = 3;
                    
                    // Draw rounded dropdown background (matching Dropdown.js)
                    ctx.fillStyle = isActive ? DROPDOWN_BG_COLOR : DROPDOWN_BG_COLOR_INACTIVE;
                    ctx.beginPath();
                    ctx.roundRect(dropdownLeft, dropdownY, dropdownWidth, dropdownHeight, cornerRadius);
                    ctx.fill();
                    
                    // Draw rounded dropdown border (matching Dropdown.js)
                    // ctx.strokeStyle = isActive ? "#555" : "#333";
                    // ctx.lineWidth = 1;
                    // ctx.beginPath();
                    // ctx.roundRect(dropdownLeft, dropdownY, dropdownWidth, dropdownHeight, cornerRadius);
                    // ctx.stroke();
                    
                    // Draw current value (centered in dropdown, matching Dropdown.js)
                    ctx.fillStyle = valueColor;
                    ctx.font = LiteGraph.NODE_SUBTEXT_SIZE + "px Arial";
                    ctx.textAlign = "center";
                    const maxWidth = dropdownWidth - 20;
                    let truncatedValue = selectedValue;
                    if (ctx.measureText(selectedValue).width > maxWidth) {
                        truncatedValue = selectedValue.substring(0, 8) + "..";
                    }
                    ctx.fillText(truncatedValue, dropdownLeft + dropdownWidth/2, sliderY + 14);
                    
                    // Draw tooltip using same method as other CRZ nodes
                    if (this.showTooltip && this.tooltipText) {
                        if (!this.tooltipElement) {
                            this.tooltipElement = document.createElement("div");
                            this.tooltipElement.style.cssText = `
                                position: fixed;
                                background: rgba(24, 24, 24, 0.95);
                                color: #868686;
                                padding: 4px 8px;
                                border-radius: 4px;
                                font-size: 16px;
                                pointer-events: none;
                                z-index: 10000;
                                border: 1px solid rgba(41, 41, 41, 0.9);
                                white-space: nowrap;
                            `;
                            document.body.appendChild(this.tooltipElement);
                        }
                        
                        // Get screen coordinates from the stored mouse event
                        let screenX = 0;
                        let screenY = 0;
                        
                        if (this.lastMouseEvent) {
                            // Try to get client coordinates from the original event
                            const originalEvent = this.lastMouseEvent.originalEvent || this.lastMouseEvent;
                            screenX = originalEvent.clientX || 0;
                            screenY = originalEvent.clientY || 0;
                        }
                        
                        this.tooltipElement.textContent = this.tooltipText;
                        this.tooltipElement.style.left = (screenX - this.tooltipElement.offsetWidth/2) + 'px';
                        this.tooltipElement.style.top = (screenY - 60) + 'px';
                        this.tooltipElement.style.display = 'block';
                    } else if (this.tooltipElement) {
                        this.tooltipElement.style.display = 'none';
                    }
                    
                } else if (type === "BOOLEAN") {
                    // BOOLEAN TOGGLE DRAWING WITH ANIMATION (expanded, no text)
                    // Value text removed - toggle fills the space
                    
                    // Draw expanded toggle switch - wider and more centered
                    const expandedToggleWidth = TOGGLE_WIDTH + 10; // Make it wider
                    const toggleLeft = this.size[0] - TRACK_RIGHT_PADDING + 40; // Move it left a bit
                    const toggleY = sliderY + TRACK_VERTICAL_OFFSET;
                    
                    // Get animation progress for smooth transitions
                    const progress = this.crzDashboardNode ? this.crzDashboardNode.booleanAnimationProgress : (value ? 1 : 0);
                    
                    // Toggle background - interpolate colors during animation
                    const bgColor = this.crzDashboardNode ? 
                        this.crzDashboardNode.interpolateColor(TOGGLE_INACTIVE_COLOR, TOGGLE_ACTIVE_COLOR, progress) :
                        (value ? TOGGLE_ACTIVE_COLOR : TOGGLE_INACTIVE_COLOR);
                    ctx.fillStyle = bgColor;
                    ctx.beginPath();
                    ctx.roundRect(toggleLeft, toggleY - TOGGLE_HEIGHT/2, expandedToggleWidth, TOGGLE_HEIGHT, TOGGLE_CORNER_RADIUS);
                    ctx.fill();
                    
                    // Animated toggle handle position - use expanded width
                    const leftPos = toggleLeft + HANDLE_PADDING;
                    const rightPos = toggleLeft + expandedToggleWidth - HANDLE_SIZE - HANDLE_PADDING;
                    const handleX = leftPos + (rightPos - leftPos) * progress;
                    const handleY = toggleY - HANDLE_SIZE/2;
                    
                    ctx.fillStyle = HANDLE_COLOR;
                    ctx.beginPath();
                    ctx.roundRect(handleX, handleY, HANDLE_SIZE, HANDLE_SIZE, HANDLE_CORNER_RADIUS);
                    ctx.fill();
                    
                    // Handle border - interpolate colors during animation
                    const borderColor = this.crzDashboardNode ? 
                        this.crzDashboardNode.interpolateColor(HANDLE_BORDER_INACTIVE, HANDLE_BORDER_ACTIVE, progress) :
                        (value ? HANDLE_BORDER_ACTIVE : HANDLE_BORDER_INACTIVE);
                    ctx.strokeStyle = borderColor;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.roundRect(handleX, handleY, HANDLE_SIZE, HANDLE_SIZE, HANDLE_CORNER_RADIUS);
                    ctx.stroke();
                    
                } else {
                    // SLIDER DRAWING (INT/FLOAT)
                    const normalizedValue = Math.max(0, Math.min(1, (value - min) / (max - min)));
                    
                    // Draw value on the right (matching FloatSlider positioning)
                    ctx.fillStyle = valueColor;
                    ctx.font = LiteGraph.NODE_SUBTEXT_SIZE + "px Arial";
                    ctx.textAlign = "center";
                    const displayValue = type === "INT" ? 
                        Math.round(value).toString() : 
                        parseFloat(value).toFixed(decimals);
                    ctx.fillText(displayValue, this.size[0] - VALUE_RIGHT_SHIFT + VALUE_RIGHT_OFFSET, sliderY + 15);
                    
                    // Draw slider track (same as Dashboard Multi)
                    ctx.fillStyle = trackColor;
                    ctx.beginPath();
                    const trackY = sliderY + TRACK_VERTICAL_OFFSET-1;
                    const trackLeft = this.size[0] - TRACK_RIGHT_PADDING;
                    const trackWidth = TRACK_WIDTH;
                    ctx.roundRect(trackLeft, trackY, trackWidth, TRACK_HEIGHT, 2);
                    ctx.fill();
                    
                    // Draw slider handle as vertical rounded rectangle (same as Dashboard Multi)
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
                if (this.flags.collapsed || !this.crzDashboardNode) return false;

                const sliderY = this.pos[1] + NODE_PADDING;
                const currentType = this.properties.slider_type || "FLOAT";
                
                // Double-click on expanded toggle area for boolean, or value area for others
                if (currentType === "BOOLEAN") {
                    // Check expanded toggle area for boolean
                    const expandedToggleWidth = TOGGLE_WIDTH + 10;
                    const expandedToggleLeft = this.pos[0] + this.size[0] - TRACK_RIGHT_PADDING + 40;
                    const toggleY = sliderY + TRACK_VERTICAL_OFFSET;
                    
                    if (e.canvasX > expandedToggleLeft && e.canvasX < expandedToggleLeft + expandedToggleWidth &&
                        e.canvasY > toggleY - TOGGLE_HEIGHT && e.canvasY < toggleY + TOGGLE_HEIGHT) {
                        // Toggle boolean value directly
                        this.properties.slider_value = !this.properties.slider_value;
                        this.onPropertyChanged('slider_value');
                        return true;
                    }
                } else if (e.canvasX > this.pos[0] + this.size[0] - VALUE_RIGHT_PADDING - 40 &&
                    e.canvasY > sliderY && e.canvasY < sliderY + SLIDER_HEIGHT) {
                    
                    if (currentType === "COMBO") {
                        // Show combo dropdown menu (matching Dropdown.js)
                        const options = this.properties.slider_options || [""];
                        if (options.length > 1) {
                            const menu = new LiteGraph.ContextMenu(options, {
                                event: e,
                                callback: (value) => {
                                    this.properties.slider_selected_index = options.indexOf(value);
                                    this.properties.slider_value = value;
                                    this.onPropertyChanged('slider_value');
                                    
                                    // Update widget with proper string value
                                    if (this.widgets && this.widgets[0]) {
                                        this.widgets[0].value = String(value);
                                    }
                                }
                            });
                        }
                        return true;
                    } else {
                        // Edit numeric value
                        const currentValue = this.properties.slider_value;
                        const displayValue = currentType === "INT" ? Math.round(currentValue).toString() : currentValue.toString();
                        
                        canvas.prompt("value", displayValue, function(v) {
                            if (currentType === "INT") {
                                v = parseInt(v);
                                if (!isNaN(v)) { 
                                    this.properties.slider_value = v;
                                    this.onPropertyChanged('slider_value');
                                }
                            } else {
                                v = Number(v);
                                if (!isNaN(v)) { 
                                    this.properties.slider_value = v;
                                    this.onPropertyChanged('slider_value');
                                }
                            }
                        }.bind(this), e);
                        return true;
                    }
                }
                
                // Double-click on slider track area to configure 
                if (currentType === "FLOAT" || currentType === "INT") {
                    const trackLeft = this.pos[0] + this.size[0] - TRACK_RIGHT_PADDING;
                    const trackWidth = TRACK_WIDTH;
                    const trackY = sliderY + TRACK_VERTICAL_OFFSET;
                    
                    if (e.canvasX > trackLeft && e.canvasX < trackLeft + trackWidth &&
                        e.canvasY > trackY - 10 && e.canvasY < trackY + 10) {
                        
                        if (currentType === "FLOAT") {
                            // Configure FLOAT slider
                            const currentMin = this.properties.slider_min;
                            const currentMax = this.properties.slider_max;
                            const currentStep = this.properties.slider_step;
                            const currentDecimals = this.properties.slider_decimals;
                            
                            const configText = `${currentMin},${currentMax},${currentStep},${currentDecimals}`;
                            
                            canvas.prompt(
                                "Configure Float Slider (min,max,step,decimals)", 
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
                                                this.properties.slider_min = min;
                                                this.properties.slider_max = max;
                                                this.properties.slider_step = step;
                                                this.properties.slider_decimals = decimals;
                                                
                                                // Force property validation
                                                this.configured = true;
                                                this.onPropertyChanged("slider_min");
                                                
                                                // Force canvas redraw
                                                if (this.graph && this.graph.setDirtyCanvas) {
                                                    this.graph.setDirtyCanvas(true);
                                                }
                                            }
                                        }
                                    }
                                }.bind(this), 
                                e
                            );
                        } else if (currentType === "INT") {
                            // Configure INT slider
                            const currentMin = this.properties.slider_min;
                            const currentMax = this.properties.slider_max;
                            const currentStep = this.properties.slider_step;
                            
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
                                                this.properties.slider_min = min;
                                                this.properties.slider_max = max;
                                                this.properties.slider_step = step;
                                                
                                                // Force property validation
                                                this.configured = true;
                                                this.onPropertyChanged("slider_min");
                                                
                                                // Force canvas redraw
                                                if (this.graph && this.graph.setDirtyCanvas) {
                                                    this.graph.setDirtyCanvas(true);
                                                }
                                            }
                                        }
                                    }
                                }.bind(this), 
                                e
                            );
                        }
                        return true;
                    }
                }
                
                // Double-click on label area to rename  
                const relativeSliderY = NODE_PADDING;
                const clickHeight = DASHBOARD_LINE_SPACING - 2; // Use spacing minus small margin
                if (e.canvasX > this.pos[0] + LABEL_LEFT_PADDING && 
                    e.canvasX < this.pos[0] + this.size[0] - TRACK_RIGHT_PADDING - 10 &&
                    e.canvasY > this.pos[1] + relativeSliderY && e.canvasY < this.pos[1] + relativeSliderY + clickHeight) {
                    
                    canvas.prompt("Slider Name", this.properties.slider_name, function(newName) {
                        if (newName && newName.trim()) {
                            this.properties.slider_name = newName.trim();
                            // Notify Dashboard Get nodes after a longer delay to ensure properties are fully updated
                            setTimeout(() => {
                                if (this.notifyDashboardGetNodes) {
                                    this.notifyDashboardGetNodes();
                                }
                            }, 300);
                        }
                    }.bind(this), e);
                    return true;
                }
                
                return false;
            };

            nodeType.prototype.onConnectionsChange = function(type, slotIndex, isConnected, linkInfo, ioSlot) {
                if (this.crzDashboardNode && type === LiteGraph.OUTPUT) {
                    // Immediate update for responsiveness
                    setTimeout(() => {
                        this.updateSliderTypeFromConnections();
                        if (this.graph && this.graph.setDirtyCanvas) {
                            this.graph.setDirtyCanvas(true);
                        }
                    }, 10);
                    
                    // Additional updates with delays to catch late connection changes
                    setTimeout(() => {
                        this.updateSliderTypeFromConnections();
                        if (this.graph && this.graph.setDirtyCanvas) {
                            this.graph.setDirtyCanvas(true);
                        }
                    }, 50);
                    
                    // Final update to ensure everything is synced
                    setTimeout(() => {
                        this.updateSliderTypeFromConnections();
                        if (this.graph && this.graph.setDirtyCanvas) {
                            this.graph.setDirtyCanvas(true);
                        }
                    }, 200);
                    
                    // Extra update for stubborn cases
                    setTimeout(() => {
                        this.updateSliderTypeFromConnections();
                        if (this.graph && this.graph.setDirtyCanvas) {
                            this.graph.setDirtyCanvas(true);
                        }
                    }, 500);
                }
            };

            nodeType.prototype.onGraphConfigured = function() {
                if (this.crzDashboardNode) {
                    // Update slider type after graph is loaded
                    setTimeout(() => {
                        this.updateSliderTypeFromConnections();
                    }, 100);
                }
            };
        }
    }
});
