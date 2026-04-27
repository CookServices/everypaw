import { Resend } from "resend";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { email } = await req.json();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    // 1. Confirmation email to the user
    await resend.emails.send({
      from: "Everypaw <hello@everypaw.app>",
      to: email,
      subject: "You're on the list 🐾",
      html: `
        <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #3D2B1F;">
          <p style="font-size: 28px; margin: 0 0 8px;">🐾</p>
          <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 16px;">You're on the Everypaw waitlist.</h1>
          <p style="font-size: 16px; line-height: 1.6; color: #7A5C44; margin: 0 0 24px;">
            We're building something special — an AI journal that turns your pet's daily moments into a beautiful printed book.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #7A5C44; margin: 0 0 24px;">
            As one of our first members, you'll get <strong style="color: #C8813A;">50% off</strong> when we launch.
            We'll be in touch soon.
          </p>
          <p style="font-size: 14px; color: #7A5C44;">— The Everypaw team</p>
        </div>
      `,
    });

    // 2. Internal notification
    await resend.emails.send({
      from: "Everypaw Waitlist <hello@everypaw.app>",
      to: process.env.WAITLIST_TO_EMAIL!,
      subject: `New waitlist signup: ${email}`,
      html: `<p>New signup: <strong>${email}</strong></p>`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resend error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
