import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/companies")({
  staticData: { sitemap: false },
  beforeLoad: () => { throw redirect({ to: "/market", statusCode: 301 }); },
});
