// Shared constants for the whole app. Grouped by concern so a value is easy to
// locate: canvas dimensions, the base folded-paper geometry, drawing tolerances,
// view (zoom/pan) limits, storage keys, and snowflake option defaults.

// ---------------------------------------------------------------------------
// Canvas / display
// ---------------------------------------------------------------------------
export const DISPLAY_WIDTH = 520;
export const DISPLAY_HEIGHT = 520;
export const CANVAS_BG = "#0a1220";

// ---------------------------------------------------------------------------
// Base folded-paper geometry (a single triangular wedge)
// ---------------------------------------------------------------------------
export const APEX = { x: 172, y: 430 };
export const FOLD_HEIGHT = 305;
export const FOLD_BASE = { x: APEX.x, y: APEX.y - FOLD_HEIGHT };

// ---------------------------------------------------------------------------
// Cut / drawing behaviour
// ---------------------------------------------------------------------------
export const EDGE_FINAL_TOL = 16;
export const EDGE_START_SNAP_TOL = 20;
export const EDGE_LOCK_MIN_PATH_LENGTH = 26;
export const MIN_EDGE_INSIDE_LENGTH = 5;
export const SNAP_OUTSIDE_LEAD = 2.6;
export const SNAP_INTERIOR_MIN_LEAD = 2.4;
export const CUT_WIDTH = 3;
export const GEOM_GRID = 0.01;
export const CLEAN_EPS = 1e-4;
export const OUTLINE_GRID = 0.5;
export const MAX_RANDOM_CUT_REMOVAL_FRACTION = 0.25;

// ---------------------------------------------------------------------------
// View (zoom + pan + spin)
// ---------------------------------------------------------------------------
export const MIN_VIEW_SCALE = 0.1;
export const MAX_VIEW_SCALE = 10;
export const UNFOLDED_ROTATE_SPEED = Math.PI / 30;
export const FOLDED_BASE_ROTATION = -Math.PI / 6;

// ---------------------------------------------------------------------------
// Touch gestures
// ---------------------------------------------------------------------------
export const TOUCH_LONG_PRESS_MS = 360;
export const TOUCH_DRAG_TOL = 8;

// ---------------------------------------------------------------------------
// Background snowfall
// ---------------------------------------------------------------------------
export const BG_FLAKE_COUNT = 26;
export const BG_FLAKE_MIN_SIZE = 16;
export const BG_FLAKE_MAX_SIZE = 58;

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------
export const COLLECTION_STORAGE_KEY = "snowflakeStudio.collection.v1";
export const ACTIVE_STUDIO_STORAGE_KEY = "snowflakeStudio.active.v1";
export const STORAGE_SCHEMA_VERSION = 1;
export const COLLECTION_MAX_ITEMS = 120;

// ---------------------------------------------------------------------------
// Snowflake options
// ---------------------------------------------------------------------------
export const DEFAULT_SIDE_COUNT = 6;
export const SIDE_COUNT_MIN = 4;
export const SIDE_COUNT_MAX = 10;
export const DEFAULT_OUTLINE_EXTERIOR_COLOR = "#65b7ff";
export const DEFAULT_OUTLINE_INTERIOR_COLOR = "#65b7ff";
export const DEFAULT_OUTLINE_EXTERIOR_WIDTH = 3.2;
export const DEFAULT_OUTLINE_INTERIOR_WIDTH = 1.8;
export const DEFAULT_SNOWFLAKE_COLOR = "#ffffff";
export const DEFAULT_PREVIEW_MODE = "outline-and-body";
export const OUTLINE_WIDTH_MIN = 0.5;
export const OUTLINE_WIDTH_MAX = 6;
