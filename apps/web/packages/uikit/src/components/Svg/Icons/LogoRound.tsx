import React from "react";
import Svg from "../Svg";
import { SvgProps } from "../types";

const Icon: React.FC<React.PropsWithChildren<SvgProps>> = (props) => {
  return (
    <Svg viewBox="0 0 96 96" {...props}>
      <defs>
        <linearGradient id="chLogoRoundGradient" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#EC4899" />
          <stop offset="0.5" stopColor="#A855F7" />
          <stop offset="1" stopColor="#6366F1" />
        </linearGradient>
      </defs>
      <circle cx={48} cy={48} r={48} fill="url(#chLogoRoundGradient)" />
      <circle cx={48} cy={48} r={40} fill="#0A0A0F" />
      <text
        x="48"
        y="50"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="38"
        fontWeight="900"
        fill="#FFFFFF"
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
      >
        CH
      </text>
    </Svg>
  );
};

export default Icon;
