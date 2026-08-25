import { z } from "zod";

const destination = z.string().trim().min(1).max(1000).refine((value) => value.startsWith("/") || /^https:\/\//i.test(value), "Destination invalide");
const optionalDate = z.union([z.string().datetime({ offset: true }), z.literal(""), z.null()]).optional();

export const AdvertisementInput = z.object({
  placement: z.enum(["home", "catalog", "recipes", "checkout"]),
  titleFr: z.string().trim().min(3).max(100),
  titleEn: z.string().trim().min(3).max(100),
  bodyFr: z.string().trim().max(260).optional().default(""),
  bodyEn: z.string().trim().max(260).optional().default(""),
  imageUrl: z.string().url().max(1000),
  imageAltFr: z.string().trim().min(3).max(180),
  imageAltEn: z.string().trim().min(3).max(180),
  linkUrl: destination,
  status: z.enum(["draft", "published", "archived"]),
  priority: z.coerce.number().int().min(0).max(100),
  startsAt: optionalDate,
  endsAt: optionalDate,
}).superRefine((value, context) => {
  if (value.startsAt && value.endsAt && new Date(value.endsAt) <= new Date(value.startsAt)) {
    context.addIssue({ code: "custom", path: ["endsAt"], message: "La fin doit être postérieure au début." });
  }
});

export const advertisementData = (input: z.infer<typeof AdvertisementInput>) => ({
  ...input,
  startsAt: input.startsAt ? new Date(input.startsAt) : null,
  endsAt: input.endsAt ? new Date(input.endsAt) : null,
});
