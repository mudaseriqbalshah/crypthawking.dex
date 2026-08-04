import { useTheme } from "@pancakeswap/hooks";
import { max, extent, scaleLinear, ZoomTransform, scaleTime } from "d3";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import partition from "lodash/partition";
import { useMatchBreakpoints } from "@pancakeswap/uikit";

import { Area } from "./VerticalArea";
import { AxisRight } from "./AxisRight";
import { Brush } from "./Brush";
import { HorizontalLine } from "./Line";
import { LiquidityChartEntry, PriceChartEntry, ChartProps } from "./types";
import Zoom, { ZoomOverlay } from "./Zoom";
import { AxisBottom } from "./AxisBottom";
import { LineChart } from "./LineChart";

const priceAccessor = (d: LiquidityChartEntry) => d.price0;
const liquidityAccessor = (d: LiquidityChartEntry) => d.activeLiquidity;
const periodAccessor = (d: PriceChartEntry) => d.time!;
const pricePeriodAccessor = (d: PriceChartEntry) => d.close;
const paddingRight = 40;
const paddingBottom = 40;

export function Chart({
  id = "PriceRangeChart",
  data: { liquiditySeries, current, priceHistory },
  dimensions: { width, height },
  margins,
  interactive = true,
  brushDomain,
  brushLabels,
  onBrushDomainChange,
  zoomLevels,
  showZoomButtons = true,
  axisTicks,
}: ChartProps) {
  const zoomRef = useRef<SVGRectElement | null>(null);
  const { theme } = useTheme();
  const { isMobile } = useMatchBreakpoints();

  const [zoom, setZoom] = useState<ZoomTransform | null>(null);

  const [innerHeight, innerWidth] = useMemo(
    () => [height - margins.top - margins.bottom, width - margins.left - margins.right],
    [width, height, margins]
  );

  const { liquidityScale, priceScale, periodScale } = useMemo(() => {
    const scales = {
      liquidityScale: scaleLinear()
        .domain([0, max(liquiditySeries, liquidityAccessor)] as number[])
        .range([innerWidth, innerWidth * 0.5]),
      priceScale: scaleLinear()
        .domain([current * zoomLevels.initialMin, current * zoomLevels.initialMax] as number[])
        .range([innerHeight, 0]),
      periodScale: scaleTime()
        .domain(extent(priceHistory, periodAccessor) as [Date, Date])
        .range([0, innerWidth * 0.75]),
    };

    if (zoom) {
      const newYscale = zoom.rescaleY(scales.priceScale);
      scales.priceScale.domain(newYscale.domain());
    }

    return scales;
  }, [
    priceHistory,
    current,
    zoomLevels.initialMin,
    zoomLevels.initialMax,
    innerWidth,
    liquiditySeries,
    innerHeight,
    zoom,
  ]);

  useEffect(() => {
    if (!brushDomain) {
      const [maxPrice, minPrice] = priceScale.domain();
      onBrushDomainChange(
        {
          min: minPrice,
          max: maxPrice,
        },
        undefined
      );
    }
  }, [brushDomain, onBrushDomainChange, priceScale]);

  const [leftSeries, rightSeries] = useMemo(() => {
    const isHighToLow = liquiditySeries[0]?.price0 > liquiditySeries[liquiditySeries.length - 1]?.price0;
    let [left, right] = partition(liquiditySeries, (d) =>
      isHighToLow ? +priceAccessor(d) < current : +priceAccessor(d) > current
    );

    if (right.length && right[right.length - 1]) {
      if (right[right.length - 1].price0 !== current) {
        right = [...right, { activeLiquidity: right[right.length - 1].activeLiquidity, price0: current }];
      }
      left = [{ activeLiquidity: right[right.length - 1].activeLiquidity, price0: current }, ...left];
    }

    return [left, right];
  }, [current, liquiditySeries]);

  const [minHandleColor, maxHandleColor] = useMemo(() => {
    const isHighToLow = liquiditySeries[0]?.price0 > liquiditySeries[liquiditySeries.length - 1]?.price0;
    return isHighToLow ? [theme.colors.success, theme.colors.failure] : [theme.colors.failure, theme.colors.success];
  }, [liquiditySeries, theme.colors.failure, theme.colors.success]);

  const defaultBrushExtent = useMemo(
    () => ({ min: priceScale.domain()[1], max: priceScale.domain()[0] }),
    [priceScale]
  );

  const handleResetBrush = useCallback(() => {
    onBrushDomainChange({ min: current * zoomLevels.initialMin, max: current * zoomLevels.initialMax }, "reset");
  }, [current, onBrushDomainChange, zoomLevels.initialMax, zoomLevels.initialMin]);

  return (
    <>
      {showZoomButtons && (
        <Zoom
          svg={zoomRef.current}
          xScale={priceScale}
          setZoom={setZoom}
          width={innerWidth}
          height={height}
          resetBrush={handleResetBrush}
          showResetButton={false}
          zoomLevels={zoomLevels}
        />
      )}
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: "hidden" }}>
        <defs>
          <linearGradient id="green-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="5%" stopColor={theme.colors.success} stopOpacity={1} />
            <stop offset="100%" stopColor={theme.colors.success} stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="red-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="5%" stopColor={theme.colors.failure} stopOpacity={1} />
            <stop offset="100%" stopColor={theme.colors.failure} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <defs>
          <clipPath id={`${id}-chart-clip`}>
            <rect x="0" y="0" width={innerWidth} height={height - paddingBottom} />
          </clipPath>

          {brushDomain && (
            // mask to highlight selected area
            <mask id={`${id}-chart-area-mask`}>
              <rect
                fill="white"
                y={liquidityScale(brushDomain.min)}
                x="0"
                width={innerWidth}
                height={liquidityScale(brushDomain.max) - liquidityScale(brushDomain.min)}
              />
            </mask>
          )}
        </defs>
        <defs>
          <clipPath id={`${id}-line-chart-clip`}>
            <rect x={margins.left} y={margins.top} width={innerWidth} height={height - paddingBottom} />
          </clipPath>
        </defs>
        <defs>
          <clipPath id={`${id}-content-clip`}>
            <rect x="0" y="0" width="400" height="172" />
          </clipPath>
        </defs>

        <g>
          <g clipPath={`url(#${id}-chart-clip)`}>
            <Area
              series={leftSeries}
              xScale={liquidityScale}
              yScale={priceScale}
              xValue={liquidityAccessor}
              yValue={priceAccessor}
              opacity={1}
              fill="url(#green-gradient)"
            />
            <Area
              series={rightSeries}
              xScale={liquidityScale}
              yScale={priceScale}
              xValue={liquidityAccessor}
              yValue={priceAccessor}
              opacity={1}
              fill="url(#red-gradient)"
            />
          </g>
        </g>
        <g>
          <g clipPath={`url(#${id}-line-chart-clip)`}>
            <LineChart
              series={priceHistory}
              xScale={periodScale}
              yScale={priceScale}
              xValue={periodAccessor}
              yValue={pricePeriodAccessor}
              color={theme.colors.secondary}
            />
          </g>
        </g>

        <g clipPath={`url(#${id}-content-clip)`}>
          <HorizontalLine
            value={current}
            yScale={priceScale}
            x1={innerWidth * 0.6}
            x2={innerWidth}
            color={theme.colors.secondary}
            strokeWidth={0.5}
          />
          <AxisRight yScale={priceScale} innerWidth={width} highlightValue={current} ticks={isMobile ? 4 : 6} />
          <ZoomOverlay width={innerWidth} height={height} ref={zoomRef} />
          <Brush
            id={id}
            scale={priceScale}
            interactive={interactive}
            brushLabelValue={brushLabels}
            brushExtent={brushDomain ?? defaultBrushExtent}
            width={innerWidth / 2 - margins.right - paddingRight}
            innerWidth={innerWidth}
            innerHeight={innerHeight}
            setBrushExtent={onBrushDomainChange}
            minHandleColor={minHandleColor}
            maxHandleColor={maxHandleColor}
            current={current}
          />
        </g>
        <AxisBottom
          xScale={periodScale}
          innerHeight={innerHeight}
          ticks={axisTicks?.bottomTicks}
          tickFormat={axisTicks?.bottomFormat}
        />
      </svg>
    </>
  );
}
