import { styled } from "styled-components";

const LabelGroup = styled.g<{ visible: boolean }>`
  opacity: ${({ visible }) => (visible ? "1" : "0")};
  transition: opacity 300ms;
`;
const TooltipBackground = styled.rect`
  fill: ${({ theme }) => theme.colors.secondary};
`;

const TooltipText = styled.text`
  text-anchor: middle;
  font-size: 10px;
  fill: ${({ theme }) => theme.colors.background};
`;

export interface ToolTipProps {
  visible: boolean;
  flip: boolean;
  text: string;
  textRef: React.Ref<SVGTextElement>;
  width?: number;
}

const LABEL_WIDTH = 37;
const LABEL_HEIGHT = 20;
const PADDING_RIGHT = 4;

export const ToolTip = ({ visible = false, flip = false, text = "", textRef, width = LABEL_WIDTH }: ToolTipProps) => {
  const boxWidth = Math.ceil(width + PADDING_RIGHT * 2);
  return (
    <LabelGroup
      transform={`translate(-${boxWidth + 6}, ${LABEL_HEIGHT * (flip ? 0.5 : -0.5) + 7}), scale(1, ${
        flip ? "-1" : "1"
      })`}
      visible={visible}
    >
      <TooltipBackground y="0" x="0" height={LABEL_HEIGHT} width={boxWidth} rx="8" />
      <TooltipText y={LABEL_HEIGHT / 2 + 1} x={boxWidth / 2} dominantBaseline="middle" ref={textRef}>
        {text}
      </TooltipText>
    </LabelGroup>
  );
};
