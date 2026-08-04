/**
 * Min and Max zoom levels for the Quick Actions
 * Mapping percentage (between 0 and 1) to initial min and max values
 */
export const ZOOM_LEVELS = {
  0.1: {
    initialMin: 0.9,
    initialMax: 1.1,
  },
  0.2: {
    initialMin: 0.8,
    initialMax: 1.2,
  },
  0.75: {
    initialMin: 0.25,
    initialMax: 1.75,
  },
} as const
