import { categories, resources } from "./resources.js";

export const seedReviews = [
  {
    id: "rvw-001",
    resourceSlug: "mobbin",
    name: "Aarav",
    role: "UI/UX student",
    rating: 5,
    comment: "Mobbin helped me understand real onboarding flows much faster than random screenshots.",
    createdAt: "2026-04-20T09:00:00.000Z"
  },
  {
    id: "rvw-002",
    resourceSlug: "mockupworld",
    name: "Nisha",
    role: "Graphic designer",
    rating: 5,
    comment: "The mockups are clean and client-presentable. It saves a lot of searching time.",
    createdAt: "2026-04-22T14:30:00.000Z"
  },
  {
    id: "rvw-003",
    resourceSlug: "colorhunt",
    name: "Rohan",
    role: "Beginner designer",
    rating: 4,
    comment: "Good for quick palettes when I am stuck choosing colors.",
    createdAt: "2026-04-24T11:15:00.000Z"
  }
];

export function getStats() {
  return {
    resources: resources.length,
    categories: categories.length,
    featured: resources.filter((resource) => resource.featured).length,
    averageRating: Number(
      (resources.reduce((total, resource) => total + resource.rating, 0) / resources.length).toFixed(1)
    )
  };
}
