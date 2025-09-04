# ComfyUI - CRZ Compare Node
import nodes

class AnyType(str):
    def __ne__(self, __value: object) -> bool:
        return False

any = AnyType("*")

class CRZCompare:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "a": (any, {"default": 0}),
                "b": (any, {"default": 0}),
            },
            "optional": {},
            "hidden": {
                "operator": ("STRING", {"default": "="})
            }
        }

    RETURN_TYPES = ("BOOLEAN",)
    FUNCTION = "compare"
    CATEGORY = 'CRZ'
    OUTPUT_NODE = False

    def compare(self, a, b, operator="="):
        """
        Compare two values using specified operator and return boolean result
        Supports =, >, <, >=, <= operators
        """
        try:
            if operator == ">":
                # Convert to numbers for greater than comparison
                try:
                    result = (float(a) > float(b))
                    return (result,)
                except (ValueError, TypeError):
                    # If can't convert to numbers, fall back to string comparison
                    result = (str(a) > str(b))
                    return (result,)
                    
            elif operator == "<":
                # Convert to numbers for less than comparison
                try:
                    result = (float(a) < float(b))
                    return (result,)
                except (ValueError, TypeError):
                    # If can't convert to numbers, fall back to string comparison
                    result = (str(a) < str(b))
                    return (result,)
                    
            elif operator == ">=":
                # Convert to numbers for greater than or equal comparison
                try:
                    result = (float(a) >= float(b))
                    return (result,)
                except (ValueError, TypeError):
                    # If can't convert to numbers, fall back to string comparison
                    result = (str(a) >= str(b))
                    return (result,)
                    
            elif operator == "<=":
                # Convert to numbers for less than or equal comparison
                try:
                    result = (float(a) <= float(b))
                    return (result,)
                except (ValueError, TypeError):
                    # If can't convert to numbers, fall back to string comparison
                    result = (str(a) <= str(b))
                    return (result,)
                    
            else:  # operator == "=" or default
                # Try direct equality comparison first
                result = (a == b)
                return (result,)
                
        except Exception:
            # If all else fails, return False
            return (False,)

NODE_CLASS_MAPPINGS = {
    "CRZCompare": CRZCompare,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CRZCompare": "CRZ Compare",
}
