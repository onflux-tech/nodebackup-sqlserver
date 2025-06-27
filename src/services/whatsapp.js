const https = require('https');
const http = require('http');
const logger = require('../utils/logger');
const { formatFileSize, formatDuration } = require('../utils/formatters');

class WhatsAppService {
  constructor() {
    this.config = null;
  }

  async configure(whatsappConfig) {
    try {
      let baseUrl = whatsappConfig.baseUrl.trim().replace(/\/$/, '');

      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = `http://${baseUrl}`;
      }

      this.config = {
        baseUrl: baseUrl,
        token: whatsappConfig.token
      };

      return true;
    } catch (error) {
      logger.error('❌ Erro ao configurar WhatsApp API', error);
      throw error;
    }
  }

  async testConnection(whatsappConfig) {
    try {
      let baseUrl = whatsappConfig.baseUrl.trim().replace(/\/$/, '');

      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = `http://${baseUrl}`;
      }

      const config = {
        baseUrl: baseUrl,
        token: whatsappConfig.token
      };

      const response = await this.makeRequest(config, '/session/status', 'GET');

      const isConnected = response && (
        response.connected === true ||
        response.status === 'connected' ||
        response.state === 'CONNECTED' ||
        response.success === true ||
        (response.data && response.data.connected === true)
      );

      if (isConnected) {
        return { success: true, message: 'Conexão WhatsApp estabelecida com sucesso' };
      } else {
        logger.warn('⚠️ Status da sessão WhatsApp:', JSON.stringify(response, null, 2));

        return {
          success: false,
          message: 'API WuzAPI acessível, mas sessão WhatsApp pode não estar conectada',
          suggestions: [
            '✅ A API WuzAPI está respondendo corretamente',
            '❓ Verifique se o WhatsApp está conectado nesta sessão',
            '🔧 Tente fazer um teste de mensagem para confirmar',
            '📱 Se necessário, reconecte o WhatsApp via QR Code ou pareamento'
          ]
        };
      }
    } catch (error) {
      logger.error('❌ Falha no teste de conexão WhatsApp', {
        error: error.message,
        baseUrl: whatsappConfig.baseUrl,
        token: whatsappConfig.token ? 'Token fornecido' : 'Token não fornecido'
      });

      const suggestions = this.getWhatsAppSuggestions(error.code || error.message);
      let userFriendlyMessage = 'Falha na conexão com WhatsApp API';

      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes('econnrefused') || errorMessage.includes('connect')) {
        userFriendlyMessage = 'Não foi possível conectar ao servidor WuzAPI - verifique se está rodando';
      } else if (errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
        userFriendlyMessage = 'Token de autenticação inválido - verifique o token do usuário';
      } else if (errorMessage.includes('timeout')) {
        userFriendlyMessage = 'Timeout na conexão com WuzAPI';
      } else if (errorMessage.includes('invalid url') || errorMessage.includes('url')) {
        userFriendlyMessage = 'URL da API inválida';
      } else if (errorMessage.includes('404')) {
        userFriendlyMessage = 'Endpoint não encontrado - verifique a URL da API';
      }

      return {
        success: false,
        message: userFriendlyMessage,
        suggestions: suggestions
      };
    }
  }

  async sendMessage(phoneNumber, message, config = null) {
    try {
      const whatsappConfig = config || this.config;

      if (!whatsappConfig) {
        throw new Error('WhatsApp não configurado');
      }

      const body = {
        Phone: phoneNumber.replace(/\D/g, ''),
        Body: message
      };

      const response = await this.makeRequest(whatsappConfig, '/chat/send/text', 'POST', body);

      if (response && response.success !== false) {
        return { success: true, messageId: response.id };
      } else {
        throw new Error(response.error || 'Falha ao enviar mensagem');
      }
    } catch (error) {
      logger.error('❌ Erro ao enviar mensagem WhatsApp', error);
      throw error;
    }
  }

  async sendTestMessage(phoneNumber, clientName) {
    try {
      if (!this.config) {
        throw new Error('WhatsApp não configurado');
      }

      const timestamp = new Date().toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const message = `🔔 *Teste de Notificação WhatsApp*\n\n✅ *Cliente:* ${clientName}\n📅 *Data/Hora:* ${timestamp}\n🤖 *Sistema:* NodeBackup SQL Server\n\nSe você recebeu esta mensagem, as notificações WhatsApp estão funcionando corretamente!`;

      return await this.sendMessage(phoneNumber, message);
    } catch (error) {
      logger.error('❌ Erro ao enviar mensagem de teste WhatsApp', error);
      throw error;
    }
  }

  async sendSuccessNotification(backupData, recipients, clientName) {
    try {
      if (!this.config) {
        logger.warn('⚠️ WhatsApp não configurado - pulando notificação');
        return;
      }

      const timestamp = new Date(backupData.timestamp).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const databaseList = backupData.databases.slice(0, 3).join(', ') +
        (backupData.databases.length > 3 ? ` (+${backupData.databases.length - 3})` : '');

      const message = `✅ *Backup Concluído com Sucesso*\n\n🏢 *Cliente:* ${clientName}\n📅 *Data/Hora:* ${timestamp}\n💾 *Bancos:* ${databaseList}\n📦 *Tamanho:* ${formatFileSize(backupData.totalSize)}\n⏱️ *Duração:* ${formatDuration(backupData.duration)}\n📁 *Arquivos:* ${backupData.files.length}\n\n🎯 Backup realizado automaticamente pelo NodeBackup SQL Server`;

      const promises = recipients.map(async (phone) => {
        try {
          await this.sendMessage(phone, message);
          logger.info(`📱 Notificação de sucesso enviada para ${phone}`);
        } catch (error) {
          logger.error(`❌ Erro ao enviar notificação para ${phone}`, error);
        }
      });

      await Promise.all(promises);
    } catch (error) {
      logger.error('❌ Erro ao enviar notificações de sucesso WhatsApp', error);
    }
  }

  async sendFailureNotification(errorData, recipients, clientName) {
    try {
      if (!this.config) {
        logger.warn('⚠️ WhatsApp não configurado - pulando notificação');
        return;
      }

      const timestamp = new Date(errorData.timestamp).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const databaseList = errorData.databases.slice(0, 3).join(', ') +
        (errorData.databases.length > 3 ? ` (+${errorData.databases.length - 3})` : '');

      const message = `❌ *Falha no Backup*\n\n🏢 *Cliente:* ${clientName}\n📅 *Data/Hora:* ${timestamp}\n💾 *Bancos Afetados:* ${databaseList}\n\n🔍 *Erro:* ${errorData.error}\n\n💡 *O que fazer:*\n• Verificar configurações SQL Server\n• Confirmar espaço em disco\n• Consultar logs da aplicação\n\n⚠️ Ação necessária para corrigir o problema`;

      const promises = recipients.map(async (phone) => {
        try {
          await this.sendMessage(phone, message);
          logger.info(`📱 Notificação de falha enviada para ${phone}`);
        } catch (error) {
          logger.error(`❌ Erro ao enviar notificação para ${phone}`, error);
        }
      });

      await Promise.all(promises);
    } catch (error) {
      logger.error('❌ Erro ao enviar notificações de falha WhatsApp', error);
    }
  }

  makeRequest(config, endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      try {
        const url = new URL(config.baseUrl + endpoint);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;

        const options = {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname + url.search,
          method: method,
          headers: {
            'token': config.token,
            'Content-Type': 'application/json'
          }
        };

        if (body && method !== 'GET') {
          const bodyString = JSON.stringify(body);
          options.headers['Content-Length'] = Buffer.byteLength(bodyString);
        }

        const req = client.request(options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                const response = data ? JSON.parse(data) : {};
                resolve(response);
              } else {
                reject(new Error(`HTTP ${res.statusCode}: ${data}`));
              }
            } catch (parseError) {
              reject(new Error(`Erro ao processar resposta: ${parseError.message}`));
            }
          });
        });

        req.on('error', (error) => {
          reject(error);
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Timeout na requisição'));
        });

        req.setTimeout(30000);

        if (body && method !== 'GET') {
          req.write(JSON.stringify(body));
        }

        req.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  getWhatsAppSuggestions(errorType) {
    const suggestions = [];

    if (errorType === 'session_disconnected') {
      suggestions.push('❌ WhatsApp não está conectado no WuzAPI');
      suggestions.push('✅ Acesse o WuzAPI e conecte sua conta WhatsApp');
      suggestions.push('✅ Use o QR Code ou pareamento por telefone');
      suggestions.push('✅ Certifique-se que a sessão está ativa');
      return suggestions;
    }

    if (typeof errorType === 'string') {
      const errorMessage = errorType.toLowerCase();

      if (errorMessage.includes('econnrefused') || errorMessage.includes('connect')) {
        suggestions.push('Verifique se o WuzAPI está rodando');
        suggestions.push('Confirme se a URL está correta (ex: http://localhost:8080)');
        suggestions.push('Verifique se não há firewall bloqueando a conexão');
      }

      if (errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
        suggestions.push('Verifique se o token está correto');
        suggestions.push('Confirme se o token foi configurado no WuzAPI');
        suggestions.push('Teste o token diretamente na API do WuzAPI');
      }

      if (errorMessage.includes('timeout')) {
        suggestions.push('Verifique se o servidor WuzAPI está respondendo');
        suggestions.push('Teste a conectividade de rede');
        suggestions.push('Considere aumentar o timeout se necessário');
      }

      if (errorMessage.includes('invalid url') || errorMessage.includes('url')) {
        suggestions.push('Verifique se a URL está no formato correto');
        suggestions.push('Para HTTP: http://localhost:8080 ou http://192.168.1.100:8080');
        suggestions.push('Para HTTPS: https://api.exemplo.com ou https://meudominio.com');
        suggestions.push('Não inclua barras no final da URL');
        suggestions.push('Se não especificar protocolo, HTTP será usado por padrão');
      }
    }

    if (suggestions.length === 0) {
      suggestions.push('Verifique todas as configurações do WuzAPI');
      suggestions.push('Confirme se o WhatsApp está conectado');
      suggestions.push('Teste a conexão manualmente na interface do WuzAPI');
    }

    return suggestions;
  }

  async checkPhoneNumber(phoneNumber) {
    try {
      if (!this.config) {
        throw new Error('WhatsApp não configurado');
      }

      const cleanPhone = phoneNumber.replace(/\D/g, '');

      const response = await this.makeRequest(this.config, '/user/check', 'POST', { Phone: [cleanPhone] });

      if (response && response.success && response.data && Array.isArray(response.data.Users) && response.data.Users.length > 0) {
        const user = response.data.Users[0];
        if (user.IsInWhatsapp === true) {
          return { isValid: true, jid: user.JID };
        }
      }

      logger.warn(`Número ${cleanPhone} não encontrado no WhatsApp ou resposta inesperada:`, response);
      return { isValid: false, reason: 'O número não parece ser um usuário válido do WhatsApp.' };

    } catch (error) {
      logger.error(`❌ Erro ao verificar número de telefone no WhatsApp: ${phoneNumber}`, error);
      return { isValid: false, reason: `Erro de comunicação com a WuzAPI: ${error.message}` };
    }
  }
}

module.exports = new WhatsAppService(); 