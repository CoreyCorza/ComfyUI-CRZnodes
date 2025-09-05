// ComfyUI.CRZ.CustomDropdown
import { app } from "../../scripts/app.js";
import { 
    NODE_WIDTH, 
    NODE_HEIGHT_MULTIPLIER,
    LABEL_LEFT_PADDING,
    TRACK_RIGHT_PADDING,
    TRACK_WIDTH,
    VALUE_RIGHT_PADDING,
    NODE_PADDING,
    NODE_BACKGROUND_COLOR,
    LABEL_COLOR,
    INACTIVE_LABEL_COLOR,
    VALUE_COLOR,
    INACTIVE_VALUE_COLOR,
    TRACK_COLOR,
    INACTIVE_TRACK_COLOR,
    INACTIVE_HANDLE_COLOR,
    DROPDOWN_BG_COLOR,
    DROPDOWN_BG_COLOR_INACTIVE
} from "./CRZConfig.js";

// Layout constants
const TRACK_VERTICAL_OFFSET = 10;

class CRZCustomDropdown {
    constructor(node) {
        this.node = node;
        
        // Initialize properties
        this.node.properties = this.node.properties || {};
        this.node.properties.dropdown_name = this.node.properties.dropdown_name ?? "Custom Dropdown";
        this.node.properties.dropdown_value = this.node.properties.dropdown_value ?? "";
        this.node.properties.dropdown_options = this.node.properties.dropdown_options ?? ["Option 1", "Option 2", "Option 3"];
        this.node.properties.dropdown_selected_index = this.node.properties.dropdown_selected_index ?? 0;
        this.node.size = [NODE_WIDTH, Math.floor(LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER)];
        // Set initial value to first option
        if (this.node.properties.dropdown_options.length > 0) {
            this.node.properties.dropdown_value = this.node.properties.dropdown_options[this.node.properties.dropdown_selected_index];
        }

        // Property change handler
        this.node.onPropertyChanged = function(propName) {
            if (!this.configured) return;
            
            // Update widget with current value
            if (this.widgets && this.widgets[0]) {
                if (typeof this.properties.dropdown_value === 'string') {
                    this.widgets[0].value = this.properties.dropdown_value;
                } else {
                    this.widgets[0].value = this.properties.dropdown_value;
                }
            }
        };

        // Tooltip state
        this.node.showTooltip = false;
        this.node.tooltipText = "";

        // Mouse move handler for tooltip
        this.node.onMouseMove = function(e) {
            if (e.canvasY - this.pos[1] < 0) return false;
            
            const dropdownWidth = TRACK_WIDTH + 45;
            const dropdownLeft = this.size[0] - TRACK_RIGHT_PADDING;
            const sliderY = NODE_PADDING;
            const dropdownY = sliderY + TRACK_VERTICAL_OFFSET - 8;
            const dropdownHeight = 16;
            
            const isInDropdown = e.canvasX >= this.pos[0] + dropdownLeft && 
                               e.canvasX <= this.pos[0] + dropdownLeft + dropdownWidth &&
                               e.canvasY >= this.pos[1] + dropdownY && 
                               e.canvasY <= this.pos[1] + dropdownY + dropdownHeight;
            
            if (isInDropdown) {
                this.showTooltip = true;
                this.tooltipText = this.properties.dropdown_value || "";
                // Store the mouse event for later use
                this.lastMouseEvent = e;
            } else {
                this.showTooltip = false;
            }
            
            return false;
        };

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

        // Mouse event handler for dropdown click
        this.node.onMouseDown = function(e) {
            if (e.canvasY - this.pos[1] < 0) return false;
            
            const dropdownWidth = TRACK_WIDTH + 45;
            const dropdownLeft = this.size[0] - TRACK_RIGHT_PADDING;
            const sliderY = NODE_PADDING;
            const dropdownY = sliderY + TRACK_VERTICAL_OFFSET - 8;
            const dropdownHeight = 16;
            
            // Check if click is in dropdown area
            if (e.canvasX < this.pos[0] + dropdownLeft || e.canvasX > this.pos[0] + dropdownLeft + dropdownWidth) return false;
            if (e.canvasY < this.pos[1] + dropdownY || e.canvasY > this.pos[1] + dropdownY + dropdownHeight) return false;

            // Track click timing for double-click detection
            const now = Date.now();
            const timeSinceLastClick = now - (this.lastClickTime || 0);
            this.lastClickTime = now;
            
            // If this is potentially a double-click, wait longer
            const isDoubleClick = timeSinceLastClick < 300;
            const delay = isDoubleClick ? 350 : 200;
            
            // Cancel any existing timeout
            if (this.clickTimeout) {
                clearTimeout(this.clickTimeout);
            }
            
            // Delay single-click to allow double-click detection
            this.clickTimeout = setTimeout(() => {
                // Check if we were cancelled by double-click
                if (this.doubleClickHandled) {
                    this.doubleClickHandled = false;
                    return;
                }
                
                // Show dropdown context menu (single-click)
                const options = this.properties.dropdown_options || ["Option 1"];
                if (options.length > 0) {
                    const menu = new LiteGraph.ContextMenu(options, {
                        event: e,
                        callback: (value) => {
                            this.properties.dropdown_selected_index = options.indexOf(value);
                            this.properties.dropdown_value = value;
                            this.onPropertyChanged('dropdown_value');
                            
                            // Update widget
                            if (this.widgets && this.widgets[0]) {
                                this.widgets[0].value = value;
                            }
                            
                            // Mark the graph as changed
                            if (this.graph && this.graph.setDirtyCanvas) {
                                this.graph.setDirtyCanvas(true);
                            }
                        }
                    });
                }
                
                // Reset double-click flag after handling single-click
                this.doubleClickHandled = false;
            }, delay);
            
            return true;
        };

        // Double-click handler for configuration and renaming
        this.node.onDblClick = function(e, pos, canvas) {
            if (this.flags.collapsed || !this.crzCustomDropdown) return false;

            // Cancel single-click timeout if double-click detected
            if (this.clickTimeout) {
                clearTimeout(this.clickTimeout);
                this.clickTimeout = null;
            }
            
            // Mark that double-click was handled
            this.doubleClickHandled = true;

            const sliderY = this.pos[1] + NODE_PADDING;
            const dropdownWidth = TRACK_WIDTH + 45;
            const dropdownLeft = this.pos[0] + this.size[0] - TRACK_RIGHT_PADDING;
            const dropdownY = sliderY + TRACK_VERTICAL_OFFSET - 8;
            const dropdownHeight = 16;
            
            // Double-click on dropdown area to configure options
            if (e.canvasX > dropdownLeft && e.canvasX < dropdownLeft + dropdownWidth &&
                e.canvasY > dropdownY && e.canvasY < dropdownY + dropdownHeight) {
                
                const currentOptions = this.properties.dropdown_options.join(', ');
                
                canvas.prompt(
                    "Configure Dropdown Options (comma-separated)", 
                    currentOptions, 
                    function(newOptions) {
                        if (newOptions && newOptions.trim()) {
                            // Parse the options
                            const options = newOptions.split(',').map(opt => {
                                const trimmed = opt.trim();
                                // Try to convert to number if it looks like a number
                                const num = parseFloat(trimmed);
                                if (!isNaN(num) && trimmed === num.toString()) {
                                    return num;
                                }
                                return trimmed;
                            }).filter(opt => opt !== ''); // Remove empty options
                            
                            if (options.length > 0) {
                                this.properties.dropdown_options = options;
                                // Reset to first option
                                this.properties.dropdown_selected_index = 0;
                                this.properties.dropdown_value = options[0];
                                this.onPropertyChanged('dropdown_value');
                            }
                        }
                        
                        // Reset double-click flag after configuration is complete
                        this.doubleClickHandled = false;
                    }.bind(this), 
                    e
                );
                return true;
            }
            
            // Double-click on label area to rename
            if (e.canvasX > this.pos[0] + LABEL_LEFT_PADDING && 
                e.canvasX < dropdownLeft - 10 &&
                e.canvasY > sliderY && e.canvasY < sliderY + 20) {
                
                canvas.prompt("Dropdown Name", this.properties.dropdown_name, function(newName) {
                    if (newName && newName.trim()) {
                        this.properties.dropdown_name = newName.trim();
                    }
                }.bind(this), e);
                return true;
            }
            
            return false;
        };
    }
}

