# ComfyUI - CRZ Boolean Toggle
import nodes

class CRZBooleanToggle:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "value": ("BOOLEAN", {"default": False}),
            },
        }

    RETURN_TYPES = ("BOOLEAN",)
    RETURN_NAMES = ("value",)

    FUNCTION = "main"
    CATEGORY = 'CRZ'

    def main(self, value):
        return (value,)

NODE_CLASS_MAPPINGS = {
    "CRZBooleanToggle": CRZBooleanToggle,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CRZBooleanToggle": "CRZ Boolean Toggle",
} 