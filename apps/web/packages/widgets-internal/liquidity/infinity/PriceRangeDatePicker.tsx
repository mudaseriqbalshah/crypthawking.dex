import { useTranslation } from "@pancakeswap/localization";
import { ButtonMenu, ButtonMenuItem, FlexGap, Text } from "@pancakeswap/uikit";
import { useCallback, useMemo } from "react";

export const PRESET_RANGE_ITEMS = [
  {
    label: "1H",
    value: "1H",
  },
  {
    label: "1D",
    value: "1D",
  },
  {
    label: "7D",
    value: "1W",
  },
  {
    label: "1M",
    value: "1M",
  },
] as const;

export type PresetRangeItem = (typeof PRESET_RANGE_ITEMS)[number];

export interface PriceRangeDatePickerProps {
  height?: string;
  value?: PresetRangeItem;
  onChange?: (range: PresetRangeItem) => void;
}

export const PriceRangeDatePicker = ({
  value = PRESET_RANGE_ITEMS[0],
  height,
  onChange,
}: PriceRangeDatePickerProps) => {
  const { t } = useTranslation();

  const activeIndex = useMemo(() => PRESET_RANGE_ITEMS.findIndex((item) => item.value === value.value), [value]);

  const onItemSelect = useCallback(
    (index: number) => {
      onChange?.(PRESET_RANGE_ITEMS[index]);
    },
    [onChange]
  );
  return (
    <FlexGap columnGap="12px" gap="12px" alignItems="center">
      <Text color="secondary" small bold>
        {t("PRICE RANGE")}
      </Text>
      <ButtonMenu variant="subtle" style={{ borderRadius: 30 }} activeIndex={activeIndex} onItemClick={onItemSelect}>
        {PRESET_RANGE_ITEMS.map((item) => (
          <ButtonMenuItem height={height || "36px"} px="16px" style={{ borderRadius: 30 }} key={item.value}>
            {item.label}
          </ButtonMenuItem>
        ))}
      </ButtonMenu>
    </FlexGap>
  );
};
