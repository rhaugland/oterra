import { Resend } from "resend";
import type { Contact, User, DataRoom } from "@prisma/client";

function getResend(): Resend {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = () => process.env.EMAIL_FROM ?? "noreply@example.com";

export async function sendInviteEmail(
  contact: Contact,
  room: DataRoom,
  magicLinkUrl: string
): Promise<void> {
  const resend = getResend();
  await resend.emails.send({
    from: FROM(),
    to: contact.email,
    subject: `You've been invited to access ${room.name}`,
    html: `
      <p>Hi ${contact.name},</p>
      <p>You have been invited to access the data room: <strong>${room.name}</strong>.</p>
      <p>Click the link below to access it. This link expires in 24 hours.</p>
      <p><a href="${magicLinkUrl}">Access Data Room</a></p>
      <p>If you did not expect this invitation, you can ignore this email.</p>
    `,
  });
}

export async function sendAccessGrantedEmail(
  contact: Contact,
  room: DataRoom
): Promise<void> {
  const resend = getResend();
  await resend.emails.send({
    from: FROM(),
    to: contact.email,
    subject: `Your access to ${room.name} has been approved`,
    html: `
      <p>Hi ${contact.name},</p>
      <p>Your request to access the data room <strong>${room.name}</strong> has been approved.</p>
      <p>You can now log in to review the documents.</p>
    `,
  });
}

export async function sendMagicLinkEmail(
  contact: Contact,
  magicLinkUrl: string
): Promise<void> {
  const resend = getResend();
  await resend.emails.send({
    from: FROM(),
    to: contact.email,
    subject: "Your login link",
    html: `
      <p>Hi ${contact.name},</p>
      <p>Click the link below to log in. This link expires in 15 minutes and can only be used once.</p>
      <p><a href="${magicLinkUrl}">Log In</a></p>
      <p>If you did not request this link, you can ignore this email.</p>
    `,
  });
}

export async function sendPasswordResetEmail(
  user: User,
  resetUrl: string
): Promise<void> {
  const resend = getResend();
  await resend.emails.send({
    from: FROM(),
    to: user.email,
    subject: "Reset your password",
    html: `
      <p>Hi ${user.name},</p>
      <p>We received a request to reset your password. Click the link below to set a new password. This link expires in 1 hour.</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>If you did not request a password reset, you can ignore this email.</p>
    `,
  });
}
