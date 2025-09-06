import torch
import json

# This is a hack to work around ComfyUI's type validation system
class AnyTypeStr(str):
    def __eq__(self, __value: object) -> bool:
        return True
    
    def __ne__(self, __value: object) -> bool:
        return False

# Use the any type hack that works with ComfyUI's validation
AnyType = AnyTypeStr("*")

class MapDropdown:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "custom_dropdown": (AnyType, {"lazy": True}),  # Accept any type (will be a dropdown node)
            },
            "optional": {
                "dropdown_options": ("STRING", {"default": "[]"}),
                "option_0": (AnyType,),
                "option_1": (AnyType,),
                "option_2": (AnyType,),
                "option_3": (AnyType,),
                "option_4": (AnyType,),
                "option_5": (AnyType,),
                "option_6": (AnyType,),
                "option_7": (AnyType,),
                "option_8": (AnyType,),
                "option_9": (AnyType,),
            }
        }

    RETURN_TYPES = (AnyType,)  # Will be dynamic based on dropdown options
    RETURN_NAMES = ("output",)  # Will be dynamic based on dropdown options
    FUNCTION = "map_dropdown"
    CATEGORY = "CRZ"

    def map_dropdown(self, custom_dropdown, **kwargs):
        # Get the selected value from the dropdown
        selected_value = None
        if isinstance(custom_dropdown, str):
            selected_value = custom_dropdown
        elif hasattr(custom_dropdown, 'get_value'):
            selected_value = custom_dropdown.get_value()
        elif hasattr(custom_dropdown, 'value'):
            selected_value = custom_dropdown.value
        else:
            selected_value = str(custom_dropdown)
        
        # Get dropdown options from kwargs
        dropdown_options_str = kwargs.get('dropdown_options', '[]')
        try:
            import json
            dropdown_options = json.loads(dropdown_options_str)
        except:
            dropdown_options = []
        
        # Debug: Print what we're getting
        print(f"MapDropdown Debug - Selected value: {selected_value}")
        print(f"MapDropdown Debug - Dropdown options: {dropdown_options}")
        print(f"MapDropdown Debug - Available kwargs: {list(kwargs.keys())}")
        
        # Get all option inputs that have data
        option_inputs = {}
        for key, value in kwargs.items():
            if key.startswith('option_') and value is not None:
                # Extract the index from option_X
                try:
                    index = int(key.split('_')[1])
                    option_inputs[index] = value
                except (ValueError, IndexError):
                    pass
        
        print(f"MapDropdown Debug - Option inputs: {option_inputs}")
        
        # Find the selected option index
        selected_index = 0
        if selected_value in dropdown_options:
            selected_index = dropdown_options.index(selected_value)
            print(f"MapDropdown Debug - Found selected value '{selected_value}' at index {selected_index}")
        else:
            print(f"MapDropdown Debug - Selected value '{selected_value}' not found in options, using index 0")
        
        # Return the data from the selected option
        if selected_index in option_inputs:
            print(f"MapDropdown Debug - Returning option_{selected_index}: {option_inputs[selected_index]}")
            return (option_inputs[selected_index],)
        else:
            print(f"MapDropdown Debug - No data for option_{selected_index}, returning None")
            return (None,)

    @classmethod
    def VALIDATE_INPUTS(s, custom_dropdown, **kwargs):
        # Accept any type for all inputs
        return True

    @classmethod
    def IS_CHANGED(s, custom_dropdown, **kwargs):
        # Always consider changed to ensure dynamic outputs update
        return True


NODE_CLASS_MAPPINGS = {
    "CRZMapDropdown": MapDropdown
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CRZMapDropdown": "CRZ Map Custom Dropdown"
}
