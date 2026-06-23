import FormControl, { type FormControlProps } from "@mui/material/FormControl";
import InputLabel, { type InputLabelProps } from "@mui/material/InputLabel";
import MenuItem, { type MenuItemProps } from "@mui/material/MenuItem";
import Select, { type SelectProps } from "@mui/material/Select";
import type { ReactNode } from "react";

export type SelectOptionValue = string | number;

export interface SelectOption<Value extends SelectOptionValue = string> {
  value: Value;
  label: string;
  disabled?: boolean;
}

export type AppSelectProps<Value extends SelectOptionValue = string> = SelectProps<Value> & {
  label?: string;
  helperText?: ReactNode;
  containerProps?: FormControlProps;
  labelProps?: InputLabelProps;
  items?: Array<SelectOption<Value>>;
  itemProps?: Partial<MenuItemProps>;
};

export function AppSelect<Value extends SelectOptionValue = string>({
  label,
  helperText,
  containerProps,
  labelProps,
  items,
  itemProps,
  children,
  ...selectProps
}: AppSelectProps<Value>) {
  const labelId = label ? `${selectProps.id ?? "app-select"}-label` : undefined;

  return (
    <FormControl fullWidth {...containerProps}>
      {label ? (
        <InputLabel id={labelId} {...labelProps}>
          {label}
        </InputLabel>
      ) : null}
      <Select labelId={labelId} label={label} {...selectProps}>
        {items
          ? items.map((item) => (
              <MenuItem
                key={String(item.value)}
                value={item.value}
                disabled={item.disabled}
                {...itemProps}
              >
                {item.label}
              </MenuItem>
            ))
          : children}
      </Select>
      {helperText}
    </FormControl>
  );
}
