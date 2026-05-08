import { Link } from "wouter";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  to: string;
  className?: string;
  activeClassName?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ className, activeClassName, to, children, ...props }, ref) => {
    return (
      <Link href={to} ref={ref} className={cn(className)} {...props}>
        {children}
      </Link>
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
