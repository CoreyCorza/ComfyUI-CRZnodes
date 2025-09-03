// ComfyUI.CRZ.ResizeImageMask - Resize image and mask together
import { app } from "../../scripts/app.js";
import { 
    NODE_WIDTH, 
    NODE_HEIGHT_MULTIPLIER
} from "./CRZConfig.js";

app.registerExtension({
    name: "CRZResizeImageMask",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "CRZResizeImageMask") {
            // Keep the title bar visible for this node
            
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) {
                    onNodeCreated.apply(this, arguments);
                }
                
                // Keep widgets visible for this node
                
                // Set input/output labels and handle conditional inputs
                this.onAdded = function() {
                    if (this.inputs) {
                        if (this.inputs[0]) {
                            this.inputs[0].name = "image";
                            this.inputs[0].localized_name = "Image";
                        }
                        if (this.inputs[1]) {
                            this.inputs[1].name = "resize_mode";
                            this.inputs[1].localized_name = "Resize Mode";
                        }
                        if (this.inputs[2]) {
                            this.inputs[2].name = "longest_side";
                            this.inputs[2].localized_name = "Longest Side";
                        }
                        if (this.inputs[3]) {
                            this.inputs[3].name = "width";
                            this.inputs[3].localized_name = "Width";
                        }
                        if (this.inputs[4]) {
                            this.inputs[4].name = "height";
                            this.inputs[4].localized_name = "Height";
                        }
                        if (this.inputs[5]) {
                            this.inputs[5].name = "resize_method";
                            this.inputs[5].localized_name = "Resize Method";
                        }
                        // Only try to access optional inputs if they exist
                        if (this.inputs[6]) {
                            this.inputs[6].name = "mask";
                            this.inputs[6].localized_name = "Mask";
                        }
                        if (this.inputs[7]) {
                            this.inputs[7].name = "mask_blur";
                            this.inputs[7].localized_name = "Mask Blur";
                        }
                        if (this.inputs[8]) {
                            this.inputs[8].name = "mask_grow";
                            this.inputs[8].localized_name = "Mask Grow";
                        }
                    }
                    if (this.outputs) {
                        if (this.outputs[0]) {
                            this.outputs[0].name = "resized_image";
                            this.outputs[0].localized_name = "Image";
                        }
                        if (this.outputs[1]) {
                            this.outputs[1].name = "resized_mask";
                            this.outputs[1].localized_name = "Mask";
                        }
                    }
                    
                    // Set up conditional input visibility
                    this.setupConditionalInputs();
                };
                
                // Ensure labels are set on configure too
                const originalOnConfigure = this.onConfigure;
                this.onConfigure = function(info) {
                    if (originalOnConfigure) {
                        originalOnConfigure.call(this, info);
                    }
                    if (this.inputs) {
                        if (this.inputs[0]) {
                            this.inputs[0].name = "image";
                            this.inputs[0].localized_name = "Image";
                        }
                        if (this.inputs[1]) {
                            this.inputs[1].name = "resize_mode";
                            this.inputs[1].localized_name = "Resize Mode";
                        }
                        if (this.inputs[2]) {
                            this.inputs[2].name = "longest_side";
                            this.inputs[2].localized_name = "Longest Side";
                        }
                        if (this.inputs[3]) {
                            this.inputs[3].name = "width";
                            this.inputs[3].localized_name = "Width";
                        }
                        if (this.inputs[4]) {
                            this.inputs[4].name = "height";
                            this.inputs[4].localized_name = "Height";
                        }
                        if (this.inputs[5]) {
                            this.inputs[5].name = "resize_method";
                            this.inputs[5].localized_name = "Resize Method";
                        }
                        // Only try to access optional inputs if they exist
                        if (this.inputs[6]) {
                            this.inputs[6].name = "mask";
                            this.inputs[6].localized_name = "Mask";
                        }
                        if (this.inputs[7]) {
                            this.inputs[7].name = "mask_blur";
                            this.inputs[7].localized_name = "Mask Blur";
                        }
                        if (this.inputs[8]) {
                            this.inputs[8].name = "mask_grow";
                            this.inputs[8].localized_name = "Mask Grow";
                        }
                    }
                    if (this.outputs) {
                        if (this.outputs[0]) {
                            this.outputs[0].name = "resized_image";
                            this.outputs[0].localized_name = "Image";
                        }
                        if (this.outputs[1]) {
                            this.outputs[1].name = "resized_mask";
                            this.outputs[1].localized_name = "Mask";
                        }
                    }
                    
                    // Set up conditional input visibility
                    this.setupConditionalInputs();
                };
                
                // Add method to handle conditional input visibility
                this.setupConditionalInputs = function() {
                    if (this.widgets) {
                        // Find the resize_mode widget
                        const resizeModeWidget = this.widgets.find(w => w.name === "resize_mode");
                        const longestSideWidget = this.widgets.find(w => w.name === "longest_side");
                        const widthWidget = this.widgets.find(w => w.name === "width");
                        const heightWidget = this.widgets.find(w => w.name === "height");
                        
                        if (resizeModeWidget && longestSideWidget && widthWidget && heightWidget) {
                            // Set up change handler for resize_mode
                            const originalOnChange = resizeModeWidget.callback;
                            resizeModeWidget.callback = (value) => {
                                if (originalOnChange) {
                                    originalOnChange.call(resizeModeWidget, value);
                                }
                                
                                // Safely show/hide widgets based on mode
                                this.updateWidgetVisibility(value, longestSideWidget, widthWidget, heightWidget);
                            };
                            
                            // Initial setup - delay to ensure DOM is ready
                            setTimeout(() => {
                                this.updateWidgetVisibility(resizeModeWidget.value, longestSideWidget, widthWidget, heightWidget);
                            }, 100);
                        }
                    }
                };
                
                // Helper method to safely update widget visibility
                this.updateWidgetVisibility = function(mode, longestSideWidget, widthWidget, heightWidget) {
                    try {
                        if (mode === "longest_side") {
                            if (longestSideWidget.parent && longestSideWidget.parent.style) {
                                longestSideWidget.parent.style.display = "block";
                            }
                            if (widthWidget.parent && widthWidget.parent.style) {
                                widthWidget.parent.style.display = "none";
                            }
                            if (heightWidget.parent && heightWidget.parent.style) {
                                heightWidget.parent.style.display = "none";
                            }
                        } else {
                            if (longestSideWidget.parent && longestSideWidget.parent.style) {
                                longestSideWidget.parent.style.display = "none";
                            }
                            if (widthWidget.parent && widthWidget.parent.style) {
                                widthWidget.parent.style.display = "block";
                            }
                            if (heightWidget.parent && heightWidget.parent.style) {
                                heightWidget.parent.style.display = "block";
                            }
                        }
                    } catch (error) {
                        // Silently handle any DOM access errors
                        console.log("Widget visibility update skipped - DOM not ready yet");
                    }
                };
            }
            
            // Add height snapping like dropdown
            nodeType.prototype.onDrawForeground = function(ctx) {
                // Height snapping
                if (this.size[1] > LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER) {
                    this.size[1] = LiteGraph.NODE_SLOT_HEIGHT * NODE_HEIGHT_MULTIPLIER;
                }
            };
        }
    }
}); 