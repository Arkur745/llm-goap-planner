import Box, { type BoxProps } from "@mui/material/Box";

export type SectionContainerProps = BoxProps;

export function SectionContainer(props: SectionContainerProps) {
  return <Box component="section" {...props} />;
}
