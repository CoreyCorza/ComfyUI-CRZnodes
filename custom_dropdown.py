# ComfyUI - CRZ Custom Dropdown
import nodes

class AnyType(str):
    def __ne__(self, __value: object) -> bool:
        return False

any = AnyType("*")

class CRZCustomDropdown:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {},
            "hidden": {
                "dropdown": ("FLOAT", {"default": 0.0}),
                "dropdown_options": ("STRING", {"default": "[]"}),
            }
        }

    RETURN_TYPES = (any,)
    FUNCTION = "main"
    CATEGORY = 'CRZ'
    OUTPUT_NODE = True

    def main(self, **kwargs):
        # Get the value from kwargs (hidden widget or default)
        dropdown_value = kwargs.get('dropdown', 0.0)
        dropdown_options = kwargs.get('dropdown_options', '[]')
        
        # Convert the value to appropriate type
        def smart_convert(value):
            if isinstance(value, bool):
                return value
            if isinstance(value, int):
                return value
            if isinstance(value, str):
                # String inputs pass through unchanged
                return value
            if isinstance(value, float):
                # Convert whole numbers to integers
                if value == float(int(value)):
                    return int(value)
                else:
                    return value
            return value
        
        # Convert the value
        dropdown_value = smart_convert(dropdown_value)
        
        # Return the converted value
        return (dropdown_value,)

NODE_CLASS_MAPPINGS = {
    "CRZCustomDropdown": CRZCustomDropdown,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CRZCustomDropdown": "CRZ Custom Dropdown",
}
