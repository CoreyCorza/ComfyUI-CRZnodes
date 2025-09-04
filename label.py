# ComfyUI - CRZ Label
class CRZLabel:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {},
            "optional": {},
            "hidden": {}
        }

    RETURN_TYPES = ()
    FUNCTION = "label"
    CATEGORY = 'CRZ'
    OUTPUT_NODE = False

    def label(self):
        """
        Label node - displays text only, no processing
        """
        return ()

NODE_CLASS_MAPPINGS = {
    "CRZLabel": CRZLabel,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CRZLabel": "CRZ Label",
}
