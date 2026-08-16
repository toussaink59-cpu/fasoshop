export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fasoshop-xi.vercel.app";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/vendor/", "/admin/", "/api/", "/account/", "/cart"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}