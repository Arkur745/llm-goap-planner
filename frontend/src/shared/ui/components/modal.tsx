import Modal, { type ModalProps } from "@mui/material/Modal";
import Box from "@mui/material/Box";
import type { PropsWithChildren } from "react";

export type AppModalProps = ModalProps;

export function AppModal(props: AppModalProps) {
  return <Modal {...props} />;
}

export function AppModalContent({ children }: PropsWithChildren) {
  return (
    <Box
      role="presentation"
      sx={{
        position: "absolute",
        inset: "50% auto auto 50%",
        transform: "translate(-50%, -50%)",
        maxWidth: 640,
        width: "calc(100% - 32px)",
        outline: 0,
        borderRadius: "var(--radius-lg)",
      }}
    >
      {children}
    </Box>
  );
}
