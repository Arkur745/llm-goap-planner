import { Outlet } from "react-router-dom";
import { Box } from "@mui/material";

export function GlobalLayout() {
  return (
    <Box component="main" sx={{ minHeight: "100dvh" }}>
      <Outlet />
    </Box>
  );
}
