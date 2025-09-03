# ComfyUI - CRZ Nodes Preferences
import json
import os
from pathlib import Path

class CRZPreferences:
    def __init__(self):
        self.prefs_file = Path(__file__).parent / "preferences.json"
        self.default_prefs = {
            "passthrough_show_connections": True,
            "image_selector_thumbnail_size": 64,
            "dashboard_theme": "dark",
            "float_slider_precision": 2
        }
        self.prefs = self.load_preferences()
    
    def load_preferences(self):
        """Load preferences from file or return defaults"""
        if self.prefs_file.exists():
            try:
                with open(self.prefs_file, 'r') as f:
                    return json.load(f)
            except:
                pass
        return self.default_prefs.copy()
    
    def save_preferences(self):
        """Save preferences to file"""
        try:
            with open(self.prefs_file, 'w') as f:
                json.dump(self.prefs, f, indent=2)
        except Exception as e:
            print(f"Error saving CRZ preferences: {e}")
    
    def get(self, key, default=None):
        """Get a preference value"""
        return self.prefs.get(key, default)
    
    def set(self, key, value):
        """Set a preference value"""
        self.prefs[key] = value
        self.save_preferences()

# Global preferences instance
preferences = CRZPreferences()
