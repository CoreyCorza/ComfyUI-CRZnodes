class CRZStringNode:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {},
            "hidden": {"text": ("STRING", {"default": "", "multiline": False})}
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    FUNCTION = "main"
    CATEGORY = "CRZ"

    def main(self, **kwargs):
        text = kwargs.get("text", "")
        return (text,)

NODE_CLASS_MAPPINGS = {
    "CRZStringNode": CRZStringNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CRZStringNode": "CRZ String"
}
