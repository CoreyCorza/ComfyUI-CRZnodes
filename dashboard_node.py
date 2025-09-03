# ComfyUI - Uber CRZ Dashboard Node
import nodes

class AnyType(str):
    def __ne__(self, __value: object) -> bool:
        return False

any = AnyType("*")

# Slider configuration constants
SLIDER_DEFAULT = 0.0
SLIDER_MIN = 0.0
SLIDER_MAX = 1000000.0
SLIDER_STEP = 0.01

class CRZDashboardNode:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {},
            "hidden": {
                "slider": ("FLOAT", {"default": 0.0}),
            }
        }

    RETURN_TYPES = (any,)
    FUNCTION = "main"
    CATEGORY = 'CRZ'
    OUTPUT_NODE = True

    def main(self, **kwargs):
        
        # Convert inputs to proper types based on their values
        def smart_convert(value):
            if isinstance(value, bool):
                return value
            if isinstance(value, int):
                return value
            if isinstance(value, str):
                # String inputs (like ComboBox values) pass through unchanged
                return value
            if isinstance(value, float):
                # Only convert to boolean if it's exactly 0.0 or 1.0 AND looks like a toggle
                # For now, let's be more conservative and just convert whole numbers to integers
                if value == float(int(value)):
                    return int(value)
                else:
                    return value
            return value
        
        # Get the value from kwargs (hidden widget or default)
        slider = kwargs.get('slider', 0.0)
        # Convert the value
        slider = smart_convert(slider)
        
        # Register value in the global registry for get nodes
        try:
            from .dashboard_get import register_dashboard_value
            # Get the node ID from the execution context
            import inspect
            frame = inspect.currentframe()
            while frame:
                if 'unique_id' in frame.f_locals:
                    node_id = frame.f_locals['unique_id']
                    # Register the single slider value
                    register_dashboard_value(node_id, 0, slider)
                    break
                frame = frame.f_back
        except Exception as e:
            # If registration fails, continue normally
            pass
        
        # Return the converted value
        return (slider,)

NODE_CLASS_MAPPINGS = {
    "CRZDashboardNode": CRZDashboardNode,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CRZDashboardNode": "CRZ Dashboard Node",
}
