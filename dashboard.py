# ComfyUI - CRZ Dashboard
import nodes

# Slider configuration constants
SLIDER_DEFAULT = 0.0
SLIDER_MIN = 0.0
SLIDER_MAX = 1000000.0
SLIDER_STEP = 0.01

class CRZDashboard:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "slider_0": ("FLOAT", {"default": 0.0, "min": 0.0, "max": 1000000.0}),
                "slider_1": ("FLOAT", {"default": 0.0, "min": 0.0, "max": 1000000.0}),
                "slider_2": ("FLOAT", {"default": 0.0, "min": 0.0, "max": 1000000.0}),
                "slider_3": ("FLOAT", {"default": 0.0, "min": 0.0, "max": 1000000.0}),
                "slider_4": ("FLOAT", {"default": 0.0, "min": 0.0, "max": 1000000.0}),
            }
        }

    RETURN_TYPES = ("FLOAT", "FLOAT", "FLOAT", "FLOAT", "FLOAT",)
    FUNCTION = "main"
    CATEGORY = 'CRZ'
    OUTPUT_NODE = True

    def main(self, slider_0, slider_1, slider_2, slider_3, slider_4):
        # Register values in the global registry for get nodes
        try:
            from .dashboard_get import register_dashboard_value
            # Get the node ID from the execution context
            import inspect
            frame = inspect.currentframe()
            while frame:
                if 'unique_id' in frame.f_locals:
                    node_id = frame.f_locals['unique_id']
                    # Register all slider values
                    register_dashboard_value(node_id, 0, slider_0)
                    register_dashboard_value(node_id, 1, slider_1)
                    register_dashboard_value(node_id, 2, slider_2)
                    register_dashboard_value(node_id, 3, slider_3)
                    register_dashboard_value(node_id, 4, slider_4)
                    break
                frame = frame.f_back
        except Exception as e:
            # If registration fails, continue normally
            pass
        
        return (slider_0, slider_1, slider_2, slider_3, slider_4,)

NODE_CLASS_MAPPINGS = {
    "CRZDashboard": CRZDashboard,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CRZDashboard": "CRZ Dashboard",
} 