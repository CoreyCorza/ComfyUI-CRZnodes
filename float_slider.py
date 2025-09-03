# ComfyUI - CRZ Float Slider
import nodes

class CRZFloatSlider:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "value": ("FLOAT", {"default": 0.5, "min": 0.0, "max": 1000000.0}),
            },
        }

    RETURN_TYPES = ("FLOAT",)
    RETURN_NAMES = ("value",)

    FUNCTION = "main"
    CATEGORY = 'CRZ'

    def main(self, value):
        return (value,)

NODE_CLASS_MAPPINGS = {
    "CRZFloatSlider": CRZFloatSlider,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CRZFloatSlider": "CRZ Float Slider",
} 