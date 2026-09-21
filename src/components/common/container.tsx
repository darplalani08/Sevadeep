import { cn } from "@/lib/utils";

export function Container({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)} {...props} />;
}

export function Section({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return <section className={cn("py-16 sm:py-20 lg:py-24", className)} {...props} />;
}
