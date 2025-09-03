# ComfyUI - CRZ Dropdown
import nodes

class AnyType(str):
    def __ne__(self, __value: object) -> bool:
        return False

class CRZDropdown:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "value": ([""], {"default": ""}),
            },
        }

    RETURN_TYPES = (AnyType("*"),)
    RETURN_NAMES = ("value",)

    FUNCTION = "main"
    CATEGORY = 'CRZ'

    @classmethod
    def VALIDATE_INPUTS(s, **kwargs):
        return True

    def main(self, value):
        return (value,)

NODE_CLASS_MAPPINGS = {
    "CRZDropdown": CRZDropdown,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CRZDropdown": "CRZ Dropdown",
}