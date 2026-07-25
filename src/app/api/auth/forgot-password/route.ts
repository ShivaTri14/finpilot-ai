import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email address is required." }, { status: 400 });
    }

    const trimmedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (!user) {
      // Return positive message to avoid email enumeration attacks
      return NextResponse.json({
        message: "If an account with that email exists, a password reset link has been generated.",
      });
    }

    // Generate random 32-byte hex token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${origin}/reset-password?token=${resetToken}&email=${encodeURIComponent(trimmedEmail)}`;

    console.log("-------------------------------------------------------");
    console.log(`[PASSWORD RESET LINK FOR ${trimmedEmail}]:`);
    console.log(resetUrl);
    console.log("-------------------------------------------------------");

    return NextResponse.json({
      message: "Password reset link generated successfully.",
      resetUrl, // Exposed for local demo/testing convenience
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
