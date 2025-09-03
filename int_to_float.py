# ComfyUI - CRZ Int to Float
import nodes

class AnyType(str):
    def __ne__(self, __value: object) -> bool:
        return False

any = AnyType("*")

class CRZIntToFloat:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {"INT": (any, )},
        }

    RETURN_TYPES = ("FLOAT",)
    FUNCTION = "main"
    CATEGORY = "__hidden__"

    def main(self, INT):
        return (float(INT),)

NODE_CLASS_MAPPINGS = {
    "CRZIntToFloat": CRZIntToFloat,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CRZIntToFloat": "CRZ Int to Float",
}
