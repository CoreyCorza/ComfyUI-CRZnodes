# ComfyUI - CRZ Execute Block
class AnyType(str):
    def __ne__(self, __value: object) -> bool:
        return False

any_type = AnyType("*")

class CRZExecuteBlock:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "input": (any_type, {"default": None}),
                "bool": ("BOOLEAN", {"default": False, "forceInput": False}),
            },
        }

    RETURN_TYPES = (any_type,)
    RETURN_NAMES = ("output",)
    FUNCTION = "execute"
    CATEGORY = 'CRZ'
    OUTPUT_NODE = False

    def execute(self, input, bool):
        """
        Execute block - passes input through or blocks execution based on bool condition
        Uses ExecutionBlocker to prevent execution when bool is False
        """
        try:
            from comfy_execution.graph import ExecutionBlocker
            
            if bool:
                # Allow execution - pass input through
                return (input,)
            else:
                # Block execution
                return (ExecutionBlocker(None),)
                
        except ImportError:
            # Fallback if ExecutionBlocker is not available
            if bool:
                return (input,)
            else:
                return (None,)

NODE_CLASS_MAPPINGS = {
    "CRZExecuteBlock": CRZExecuteBlock,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CRZExecuteBlock": "CRZ Execute Block",
}