app.registerExtension({
    name: "CRZCustomDropdown",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "CRZCustomDropdown") {
            // Hide the title bar
            nodeType.title_mode = LiteGraph.NO_TITLE;
            nodeType.prototype.getTitle = function() { return ""; };
            nodeType.prototype.onDrawTitle = function() { return false; };
            
            // Set minimum size
            nodeType.min_size = [NODE_WIDTH, Math.floor(LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER)];
            
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                onNodeCreated?.apply(this, arguments);
                this.bgcolor = NODE_BACKGROUND_COLOR;
                
                // Initialize and hide the widget
                if (this.widgets && this.widgets[0]) {
                    this.widgets[0].value = this.properties.dropdown_value || "";
                    this.widgets[0].hidden = true;
                    this.widgets[0].type = "hidden";
                } else {
                    // Manually create the widget if it doesn't exist
                    this.addWidget("text", "dropdown", "", function(v) {
                        this.properties.dropdown_value = v;
                    });
                    if (this.widgets && this.widgets[0]) {
                        this.widgets[0].hidden = true;
                        this.widgets[0].type = "hidden";
                    }
                }
                
                // Hide widgets off-screen
                this.onAdded = function() {
                    this.outputs[0].name = this.outputs[0].localized_name = "";
                    this.widgets_start_y = -2.4e8*LiteGraph.NODE_SLOT_HEIGHT;
                    
                    if (this.widgets && this.widgets[0]) {
                        this.widgets[0].hidden = true;
                        this.widgets[0].type = "hidden";
                    }
                };
                
                this.crzCustomDropdown = new CRZCustomDropdown(this);
                
                // Mark as CRZ node for connection hiding
                this.isCRZNode = true;
            };
            
            // Force the node to use explicit width
            nodeType.prototype.computeSize = () => [NODE_WIDTH-100, Math.floor(LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER)];

            nodeType.prototype.onDrawForeground = function(ctx) {
                if (this.flags.collapsed || !this.crzCustomDropdown) return;
                
                // Height snapping - prevent vertical resize
                if (this.size[1] > LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER) {
                    this.size[1] = LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER;
                }
                
                // Mark as configured
                this.configured = true;
                
                const name = this.properties.dropdown_name || "Custom Dropdown";
                const options = this.properties.dropdown_options || ["Option 1"];
                const selectedIndex = this.properties.dropdown_selected_index || 0;
                const selectedValue = options[selectedIndex] !== undefined ? options[selectedIndex] : (options[0] !== undefined ? options[0] : "");
                
                const sliderY = NODE_PADDING;
                
                // Check if this dropdown should be active (not greyed out)
                const isConnected = this.outputs && this.outputs[0] && 
                                   this.outputs[0].links && this.outputs[0].links.length > 0;
                const hasCustomName = name !== "Custom Dropdown";
                const isActive = isConnected || hasCustomName;
                
                // Choose colors based on active status
                const labelColor = isActive ? LABEL_COLOR : INACTIVE_LABEL_COLOR;
                const valueColor = isActive ? VALUE_COLOR : INACTIVE_VALUE_COLOR;
                
                // Draw name on the left
                ctx.fillStyle = labelColor;
                ctx.font = LiteGraph.NODE_SUBTEXT_SIZE + "px Arial";
                ctx.textAlign = "left";
                ctx.fillText(name, LABEL_LEFT_PADDING, sliderY + 15);
                
                // Draw dropdown area
                const dropdownWidth = TRACK_WIDTH + 50;
                const dropdownLeft = this.size[0] - TRACK_RIGHT_PADDING;
                const dropdownY = sliderY + TRACK_VERTICAL_OFFSET - 8;
                const dropdownHeight = 16;
                const cornerRadius = 3;
                
                // Draw rounded dropdown background
                ctx.fillStyle = isActive ? DROPDOWN_BG_COLOR : DROPDOWN_BG_COLOR_INACTIVE;
                ctx.beginPath();
                ctx.roundRect(dropdownLeft, dropdownY, dropdownWidth, dropdownHeight, cornerRadius);
                ctx.fill();
                
                // Draw rounded dropdown border
                // ctx.strokeStyle = isActive ? "#555" : "#333";
                // ctx.lineWidth = 0;
                // ctx.beginPath();
                // ctx.roundRect(dropdownLeft, dropdownY, dropdownWidth, dropdownHeight, cornerRadius);
                // ctx.stroke();
                
                // Draw current value (centered in dropdown)
                ctx.fillStyle = valueColor;
                ctx.font = LiteGraph.NODE_SUBTEXT_SIZE + "px Arial";
                ctx.textAlign = "center";
                const maxWidth = dropdownWidth - 20;
                let truncatedValue = String(selectedValue);
                if (ctx.measureText(truncatedValue).width > maxWidth) {
                    truncatedValue = truncatedValue.substring(0, 8) + "..";
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
            };
        }
    }
});
