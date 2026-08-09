import React from "react";
import { ASSET_CDN } from "../../util/endpoints";
import { Box } from "../Box";
import { Image } from "../Image";
import { SpinnerProps } from "./types";

const Spinner: React.FC<React.PropsWithChildren<SpinnerProps>> = ({ size = 128 }) => {
  return (
    <Box width={size} height={size} position="relative">
      <Image
        width={size}
        height={size}
        src={`${ASSET_CDN}/web/hawking-spinner.svg`}
        alt="loading"
      />
    </Box>
  );
};

export default Spinner;
