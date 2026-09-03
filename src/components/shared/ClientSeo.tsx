"use client";

import { useEffect } from "react";

interface ClientSeoProps {
  id: string;
  title: string;
  description: string;
  canonicalPath: string;
  image?: string | null;
  structuredData: Record<string, unknown>;
}

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://je-mange-africain.com").replace(/\/$/, "");

export function ClientSeo({ id, title, description, canonicalPath, image, structuredData }: ClientSeoProps) {
  useEffect(() => {
    const previousTitle = document.title;
    const canonicalUrl = absoluteUrl(canonicalPath);
    const imageUrl = image ? absoluteUrl(image) : null;
    const restorers: Array<() => void> = [];

    document.title = title;
    restorers.push(() => { document.title = previousTitle; });

    setMeta("name", "description", description, restorers);
    setMeta("property", "og:title", title, restorers);
    setMeta("property", "og:description", description, restorers);
    setMeta("property", "og:url", canonicalUrl, restorers);
    setMeta("name", "twitter:title", title, restorers);
    setMeta("name", "twitter:description", description, restorers);
    if (imageUrl) {
      setMeta("property", "og:image", imageUrl, restorers);
      setMeta("name", "twitter:image", imageUrl, restorers);
    }

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const createdCanonical = !canonical;
    const previousCanonical = canonical?.getAttribute("href");
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
    restorers.push(() => {
      if (createdCanonical) canonical?.remove();
      else if (previousCanonical === null || previousCanonical === undefined) canonical?.removeAttribute("href");
      else canonical?.setAttribute("href", previousCanonical);
    });

    return () => restorers.reverse().forEach((restore) => restore());
  }, [canonicalPath, description, image, title]);

  return (
    <script
      id={`jma-structured-${id}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
    />
  );
}

export function absoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteUrl}${path.startsWith("/") ? "" : "/"}${path}`;
}

function setMeta(attribute: "name" | "property", key: string, content: string, restorers: Array<() => void>) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  const created = !element;
  const previousContent = element?.getAttribute("content");

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;

  restorers.push(() => {
    if (created) element?.remove();
    else if (previousContent === null || previousContent === undefined) element?.removeAttribute("content");
    else element?.setAttribute("content", previousContent);
  });
}
