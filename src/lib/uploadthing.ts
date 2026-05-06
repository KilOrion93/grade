import { createUploadthing, type FileRouter } from "uploadthing/next";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";

const f = createUploadthing();

export const uploadRouter = {
  businessLogo: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const session = await requireSession();
      const businessId = req.headers.get("x-business-id");
      if (!businessId) throw new Error("businessId requis");

      if (session.role !== "ADMIN") {
        const membership = await db.staffMembership.findUnique({
          where: { userId_businessId: { userId: session.userId, businessId } },
        });
        if (!membership) throw new Error("Accès refusé");
      }

      return { businessId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await db.business.update({
        where: { id: metadata.businessId },
        data: { logoUrl: file.ufsUrl },
      });
      return { url: file.ufsUrl };
    }),

  businessPhotos: f({ image: { maxFileSize: "4MB", maxFileCount: 6 } })
    .middleware(async ({ req }) => {
      const session = await requireSession();
      const businessId = req.headers.get("x-business-id");
      if (!businessId) throw new Error("businessId requis");

      if (session.role !== "ADMIN") {
        const membership = await db.staffMembership.findUnique({
          where: { userId_businessId: { userId: session.userId, businessId } },
        });
        if (!membership) throw new Error("Accès refusé");
      }

      const count = await db.businessPhoto.count({ where: { businessId } });
      if (count >= 6) throw new Error("Maximum 6 photos");

      return { businessId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const last = await db.businessPhoto.findFirst({
        where: { businessId: metadata.businessId },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      await db.businessPhoto.create({
        data: {
          businessId: metadata.businessId,
          url: file.ufsUrl,
          order: (last?.order ?? -1) + 1,
        },
      });
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
