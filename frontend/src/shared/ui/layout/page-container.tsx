import Container, { type ContainerProps } from "@mui/material/Container";

export type PageContainerProps = ContainerProps;

export function PageContainer(props: PageContainerProps) {
  return <Container maxWidth="xl" {...props} />;
}
