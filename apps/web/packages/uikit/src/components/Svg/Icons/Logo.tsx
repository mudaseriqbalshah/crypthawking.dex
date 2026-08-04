import React from "react";
import Svg from "../Svg";
import { SvgProps } from "../types";

const Icon: React.FC<React.PropsWithChildren<SvgProps>> = (props) => {
  return (
    <Svg viewBox="0 0 198 199" {...props}>
      <defs>
        <linearGradient id="chLogoMarkGradient" x1="0" y1="0" x2="198" y2="199" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#EC4899" />
          <stop offset="0.5" stopColor="#A855F7" />
          <stop offset="1" stopColor="#6366F1" />
        </linearGradient>
      </defs>
      <circle cx="99" cy="99.5" r="90" fill="#0A0A0F" stroke="url(#chLogoMarkGradient)" strokeWidth="14" />
      <text
        x="99"
        y="103"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="86"
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
