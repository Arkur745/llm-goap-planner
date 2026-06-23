import Tabs, { type TabsProps } from "@mui/material/Tabs";
import Tab, { type TabProps } from "@mui/material/Tab";

export type AppTabsProps = TabsProps;
export type AppTabProps = TabProps;

export function AppTabs(props: AppTabsProps) {
  return <Tabs {...props} />;
}

export function AppTab(props: AppTabProps) {
  return <Tab {...props} />;
}
