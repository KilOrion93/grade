import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendNewReviewNotification({
  ownerEmail,
  ownerName,
  businessName,
  overallScore,
  comment,
}: {
  ownerEmail: string;
  ownerName: string | null;
  businessName: string;
  overallScore: number;
  comment: string | null;
}) {
  if (!resend) return;

  const stars = "★".repeat(Math.round(overallScore)) + "☆".repeat(5 - Math.round(overallScore));
  const greeting = ownerName ? `Bonjour ${ownerName},` : "Bonjour,";
  const commentSection = comment
    ? `<p style="margin:16px 0;padding:12px 16px;background:#f8fafc;border-left:3px solid #2563eb;border-radius:0 8px 8px 0;font-style:italic;color:#475569;">"${comment}"</p>`
    : "";

  await resend.emails.send({
    from: "Grade <notifications@grade.fr>",
    to: ownerEmail,
    subject: `Nouvel avis reçu pour ${businessName} — ${overallScore}/5`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#0f172a;">
        <div style="margin-bottom:24px;">
          <span style="font-size:22px;font-weight:800;color:#2563eb;">Grade</span>
        </div>
        <h1 style="font-size:20px;font-weight:700;margin:0 0 8px;">Vous avez reçu un nouvel avis !</h1>
        <p style="color:#475569;margin:0 0 20px;">${greeting} Un client vient de laisser un avis vérifié pour <strong>${businessName}</strong>.</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:20px;">
          <p style="font-size:24px;margin:0 0 4px;letter-spacing:2px;">${stars}</p>
          <p style="font-size:28px;font-weight:800;color:#2563eb;margin:0;">${overallScore}/5</p>
        </div>
        ${commentSection}
        <p style="color:#475569;font-size:14px;">Connectez-vous à votre tableau de bord pour voir les détails et répondre à cet avis.</p>
        <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px;">
          Grade — Avis certifiés par de vraies visites
        </div>
      </div>
    `,
  });
}
