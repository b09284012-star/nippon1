import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/company")({
  staticData: { sitemap: false },
  beforeLoad: () => { throw redirect({
  staticData: { sitemap: false }, to: "/about", hash: "company", statusCode: 301 }); },
});
