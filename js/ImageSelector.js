// ComfyUI.CRZ.ImageSelector - Custom Thumbnails
import { app } from "../../scripts/app.js";
import { 
    IMAGE_LOADER_WIDTH, 
    IMAGE_LOADER_HEIGHT, 
    THUMBNAIL_SIZE, 
    THUMBNAIL_SPACING, 
    THUMBNAIL_START_X, 
    THUMBNAIL_START_Y, 
    UPLOAD_BUTTON_HEIGHT, 
    BUTTON_SPACING, 
    ROW_SPACING,
    THUMBNAIL_PLACEHOLDER_BG,
    THUMBNAIL_PLACEHOLDER_TEXT,
    THUMBNAIL_BG,
    THUMBNAIL_BORDER,
    THUMBNAIL_GROUP_BG,
    THUMBNAIL_GROUP_BORDER,
    UPLOAD_BUTTON_BG,
    UPLOAD_BUTTON_BORDER,
    UPLOAD_BUTTON_TEXT,
    IMAGE_LABEL_TEXT,
    CLEAR_BUTTON_BG,
    CLEAR_BUTTON_BORDER,
    CLEAR_BUTTON_TEXT,
    CLEAR_BUTTON_FONT_SIZE,
    CLEAR_BUTTON_WIDTH_RATIO
} from "./CRZConfig.js";

