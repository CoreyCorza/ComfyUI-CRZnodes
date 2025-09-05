// ComfyUI.CRZ.StringNode
import { app } from "../../scripts/app.js";
import { 
    NODE_WIDTH, 
    NODE_HEIGHT_MULTIPLIER,
    NODE_PADDING,
    LABEL_LEFT_PADDING,
    TRACK_RIGHT_PADDING,
    VALUE_RIGHT_SHIFT,
    VALUE_RIGHT_OFFSET,
    VALUE_RIGHT_PADDING,
    DASHBOARD_LINE_SPACING,
    NODE_BACKGROUND_COLOR,
    LABEL_COLOR,
    VALUE_COLOR,
    INACTIVE_LABEL_COLOR,
    INACTIVE_VALUE_COLOR,
    DROPDOWN_BG_COLOR,
    DROPDOWN_BG_COLOR_INACTIVE
} from "./CRZConfig.js";

class CRZStringNode {
    constructor(node) {
        this.node = node;
        
        // Initialize properties
        this.node.properties = this.node.properties || {};
        this.node.properties.text_value = this.node.properties.text_value ?? "";
        this.node.properties.text_name = this.node.properties.text_name ?? "String";

        // Define layout constants in constructor scope (like BooleanToggle)
        this.node.size = [NODE_WIDTH, Math.floor(LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER)];
        const fontsize = LiteGraph.NODE_SUBTEXT_SIZE;
        const shX = (this.node.slot_start_y || 0) + fontsize * 1.5;
        const shiftLeft = 10;
        const shiftRight = 60;

        this.node.onAdded = function() {
            // Hide widget and set output
            if (this.widgets && this.widgets[0]) {
                this.widgets[0].hidden = true;
                this.widgets[0].type = "hidden";
            }
            if (this.outputs && this.outputs[0]) {
                this.outputs[0].name = this.outputs[0].localized_name = "";
                this.outputs[0].type = "STRING";
            }
            this.widgets_start_y = -2.4e8 * LiteGraph.NODE_SLOT_HEIGHT;
        };

        this.node.onConfigure = function() {
            if (this.outputs && this.outputs[0]) {
                this.outputs[0].type = "STRING";
            }
        };

        this.node.onGraphConfigured = function() {
            this.configured = true;
            this.onPropertyChanged();
        };

        // Property changed handler
        this.node.onPropertyChanged = function(propName) {
            if (!this.configured) return;
            
            // Update widget with current text value
            if (this.widgets && this.widgets[0]) {
                this.widgets[0].value = this.properties.text_value || "";
            }
        };

        // Store the mouse handler function to avoid recursion
        this.mouseDownHandler = function(e)
        {
            if ( e.canvasY - this.pos[1] < 0 ) return false;
            
            // Text area hit detection (similar to BooleanToggle's expanded toggle)
            const textAreaWidth = 115;
            const textAreaLeft = this.size[0] - TRACK_RIGHT_PADDING;
            
            if ( e.canvasX < this.pos[0] + textAreaLeft - 5 || e.canvasX > this.pos[0] + textAreaLeft + textAreaWidth + 5 ) return false;
            if ( e.canvasY < this.pos[1] + shiftLeft - 5 || e.canvasY > this.pos[1] + this.size[1] - shiftLeft + 5 ) return false;

            // Show text input prompt using ComfyUI dialog
            const canvas = app.canvas;
            if (canvas && canvas.prompt) {
                canvas.prompt(
                    "Text Value", 
                    this.properties.text_value || "", 
                    function(newText) {
                        this.properties.text_value = newText || "";
                        this.onPropertyChanged('text_value');
                        
                        // Update widget
                        if (this.widgets && this.widgets[0]) {
                            this.widgets[0].value = this.properties.text_value;
                        }
                        
                        // Mark the graph as changed
                        if (this.graph && this.graph.setDirtyCanvas) {
                            this.graph.setDirtyCanvas(true);
                        } else if (this.graph && this.graph._version !== undefined) {
                            this.graph._version++;
                        }
                    }.bind(this), 
                    e
                );
            }
            
            return true;
        }.bind(this.node);
    }
}

