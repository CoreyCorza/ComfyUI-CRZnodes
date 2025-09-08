# ComfyUI - CRZ Image Selector
import os
import hashlib
from PIL import Image, ImageOps
import numpy as np
import torch
from pathlib import Path
import folder_paths

class CRZImageSelector:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "image_1": ("STRING", {"default": ""}),
                "image_2": ("STRING", {"default": ""}),
                "image_3": ("STRING", {"default": ""}),
                "image_4": ("STRING", {"default": ""}),
                "image_5": ("STRING", {"default": ""}),
                "image_6": ("STRING", {"default": ""}),
            }
        }

    RETURN_TYPES = ("IMAGE", "IMAGE", "IMAGE", "IMAGE", "IMAGE", "IMAGE", "INT", "IMAGE")
    RETURN_NAMES = ("image_1", "image_2", "image_3", "image_4", "image_5", "image_6", "image_count", "image_batch")
    FUNCTION = "load_images"
    CATEGORY = "CRZ"

    def load_image(self, image_path):
        """Load a single image and return image tensor"""
        if not image_path or image_path == "":
            # Return a blank 64x64 black image if no path provided
            blank_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
            return blank_image
        
        try:
            input_dir = folder_paths.get_input_directory()
            full_path = os.path.join(input_dir, image_path)
            
            if not os.path.exists(full_path):
                # Return blank image if file doesn't exist
                blank_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
                return blank_image
            
            # Load image
            i = Image.open(full_path)
            i = ImageOps.exif_transpose(i)
            image = i.convert("RGB")
            image = np.array(image).astype(np.float32) / 255.0
            image = torch.from_numpy(image)[None,]
            
            return image
        except Exception as e:
            print(f"Error loading image {image_path}: {e}")
            # Return blank image on error
            blank_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
            return blank_image

    def load_images(self, image_1, image_2, image_3, image_4, image_5, image_6):
        """Load all six images and count them"""
        
        image_paths = [image_1, image_2, image_3, image_4, image_5, image_6]
        
        # Count non-empty image paths
        image_count = sum(1 for path in image_paths if path and path.strip() != "")
        
        img1 = self.load_image(image_1)
        img2 = self.load_image(image_2)
        img3 = self.load_image(image_3)
        img4 = self.load_image(image_4)
        img5 = self.load_image(image_5)
        img6 = self.load_image(image_6)
        
        # Create image batch from non-empty images
        images = [img1, img2, img3, img4, img5, img6]
        non_empty_images = []
        
        for i, (img, path) in enumerate(zip(images, image_paths)):
            if path and path.strip() != "":
                non_empty_images.append(img)
        
        # Create batch similar to MakeImageBatch logic
        if len(non_empty_images) == 0:
            # Return a blank 64x64 black image if no images
            image_batch = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
        elif len(non_empty_images) == 1:
            image_batch = non_empty_images[0]
        else:
            # Concatenate images, handling different sizes
            image1 = non_empty_images[0]
            for image2 in non_empty_images[1:]:
                if image1.shape[1:] != image2.shape[1:]:
                    # Resize image2 to match image1 dimensions
                    import comfy.utils
                    image2 = comfy.utils.common_upscale(
                        image2.movedim(-1, 1), 
                        image1.shape[2], 
                        image1.shape[1], 
                        "lanczos", 
                        "center"
                    ).movedim(1, -1)
                image1 = torch.cat((image1, image2), dim=0)
            image_batch = image1
        
        return (img1, img2, img3, img4, img5, img6, image_count, image_batch)

NODE_CLASS_MAPPINGS = {
    "CRZImageSelector": CRZImageSelector,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CRZImageSelector": "CRZ Image Selector",
} 