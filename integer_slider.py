# ComfyUI - CRZ Integer Slider
import nodes

class CRZIntegerSlider:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "value": ("INT", {"default": 5, "min": 0, "max": 4294967296}),
            },
        }

    RETURN_TYPES = ("INT",)
    RETURN_NAMES = ("value",)

    FUNCTION = "main"
    CATEGORY = 'CRZ'

    def main(self, value):
        return (value,)

NODE_CLASS_MAPPINGS = {
    "CRZIntegerSlider": CRZIntegerSlider,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CRZIntegerSlider": "CRZ Integer Slider",
} 