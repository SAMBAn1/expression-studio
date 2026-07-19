"use client";

import { useEffect } from "react";

export default function StoryMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    root.classList.add("story-motion-ready");

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -48px" });

    elements.forEach((element, index) => {
      element.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 70}ms`);
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
      root.classList.remove("story-motion-ready");
    };
  }, []);

  return null;
}
