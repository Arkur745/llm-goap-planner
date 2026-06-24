import { Box, TextField, type TextFieldProps, Typography } from "@mui/material";
import { forwardRef, type ReactNode } from "react";

export interface AppTextareaProps extends Omit<TextFieldProps, "variant" | "multiline"> {
  errorText?: string;
  minRows?: number;
  maxRows?: number;
  children?: ReactNode;
}

export const AppTextarea = forwardRef<HTMLDivElement, AppTextareaProps>(
  ({ errorText, minRows = 4, maxRows = 10, sx, error, children, ...props }, ref) => {
    return (
      <Box sx={{ width: "100%" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            backgroundColor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(10, 15, 30, 0.5)" : "rgba(255, 255, 255, 0.65)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)", // 16px radius
            p: 3.5, // generous padding
            position: "relative",
            transition: "all var(--transition-normal)",
            boxShadow: (theme) => 
              theme.palette.mode === "dark"
                ? "0 20px 50px rgba(0, 0, 0, 0.3), 0 0 40px rgba(124, 92, 255, 0.03)" 
                : "0 15px 35px rgba(0, 0, 0, 0.05), 0 0 30px rgba(124, 92, 255, 0.01)",
            "&:hover": {
              borderColor: "var(--color-border-hover)",
              transform: "translateY(-2px)",
              boxShadow: (theme) =>
                theme.palette.mode === "dark"
                  ? "0 25px 60px rgba(0, 0, 0, 0.45), 0 0 50px rgba(124, 92, 255, 0.06)"
                  : "0 20px 40px rgba(0, 0, 0, 0.08), 0 0 40px rgba(124, 92, 255, 0.02)",
            },
            "&:focus-within": {
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(124, 92, 255, 0.45)" : "rgba(124, 92, 255, 0.3)",
              backgroundColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(14, 20, 38, 0.55)" : "rgba(255, 255, 255, 0.75)",
              transform: "translateY(-2px)",
              boxShadow: (theme) =>
                theme.palette.mode === "dark"
                  ? "0 25px 60px rgba(0, 0, 0, 0.4), 0 0 50px rgba(124, 92, 255, 0.12), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)"
                  : "0 20px 40px rgba(0, 0, 0, 0.06), 0 0 45px rgba(124, 92, 255, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)",
            },
            ...(error && {
              borderColor: "var(--color-danger)",
              "&:focus-within": {
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.45)" : "rgba(239, 68, 68, 0.3)",
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(20, 12, 12, 0.55)" : "rgba(255, 250, 250, 0.75)",
                transform: "translateY(-2px)",
                boxShadow: (theme) =>
                  theme.palette.mode === "dark"
                    ? "0 25px 60px rgba(0, 0, 0, 0.4), 0 0 50px rgba(239, 68, 68, 0.12), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)"
                    : "0 20px 40px rgba(0, 0, 0, 0.06), 0 0 45px rgba(239, 68, 68, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)",
              },
            }),
          }}
        >
          <TextField
            ref={ref}
            fullWidth
            multiline
            minRows={minRows}
            maxRows={maxRows}
            variant="outlined"
            error={error}
            {...props}
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "transparent !important",
                padding: 0,
                fontSize: "1.05rem",
                lineHeight: 1.6,
                color: "var(--color-text-primary)",
                "&.Mui-focused": {
                  backgroundColor: "transparent !important",
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  border: "none !important",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  border: "none !important",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  border: "none !important",
                },
              },
              "& .MuiInputBase-input": {
                backgroundColor: "transparent !important",
                outline: "none !important",
                boxShadow: "none !important",
              },
              "& .MuiInputBase-input::placeholder": {
                color: "var(--color-text-secondary)",
                opacity: 0.45,
                fontWeight: 400,
                fontSize: "1.05rem",
                transition: "opacity var(--transition-fast) ease-out",
              },
              "& .MuiInputBase-input:focus::placeholder": {
                opacity: 0.25,
              },
              ...sx,
            }}
          />
          {children}
        </Box>
        {errorText && (
          <Typography
            variant="caption"
            color="error"
            sx={{ display: "block", mt: 1, ml: 1, fontWeight: 500 }}
          >
            {errorText}
          </Typography>
        )}
      </Box>
    );
  }
);

AppTextarea.displayName = "AppTextarea";
