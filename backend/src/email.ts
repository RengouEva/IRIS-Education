import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
    })
  }
  return transporter
}

const FROM = process.env.SMTP_FROM || 'noreply@iris-education.com'
const BASE_URL = process.env.APP_URL || 'https://iris-education-plum.vercel.app'

export async function sendVerificationEmail(email: string, token: string, firstname: string) {
  const link = `${BASE_URL}/verify-email?token=${token}`
  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Vérification</title></head>
<body style="font-family:sans-serif;background:#f5f5f5;padding:40px">
<div style="max-width:600px;margin:auto;background:white;border-radius:12px;padding:32px">
<div style="background:#1a365d;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px">
<h1 style="color:white;margin:0;font-size:20px">IRIS-Education</h1>
</div>
<h2 style="color:#1a365d">Bonjour ${firstname},</h2>
<p style="color:#555;line-height:1.6">Merci de vous être inscrit sur IRIS-Education. Veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous :</p>
<div style="text-align:center;margin:32px 0">
<a href="${link}" style="background:#c9a44c;color:#1a365d;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">Vérifier mon email</a>
</div>
<p style="color:#999;font-size:13px">Ce lien expire dans 24 heures. Si vous n'avez pas créé de compte, ignorez cet email.</p>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0">
<p style="color:#aaa;font-size:12px;text-align:center">IRIS-Education — Rédaction académique assistée par IA</p>
</div>
</body>
</html>`

  try {
    await getTransporter().sendMail({
      from: FROM,
      to: email,
      subject: 'Vérifiez votre adresse email — IRIS-Education',
      html,
    })
    console.log('Verification email sent to', email)
  } catch (err) {
    console.error('Failed to send verification email:', err)
  }
}

export async function sendWelcomeEmail(email: string, firstname: string) {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Bienvenue</title></head>
<body style="font-family:sans-serif;background:#f5f5f5;padding:40px">
<div style="max-width:600px;margin:auto;background:white;border-radius:12px;padding:32px">
<div style="background:#1a365d;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px">
<h1 style="color:white;margin:0;font-size:20px">IRIS-Education</h1>
</div>
<h2 style="color:#1a365d">Bienvenue ${firstname} !</h2>
<p style="color:#555;line-height:1.6">Votre adresse email a été vérifiée avec succès. Vous pouvez dès à présent :</p>
<ul style="color:#555;line-height:2">
<li>Créer et rédiger vos mémoires académiques</li>
<li>Utiliser l'assistant IA pour vos recherches</li>
<li>Structurer vos documents selon les normes universitaires</li>
<li>Exporter en PDF et Word</li>
</ul>
<div style="text-align:center;margin:32px 0">
<a href="${BASE_URL}/login" style="background:#c9a44c;color:#1a365d;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">Commencer</a>
</div>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0">
<p style="color:#aaa;font-size:12px;text-align:center">IRIS-Education — Rédaction académique assistée par IA</p>
</div>
</body>
</html>`

  try {
    await getTransporter().sendMail({
      from: FROM,
      to: email,
      subject: 'Bienvenue sur IRIS-Education !',
      html,
    })
  } catch (err) {
    console.error('Failed to send welcome email:', err)
  }
}

export async function sendPasswordResetEmail(email: string, token: string, firstname: string) {
  const link = `${BASE_URL}/reset-password?token=${token}`
  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Réinitialisation</title></head>
<body style="font-family:sans-serif;background:#f5f5f5;padding:40px">
<div style="max-width:600px;margin:auto;background:white;border-radius:12px;padding:32px">
<div style="background:#1a365d;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px">
<h1 style="color:white;margin:0;font-size:20px">IRIS-Education</h1>
</div>
<h2 style="color:#1a365d">Bonjour ${firstname},</h2>
<p style="color:#555;line-height:1.6">Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
<div style="text-align:center;margin:32px 0">
<a href="${link}" style="background:#c9a44c;color:#1a365d;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">Réinitialiser mon mot de passe</a>
</div>
<p style="color:#999;font-size:13px">Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0">
<p style="color:#aaa;font-size:12px;text-align:center">IRIS-Education — Rédaction académique assistée par IA</p>
</div>
</body>
</html>`

  try {
    await getTransporter().sendMail({
      from: FROM,
      to: email,
      subject: 'Réinitialisation de mot de passe — IRIS-Education',
      html,
    })
  } catch (err) {
    console.error('Failed to send password reset email:', err)
  }
}

export async function sendPaymentConfirmationEmail(email: string, firstname: string, planName: string, amount: string) {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Confirmation de paiement</title></head>
<body style="font-family:sans-serif;background:#f5f5f5;padding:40px">
<div style="max-width:600px;margin:auto;background:white;border-radius:12px;padding:32px">
<div style="background:#1a365d;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px">
<h1 style="color:white;margin:0;font-size:20px">IRIS-Education</h1>
</div>
<h2 style="color:#1a365d">Merci ${firstname} !</h2>
<p style="color:#555;line-height:1.6">Votre paiement de <strong>${amount} FCFA</strong> pour le forfait <strong>${planName}</strong> a été confirmé.</p>
<p style="color:#555;line-height:1.6">Vous avez désormais accès à toutes les fonctionnalités de votre abonnement.</p>
<div style="text-align:center;margin:32px 0">
<a href="${BASE_URL}/dashboard" style="background:#c9a44c;color:#1a365d;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">Accéder au tableau de bord</a>
</div>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0">
<p style="color:#aaa;font-size:12px;text-align:center">IRIS-Education — Rédaction académique assistée par IA</p>
</div>
</body>
</html>`

  try {
    await getTransporter().sendMail({
      from: FROM,
      to: email,
      subject: 'Confirmation de paiement — IRIS-Education',
      html,
    })
  } catch (err) {
    console.error('Failed to send payment email:', err)
  }
}
