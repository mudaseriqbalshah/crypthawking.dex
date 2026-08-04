/*
 * https://medium.com/@dennismphil/one-side-rounded-rectangle-using-svg-fb31cf318d90
 */
export const brushHandlePath = (width: number) =>
  [
    // handle
    "M 3 0", // move to origin
    `h ${width}`, // horizontal line
    "m 0 1", // move 1px to the top
    "H 0", // second horizontal line
    "M 3 0", // move to origin

    // head
    "M 0 4", // move to left side, 4px down
    "q 0 -4 4 -4", // top-left corner radius
    "h 16", // horizontal line
    "q 4 0 4 4", // top-right corner radius
    "v 7", // vertical line
    "q 0 4 -4 4", // bottom-right corner radius
    "h -16", // horizontal line
    "q -4 0 -4 -4", // bottom-left corner radius
    "z", // close path
  ].join(" ");

export const brushHandleAccentPath = () => "m 5 9 h 14 M 0 0 m 5 5 h 14 z";
// export const brushHandleAccentPath = () =>
// "M 4 0 h 16 a 4 4 0 0 1 4 4 v 7 a 4 4 0 0 1 -4 4 h -16 a 4 4 0 0 1 -4 -4 v -7 a 4 4 0 0 1 4 -4";

export const OffScreenHandle = ({
  color,
  size = 10,
  margin = 10,
}: {
  color: string;
  size?: number;
  margin?: number;
}) => (
  <polygon
    points={`0 0, ${size} ${size}, 0 ${size}`}
    transform={` translate(${size + margin}, ${margin}) rotate(-45) `}
    fill={color}
    stroke={color}
    strokeWidth="4"
    strokeLinejoin="round"
    opacity="0.8"
  />
);
