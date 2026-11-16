import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/profits")({
  staticData: { sitemap: false },
  beforeLoad: () => {
    throw redirect({ to: "/finance" });
  },
});
