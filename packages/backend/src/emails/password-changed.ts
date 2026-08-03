import type { EmailMessage } from '../lib/email.js';

import { BRAND_HTML, DATA_DETECTORS_RESET, escapeHtml } from './html.js';

// Deliberately has no reset URL or token: a "your password changed" notice that
// carried a link able to change the password again would defeat its purpose.
interface PasswordChangedEmailInput {
  email: string;
  logoUrl: string;
  name: string;
  supportUrl: string;
}

export function buildPasswordChangedEmail({
  email,
  logoUrl,
  name,
  supportUrl,
}: PasswordChangedEmailInput): EmailMessage {
  const safeName = escapeHtml(name);

  const safeEmail = escapeHtml(email);

  const safeSupportUrl = escapeHtml(supportUrl);

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Sua senha foi alterada — FIT.AI</title>
<!--[if mso]>
<style type="text/css">
table { border-collapse: collapse; }
.fallback-font { font-family: Arial, sans-serif; }
</style>
<![endif]-->
${DATA_DETECTORS_RESET}
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f4f4f5;">A senha da sua conta FIT.AI foi alterada e todas as sessões foram encerradas.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
<tr>
<td align="center" style="padding:32px 16px;">

<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

<tr>
<td align="center" bgcolor="#1d4ed8" style="background-color:#1d4ed8;border-radius:12px 12px 0 0;padding:32px 40px 40px;">
<img src="${escapeHtml(logoUrl)}" width="85" height="39" alt="FIT.AI" style="display:block;border:0;outline:none;text-decoration:none;">
<div style="height:24px;line-height:24px;font-size:1px;">&nbsp;</div>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:1.25;font-weight:bold;color:#ffffff;">Sua senha foi alterada</div>
</td>
</tr>

<tr>
<td style="background-color:#ffffff;border-radius:0 0 12px 12px;padding:40px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#18181b;padding-bottom:20px;">
Olá, ${safeName},
</td>
</tr>
<tr>
<td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#18181b;padding-bottom:28px;">
A senha da sua conta ${BRAND_HTML} acabou de ser alterada. Por segurança, <b>todas as sessões foram encerradas</b> — será preciso entrar de novo em cada aparelho.
</td>
</tr>

<tr>
<td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#18181b;padding-bottom:28px;">
<b>Não foi você?</b> Entre em contato com o <a href="${safeSupportUrl}" target="_blank" style="color:#1d4ed8;text-decoration:underline;">suporte ${BRAND_HTML}</a> imediatamente — sua conta pode ter sido acessada por outra pessoa.
</td>
</tr>

<tr>
<td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#18181b;padding-bottom:28px;">
Bons treinos!<br>
Equipe ${BRAND_HTML}
</td>
</tr>

<tr>
<td style="border-top:1px solid #e4e4e7;font-size:1px;line-height:1px;padding-top:24px;">&nbsp;</td>
</tr>

<tr>
<td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#71717a;padding-top:20px;">
OBSERVAÇÃO: este é um e-mail automático. Não responda a esta mensagem. Para ajuda, visite <a href="${safeSupportUrl}" style="color:#1d4ed8;text-decoration:underline;">${safeSupportUrl}</a>.
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td align="center" style="padding:24px 40px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:#a1a1aa;">
Este e-mail foi enviado para ${safeEmail} por ${BRAND_HTML} a partir de um endereço somente de notificação que não recebe respostas.<br>
©2026 ${BRAND_HTML}. Todos os direitos reservados.
</td>
</tr>

</table>
</td>
</tr>
</table>

</body>
</html>
`;

  const text = `Olá, ${name},

A senha da sua conta FIT.AI acabou de ser alterada. Por segurança, todas as sessões foram encerradas — será preciso entrar de novo em cada aparelho.

Não foi você? Entre em contato com o suporte FIT.AI imediatamente — sua conta pode ter sido acessada por outra pessoa: ${supportUrl}

Bons treinos!
Equipe FIT.AI

---
OBSERVAÇÃO: este é um e-mail automático. Não responda a esta mensagem. Para ajuda, visite ${supportUrl}.

Este e-mail foi enviado para ${email} por FIT.AI a partir de um endereço somente de notificação que não recebe respostas.
©2026 FIT.AI. Todos os direitos reservados.
`;

  return { html, subject: 'Sua senha foi alterada — FIT.AI', text };
}
