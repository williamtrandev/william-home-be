/**
 * Invitation email — bilingual (English + Vietnamese), deliverability-tuned.
 *
 * Notes on each design choice:
 *  - We always emit BOTH languages in the body. The inviter's selected UI
 *    language (`primaryLanguage`) goes FIRST so the most likely-relevant
 *    text is what the recipient sees on open.
 *  - Plain text alternative is always returned so the caller can send
 *    multipart/alternative. HTML-only mail is a major spam signal.
 *  - All styles are inlined (most clients strip <style> blocks).
 *  - Bulletproof <table>-based button (works in Outlook, no gradients,
 *    transitions or SVGs — those get stripped and increase spam score).
 *  - Hidden preheader is bilingual too, kept short to fit inbox previews.
 *  - Subject contains both languages but uses a clean ` · ` separator
 *    instead of `|` (pipes correlate with spam patterns).
 */

const COPY = {
    en: {
        preheader: (inviter, house) =>
            `${inviter} invited you to join ${house} on William's Home.`,
        subject: (inviter, house) =>
            `${inviter} invited you to join ${house}`,
        languageTag: 'English',
        greeting: 'Hi there,',
        intro: (inviter, house) =>
            `${inviter} has invited you to join the household "${house}" on William's Home, a simple tool for families to track shared expenses.`,
        cta: 'Accept invitation',
        fallbackLabel:
            "If the button above doesn't work, paste this link into your browser:",
        footerNote:
            "You're receiving this because someone entered your email when inviting a member. If this wasn't expected, you can safely ignore it.",
        signOff: 'Thanks,\nThe William\'s Home team',
    },
    vi: {
        preheader: (inviter, house) =>
            `${inviter} đã mời bạn tham gia ${house} trên William's Home.`,
        subject: (inviter, house) =>
            `${inviter} đã mời bạn tham gia ${house}`,
        languageTag: 'Tiếng Việt',
        greeting: 'Xin chào,',
        intro: (inviter, house) =>
            `${inviter} đã mời bạn tham gia nhà "${house}" trên William's Home, một công cụ đơn giản giúp các gia đình theo dõi chi tiêu chung.`,
        cta: 'Chấp nhận lời mời',
        fallbackLabel:
            'Nếu nút bên trên không hoạt động, hãy dán liên kết này vào trình duyệt:',
        footerNote:
            'Bạn nhận được email này vì có người đã nhập địa chỉ của bạn khi mời thành viên. Nếu không mong đợi, bạn có thể bỏ qua email này.',
        signOff: 'Trân trọng,\nĐội ngũ William\'s Home',
    },
};

const escapeHtml = (s = '') =>
    String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

/** Renders one language block (header tag + greeting + intro + CTA + fallback link). */
const renderHtmlBlock = ({ copy, inviter, house, link, isFirst }) => `
        <tr>
          <td style="padding:${isFirst ? '8' : '24'}px 32px 0 32px;">
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;margin-bottom:12px;">${copy.languageTag}</div>
            <p style="margin:0 0 12px 0;font-size:16px;line-height:1.6;color:#1f2937;">${copy.greeting}</p>
            <p style="margin:0 0 20px 0;font-size:16px;line-height:1.6;color:#1f2937;">${copy.intro(inviter, house)}</p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:4px 32px 8px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="#2563eb" style="border-radius:8px;">
                  <a href="${link}"
                     style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                    ${copy.cta}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 8px 32px;">
            <p style="margin:0 0 6px 0;font-size:13px;line-height:1.5;color:#6b7280;">${copy.fallbackLabel}</p>
            <p style="margin:0;font-size:13px;line-height:1.5;word-break:break-all;"><a href="${link}" style="color:#2563eb;text-decoration:underline;">${link}</a></p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 0 32px;">
            <p style="margin:0;font-size:14px;line-height:1.6;color:#1f2937;white-space:pre-line;">${copy.signOff}</p>
          </td>
        </tr>`;

