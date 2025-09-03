class AnyType(str):
    def __ne__(self, __value: object) -> bool:
        return False

any = AnyType("*")

class CRZPassthrough:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "input": (any, ),
            },
        }

    RETURN_TYPES = (any,)
    FUNCTION = "passthrough"
    CATEGORY = "CRZ"

    def passthrough(self, input):
        # Handle initialization edge case where input might be None or undefined  
        if input is None:
            return (0,)
        return (input,)

NODE_CLASS_MAPPINGS = {
    "CRZPassthrough": CRZPassthrough,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CRZPassthrough": "CRZ Passthrough",
} 