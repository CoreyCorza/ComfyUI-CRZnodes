# ComfyUI - CRZ Float to Int
import nodes

class AnyType(str):
    def __ne__(self, __value: object) -> bool:
        return False

any = AnyType("*")

class CRZFloatToInt:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {"FLT": (any, )},
        }

    RETURN_TYPES = ("INT",)
    FUNCTION = "main"
    CATEGORY = "__hidden__"

    def main(self, FLT):
        return (int(FLT),)

NODE_CLASS_MAPPINGS = {
    "CRZFloatToInt": CRZFloatToInt,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CRZFloatToInt": "CRZ Float to Int",
} 