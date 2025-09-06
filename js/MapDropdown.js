// ComfyUI - CRZ Map Dropdown JS Extension
import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "CRZ.MapDropdown",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "CRZMapDropdown") {
            // Remove title like other CRZ nodes
            nodeType.title_mode = LiteGraph.NO_TITLE;

            // Store original methods
            const originalOnNodeCreated = nodeType.prototype.onNodeCreated;
            const originalOnConfigure = nodeType.prototype.onConfigure;
            const originalOnConnectionsChange = nodeType.prototype.onConnectionsChange;

            nodeType.prototype.onNodeCreated = function () {
                const r = originalOnNodeCreated ? originalOnNodeCreated.apply(this, arguments) : undefined;
                
                // Initialize properties
                this.dropdownOptions = [];
                this.connectedDropdown = null;
                this.outputSockets = [];
                
                // Move widgets off-screen like other CRZ nodes
                this.widgets_start_y = -2.4e8*LiteGraph.NODE_SLOT_HEIGHT;
                
                // Ensure we have the custom dropdown input and one output
                if (this.inputs.length === 0) {
                    this.addInput("custom_dropdown", "*");
                }
                if (this.outputs.length === 0) {
                    this.addOutput("output", "*", { label: "output" });
                }
                
                // Auto-resize to minimum height on creation
                this.autoResize();
                
                return r;
            };

            // Set input labels like other CRZ nodes
            nodeType.prototype.onAdded = function() {
                if (this.inputs && this.inputs.length > 0) {
                    this.inputs[0].localized_name = "Custom Dropdown";
                }
                if (this.outputs && this.outputs.length > 0) {
                    this.outputs[0].name = this.outputs[0].localized_name = "";
                }
            };

            nodeType.prototype.onConfigure = function (info) {
                if (originalOnConfigure) {
                    originalOnConfigure.call(this, info);
                }
                
                // Update dropdown options from saved data
                if (info && info.dropdownOptions) {
                    this.dropdownOptions = info.dropdownOptions;
                    this.updateOutputSockets();
                }
            };

            // Override onConnectionsChange to handle dynamic outputs
            nodeType.prototype.onConnectionsChange = function (type, slotIndex, isConnected, linkInfo, ioSlot) {
                if (originalOnConnectionsChange) {
                    originalOnConnectionsChange.call(this, type, slotIndex, isConnected, linkInfo, ioSlot);
                }

                // Handle input connection changes (custom dropdown input)
                if (type === LiteGraph.INPUT && slotIndex === 0) {
                    if (isConnected && linkInfo) {
                        // A custom dropdown was connected
                        this.connectedDropdown = this.graph.getNodeById(linkInfo.origin_id);
                        this.updateDropdownOptions();
                    } else {
                        // Custom dropdown was disconnected
                        this.connectedDropdown = null;
                        this.dropdownOptions = [];
                        this.updateOutputSockets();
                    }
                }
            };

            // Method to update dropdown options from connected dropdown
            nodeType.prototype.updateDropdownOptions = function () {
                if (!this.connectedDropdown) return;

                // Try to get options from the connected dropdown
                let newOptions = [];
                
                // Check if it's a CRZ Custom Dropdown
                if (this.connectedDropdown.properties && this.connectedDropdown.properties.dropdown_options) {
                    newOptions = this.connectedDropdown.properties.dropdown_options;
                } else if (this.connectedDropdown.getOptions) {
                    newOptions = this.connectedDropdown.getOptions();
                } else if (this.connectedDropdown.options) {
                    newOptions = this.connectedDropdown.options;
                } else if (this.connectedDropdown.widgets) {
                    // Look for dropdown widget
                    const dropdownWidget = this.connectedDropdown.widgets.find(w => w.type === "combo");
                    if (dropdownWidget && dropdownWidget.options) {
                        newOptions = dropdownWidget.options.values || dropdownWidget.options;
                    }
                }

                // console.log("MapDropdown JS - Got options:", newOptions);

                // Only update if options changed
                if (JSON.stringify(newOptions) !== JSON.stringify(this.dropdownOptions)) {
                    this.dropdownOptions = newOptions;
                    this.updateOutputSockets();
                    this.updateDropdownOptionsWidget();
                }
            };

            // Method to update the dropdown options widget
            nodeType.prototype.updateDropdownOptionsWidget = function () {
                // Find or create the dropdown_options widget
                let optionsWidget = this.widgets.find(w => w.name === 'dropdown_options');
                if (!optionsWidget) {
                    this.addWidget("text", "dropdown_options", JSON.stringify(this.dropdownOptions), function(v) {
                        // This widget is read-only, just for passing data to Python
                    });
                    optionsWidget = this.widgets[this.widgets.length - 1];
                }
                
                // Make it invisible
                optionsWidget.hidden = true;
                optionsWidget.computeSize = function() { return [0, 0]; };
                optionsWidget.draw = function() { return; };
                optionsWidget.value = JSON.stringify(this.dropdownOptions);
            };

            // Method to update input sockets based on dropdown options
            nodeType.prototype.updateOutputSockets = function () {
                // Remove existing option input sockets (keep the custom dropdown input)
                const inputsToRemove = [];
                for (let i = 0; i < this.inputs.length; i++) {
                    if (this.inputs[i].name.startsWith('option_')) {
                        inputsToRemove.push(i);
                    }
                }
                // Remove in reverse order to maintain indices
                for (let i = inputsToRemove.length - 1; i >= 0; i--) {
                    this.removeInput(inputsToRemove[i]);
                }

                // Add new input sockets for each dropdown option
                this.outputSockets = [];
                for (let i = 0; i < this.dropdownOptions.length; i++) {
                    const option = this.dropdownOptions[i];
                    const socketName = `option_${i}`;
                    const socketLabel = option;
                    
                    this.addInput(socketName, "*", { label: socketLabel });
                    this.outputSockets.push({
                        name: socketName,
                        label: socketLabel,
                        index: i
                    });
                }
                
                console.log("MapDropdown JS - Created input sockets:", this.outputSockets.map(s => s.name));

                // Ensure we have one output socket
                if (this.outputs.length === 0) {
                    this.addOutput("output", "*", { label: "output" });
                }

                // Auto-adjust node height based on number of inputs
                this.autoResize();

                // Force redraw
                if (this.graph && this.graph.setDirtyCanvas) {
                    this.graph.setDirtyCanvas(true, true);
                }
            };

            // Method to automatically resize the node to fit its content
            nodeType.prototype.autoResize = function () {
                // Calculate minimum height based on number of inputs
                const minHeight = Math.max(28, (this.inputs.length -1 ) * LiteGraph.NODE_SLOT_HEIGHT+6);
                
                // Set the node size to minimum required height
                this.size[1] = minHeight;
                
                // Ensure the node is marked as dirty for redraw
                this.setDirtyCanvas(true, true);
            };


            // Override onDrawForeground to show current dropdown info
            nodeType.prototype.onDrawForeground = function (ctx) {
                if (this.dropdownOptions.length > 0) {
                    // Get the currently selected value from the connected dropdown
                    let selectedValue = "None";
                    if (this.connectedDropdown && this.connectedDropdown.properties) {
                        selectedValue = this.connectedDropdown.properties.dropdown_value || "None";
                    }
                    
                    
                    ctx.font = "8px Arial";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "bottom";
                    
                    const optionsText = `${this.dropdownOptions.length} options`;
                    const selectedText = `Active: ${selectedValue}`;
                    
                    // Measure both texts
                    const optionsWidth = ctx.measureText(optionsText).width;
                    const selectedWidth = ctx.measureText(selectedText).width;
                    const maxWidth = Math.max(optionsWidth, selectedWidth);
                    
                    // Align to the far right of the node - text width
                    const padding = 8;
                    const x = this.size[0] - maxWidth /2 - padding -2;
                    const y = 20;
                    
                    const lineHeight = 12;
                    const totalHeight = lineHeight * 2 + 4;
                    
                    // Draw rounded rectangle background
                    const rectX = x - maxWidth/2 - padding;
                    const rectY = y - totalHeight/2 - 4;
                    const rectWidth = maxWidth + padding * 2;
                    const rectHeight = totalHeight;
                    const radius = 6;
                    
                    ctx.fillStyle = "rgba(36, 36, 36, 0.8)";
                    ctx.beginPath();
                    ctx.roundRect(rectX, rectY, rectWidth, rectHeight, radius);
                    ctx.fill();
                    
                    // Draw border
                    ctx.strokeStyle = "rgba(255, 255, 255, 0.082)";
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    
                    // Draw options text
                    ctx.fillStyle = "rgba(255, 255, 255, 0.438)";
                    ctx.fillText(optionsText, x, y - lineHeight/2);

                    
                    // Draw selected text
                    ctx.fillStyle = "rgba(200, 255, 200, 0.418)";
                    ctx.fillText(selectedText, x, y + lineHeight/2);
                }
            };

            // Override serialize to save dropdown options
            const originalSerialize = nodeType.prototype.serialize;
            nodeType.prototype.serialize = function () {
                const data = originalSerialize ? originalSerialize.call(this) : {};
                data.dropdownOptions = this.dropdownOptions;
                return data;
            };

            // Override configure to restore dropdown options
            const originalConfigure = nodeType.prototype.configure;
            nodeType.prototype.configure = function (info) {
                if (originalConfigure) {
                    originalConfigure.call(this, info);
                }
                
                if (info && info.dropdownOptions) {
                    this.dropdownOptions = info.dropdownOptions;
                    this.updateOutputSockets();
                }
            };
        }
    },

    async setup() {
        // Listen for changes to dropdown nodes to update connected MapDropdown nodes
        const originalOnNodeCreated = app.registerNodeDef;
        app.registerNodeDef = function (nodeType, nodeData) {
            const result = originalOnNodeCreated.call(this, nodeType, nodeData);
            
            // If this is a custom dropdown node, add change detection
            if (nodeData.name && (nodeData.name.includes("CustomDropdown") || nodeData.name.includes("Dropdown"))) {
                const originalOnConnectionsChange = nodeType.prototype.onConnectionsChange;
                nodeType.prototype.onConnectionsChange = function (type, slotIndex, isConnected, linkInfo, ioSlot) {
                    if (originalOnConnectionsChange) {
                        originalOnConnectionsChange.call(this, type, slotIndex, isConnected, linkInfo, ioSlot);
                    }
                    
                    // Notify connected MapDropdown nodes
                    if (type === LiteGraph.OUTPUT && isConnected) {
                        const targetNode = this.graph.getNodeById(linkInfo.target_id);
                        if (targetNode && targetNode.updateDropdownOptions) {
                            targetNode.updateDropdownOptions();
                        }
                    }
                };
            }
            
            return result;
        };
    }
});
