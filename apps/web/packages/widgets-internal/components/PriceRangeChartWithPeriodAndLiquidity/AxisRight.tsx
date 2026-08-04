import { useTheme } from "@pancakeswap/hooks";
import { useMatchBreakpoints } from "@pancakeswap/uikit";
import { Axis as d3Axis, NumberValue, ScaleLinear, select, axisLeft } from "d3";
import { styled } from "styled-components";

const StyledGroup = styled.g<{ $isMobile: boolean }>`
  line {
    display: none;
  }

  text {
    font-size: ${({ $isMobile }) => ($isMobile ? "14px" : "8px")};
    color: ${({ theme }) => theme.colors.textSubtle};
  }
`;

const Axis = ({ axisGenerator, highlightValue }: { axisGenerator: d3Axis<NumberValue>; highlightValue?: number }) => {
  const { theme } = useTheme();
  const axisRef = (axis: SVGGElement) => {
    if (!axis) return;
    const axisGroup = select(axis);

    axisGroup.call(axisGenerator).call((g) => g.select(".domain").remove());

    // Highlight current value if provided
    if (highlightValue !== undefined) {
      axisGroup.selectAll(".tick rect").remove();
      axisGroup
        .selectAll(".tick")
        .filter((d) => d === highlightValue)
        .select("text")
        .style("fill", theme.colors.v2Default)
        .attr("transform", "translate(-2, 0)")
        .each(function iter() {
          const bbox = (this as SVGTextElement).getBBox();
          select((this as SVGTextElement).parentElement)
            .insert("rect", "text")
            .attr("x", bbox.x - 4)
            .attr("y", bbox.y)
            .attr("width", bbox.width + 4)
            .attr("height", bbox.height)
            .attr("rx", 4)
            .attr("fill", theme.colors.secondary);
        });
    }
  };

  return <g ref={axisRef} />;
};

export const AxisRight = ({
  yScale,
  innerWidth,
  offset = 0,
  ticks = 6,
  highlightValue,
}: {
  highlightValue?: number;
  yScale: ScaleLinear<number, number>;
  innerWidth: number;
  offset?: number;
  ticks?: number;
}) => {
  const defaultTicks = yScale.ticks(ticks);
  const { isMobile } = useMatchBreakpoints();

  // If current is defined, replace the closest tick with current
  let finalTicks = defaultTicks;
  if (highlightValue !== undefined) {
    const closestTick = defaultTicks.reduce((prev, curr) =>
      Math.abs(curr - highlightValue) < Math.abs(prev - highlightValue) ? curr : prev
    );
    finalTicks = defaultTicks.map((tick) => (tick === closestTick ? highlightValue : tick));
  }
  return (
    <StyledGroup $isMobile={isMobile} transform={`translate(${innerWidth + offset})`}>
      <Axis axisGenerator={axisLeft(yScale).tickValues(finalTicks).tickSize(0)} highlightValue={highlightValue} />
    </StyledGroup>
  );
};
