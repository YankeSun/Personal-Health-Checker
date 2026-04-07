import Link from "next/link";
import type { ComponentProps } from "react";

type AppLinkProps = ComponentProps<typeof Link>;

export function AppLink({ scroll = false, ...props }: AppLinkProps) {
  return <Link scroll={scroll} {...props} />;
}
