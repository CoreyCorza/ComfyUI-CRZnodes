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
                
                // Restore connections after a short delay to ensure graph is fully loaded
                // Use multiple attempts to ensure restoration works even during undo operations
                if (this.savedConnectedDropdownId || this.savedInputConnections) {
                    let attempts = 0;
                    const maxAttempts = 5;
                    
                    const tryRestore = () => {
                        attempts++;
                        if (this.restoreConnection()) {
                            // Success, stop trying
                            return;
                        } else if (attempts < maxAttempts) {
                            // Try again with increasing delay
                            setTimeout(tryRestore, 100 * attempts);
                        }
                    };
                    
                    setTimeout(tryRestore, 50);
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

                // Skip processing during undo/redo operations to avoid conflicts
                const stackTrace = new Error().stack;
                if (stackTrace.includes('undo') || stackTrace.includes('redo') || 
                    stackTrace.includes('loadGraphData') || stackTrace.includes('pasteFromClipboard')) {
                    return;
                }

                // Handle input connection changes (custom dropdown input)
                if (type === LiteGraph.INPUT && slotIndex === 0) {
                    if (isConnected && linkInfo) {
                        // A node was connected - could be dropdown or passthrough
                        const connectedNode = this.graph.getNodeById(linkInfo.origin_id);
                        this.connectedDropdown = connectedNode;
                        
                        // Find the actual dropdown node through passthrough chains
                        const actualDropdown = this.findActualDropdownNode(connectedNode);
                        if (actualDropdown) {
                            this.updateDropdownOptions();
                        } else {
                            // No dropdown found, clear options
                            this.dropdownOptions = [];
                            this.updateOutputSockets();
                        }
                    } else {
                        // Custom dropdown was disconnected
                        this.connectedDropdown = null;
                        this.dropdownOptions = [];
                        this.updateOutputSockets();
                    }
                }
            };

            // Method to find the actual dropdown node through any reroute/passthrough chains
            nodeType.prototype.findActualDropdownNode = function (node) {
                if (!node) return null;
                
                // Check if this is a dropdown node first
                if (this.isDropdownNode(node)) {
                    return node;
                }
                
                // Check if this is any type of reroute/passthrough node
                if (this.isRerouteNode(node)) {
                    // Follow the input chain to find the source
                    if (node.inputs && node.inputs.length > 0) {
                        for (const input of node.inputs) {
                            if (input.link) {
                                const inputLink = this.graph.links[input.link];
                                if (inputLink) {
                                    const sourceNode = this.graph.getNodeById(inputLink.origin_id);
                                    const result = this.findActualDropdownNode(sourceNode);
                                    if (result) return result;
                                }
                            }
                        }
                    }
                }
                
                return null;
            };
            
            // Method to check if a node is a dropdown node
            nodeType.prototype.isDropdownNode = function (node) {
                if (!node) return false;
                
                // Check various ways a node could be a dropdown
                return (
                    // CRZ Custom Dropdown
                    (node.properties && node.properties.dropdown_options) ||
                    // Standard dropdown methods
                    (node.getOptions && typeof node.getOptions === 'function') ||
                    (node.options && Array.isArray(node.options)) ||
                    // Widget-based dropdown
                    (node.widgets && node.widgets.some(w => w.type === "combo" && w.options))
                );
            };
            
            // Method to check if a node is a reroute/passthrough node
            nodeType.prototype.isRerouteNode = function (node) {
                if (!node) return false;
                
                // Check for known reroute/passthrough node types
                const rerouteTypes = [
                    'Reroute',           // ComfyUI built-in reroute
                    'CRZPassthrough',    // CRZ passthrough
                    'Passthrough',       // Generic passthrough
                    'RerouteNode',       // Alternative naming
                    'PassThrough',       // Alternative naming
                    'Bridge',            // Bridge nodes
                    'Connector',         // Connector nodes
                    'Link',              // Link nodes
                    'Wire',              // Wire nodes
                    'Pipe',              // Pipe nodes
                    'Tunnel',            // Tunnel nodes
                    'Proxy',             // Proxy nodes
                    'Relay'              // Relay nodes
                ];
                
                // Check by type name
                if (node.type && rerouteTypes.includes(node.type)) {
                    return true;
                }
                
                // Check by node title/name
                if (node.title && rerouteTypes.some(type => node.title.includes(type))) {
                    return true;
                }
                
                // Check for CRZ passthrough specific property
                if (node.isPassthrough) {
                    return true;
                }
                
                // Check for reroute-like behavior: single input, single output, minimal functionality
                if (node.inputs && node.outputs && 
                    node.inputs.length === 1 && node.outputs.length === 1 &&
                    (!node.widgets || node.widgets.length === 0) &&
                    (!node.properties || Object.keys(node.properties).length === 0)) {
                    return true;
                }
                
                // Check for nodes that have "reroute" or "passthrough" in their name
                const nodeName = (node.type || '').toLowerCase();
                const nodeTitle = (node.title || '').toLowerCase();
                if (nodeName.includes('reroute') || nodeName.includes('passthrough') ||
                    nodeTitle.includes('reroute') || nodeTitle.includes('passthrough')) {
                    return true;
                }
                
                return false;
            };

            // Method to update dropdown options from connected dropdown
            nodeType.prototype.updateDropdownOptions = function () {
                if (!this.connectedDropdown) return;

                // Find the actual dropdown node through any passthrough chains
                const actualDropdown = this.findActualDropdownNode(this.connectedDropdown);
                if (!actualDropdown) {
                    console.log("MapDropdown JS - Could not find actual dropdown node");
                    return;
                }

                // Try to get options from the actual dropdown
                let newOptions = [];
                
                // Check if it's a CRZ Custom Dropdown
                if (actualDropdown.properties && actualDropdown.properties.dropdown_options) {
                    newOptions = actualDropdown.properties.dropdown_options;
                } else if (actualDropdown.getOptions) {
                    newOptions = actualDropdown.getOptions();
                } else if (actualDropdown.options) {
                    newOptions = actualDropdown.options;
                } else if (actualDropdown.widgets) {
                    // Look for dropdown widget
                    const dropdownWidget = actualDropdown.widgets.find(w => w.type === "combo");
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
                // Get current option sockets
                const currentOptionSockets = this.inputs.filter(input => input.name.startsWith('option_'));
                
                // Create a map of existing socket names for quick lookup
                const existingSocketMap = {};
                currentOptionSockets.forEach(socket => {
                    existingSocketMap[socket.name] = socket;
                });

                // Remove sockets that are no longer needed
                const inputsToRemove = [];
                for (let i = 0; i < this.inputs.length; i++) {
                    if (this.inputs[i].name.startsWith('option_')) {
                        const socketIndex = parseInt(this.inputs[i].name.split('_')[1]);
                        if (socketIndex >= this.dropdownOptions.length) {
                            inputsToRemove.push(i);
                        }
                    }
                }
                // Remove in reverse order to maintain indices
                for (let i = inputsToRemove.length - 1; i >= 0; i--) {
                    this.removeInput(inputsToRemove[i]);
                }

                // Update existing sockets and add new ones
                this.outputSockets = [];
                for (let i = 0; i < this.dropdownOptions.length; i++) {
                    const option = this.dropdownOptions[i];
                    const socketName = `option_${i}`;
                    const socketLabel = option;
                    
                    if (existingSocketMap[socketName]) {
                        // Update existing socket label
                        existingSocketMap[socketName].label = socketLabel;
                        this.outputSockets.push({
                            name: socketName,
                            label: socketLabel,
                            index: i
                        });
                    } else {
                        // Add new socket
                        this.addInput(socketName, "*", { label: socketLabel });
                        this.outputSockets.push({
                            name: socketName,
                            label: socketLabel,
                            index: i
                        });
                    }
                }
                
                console.log("MapDropdown JS - Updated input sockets:", this.outputSockets.map(s => s.name));

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
                    // Get the currently selected value from the actual dropdown through passthrough chains
                    let selectedValue = "None";
                    if (this.connectedDropdown) {
                        const actualDropdown = this.findActualDropdownNode(this.connectedDropdown);
                        if (actualDropdown && actualDropdown.properties) {
                            selectedValue = actualDropdown.properties.dropdown_value || "None";
                        }
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

            // Override serialize to save dropdown options and input connections
            const originalSerialize = nodeType.prototype.serialize;
            nodeType.prototype.serialize = function () {
                const data = originalSerialize ? originalSerialize.call(this) : {};
                data.dropdownOptions = this.dropdownOptions;
                // Save the connected dropdown ID if it exists
                if (this.connectedDropdown) {
                    data.connectedDropdownId = this.connectedDropdown.id;
                }
                // Save input connection data for restoration
                data.inputConnections = [];
                for (let i = 0; i < this.inputs.length; i++) {
                    const input = this.inputs[i];
                    if (input.name.startsWith('option_') && input.link !== null) {
                        data.inputConnections.push({
                            inputIndex: i,
                            inputName: input.name,
                            linkId: input.link
                        });
                    }
                }
                return data;
            };

            // Override configure to restore dropdown options and connections
            const originalConfigure = nodeType.prototype.configure;
            nodeType.prototype.configure = function (info) {
                if (originalConfigure) {
                    originalConfigure.call(this, info);
                }
                
                if (info && info.dropdownOptions) {
                    this.dropdownOptions = info.dropdownOptions;
                    this.updateOutputSockets();
                }
                
                // Store the connected dropdown ID for later restoration
                if (info && info.connectedDropdownId) {
                    this.savedConnectedDropdownId = info.connectedDropdownId;
                }
                
                // Store input connections for restoration
                if (info && info.inputConnections) {
                    this.savedInputConnections = info.inputConnections;
                }
            };

            // Method to restore connection after graph is loaded
            nodeType.prototype.restoreConnection = function () {
                let success = true;
                
                if (this.savedConnectedDropdownId && this.graph) {
                    const connectedNode = this.graph.getNodeById(this.savedConnectedDropdownId);
                    if (connectedNode) {
                        this.connectedDropdown = connectedNode;
                        
                        // Find the actual dropdown node through passthrough chains
                        const actualDropdown = this.findActualDropdownNode(connectedNode);
                        if (actualDropdown) {
                            this.updateDropdownOptions();
                        } else {
                            // No dropdown found, clear options
                            this.dropdownOptions = [];
                            this.updateOutputSockets();
                        }
                        delete this.savedConnectedDropdownId;
                    } else {
                        success = false; // Connected node not found yet
                    }
                }
                
                // Restore input connections
                if (this.savedInputConnections && this.graph) {
                    // Check if all required links exist
                    const allLinksExist = this.savedInputConnections.every(conn => 
                        this.graph.links.find(l => l.id === conn.linkId)
                    );
                    
                    if (allLinksExist) {
                        this.restoreInputConnections();
                    } else {
                        success = false; // Some links not found yet
                    }
                }
                
                return success;
            };
            
            // Method to restore input connections
            nodeType.prototype.restoreInputConnections = function () {
                if (!this.savedInputConnections || !this.graph) return;
                
                for (const connection of this.savedInputConnections) {
                    // Find the link in the graph
                    const link = this.graph.links.find(l => l.id === connection.linkId);
                    if (link) {
                        // Reconnect the input
                        const inputIndex = this.inputs.findIndex(input => input.name === connection.inputName);
                        if (inputIndex !== -1) {
                            this.inputs[inputIndex].link = connection.linkId;
                            // Update the link's target information
                            link.target_id = this.id;
                            link.target_slot = inputIndex;
                        }
                    }
                }
                
                // Clear saved connections
                delete this.savedInputConnections;
                
                // Force redraw
                if (this.graph && this.graph.setDirtyCanvas) {
                    this.graph.setDirtyCanvas(true, true);
                }
            };
            
            // Override onGraphRebuilt to handle restoration after graph rebuilds
            nodeType.prototype.onGraphRebuilt = function() {
                // Try to restore connections after graph rebuild
                if (this.savedConnectedDropdownId || this.savedInputConnections) {
                    setTimeout(() => {
                        this.restoreConnection();
                    }, 100);
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
                    
                    // Notify connected MapDropdown nodes (including through passthrough chains)
                    if (type === LiteGraph.OUTPUT && isConnected) {
                        this.notifyConnectedMapDropdowns();
                    }
                };
                
                // Add method to notify all connected MapDropdown nodes
                nodeType.prototype.notifyConnectedMapDropdowns = function() {
                    if (!this.graph) return;
                    
                    // Find all MapDropdown nodes that might be connected to this dropdown
                    const mapDropdownNodes = Object.values(this.graph._nodes_by_id).filter(node => 
                        node.type === "CRZMapDropdown"
                    );
                    
                    mapDropdownNodes.forEach(mapDropdown => {
                        if (mapDropdown.connectedDropdown) {
                            // Check if this dropdown is in the chain leading to the MapDropdown
                            const actualDropdown = mapDropdown.findActualDropdownNode(mapDropdown.connectedDropdown);
                            if (actualDropdown && actualDropdown.id === this.id) {
                                mapDropdown.updateDropdownOptions();
                            }
                        }
                    });
                };
            }
            
            // If this is any type of reroute/passthrough node, add change detection for MapDropdown nodes
            if (nodeData.name && (
                nodeData.name === "Reroute" ||           // ComfyUI built-in
                nodeData.name === "CRZPassthrough" ||    // CRZ passthrough
                nodeData.name.toLowerCase().includes('reroute') ||
                nodeData.name.toLowerCase().includes('passthrough') ||
                nodeData.name.toLowerCase().includes('bridge') ||
                nodeData.name.toLowerCase().includes('connector') ||
                nodeData.name.toLowerCase().includes('link') ||
                nodeData.name.toLowerCase().includes('wire') ||
                nodeData.name.toLowerCase().includes('pipe') ||
                nodeData.name.toLowerCase().includes('tunnel') ||
                nodeData.name.toLowerCase().includes('proxy') ||
                nodeData.name.toLowerCase().includes('relay')
            )) {
                const originalOnConnectionsChange = nodeType.prototype.onConnectionsChange;
                nodeType.prototype.onConnectionsChange = function (type, slotIndex, isConnected, linkInfo, ioSlot) {
                    if (originalOnConnectionsChange) {
                        originalOnConnectionsChange.call(this, type, slotIndex, isConnected, linkInfo, ioSlot);
                    }
                    
                    // Notify connected MapDropdown nodes when reroute connections change
                    if (type === LiteGraph.OUTPUT && isConnected) {
                        this.notifyConnectedMapDropdowns();
                    }
                };
                
                // Add method to notify connected MapDropdown nodes
                nodeType.prototype.notifyConnectedMapDropdowns = function() {
                    if (!this.graph) return;
                    
                    // Find all MapDropdown nodes that might be connected to this reroute
                    const mapDropdownNodes = Object.values(this.graph._nodes_by_id).filter(node => 
                        node.type === "CRZMapDropdown"
                    );
                    
                    mapDropdownNodes.forEach(mapDropdown => {
                        if (mapDropdown.connectedDropdown && mapDropdown.connectedDropdown.id === this.id) {
                            mapDropdown.updateDropdownOptions();
                        }
                    });
                };
            }
            
            return result;
        };
    }
});
