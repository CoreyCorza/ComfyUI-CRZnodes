// ComfyUI.CRZ.Dropdown
import { app } from "../../scripts/app.js";
import { 
    NODE_WIDTH, 
    NODE_HEIGHT_MULTIPLIER,
    LABEL_LEFT_PADDING,
    DROPDOWN_RIGHT_PADDING,
    DROPDOWN_WIDTH,
    COMBO_TEXT_OFFSET,
    NODE_BACKGROUND_COLOR,
    LABEL_COLOR,
    INACTIVE_LABEL_COLOR,
    VALUE_COLOR,
    INACTIVE_VALUE_COLOR,
    DROPDOWN_BG_COLOR,
    DROPDOWN_BG_COLOR_INACTIVE,
    DROPDOWN_BORDER_COLOR,
    VALUE_TEXT_COLOR
} from "./CRZConfig.js";

app.registerExtension({
    name: "CRZDropdown",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "CRZDropdown") {
            // Hide the title bar like other CRZ nodes
            nodeType.title_mode = LiteGraph.NO_TITLE;
            nodeType.prototype.getTitle = function() { return ""; };
            nodeType.prototype.onDrawTitle = function() { return false; };
            
            // Set minimum size
            nodeType.min_size = [NODE_WIDTH, Math.floor(LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER)];
            
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) {
                    onNodeCreated.apply(this, arguments);
                }
                
                // Set background color like other CRZ nodes
                this.bgcolor = NODE_BACKGROUND_COLOR;
                
                // Mark this as a CRZ node for connection hiding
                this.isCRZNode = true;
                
                // Initialize properties like other CRZ nodes
                this.properties = this.properties || {};
                this.properties.label = this.properties.label || "Dropdown";
                this.properties.value = this.properties.value || "";
                this.properties.options = this.properties.options || [""];
                
                // Set consistent height like other CRZ nodes
                this.size = [NODE_WIDTH, Math.floor(LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER)];
                
                // Move widgets off-screen like FloatSlider (same technique)
                this.widgets_start_y = -2.4e8*LiteGraph.NODE_SLOT_HEIGHT;
                
                // Hide the default widget like other CRZ nodes do
                if (this.widgets && this.widgets[0]) {
                    this.widgets[0].hidden = true;
                    this.widgets[0].type = "hidden";
                }
                
                // Store reference to the value widget for syncing
                this.valueWidget = this.widgets?.find(w => w.name === "value");
                
                // Clear output socket label like other CRZ nodes
                this.onAdded = function() {
                    if (this.outputs && this.outputs[0]) {
                        this.outputs[0].name = this.outputs[0].localized_name = "";
                    }
                };
                
                // Simple function to set specific combo options
                this.setComboOptions = function(options) {
                    this.properties.options = [...options];
                    if (!options.includes(this.properties.value)) {
                        this.properties.value = options[0] || "";
                    }
                    // Sync with hidden widget
                    if (this.valueWidget) {
                        this.valueWidget.value = this.properties.value;
                        this.valueWidget.options = this.valueWidget.options || {};
                        this.valueWidget.options.values = [...options];
                    }
                    this.setDirtyCanvas(true, true);
                };
                
                // Function to update combo options based on connection
                this.updateComboOptions = function() {
                    // Check if our output is connected
                    const output = this.outputs?.[0];
                    if (!output || !output.links || output.links.length === 0) {
                        this.setComboOptions([""]);
                        return;
                    }
                    
                    // Get connected node info
                    const linkId = output.links[0];
                    const link = this.graph.links[linkId];
                    if (!link) {
                        return;
                    }
                    
                    let targetNode = this.graph.getNodeById(link.target_id);
                    let targetInput = targetNode?.inputs?.[link.target_slot];
                    
                    // PASSTHROUGH FIX: If target is a passthrough, find the final target
                    if (targetNode && targetNode.isPassthrough && targetNode.getPassthroughTarget) {
                        const passthroughTarget = targetNode.getPassthroughTarget();
                        if (passthroughTarget) {
                            targetNode = passthroughTarget.node;
                            targetInput = passthroughTarget.input;
                        }
                    }
                    
                    if (!targetNode || !targetInput) {
                        return;
                    }
                    
                    // Method 1: Try to get from target node's widget
                    const targetWidget = targetNode.widgets?.find(w => w.name === targetInput.name);
                    if (targetWidget && targetWidget.options?.values) {
                        this.setComboOptions(targetWidget.options.values);
                        return;
                    }
                    
                    // Method 2: Try to get from target node's constructor
                    const nodeConstructor = targetNode.constructor;
                    if (nodeConstructor && nodeConstructor.nodeData) {
                        const inputDef = nodeConstructor.nodeData.input?.required?.[targetInput.name] || 
                                       nodeConstructor.nodeData.input?.optional?.[targetInput.name];
                        if (inputDef && Array.isArray(inputDef[0])) {
                            this.setComboOptions(inputDef[0]);
                            return;
                        }
                    }
                    
                    // Method 3: Try global app nodeData
                    if (app.nodeData && app.nodeData[targetNode.type]) {
                        const nodeDef = app.nodeData[targetNode.type];
                        const inputDef = nodeDef.input?.required?.[targetInput.name] || 
                                       nodeDef.input?.optional?.[targetInput.name];
                        if (inputDef && Array.isArray(inputDef[0])) {
                            this.setComboOptions(inputDef[0]);
                            return;
                        }
                    }
                    
                    this.setComboOptions([""]);
                };
                
                // Override onConnectionsChange
                const originalOnConnectionsChange = this.onConnectionsChange;
                this.onConnectionsChange = function(type, index, connected, link_info) {
                    if (originalOnConnectionsChange) {
                        originalOnConnectionsChange.apply(this, arguments);
                    }
                    
                    // Update after a short delay
                    setTimeout(() => {
                        this.updateComboOptions();
                    }, 200);
                };
                
                // Property change handler like other CRZ nodes
                this.onPropertyChanged = function(propName) {
                    if (propName === "value" && this.valueWidget) {
                        this.valueWidget.value = this.properties.value;
                    }
                };
                
                // Mouse click handler for dropdown
                this.onMouseDown = function(e) {
                    if (e.canvasY - this.pos[1] < 0) return false;
                    
                    // Check if click is in dropdown area
                    const dropdownLeft = this.size[0] - DROPDOWN_RIGHT_PADDING - DROPDOWN_WIDTH;
                    if (e.canvasX < this.pos[0] + dropdownLeft || 
                        e.canvasX > this.pos[0] + dropdownLeft + DROPDOWN_WIDTH) return false;
                    
                    // Show dropdown menu
                    const options = this.properties.options || [""];
                    if (options.length > 1) {
                        const menu = new LiteGraph.ContextMenu(options, {
                            event: e,
                            callback: (value) => {
                                this.properties.value = value;
                                this.onPropertyChanged("value");
                                this.setDirtyCanvas(true, true);
                            }
                        });
                    }
                    return true;
                };
                
                // Add the double-click handler for renaming like other CRZ nodes
                const originalOnDblClick = this.onDblClick;
                this.onDblClick = function(e, pos, canvas) {
                    // Double-click on label area to rename
                    if (e.canvasX > this.pos[0] + LABEL_LEFT_PADDING && 
                        e.canvasX < this.pos[0] + this.size[0] - DROPDOWN_RIGHT_PADDING - DROPDOWN_WIDTH - 10 &&
                        e.canvasY > this.pos[1] && e.canvasY < this.pos[1] + this.size[1]) {
                        
                        canvas.prompt("Label", this.properties.label || "Dropdown", function(newLabel) {
                            if (newLabel && newLabel.trim()) {
                                this.properties.label = newLabel.trim();
                            }
                        }.bind(this), e);
                        return true;
                    }
                    
                    // Force update combo options
                    this.updateComboOptions();
                    
                    if (originalOnDblClick) {
                        return originalOnDblClick.apply(this, arguments);
                    }
                    return false;
                };
            };
            
            // Add drawing functionality like other CRZ nodes
            nodeType.prototype.onDrawForeground = function(ctx) {
                if (this.flags.collapsed) return;
                
                // Height snapping like other CRZ slider nodes - prevent vertical resize
                if (this.size[1] > LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER) {
                    this.size[1] = LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER;
                }
                
                const fontsize = LiteGraph.NODE_SUBTEXT_SIZE;
                const shX = (this.slot_start_y || 0) + fontsize * 1.5;
                
                // Check if this dropdown should be active (not greyed out)
                const isConnected = this.outputs && this.outputs[0] && 
                                   this.outputs[0].links && this.outputs[0].links.length > 0;
                const hasCustomName = (this.properties.label || "Dropdown") !== "Dropdown";
                const isActive = isConnected || hasCustomName;
                
                // Choose colors based on active status
                const labelColor = isActive ? LABEL_COLOR : INACTIVE_LABEL_COLOR;
                const valueColor = isActive ? VALUE_COLOR : INACTIVE_VALUE_COLOR;
                
                // Draw the label like other CRZ nodes
                ctx.save();
                ctx.fillStyle = labelColor;
                ctx.font = fontsize + "px Arial";
                ctx.textAlign = "left";
                ctx.fillText(this.properties.label || "Dropdown", LABEL_LEFT_PADDING, shX);
                
                // Draw dropdown area - lower position and rounded corners
                const dropdownLeft = this.size[0] - DROPDOWN_RIGHT_PADDING - DROPDOWN_WIDTH;
                const dropdownY = shX - fontsize + 3; // Lower the box
                const dropdownHeight = fontsize + 4;
                const cornerRadius = 3;
                
                // Draw rounded dropdown background
                ctx.fillStyle = isActive ? DROPDOWN_BG_COLOR : DROPDOWN_BG_COLOR_INACTIVE;
                ctx.beginPath();
                ctx.roundRect(dropdownLeft, dropdownY - 2, DROPDOWN_WIDTH, dropdownHeight, cornerRadius);
                ctx.fill();
                
                // Draw rounded dropdown border
                // ctx.strokeStyle = DROPDOWN_BORDER_COLOR;
                // ctx.lineWidth = 1;
                // ctx.beginPath();
                // ctx.roundRect(dropdownLeft, dropdownY - 2, DROPDOWN_WIDTH, dropdownHeight, cornerRadius);
                // ctx.stroke();
                
                // Draw current value
                ctx.fillStyle = valueColor;
                ctx.font = fontsize + "px Arial";
                ctx.textAlign = "center";
                const displayValue = this.properties.value || "";
                const maxWidth = DROPDOWN_WIDTH - 20;
                let truncatedValue = displayValue;
                if (ctx.measureText(displayValue).width > maxWidth) {
                    truncatedValue = displayValue.substring(0, 16) + "..";
                }
                ctx.fillText(truncatedValue, dropdownLeft + DROPDOWN_WIDTH/2, shX + 3 + COMBO_TEXT_OFFSET);
                
                ctx.restore();
            };
            
            // Set compute size function to match other CRZ nodes
            nodeType.prototype.computeSize = () => [NODE_WIDTH-100, Math.floor(LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER)];
        }
    }
});