app.registerExtension({
    name: "CRZ.StringNode",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name === "CRZStringNode") {
            // Hide the title bar
            nodeType.title_mode = LiteGraph.NO_TITLE;
            nodeType.prototype.getTitle = function() { return ""; };
            nodeType.prototype.onDrawTitle = function() { return false; };
            
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                onNodeCreated?.apply(this, arguments);
                this.bgcolor = NODE_BACKGROUND_COLOR;
                
                // Initialize and hide the widget like other CRZ nodes
                if (this.widgets && this.widgets[0]) {
                    this.widgets[0].value = this.properties.text_value || "";
                    this.widgets[0].hidden = true;
                    this.widgets[0].type = "hidden";
                } else {
                    // Manually create the widget if it doesn't exist
                    this.addWidget("text", "text", "", function(v) {
                        this.properties.text_value = v;
                    });
                    if (this.widgets && this.widgets[0]) {
                        this.widgets[0].hidden = true;
                        this.widgets[0].type = "hidden";
                    }
                }
                
                this.crzStringNode = new CRZStringNode(this);
                
                // Override the onMouseDown at the instance level to ensure it's called
                const originalOnMouseDown = this.onMouseDown;
                this.onMouseDown = function(e) {
                    // Try the CRZ handler first
                    if (this.crzStringNode && this.crzStringNode.mouseDownHandler) {
                        const result = this.crzStringNode.mouseDownHandler(e);
                        if (result) return result;
                    }
                    // Fall back to original if needed
                    if (originalOnMouseDown) {
                        return originalOnMouseDown.call(this, e);
                    }
                    return false;
                };
                
                // Mark as CRZ node for connection hiding
                this.isCRZNode = true;
            };

            // Force the node to use explicit width
            nodeType.prototype.computeSize = () => [NODE_WIDTH-100, Math.floor(LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER)];


            nodeType.prototype.onDrawForeground = function(ctx) {
                if (this.flags.collapsed || !this.crzStringNode) return;
                
                // Height snapping like other CRZ slider nodes - prevent vertical resize
                if (this.size[1] > LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER) {
                    this.size[1] = LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER;
                }
                
                // Mark as configured
                this.configured = true;

                const textValue = this.properties.text_value || "";
                const name = this.properties.text_name || "String";
                
                const stringY = NODE_PADDING;
                
                // Check if this string node should be active (not greyed out)
                const isConnected = this.outputs && this.outputs[0] && 
                                   this.outputs[0].links && this.outputs[0].links.length > 0;
                const hasCustomName = name !== "String";
                const hasText = textValue !== "";
                const isActive = isConnected || hasCustomName || hasText;
                
                // Choose colors based on active status
                const labelColor = isActive ? LABEL_COLOR : INACTIVE_LABEL_COLOR;
                const valueColor = isActive ? VALUE_COLOR : INACTIVE_VALUE_COLOR;
                
                // Draw name on the left
                ctx.fillStyle = labelColor;
                ctx.font = LiteGraph.NODE_SUBTEXT_SIZE + "px Arial";
                ctx.textAlign = "left";
                ctx.fillText(name, LABEL_LEFT_PADDING, stringY + 15);
                
                // Draw text area - same positioning as dropdown/combo nodes
                const textAreaWidth = 115; // Match dropdown width
                const textAreaLeft = this.size[0] - TRACK_RIGHT_PADDING;
                const textAreaY = stringY + 10 - 8;
                const textAreaHeight = 16;
                const cornerRadius = 3;
                
                // Draw rounded text background
                ctx.fillStyle = isActive ? DROPDOWN_BG_COLOR : DROPDOWN_BG_COLOR_INACTIVE;
                ctx.beginPath();
                ctx.roundRect(textAreaLeft, textAreaY, textAreaWidth, textAreaHeight, cornerRadius);
                ctx.fill();
                
                // Draw current text value (centered in text area)
                ctx.fillStyle = valueColor;
                ctx.font = LiteGraph.NODE_SUBTEXT_SIZE + "px Arial";
                ctx.textAlign = "center";
                const maxWidth = textAreaWidth - 20;
                let truncatedValue = textValue || "\"\"";
                if (ctx.measureText(truncatedValue).width > maxWidth) {
                    truncatedValue = truncatedValue.substring(0, 12) + "..";
                }
                ctx.fillText(truncatedValue, textAreaLeft + textAreaWidth/2, stringY + 14);
            };

            nodeType.prototype.onDblClick = function(e, pos, canvas) {
                if (this.flags.collapsed || !this.crzStringNode) return false;

                const stringY = this.pos[1] + NODE_PADDING;
                
                // Double-click on text area to edit text (same as single-click now)
                const textAreaWidth = 115;
                const textAreaLeft = this.pos[0] + this.size[0] - TRACK_RIGHT_PADDING;
                const textAreaY = stringY + 10 - 8;
                const textAreaHeight = 16;
                
                if (e.canvasX > textAreaLeft && e.canvasX < textAreaLeft + textAreaWidth &&
                    e.canvasY > textAreaY && e.canvasY < textAreaY + textAreaHeight) {
                    
                    canvas.prompt(
                        "Text Value", 
                        this.properties.text_value || "", 
                        function(newText) {
                            this.properties.text_value = newText || "";
                            this.onPropertyChanged('text_value');
                            
                            // Update widget
                            if (this.widgets && this.widgets[0]) {
                                this.widgets[0].value = this.properties.text_value;
                            }
                        }.bind(this), 
                        e
                    );
                    return true;
                }
                
                // Double-click on label area to rename
                if (e.canvasX > this.pos[0] + LABEL_LEFT_PADDING && 
                    e.canvasX < this.pos[0] + this.size[0] - TRACK_RIGHT_PADDING - 10 &&
                    e.canvasY > stringY && e.canvasY < stringY + DASHBOARD_LINE_SPACING - 2) {
                    
                    canvas.prompt("String Name", this.properties.text_name, function(newName) {
                        if (newName && newName.trim()) {
                            this.properties.text_name = newName.trim();
                        }
                    }.bind(this), e);
                    return true;
                }
                
                return false;
            };
        }
    }
});
