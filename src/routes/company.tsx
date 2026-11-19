import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/company")({
  staticData: { sitemap: false },
  beforeLoad: () => { throw redirect({
  to: "/about", hash: "company", statusCode: 301 }); },
});
