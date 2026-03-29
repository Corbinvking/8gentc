import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "8gent <noreply@8gent-c.com>";

export async function sendOnboardingEmail(
  to: string,
  stage: "submitted" | "under_review" | "assessment_ready" | "approved" | "rejected",
  name: string
) {
  const subjects: Record<string, string> = {
    submitted: "Application Received — 8gent Contractor Platform",
    under_review: "Application Under Review — 8gent",
    assessment_ready: "Your Assessment is Ready — 8gent",
    approved: "Welcome to the 8gent Contractor Fleet!",
    rejected: "Application Update — 8gent",
  };

  const bodies: Record<string, string> = {
    submitted: `Hi ${name},\n\nThank you for applying to join the 8gent contractor fleet. We've received your application and will review it shortly.\n\nYou can track your application status at any time on your dashboard.\n\n— The 8gent Team`,
    under_review: `Hi ${name},\n\nYour application is now under review by our team. This typically takes 1-2 business days.\n\nWe'll notify you as soon as we have an update.\n\n— The 8gent Team`,
    assessment_ready: `Hi ${name},\n\nGreat news! You've been invited to complete the 8gent skills assessment. This is a timed evaluation consisting of 3 tasks that will help us understand your AI-augmented work capabilities.\n\nLog in to your dashboard to begin.\n\n— The 8gent Team`,
    approved: `Hi ${name},\n\nCongratulations! You've been approved to join the 8gent contractor fleet. You can now set your availability, browse tasks, and start earning.\n\nLog in to get started.\n\n— The 8gent Team`,
    rejected: `Hi ${name},\n\nThank you for your interest in joining the 8gent contractor fleet. After careful review, we're unable to move forward with your application at this time.\n\nYou're welcome to reapply after 30 days.\n\n— The 8gent Team`,
  };

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: subjects[stage],
    text: bodies[stage],
  });
}

export async function sendNotificationEmail(to: string, subject: string, body: string) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    text: body,
  });
}
