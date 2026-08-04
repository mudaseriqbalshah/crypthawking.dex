import React from "react";
import Svg from "../Svg";
import { SvgProps } from "../types";
import { vars } from "../../../css/vars.css";

const Logo: React.FC<React.PropsWithChildren<SvgProps>> = (props) => {
  return (
    <Svg viewBox="0 0 1281 199" {...props}>
      <defs>
        <linearGradient id="chLogoWithTextGradient" x1="0" y1="0" x2="198" y2="199" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#EC4899" />
          <stop offset="0.5" stopColor="#A855F7" />
          <stop offset="1" stopColor="#6366F1" />
        </linearGradient>
      </defs>
      <circle cx="99" cy="99.5" r="90" fill="#0A0A0F" stroke="url(#chLogoWithTextGradient)" strokeWidth="14" />
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
      <text
        x="230"
        y="128"
        fontSize="96"
        fontWeight="900"
        fill={vars.colors.contrast}
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
      >
        CryptoHawking
      </text>
    </Svg>
  );
};

export default Logo;
