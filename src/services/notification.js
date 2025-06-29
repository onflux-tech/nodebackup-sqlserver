const nodemailer = require('nodemailer');
const { formatFileSize, formatDuration } = require('../utils/formatters');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class NotificationService {
  constructor() {
    this.transporter = null;
  }

  getLogoAttachment() {
    try {
      const isPkg = typeof process.pkg !== 'undefined';
      const baseDir = isPkg ? path.dirname(process.execPath) : process.cwd();
      const logoPath = path.join(baseDir, 'public', 'logo-mail.png');

      if (fs.existsSync(logoPath)) {
        return {
          filename: 'logo-mail.png',
          path: logoPath,
          cid: 'logo@nodebackup.email'
        };
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  async configure(smtpConfig) {
    try {
      this.transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.password
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      return true;
    } catch (error) {
      logger.error('❌ Erro ao configurar transporter SMTP', error);
      throw error;
    }
  }

  async testConnection(smtpConfig) {
    try {
      const testTransporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.password
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      await testTransporter.verify();
      return { success: true, message: 'Conexão SMTP estabelecida com sucesso' };
    } catch (error) {
      logger.error('❌ Falha no teste de conexão SMTP', {
        error: error.message,
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        user: smtpConfig.user
      });

      const suggestions = this.getSMTPSuggestions(error);
      let userFriendlyMessage = 'Falha na conexão SMTP';

      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes('wrong version number')) {
        userFriendlyMessage = 'Configuração SSL/TLS incorreta para esta porta';
      } else if (errorMessage.includes('authentication') || errorMessage.includes('login')) {
        userFriendlyMessage = 'Falha na autenticação (usuário ou senha incorretos)';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('connect')) {
        userFriendlyMessage = 'Não foi possível conectar ao servidor SMTP';
      } else if (errorMessage.includes('certificate') || errorMessage.includes('cert')) {
        userFriendlyMessage = 'Problema com certificado SSL do servidor';
      }

      return {
        success: false,
        message: userFriendlyMessage,
        suggestions: suggestions
      };
    }
  }

  async sendSuccessNotification(backupData, recipients, clientName, smtpConfig) {
    if (!smtpConfig || !recipients || recipients.length === 0) {
      logger.warn('⚠️  Notificação de sucesso pulada: configuração SMTP ou destinatários ausentes.');
      return;
    }

    try {
      await this.configure(smtpConfig);
      const subject = `Backup realizado com sucesso - ${clientName}`;
      const htmlContent = this.generateSuccessTemplate(backupData, clientName);

      await this.sendEmail(recipients, subject, htmlContent);
      logger.info(`📧 Notificação de sucesso enviada para ${recipients.length} destinatários`);
    } catch (error) {
      logger.error('❌ Erro ao enviar notificação de sucesso', error);
    }
  }

  async sendFailureNotification(errorData, recipients, clientName, smtpConfig) {
    if (!smtpConfig || !recipients || recipients.length === 0) {
      logger.warn('⚠️  Notificação de falha pulada: configuração SMTP ou destinatários ausentes.');
      return;
    }

    try {
      await this.configure(smtpConfig);
      const subject = `Falha no backup - ${clientName}`;
      const htmlContent = this.generateFailureTemplate(errorData, clientName);

      await this.sendEmail(recipients, subject, htmlContent);
      logger.info(`📧 Notificação de falha enviada para ${recipients.length} destinatários`);
    } catch (error) {
      logger.error('❌ Erro ao enviar notificação de falha', error);
    }
  }

  async sendEmail(recipients, subject, htmlContent) {
    const logoAttachment = this.getLogoAttachment();

    const mailOptions = {
      from: this.transporter.options.auth.user,
      to: recipients.join(', '),
      subject: subject,
      html: htmlContent,
      attachments: logoAttachment ? [logoAttachment] : []
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendTestEmail(recipient, clientName) {
    if (!this.transporter) {
      logger.warn('Transporter SMTP não configurado. Impossível enviar e-mail de teste.');
      return;
    }
    const subject = `🧪 Teste SMTP - NodeBackup Configurado`;
    const htmlContent = this.generateTestTemplate(clientName);

    await this.sendEmail([recipient], subject, htmlContent);
    logger.info(`📧 E-mail de teste enviado para ${recipient}`);
  }

  generateSuccessTemplate(backupData, clientName) {
    const { databases, totalSize, duration, timestamp, files } = backupData;

    const dateObj = new Date(timestamp);
    const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
    const formattedTime = dateObj.toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit'
    });

    const databaseChips = databases.map(db => `
      <span style="background-color: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe; padding: 6px 12px; border-radius: 9999px; font-size: 13px; font-weight: 500; display: inline-block; margin: 4px;">
        ${db}
      </span>
    `).join('');

    const fileChips = files.slice(0, 5).map(f => `
      <span style="background-color: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; padding: 6px 12px; border-radius: 9999px; font-size: 13px; font-weight: 500; display: inline-block; margin: 4px;">
        ${f}
      </span>
    `).join('') + (files.length > 5 ? `<span style="background-color: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 9999px; font-size: 13px; font-weight: 500; display: inline-block; margin: 4px;">+${files.length - 5}</span>` : '');

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Backup Concluído com Sucesso</title>
  <style>
    body { margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
    @media (prefers-color-scheme: dark) {
      .dark-mode-bg { background-color: #0f172a !important; background-image: radial-gradient(circle, #1e293b 0%, #0f172a 70%) !important; }
      .dark-mode-card { background-color: #1e293b !important; border-color: #334155 !important; }
      .dark-mode-header { background-color: rgba(34, 197, 94, 0.1) !important; }
      .dark-mode-text-primary { color: #f8fafc !important; }
      .dark-mode-text-secondary { color: #cbd5e1 !important; }
      .dark-mode-border { border-color: #334155 !important; }
      .dark-mode-stat-card { background-color: #0f172a !important; }
      .dark-mode-chip-db { background-color: rgba(59, 130, 246, 0.1) !important; color: #60a5fa !important; border-color: rgba(59, 130, 246, 0.2) !important; }
      .dark-mode-chip-file { background-color: rgba(34, 197, 94, 0.1) !important; color: #4ade80 !important; border-color: rgba(34, 197, 94, 0.2) !important; }
      .dark-mode-chip-more { background-color: #334155 !important; color: #cbd5e1 !important; border-color: #475569 !important; }
      .dark-mode-text-success { color: #4ade80 !important; }
      .dark-mode-logo-bg { background-color: #3b82f6 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; background-image: radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(241,245,249,0) 70%);" class="dark-mode-bg">
  <table role="presentation" style="width: 100%; border-collapse: collapse;" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 24px;">
        <table role="presentation" class="dark-mode-card" style="width: 100%; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="dark-mode-header" style="background-color: #f0fdf4; padding: 24px; border-top-left-radius: 16px; border-top-right-radius: 16px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width: 48px; padding-right: 16px;">
                    <div class="dark-mode-logo-bg" padding: 10px; width: 48px; height: 48px; box-sizing: border-box;">
                      <img src="cid:logo@nodebackup.email" alt="Logo" style="height: 48px; width: auto; vertical-align: middle;">
                    </div>
                  </td>
                  <td style="vertical-align: middle;">
                    <h1 class="dark-mode-text-success" style="font-size: 18px; font-weight: 700; margin: 0; color: #16a34a;">Backup Concluído com Sucesso</h1>
                    <p class="dark-mode-text-secondary" style="font-size: 14px; margin: 4px 0 0 0; color: #475569;">${clientName}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 24px 12px 24px;">
              <p class="dark-mode-text-secondary" style="font-size: 12px; margin: 0 0 16px 0; color: #64748b; text-align: center;">${formattedDate} às ${formattedTime}</p>
              <table role="presentation" style="width: 100%; border-collapse: collapse;" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 6px;">
                    <div class="dark-mode-stat-card" style="background-color: #f8fafc; padding: 16px; border-radius: 12px; text-align: center;">
                      <p class="dark-mode-text-primary" style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0;">${databases.length}</p>
                      <p class="dark-mode-text-secondary" style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; color: #475569;">Bancos</p>
                    </div>
                  </td>
                  <td style="padding: 6px;">
                    <div class="dark-mode-stat-card" style="background-color: #f8fafc; padding: 16px; border-radius: 12px; text-align: center;">
                      <p class="dark-mode-text-primary" style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0;">${formatFileSize(totalSize)}</p>
                      <p class="dark-mode-text-secondary" style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; color: #475569;">Tamanho</p>
                    </div>
                  </td>
                  <td style="padding: 6px;">
                    <div class="dark-mode-stat-card" style="background-color: #f8fafc; padding: 16px; border-radius: 12px; text-align: center;">
                      <p class="dark-mode-text-primary" style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0;">${formatDuration(duration)}</p>
                      <p class="dark-mode-text-secondary" style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; color: #475569;">Duração</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              <p class="dark-mode-text-primary" style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 0 0 12px 0;">Bancos Processados</p>
              <div class="dark-mode-chip-db" style="text-align: left;">
                ${databaseChips}
              </div>
              <div style="height: 24px;"></div>
              <p class="dark-mode-text-primary" style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 0 0 12px 0;">Arquivos Gerados</p>
              <div class="dark-mode-chip-file dark-mode-chip-more" style="text-align: left;">
                ${fileChips}
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 16px 24px; border-top: 1px solid #e2e8f0;" class="dark-mode-border">
              <p class="dark-mode-text-secondary" style="font-size: 12px; color: #475569; margin: 0;">Email enviado por <strong class="dark-mode-text-primary" style="color: #0f172a;">NodeBackup</strong>.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  generateFailureTemplate(errorData, clientName) {
    const { error, timestamp, databases, suggestions } = errorData;

    const dateObj = new Date(timestamp);
    const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
    const formattedTime = dateObj.toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit'
    });

    const databaseChips = databases && databases.length > 0
      ? databases.map(db => `
          <span style="background-color: #fef2f2; color: #991b1b; border: 1px solid #fecaca; padding: 6px 12px; border-radius: 9999px; font-size: 13px; font-weight: 500; display: inline-block; margin: 4px;">
            ${db}
          </span>
        `).join('')
      : '<span class="dark-mode-text-secondary" style="font-size: 13px; font-style: italic; color: #475569;">Nenhum banco de dados foi afetado diretamente.</span>';

    const suggestionItems = suggestions && suggestions.length > 0
      ? suggestions.map(s => `<li style="font-size: 14px; line-height: 1.6; padding-left: 24px; position: relative; margin-bottom: 12px;"><span style="position: absolute; left: 0; top: 2px;">💡</span>${s}</li>`).join('')
      : '<li style="font-size: 14px; line-height: 1.6; padding-left: 24px; position: relative; margin-bottom: 0px;"><span style="position: absolute; left: 0; top: 2px;">ℹ️</span>Nenhuma sugestão automática. Verifique os logs da aplicação para mais detalhes.</li>';

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Falha no Processo de Backup</title>
  <style>
    body { margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
    ul { padding: 0; list-style: none; }
    @media (prefers-color-scheme: dark) {
      .dark-mode-bg { background-color: #0f172a !important; background-image: radial-gradient(circle, #1e293b 0%, #0f172a 70%) !important; }
      .dark-mode-card { background-color: #1e293b !important; border-color: #334155 !important; }
      .dark-mode-header { background-color: rgba(239, 68, 68, 0.1) !important; }
      .dark-mode-text-primary { color: #f8fafc !important; }
      .dark-mode-text-secondary { color: #cbd5e1 !important; }
      .dark-mode-border { border-color: #334155 !important; }
      .dark-mode-error-box { background-color: rgba(239, 68, 68, 0.1) !important; border-color: rgba(239, 68, 68, 0.3) !important; }
      .dark-mode-text-error-title { color: #f87171 !important; }
      .dark-mode-chip-db { background-color: rgba(239, 68, 68, 0.1) !important; color: #f87171 !important; border-color: rgba(239, 68, 68, 0.2) !important; }
      .dark-mode-suggestion-box { background-color: #0f172a !important; }
      .dark-mode-text-error { color: #f87171 !important; }
      .dark-mode-logo-bg { background-color: #3b82f6 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; background-image: radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(241,245,249,0) 70%);" class="dark-mode-bg">
  <table role="presentation" style="width: 100%; border-collapse: collapse;" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 24px;">
        <table role="presentation" class="dark-mode-card" style="width: 100%; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="dark-mode-header" style="background-color: #fef2f2; padding: 24px; border-top-left-radius: 16px; border-top-right-radius: 16px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width: 48px; padding-right: 16px;">
                    <div class="dark-mode-logo-bg" padding: 10px; width: 48px; height: 48px; box-sizing: border-box;">
                      <img src="cid:logo@nodebackup.email" alt="Logo" style="height: 48px; width: auto; vertical-align: middle;">
                    </div>
                  </td>
                  <td style="vertical-align: middle;">
                    <h1 class="dark-mode-text-error" style="font-size: 18px; font-weight: 700; margin: 0; color: #dc2626;">Falha no Processo de Backup</h1>
                    <p class="dark-mode-text-secondary" style="font-size: 14px; margin: 4px 0 0 0; color: #475569;">${clientName}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              <p class="dark-mode-text-secondary" style="font-size: 12px; margin: 0 0 16px 0; color: #64748b; text-align: center;">${formattedDate} às ${formattedTime}</p>
              <div class="dark-mode-error-box" style="padding: 20px; background-color: #fef2f2; border-radius: 12px; border: 1px solid #fecaca;">
                <h2 class="dark-mode-text-error-title" style="font-size: 16px; font-weight: 700; color: #b91c1c; margin: 0 0 8px 0;">Resumo do Erro</h2>
                <p class="dark-mode-text-secondary" style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0;">${error}</p>
              </div>
              <div style="height: 24px;"></div>
              <h3 class="dark-mode-text-primary" style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 0 0 12px 0;">Bancos Afetados</h3>
              <div class="dark-mode-chip-db" style="text-align: left;">
                ${databaseChips}
              </div>
              <div style="height: 24px;"></div>
              <div class="dark-mode-suggestion-box" style="padding: 20px; background-color: #f8fafc; border-radius: 12px;">
                <h3 class="dark-mode-text-primary" style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 0 0 16px 0;">O que fazer agora?</h3>
                <ul class="dark-mode-text-secondary" style="padding: 0; list-style: none; margin: 0; color: #475569;">
                  ${suggestionItems}
                </ul>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 16px 24px; border-top: 1px solid #e2e8f0;" class="dark-mode-border">
              <p class="dark-mode-text-secondary" style="font-size: 12px; color: #475569; margin: 0;">Email enviado por <strong class="dark-mode-text-primary" style="color: #0f172a;">NodeBackup</strong>.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  generateTestTemplate(clientName) {
    const dateObj = new Date();
    const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
    const formattedTime = dateObj.toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit'
    });

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Teste de Notificação SMTP</title>
  <style>
    body { margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
    @media (prefers-color-scheme: dark) {
      .dark-mode-bg { background-color: #0f172a !important; background-image: radial-gradient(circle, #1e293b 0%, #0f172a 70%) !important; }
      .dark-mode-card { background-color: #1e293b !important; border-color: #334155 !important; }
      .dark-mode-header { background-color: rgba(59, 130, 246, 0.1) !important; }
      .dark-mode-text-primary { color: #f8fafc !important; }
      .dark-mode-text-secondary { color: #cbd5e1 !important; }
      .dark-mode-border { border-color: #334155 !important; }
      .dark-mode-test-box { background-color: #0f172a !important; border-color: rgba(59, 130, 246, 0.3) !important; }
      .dark-mode-text-brand-title { color: #60a5fa !important; }
      .dark-mode-text-brand { color: #60a5fa !important; }
      .dark-mode-logo-bg { background-color: #3b82f6 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; background-image: radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(241,245,249,0) 70%);" class="dark-mode-bg">
  <table role="presentation" style="width: 100%; border-collapse: collapse;" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 24px;">
        <table role="presentation" class="dark-mode-card" style="width: 100%; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="dark-mode-header" style="background-color: #eff6ff; padding: 24px; border-top-left-radius: 16px; border-top-right-radius: 16px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width: 48px; padding-right: 16px;">
                    <div class="dark-mode-logo-bg" padding: 10px; width: 48px; height: 48px; box-sizing: border-box;">
                      <img src="cid:logo@nodebackup.email" alt="Logo" style="height: 48px; width: auto; vertical-align: middle;">
                    </div>
                  </td>
                  <td style="vertical-align: middle;">
                    <h1 class="dark-mode-text-brand" style="font-size: 18px; font-weight: 700; margin: 0; color: #1d4ed8;">Teste de Conexão SMTP</h1>
                    <p class="dark-mode-text-secondary" style="font-size: 14px; margin: 4px 0 0 0; color: #475569;">${clientName}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              <p class="dark-mode-text-secondary" style="font-size: 12px; margin: 0 0 16px 0; color: #64748b; text-align: center;">${formattedDate} às ${formattedTime}</p>
              <div class="dark-mode-test-box" style="padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
                <h2 class="dark-mode-text-brand-title" style="font-size: 16px; font-weight: 700; color: #1d4ed8; margin: 0 0 8px 0;">Tudo Certo!</h2>
                <p class="dark-mode-text-secondary" style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0;">Este é um e-mail de teste para confirmar que suas configurações de notificação SMTP estão funcionando corretamente. Você está pronto para receber alertas sobre seus backups.</p>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 16px 24px; border-top: 1px solid #e2e8f0;" class="dark-mode-border">
              <p class="dark-mode-text-secondary" style="font-size: 12px; color: #475569; margin: 0;">Email enviado por <strong class="dark-mode-text-primary" style="color: #0f172a;">NodeBackup</strong>.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  getSMTPSuggestions(error) {
    const suggestions = [];
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('wrong version number')) {
      suggestions.push('❌ Configuração SSL/TLS incorreta detectada');
      suggestions.push('✅ Para porta 587: DESMARQUE "Usar SSL/TLS" (usa STARTTLS)');
      suggestions.push('✅ Para porta 465: MARQUE "Usar SSL/TLS" (usa SSL direto)');
      suggestions.push('✅ Para porta 25: DESMARQUE "Usar SSL/TLS" (não usa criptografia)');
      return suggestions;
    }

    if (errorMessage.includes('authentication') || errorMessage.includes('login')) {
      suggestions.push('Verifique se o usuário e senha estão corretos');
      suggestions.push('Confirme se a autenticação está habilitada no servidor');
      suggestions.push('Para Gmail: use senhas de app em vez da senha normal');
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('connect')) {
      suggestions.push('Verifique se o host e porta estão corretos');
      suggestions.push('Confirme se o servidor SMTP está acessível');
      suggestions.push('Verifique se não há firewall bloqueando a conexão');
    }

    if (errorMessage.includes('secure') || errorMessage.includes('tls') || errorMessage.includes('ssl')) {
      suggestions.push('Verifique se a configuração SSL/TLS está correta');
      suggestions.push('Porta 587 = TLS (DESMARQUE SSL/TLS)');
      suggestions.push('Porta 465 = SSL (MARQUE SSL/TLS)');
    }

    if (errorMessage.includes('certificate') || errorMessage.includes('cert')) {
      suggestions.push('Problema com certificado SSL detectado');
      suggestions.push('Verifique se o certificado do servidor é válido');
      suggestions.push('Tente com outro servidor SMTP se possível');
    }

    if (suggestions.length === 0) {
      suggestions.push('Verifique todas as configurações SMTP');
      suggestions.push('Teste com diferentes combinações de porta e SSL/TLS');
      suggestions.push('Contate o administrador do servidor de email');
    }

    return suggestions;
  }
}

module.exports = new NotificationService(); 