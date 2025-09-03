# ComfyUI - CRZ Switch
import nodes

# This is a hack to work around ComfyUI's type validation system
class AnyTypeStr(str):
    def __eq__(self, __value: object) -> bool:
        return True
    
    def __ne__(self, __value: object) -> bool:
        return False

# Use the any type hack that works with ComfyUI's validation
AnyType = AnyTypeStr("*")

class CRZSwitch:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "false_input": (AnyType, {"lazy": True}),
                "true_input": (AnyType, {"lazy": True}),
                "value": ("BOOLEAN", {"default": False, "forceInput": False}),
            },
        }

    RETURN_TYPES = (AnyType,)
    RETURN_NAMES = ("output",)
    FUNCTION = "switch_inputs"
    CATEGORY = 'CRZ'

    def check_lazy_status(self, value=False, false_input=None, true_input=None):
        # Only evaluate the input that will be used
        needed = "true_input" if value else "false_input"
        return [needed]

    def switch_inputs(self, value, false_input=None, true_input=None):
        # Return the selected input based on the switch value
        selected = true_input if value else false_input
        return (selected,)

NODE_CLASS_MAPPINGS = {
    "CRZSwitch": CRZSwitch,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CRZSwitch": "CRZ Switch",
} 