# ComfyUI - CRZ Execute Switch
class AnyType(str):
    def __ne__(self, __value: object) -> bool:
        return False

any_type = AnyType("*")

class CRZExecuteSwitch:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "input": (any_type, {"default": None}),
                "bool": ("BOOLEAN", {"default": False, "forceInput": False}),
            },
        }

    RETURN_TYPES = (any_type, any_type)
    RETURN_NAMES = ("true", "false")
    FUNCTION = "execute"
    CATEGORY = 'CRZ'
    OUTPUT_NODE = False

    def execute(self, input, bool):
        """
        Execute switch - routes input to true or false output based on bool condition
        Uses ExecutionBlocker to prevent execution on the inactive branch
        """
        try:
            from comfy_execution.graph import ExecutionBlocker
            
            if bool:
                # Route to true output, block false output
                return (input, ExecutionBlocker(None))
            else:
                # Route to false output, block true output  
                return (ExecutionBlocker(None), input)
                
        except ImportError:
            # Fallback if ExecutionBlocker is not available
            if bool:
                return (input, None)
            else:
                return (None, input)

NODE_CLASS_MAPPINGS = {
    "CRZExecuteSwitch": CRZExecuteSwitch,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CRZExecuteSwitch": "CRZ Execute Switch",
}
