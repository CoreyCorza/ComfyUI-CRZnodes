// CRZ Global Stylesheet
// Todo: Ugghh.. Actually use these across all nodes consistently

// === NODE SIZING ===
export const NODE_WIDTH = 250;
export const NODE_HEIGHT_MULTIPLIER = 1.4;

// === LAYOUT ===
export const NODE_PADDING = 4;
export const LABEL_LEFT_PADDING = 10;
export const TRACK_LEFT_PADDING = 10;
export const TRACK_RIGHT_PADDING = 140;
export const HANDLE_LEFT_PADDING = 10;
export const HANDLE_RIGHT_PADDING = 90;
export const VALUE_RIGHT_SHIFT = 60;
export const VALUE_RIGHT_OFFSET = 24;
export const VALUE_RIGHT_PADDING = 35;
export const DROPDOWN_RIGHT_PADDING = 20;
export const DROPDOWN_WIDTH = 120;
export const COMBO_TEXT_OFFSET = -2;

// === SLIDER DIMENSIONS ===
export const TRACK_HEIGHT = 4;
export const TRACK_WIDTH = 70;
export const TRACK_CORNER_RADIUS = 2;
export const HANDLE_RADIUS = 5;
export const HANDLE_WIDTH = 8;
export const HANDLE_HEIGHT = 14;
export const HANDLE_Y_OFFSET = 6;
export const SLIDER_HEIGHT = 30;
export const SLIDER_VERTICAL_OFFSET = 0;

// === DASHBOARD SPECIFIC ===
export const DASHBOARD_LINE_SPACING = 20;

// === TOGGLE DIMENSIONS ===
export const TOGGLE_WIDTH = 70;
export const TOGGLE_HEIGHT = 16;
export const TOGGLE_CORNER_RADIUS = 8;
export const HANDLE_SIZE = 12;
export const HANDLE_CORNER_RADIUS = 6;
export const HANDLE_PADDING = 2;
export const TOGGLE_VERTICAL_OFFSET = 1;

// === COLORS === rgba(202, 67, 67, 0.5)
// export const NODE_BACKGROUND_COLOR = "";
export const NODE_BACKGROUND_COLOR = LiteGraph.NODE_DEFAULT_BGCOLOR;
export const LABEL_COLOR = LiteGraph.NODE_TEXT_COLOR;
export const VALUE_COLOR = LiteGraph.NODE_TEXT_COLOR;
export const TRACK_COLOR = "rgba(20,20,20,0.5)";
export const HANDLE_COLOR = "rgba(192, 192, 192, 1)";
export const HANDLE_BORDER_COLOR = LiteGraph.NODE_DEFAULT_BGCOLOR;

// === TOGGLE COLORS ===
export const TOGGLE_ACTIVE_COLOR = "rgba(105, 194, 65, 0.829)";
export const TOGGLE_INACTIVE_COLOR = "rgba(226, 74, 74, 1)";
export const HANDLE_BORDER_ACTIVE = "rgba(207, 207, 207, 0)";
export const HANDLE_BORDER_INACTIVE = "rgba(77, 77, 77, 0)";

// === DROPDOWN COLORS ===
export const DROPDOWN_BG_COLOR = "rgba(20,20,20,0.5)";
export const DROPDOWN_BG_COLOR_INACTIVE = "rgba(20,20,20,0.1)";
export const DROPDOWN_BORDER_COLOR = LiteGraph.NODE_DEFAULT_BGCOLOR;
export const VALUE_TEXT_COLOR = LiteGraph.NODE_TEXT_COLOR;

// === DASHBOARD INACTIVE COLORS ===
export const INACTIVE_LABEL_COLOR = "rgba(128,128,128,0.2)";
export const INACTIVE_VALUE_COLOR = "rgba(128,128,128,0.0)";
export const INACTIVE_TRACK_COLOR = "rgba(20,20,20,0.1)";
export const INACTIVE_HANDLE_COLOR = "rgba(128,128,128,0.0)";

// === IMAGE LOADER DIMENSIONS ===
export const IMAGE_LOADER_WIDTH = 240;
export const IMAGE_LOADER_HEIGHT = 160; // Increased to accommodate larger top padding
export const THUMBNAIL_SIZE = 60;
export const THUMBNAIL_SPACING = 10;
export const THUMBNAIL_START_X = 0;
export const THUMBNAIL_START_Y = 12; // Start below title bar to avoid drag interception
export const UPLOAD_BUTTON_HEIGHT = 20; // Keep for backward compatibility
export const BUTTON_SPACING = 5; // Keep for backward compatibility
export const ROW_SPACING = 75; // Reduced from 105 to just thumbnail + small padding

// === IMAGE LOADER COLORS ===
export const THUMBNAIL_PLACEHOLDER_BG = "rgba(43, 43, 43, 1)";
export const THUMBNAIL_PLACEHOLDER_TEXT = "#888";
export const THUMBNAIL_BG = "rgba(43, 43, 43, 1)";
export const THUMBNAIL_BORDER = "rgba(56, 56, 56, 0.651)";
// Group box (background behind all thumbnails)
export const THUMBNAIL_GROUP_BG = "rgba(31, 31, 31, 1)";
export const THUMBNAIL_GROUP_BORDER = "rgba(56, 56, 56, 0.651)";
export const UPLOAD_BUTTON_BG = "rgba(43, 43, 43, 1)";
export const UPLOAD_BUTTON_BORDER = "rgba(56, 56, 56, 0)";
export const UPLOAD_BUTTON_TEXT = "#fff";
export const IMAGE_LABEL_TEXT = "rgba(141, 141, 141, 1)";

// === CLEAR BUTTON STYLING ===
export const CLEAR_BUTTON_BG = "rgba(102, 102, 102, 1)";
export const CLEAR_BUTTON_BORDER = "#8b3a3a00";
export const CLEAR_BUTTON_TEXT = "#ffffff";
export const CLEAR_BUTTON_FONT_SIZE = "8px";
export const CLEAR_BUTTON_WIDTH_RATIO = 0.3; // 30% of thumbnail width 