type AuthEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendAuthEmail(input: AuthEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.info("[auth-email:fallback]", {
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    return { delivered: false as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    throw new Error(`failed to send auth email: ${payload || response.statusText}`);
  }

  return { delivered: true as const };
}