app.registerExtension({
    name: "CRZ.ImageSelector",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "CRZImageSelector") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            const onNodeRemoved = nodeType.prototype.onRemoved;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) {
                    onNodeCreated.apply(this, arguments);
                }
                
                // Set size for 2 rows of 3 images
                this.size = [IMAGE_LOADER_WIDTH, IMAGE_LOADER_HEIGHT];
                
                // Set background color
                this.bgcolor = "#353535";
                
                // Initialize thumbnail storage and properties
                this.thumbnails = {};
                this.hoveredImageIndex = -1; // Track which image area is being hovered
                this.properties = this.properties || {};
                this.properties.image_1 = "";
                this.properties.image_2 = "";
                this.properties.image_3 = "";
                this.properties.image_4 = "";
                this.properties.image_5 = "";
                this.properties.image_6 = "";
                
                // Move widgets off-screen like FloatSlider (same technique)
                this.widgets_start_y = -2.4e8*LiteGraph.NODE_SLOT_HEIGHT;
                
                // Hide all widgets completely
                if (this.widgets) {
                    this.widgets.forEach(widget => {
                        widget.type = "hidden";
                    });
                }
                
                // Hide all input sockets
                if (this.inputs) {
                    this.inputs.forEach(input => {
                        input.type = -1;
                        input.name = "";
                    });
                }
                
                // Clear all output socket labels
                if (this.outputs) {
                    this.outputs.forEach(output => {
                        output.name = output.localized_name = "";
                    });
                }

                // Load existing thumbnails
                setTimeout(() => {
                    this.loadAllThumbnails();
                }, 100);

                // DOM capture handlers removed - using onMouseDown instead to avoid double file dialogs
            };

            nodeType.prototype.onRemoved = function () {
                if (onNodeRemoved) onNodeRemoved.apply(this, arguments);
            };

            // Function to load all thumbnails from properties
            nodeType.prototype.loadAllThumbnails = function() {
                this.loadThumbnail('image_1', this.properties.image_1);
                this.loadThumbnail('image_2', this.properties.image_2);
                this.loadThumbnail('image_3', this.properties.image_3);
                this.loadThumbnail('image_4', this.properties.image_4);
                this.loadThumbnail('image_5', this.properties.image_5);
                this.loadThumbnail('image_6', this.properties.image_6);
            };

			// Helpers to compute rects on-demand (avoid relying on draw-time caches)
			nodeType.prototype._getThumbRect = function(index) {
				const col = index % 3;
				const row = Math.floor(index / 3);
				const x = THUMBNAIL_START_X + col * (THUMBNAIL_SIZE + THUMBNAIL_SPACING);
				const y = THUMBNAIL_START_Y + row * ROW_SPACING;
				return { x, y, width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE };
			};

			// Ensure clicks inside our interactive region are NOT treated as title drags
			const __originalIsPointOverTitle = nodeType.prototype.isPointOverTitle;
			nodeType.prototype.isPointOverTitle = function(x, y, graphcanvas) {
				// Convert to local
				const localX = x - this.pos[0];
				const localY = y - this.pos[1];
				// If inside any thumbnail rect (including label/clear button area), it's not title
				for (let i = 0; i < 6; i++) {
					const r = this._getThumbRect(i);
					if (localX >= r.x && localX <= r.x + r.width && localY >= r.y && localY <= r.y + r.height) {
						return false;
					}
				}
				// Fallback to original behavior
				if (typeof __originalIsPointOverTitle === "function") {
					return __originalIsPointOverTitle.apply(this, arguments);
				}
				// Conservative default
				return localY < (LiteGraph.NODE_TITLE_HEIGHT || 20);
			};

			nodeType.prototype._getClearButtonRect = function(index) {
				const rect = this._getThumbRect(index);
				const clearButtonSize = 12;
				const x = rect.x + THUMBNAIL_SIZE - clearButtonSize - 2;
				const y = rect.y + 2;
				return { x, y, width: clearButtonSize, height: clearButtonSize };
			};

			// Helper: convert event/canvas coords to node-local coords
			nodeType.prototype._toLocal = function(e, pos, gc) {
				if (e && typeof e.canvasX === "number" && typeof e.canvasY === "number") {
					return [e.canvasX - this.pos[0], e.canvasY - this.pos[1]];
				}
				try {
					if (gc && typeof gc.convertEventToCanvasOffset === "function") {
						const off = gc.convertEventToCanvasOffset(e);
						return [off[0] - this.pos[0], off[1] - this.pos[1]];
					}
				} catch(_) {}
				if (Array.isArray(pos) && pos.length >= 2) return [pos[0], pos[1]];
				return [0, 0];
			};

            // Function to load individual thumbnail
            nodeType.prototype.loadThumbnail = function(widgetName, filename) {
                if (!filename || filename === "") {
                    this.thumbnails[widgetName] = null;
                    this.setDirtyCanvas(true);
                    return;
                }

                const img = new Image();
                img.onload = () => {
                    // Store the full resolution image directly - no pre-scaling!
                    // This gives maximum quality when we scale it down during drawing
                    this.thumbnails[widgetName] = img;
                    this.setDirtyCanvas(true);
                };
                
                img.onerror = () => {
                    this.thumbnails[widgetName] = null;
                    this.setDirtyCanvas(true);
                };
                
                // Load from ComfyUI input directory
                img.src = `/view?filename=${encodeURIComponent(filename)}&type=input`;
            };



            // Override onDrawForeground to draw custom thumbnails with clickable image areas
            nodeType.prototype.onDrawForeground = function(ctx) {
                if (this.flags.collapsed) return;
				const pad = 6;
				const groupX = THUMBNAIL_START_X - pad;
				const groupY = THUMBNAIL_START_Y - pad;
				const groupW = (THUMBNAIL_SIZE * 3) + (THUMBNAIL_SPACING * 2) + (pad * 2);
				const groupH = ROW_SPACING + THUMBNAIL_SIZE + (pad * 2);
                ctx.fillStyle = THUMBNAIL_GROUP_BG;
				ctx.beginPath();
				ctx.roundRect(groupX, groupY, groupW, groupH, 10);
				ctx.fill();
                ctx.strokeStyle = THUMBNAIL_GROUP_BORDER;
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.roundRect(groupX, groupY, groupW, groupH, 10);
				ctx.stroke();
				
                // Draw thumbnails in 2 rows of 3
                const widgetNames = ['image_1', 'image_2', 'image_3', 'image_4', 'image_5', 'image_6'];
                
                if (!this.imageAreaBounds) this.imageAreaBounds = [];
                if (!this.clearButtonBounds) this.clearButtonBounds = [];
                
                widgetNames.forEach((widgetName, index) => {
                    const col = index % 3; // 0, 1, 2
                    const row = Math.floor(index / 3); // 0 or 1
                    
                    const x = THUMBNAIL_START_X + col * (THUMBNAIL_SIZE + THUMBNAIL_SPACING);
                    const y = THUMBNAIL_START_Y + row * ROW_SPACING;
                    
                    // Draw thumbnail or clickable upload placeholder
                    if (this.thumbnails[widgetName]) {
                        const img = this.thumbnails[widgetName];
                        
                        // Enable highest quality scaling for full-resolution images
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        
                        // Draw background first
                        ctx.fillStyle = THUMBNAIL_BG;
                        ctx.beginPath();
                        ctx.roundRect(x, y, THUMBNAIL_SIZE, THUMBNAIL_SIZE, 8);
                        ctx.fill();
                        
                        // Calculate aspect ratio for centered crop from full resolution
                        const aspectRatio = img.width / img.height;
                        let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
                        
                        if (aspectRatio > 1) {
                            // Wide image - fit to height, crop width
                            drawWidth = THUMBNAIL_SIZE;
                            drawHeight = THUMBNAIL_SIZE / aspectRatio;
                            offsetY = (THUMBNAIL_SIZE - drawHeight) / 2;
                        } else {
                            // Tall image - fit to width, crop height
                            drawWidth = THUMBNAIL_SIZE * aspectRatio;
                            drawHeight = THUMBNAIL_SIZE;
                            offsetX = (THUMBNAIL_SIZE - drawWidth) / 2;
                        }
                        
                        // Clip to rounded rectangle for the image
                        ctx.save();
                        ctx.beginPath();
                        ctx.roundRect(x, y, THUMBNAIL_SIZE, THUMBNAIL_SIZE, 8);
                        ctx.clip();
                        
                        // Draw full-resolution image scaled down to fit
                        ctx.drawImage(img, x + offsetX, y + offsetY, drawWidth, drawHeight);
                        ctx.restore();
                        
                        // Draw clear button as overlay on top-right corner of image
                        const clearButtonSize = 12;
                        const clearButtonX = x + THUMBNAIL_SIZE - clearButtonSize - 2;
                        const clearButtonY = y + 2;
                        
                        ctx.fillStyle = CLEAR_BUTTON_BG;
                        ctx.beginPath();
                        ctx.roundRect(clearButtonX, clearButtonY, clearButtonSize, clearButtonSize, 6);
                        ctx.fill();
                        
                        ctx.strokeStyle = CLEAR_BUTTON_BORDER;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.roundRect(clearButtonX, clearButtonY, clearButtonSize, clearButtonSize, 3);
                        ctx.stroke();
                        
                        ctx.fillStyle = CLEAR_BUTTON_TEXT;
                        ctx.font = "12px Arial";
                        ctx.textAlign = "center";
                        ctx.fillText("×", clearButtonX + clearButtonSize/2, clearButtonY + clearButtonSize/2 + 4);
                        
                        // Store clear button bounds for click detection
                        this.clearButtonBounds[index] = {
                            x: clearButtonX,
                            y: clearButtonY,
                            width: clearButtonSize,
                            height: clearButtonSize,
                            widgetName: widgetName
                        };
                    } else {
                        // Draw clickable upload placeholder with hover effect
                        const isHovered = (this.hoveredImageIndex === index);
                        ctx.fillStyle = isHovered ? "rgba(48, 48, 48, 1)" : THUMBNAIL_PLACEHOLDER_BG; // Lighter grey on hover
                        ctx.beginPath();
                        ctx.roundRect(x, y, THUMBNAIL_SIZE, THUMBNAIL_SIZE, 8);
                        ctx.fill();
                        
                        // Draw solid border like other thumbnails
                        ctx.strokeStyle = THUMBNAIL_BORDER;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.roundRect(x, y, THUMBNAIL_SIZE, THUMBNAIL_SIZE, 8);
                        ctx.stroke();
                        
                        ctx.fillStyle = THUMBNAIL_PLACEHOLDER_TEXT;
                        ctx.font = "12px Arial";
                        ctx.textAlign = "center";
                        ctx.fillText("Upload", x + THUMBNAIL_SIZE/2, y + THUMBNAIL_SIZE/2 + 4);
                        
                        // No clear button for empty slots
                        this.clearButtonBounds[index] = null;
                    }
                    
                    // Draw solid border with rounded corners for all thumbnails
                    ctx.strokeStyle = THUMBNAIL_BORDER;
                    ctx.lineWidth = 1;
                    ctx.setLineDash([]); // Ensure solid line
                    ctx.beginPath();
                    ctx.roundRect(x, y, THUMBNAIL_SIZE, THUMBNAIL_SIZE, 8);
                    ctx.stroke();
                    
                    // Labels removed per request
                    
                    // Store image area bounds for click detection (for upload when empty, or re-upload when has image)
                    this.imageAreaBounds[index] = {
                        x: x,
                        y: y,
                        width: THUMBNAIL_SIZE,
                        height: THUMBNAIL_SIZE,
                        widgetName: widgetName
                    };
                });
            };

            // Removed redundant background drawing - handled by the rounded background below



			// Handle mouse clicks for image areas and clear buttons
			nodeType.prototype.onMouseDown = function(event, pos, graphcanvas) {
				if (this.flags.collapsed) return false;
				const lp = this._toLocal(event, pos, graphcanvas);
				const lx = lp[0], ly = lp[1];

				const widgetNames = ['image_1', 'image_2', 'image_3', 'image_4', 'image_5', 'image_6'];
				for (let i = 0; i < widgetNames.length; i++) {
					const widgetName = widgetNames[i];
					const thumbRect = this._getThumbRect(i);

					// If inside thumbnail area
					if (lx >= thumbRect.x && lx <= thumbRect.x + thumbRect.width &&
							ly >= thumbRect.y && ly <= thumbRect.y + thumbRect.height) {

						// If there is an image, check clear button first
						if (this.thumbnails && this.thumbnails[widgetName]) {
							const clearRect = this._getClearButtonRect(i);
							if (lx >= clearRect.x && lx <= clearRect.x + clearRect.width &&
									ly >= clearRect.y && ly <= clearRect.y + clearRect.height) {
								this.clearImageSlot(widgetName, i + 1);
								if (graphcanvas) graphcanvas._mouse_down_widget = true;
								if (event && event.preventDefault) { try { event.preventDefault(); event.stopPropagation(); } catch(_){} }
								return true; // consume
							}
						}

						// Open file dialog for (re)upload
						this.openFileDialog(widgetName, i + 1);
						if (event && event.preventDefault) event.preventDefault();
						if (event && event.stopPropagation) event.stopPropagation();
						if (graphcanvas) graphcanvas._mouse_down_widget = true;
						return true; // consume so the node doesn't start dragging
					}
				}

				// Not a click in our interactive areas: let default behavior happen
				return false;
			};

			// Override widget mouse handling to prevent widget interactions
			nodeType.prototype.onMouseMove = function(event, pos, graphcanvas) {
				if (this.flags.collapsed) return false;
				const lp = this._toLocal(event, pos, graphcanvas);
				const lx = lp[0], ly = lp[1];

				let previousHovered = this.hoveredImageIndex;
				this.hoveredImageIndex = -1; // Reset hover state

				const widgetNames = ['image_1', 'image_2', 'image_3', 'image_4', 'image_5', 'image_6'];
				for (let i = 0; i < widgetNames.length; i++) {
					const widgetName = widgetNames[i];
					const rect = this._getThumbRect(i);
					if (!this.thumbnails[widgetName] &&
							lx >= rect.x && lx <= rect.x + rect.width &&
							ly >= rect.y && ly <= rect.y + rect.height) {
						this.hoveredImageIndex = i;
						break;
					}
				}

				// Redraw if hover state changed
				if (previousHovered !== this.hoveredImageIndex) {
					this.setDirtyCanvas(true);
				}

				return false;
			};

            nodeType.prototype.onMouseUp = function(event, pos, graphcanvas) {
                // Don't let widgets handle mouse up
                return false;
            };



            // Open file dialog for specific image slot
            nodeType.prototype.openFileDialog = function(widgetName, imageNumber) {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        this.uploadFileToSlot(file, widgetName, imageNumber);
                    }
                };
                input.click();
            };

            // Upload file to specific slot
            nodeType.prototype.uploadFileToSlot = function(file, widgetName, imageNumber) {
                const formData = new FormData();
                formData.append('image', file);
                formData.append('type', 'input');
                formData.append('subfolder', '');
                
                fetch('/upload/image', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.name) {
                        // Update the property
                        this.properties[widgetName] = data.name;
                        
                        // Update the corresponding widget value
                        if (this.widgets) {
                            const widget = this.widgets.find(w => w.name === widgetName);
                            if (widget) {
                                widget.value = data.name;
                            }
                        }
                        
                        // Load thumbnail immediately
                        this.loadThumbnail(widgetName, data.name);
                        
                        // Mark node as dirty to trigger redraw
                        this.setDirtyCanvas(true, true);
                    }
                })
                .catch(error => {
                    console.error(`Error uploading to Image ${imageNumber}:`, error);
                    alert(`Failed to upload to Image ${imageNumber}`);
                });
            };

            // Clear image from specific slot
            nodeType.prototype.clearImageSlot = function(widgetName, imageNumber) {
                // Clear the property
                this.properties[widgetName] = "";
                
                // Update the corresponding widget value
                if (this.widgets) {
                    const widget = this.widgets.find(w => w.name === widgetName);
                    if (widget) {
                        widget.value = "";
                    }
                }
                
                // Clear the thumbnail
                this.thumbnails[widgetName] = null;
                
                // Mark node as dirty to trigger redraw
                this.setDirtyCanvas(true, true);
                
                console.log(`Cleared Image ${imageNumber}`);
            };

            // Override computeSize to force fixed size
            nodeType.prototype.computeSize = function() {
                return [IMAGE_LOADER_WIDTH, IMAGE_LOADER_HEIGHT];
            };

            // Let LiteGraph handle the native node background - no custom drawing needed

            // Override getExtraMenuOptions to prevent widget-related menu items
            nodeType.prototype.getExtraMenuOptions = function(canvas, options) {
                // Don't add widget-related menu options
                return options;
            };

            // Prevent connections to input sockets
            nodeType.prototype.onConnectInput = function(inputIndex, outputType, outputSlot, outputNode, outputIndex) {
                return false; // Reject all input connections
            };

            // Override input rendering to make them completely invisible
            nodeType.prototype.onDrawInputs = function(ctx) {
                // Don't draw any inputs
                return;
            };

            // Override widget drawing to prevent widgets from being drawn
            nodeType.prototype.onDrawWidget = function(ctx, widget, x, y, width, height) {
                // Don't draw any widgets
                return false;
            };

            // Override the entire widget area drawing
            nodeType.prototype.drawWidgets = function(ctx, node) {
                // Don't draw widgets at all
                return;
            };

            // Serialize properties to be passed to Python
            nodeType.prototype.onSerialize = function(o) {
                o.properties = this.properties;
            };

            // Restore properties from serialized data
            nodeType.prototype.onConfigure = function(o) {
                if (o.properties) {
                    this.properties = o.properties;
                    // Ensure all 6 properties exist
                    this.properties.image_1 = this.properties.image_1 || "";
                    this.properties.image_2 = this.properties.image_2 || "";
                    this.properties.image_3 = this.properties.image_3 || "";
                    this.properties.image_4 = this.properties.image_4 || "";
                    this.properties.image_5 = this.properties.image_5 || "";
                    this.properties.image_6 = this.properties.image_6 || "";
                    // Reload thumbnails after configuration
                    setTimeout(() => {
                        this.loadAllThumbnails();
                    }, 100);
                }
            };


        }
    }
}); 