const buildHtml = ({ inviterName, houseName, inviteLink, order }) => {
    const inviter = escapeHtml(inviterName);
    const house = escapeHtml(houseName);
    const link = escapeHtml(inviteLink);

    const [firstCopy, secondCopy] = order;
    const blocks = `${renderHtmlBlock({
        copy: firstCopy,
        inviter,
        house,
        link,
        isFirst: true,
    })}
        <tr>
          <td style="padding:24px 32px 8px 32px;">
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;">
          </td>
        </tr>${renderHtmlBlock({
        copy: secondCopy,
        inviter,
        house,
        link,
        isFirst: false,
    })}`;

    const preheader = `${firstCopy.preheader(inviter, house)} · ${secondCopy.preheader(inviter, house)}`;

    return `<!DOCTYPE html>
<html lang="${firstCopy === COPY.vi ? 'vi' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>William's Home</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
<!-- Preheader: hidden snippet shown in inbox preview -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f4f6f8;opacity:0;">
${preheader}
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6f8;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
        <tr>
          <td style="padding:32px 32px 8px 32px;">
            <div style="font-size:18px;font-weight:700;color:#2563eb;letter-spacing:-0.01em;">William's Home</div>
          </td>
        </tr>${blocks}
        <tr>
          <td style="padding:32px;"></td>
        </tr>
      </table>

      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="padding:16px 32px 24px 32px;">
            <p style="margin:0 0 8px 0;font-size:12px;line-height:1.5;color:#9ca3af;text-align:center;">${firstCopy.footerNote}</p>
            <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;text-align:center;">${secondCopy.footerNote}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
};

const renderTextBlock = ({ copy, inviterName, houseName, inviteLink }) =>
    [
        `[${copy.languageTag}]`,
        '',
        copy.greeting,
        '',
        copy.intro(inviterName, houseName),
        '',
        `${copy.cta}: ${inviteLink}`,
        '',
        copy.signOff,
    ].join('\n');

const buildText = ({ inviterName, houseName, inviteLink, order }) => {
    const [first, second] = order;
    return [
        renderTextBlock({ copy: first, inviterName, houseName, inviteLink }),
        '',
        '------------------------------',
        '',
        renderTextBlock({ copy: second, inviterName, houseName, inviteLink }),
        '',
        '------------------------------',
        '',
        first.footerNote,
        '',
        second.footerNote,
    ].join('\n');
};

/**
 * @param {object} params
 * @param {string} params.houseName        Name of the house being invited to.
 * @param {string} params.inviterName      Display name of the person sending the invite.
 * @param {string} params.inviteLink       Absolute join URL.
 * @param {'en'|'vi'} [params.primaryLanguage]
 *        The inviter's UI language. Determines which language block appears
 *        first in the body and which subject form is used. Defaults to 'en'.
 * @returns {{ subject: string, html: string, text: string }}
 */
const getInviteEmailTemplate = ({
    houseName,
    inviterName,
    inviteLink,
    primaryLanguage = 'en',
}) => {
    const safeInviter = inviterName || 'Someone';
    const safeHouse = houseName || 'a household';

    const primary = COPY[primaryLanguage] || COPY.en;
    const secondary = primary === COPY.vi ? COPY.en : COPY.vi;
    const order = [primary, secondary];

    // Bilingual subject, primary first. ` · ` separator scores better than `|`.
    const subject = `${primary.subject(safeInviter, safeHouse)} · ${secondary.subject(safeInviter, safeHouse)}`;

    return {
        subject,
        html: buildHtml({
            inviterName: safeInviter,
            houseName: safeHouse,
            inviteLink,
            order,
        }),
        text: buildText({
            inviterName: safeInviter,
            houseName: safeHouse,
            inviteLink,
            order,
        }),
    };
};

module.exports = {
    getInviteEmailTemplate,
};
