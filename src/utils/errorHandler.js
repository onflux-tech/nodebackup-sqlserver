const logger = require('./logger');

/**
 * @param {Error} error
 * @returns {Object}
 */
function translateDatabaseError(error) {
  const errorMessage = error.message || error.toString();

  const errorMappings = {
    'Failed to connect to localhost:1433': {
      friendly: 'Não foi possível conectar ao SQL Server. Verifique se o serviço está em execução.',
      details: 'O SQL Server pode estar desligado ou a porta 1433 pode estar bloqueada.',
      suggestions: [
        'Verifique se o SQL Server está instalado e em execução',
        'Confirme se o nome do servidor está correto (ex: localhost\\SQLEXPRESS)',
        'Verifique se a autenticação SQL está habilitada',
        'Confirme se o firewall não está bloqueando a porta'
      ]
    },
    'Could not connect (sequence)': {
      friendly: 'Falha na sequência de conexão com o banco de dados.',
      details: 'O servidor não respondeu à tentativa de conexão.',
      suggestions: [
        'Verifique se o nome do servidor está correto',
        'Para instâncias nomeadas, use o formato: SERVIDOR\\INSTANCIA',
        'Certifique-se de que o SQL Server Browser está em execução'
      ]
    },
    'Login failed': {
      friendly: 'Falha na autenticação. Usuário ou senha incorretos.',
      details: 'As credenciais fornecidas foram rejeitadas pelo servidor.',
      suggestions: [
        'Verifique se o usuário e senha estão corretos',
        'Confirme se o usuário tem permissão para acessar o servidor',
        'Verifique se a autenticação SQL está habilitada no servidor'
      ]
    },
    'ECONNREFUSED': {
      friendly: 'Conexão recusada pelo servidor.',
      details: 'O servidor recusou ativamente a conexão.',
      suggestions: [
        'Verifique se o SQL Server está em execução',
        'Confirme se a porta está correta',
        'Verifique as configurações de firewall'
      ]
    },
    'ETIMEDOUT': {
      friendly: 'Tempo limite de conexão excedido.',
      details: 'O servidor não respondeu dentro do tempo esperado.',
      suggestions: [
        'Verifique a conectividade de rede',
        'Confirme se o servidor está acessível',
        'Verifique se há problemas de latência na rede'
      ]
    },
    'ENOTFOUND': {
      friendly: 'Servidor não encontrado.',
      details: 'O nome do servidor não pôde ser resolvido.',
      suggestions: [
        'Verifique se o nome do servidor está correto',
        'Confirme se o servidor está na rede',
        'Tente usar o endereço IP ao invés do nome'
      ]
    },
    'ESOCKET': {
      friendly: 'Erro de socket durante a conexão.',
      details: 'A conexão foi interrompida inesperadamente. Pode ser um problema de certificado SSL/TLS.',
      suggestions: [
        'Se estiver usando Windows Server 2012/2016, pode ser um problema com certificados SHA1',
        'Verifique se o SQL Server tem um certificado válido',
        'Tente desabilitar a criptografia temporariamente para teste',
        'Verifique os logs do SQL Server para mais detalhes'
      ]
    },
    'self signed certificate': {
      friendly: 'Certificado autoassinado detectado.',
      details: 'O SQL Server está usando um certificado autoassinado que pode não ser confiável.',
      suggestions: [
        'A configuração já está definida para confiar em certificados autoassinados',
        'Considere instalar um certificado válido no SQL Server',
        'Para ambientes de produção, use certificados emitidos por uma CA confiável'
      ]
    },
    'socket hang up': {
      friendly: 'Conexão interrompida durante handshake SSL/TLS.',
      details: 'Problema comum em Windows Server 2012/2016 com certificados antigos.',
      suggestions: [
        'O SQL Server pode estar usando um certificado SHA1 incompatível',
        'Tente atualizar o certificado do SQL Server',
        'Verifique se o SQL Server suporta TLS 1.2',
        'Como solução temporária, a aplicação já está configurada para aceitar certificados antigos'
      ]
    },
    'ConnectionError': {
      friendly: 'Erro geral de conexão com o banco de dados.',
      details: 'Não foi possível estabelecer uma conexão com o SQL Server.',
      suggestions: [
        'Verifique todos os parâmetros de conexão',
        'Teste a conexão usando SQL Server Management Studio',
        'Verifique os logs do Windows Event Viewer',
        'Confirme se não há políticas de segurança bloqueando a conexão'
      ]
    }
  };

  for (const [pattern, info] of Object.entries(errorMappings)) {
    if (errorMessage.includes(pattern)) {
      return {
        friendly: info.friendly,
        details: info.details,
        suggestions: info.suggestions,
        technical: errorMessage
      };
    }
  }

  return {
    friendly: 'Erro ao conectar com o banco de dados.',
    details: 'Ocorreu um erro não identificado na conexão.',
    suggestions: [
      'Verifique todas as configurações de conexão',
      'Confirme se o SQL Server está acessível',
      'Consulte os logs para mais detalhes'
    ],
    technical: errorMessage
  };
}

/**
 * @param {Error} error
 * @returns {Object}
 */
function translateFTPError(error) {
  const errorMessage = error.message || error.toString();

  const ftpErrorMappings = {
    '553 Could not create file': {
      friendly: 'Não foi possível criar o arquivo no servidor FTP.',
      details: 'O servidor FTP rejeitou a criação do arquivo. Isso pode ser devido a permissões insuficientes ou diretório inexistente.',
      suggestions: [
        'Verifique se o usuário FTP tem permissão de escrita no diretório',
        'Confirme se o diretório remoto existe e está correto',
        'Verifique se há espaço suficiente no servidor FTP',
        'Tente usar um diretório diferente ou o diretório raiz (/)'
      ]
    },
    '530 Login authentication failed': {
      friendly: 'Falha na autenticação FTP.',
      details: 'Usuário ou senha incorretos para o servidor FTP.',
      suggestions: [
        'Verifique se o usuário e senha FTP estão corretos',
        'Confirme se o usuário está ativo no servidor FTP',
        'Verifique se há restrições de IP para o usuário'
      ]
    },
    '550 No such file or directory': {
      friendly: 'Diretório não encontrado no servidor FTP.',
      details: 'O diretório especificado não existe no servidor.',
      suggestions: [
        'Verifique se o caminho do diretório está correto',
        'Use "/" para o diretório raiz',
        'Crie o diretório no servidor FTP primeiro'
      ]
    },
    'ECONNREFUSED': {
      friendly: 'Conexão FTP recusada.',
      details: 'O servidor FTP recusou a conexão.',
      suggestions: [
        'Verifique se o servidor FTP está em execução',
        'Confirme se o endereço do servidor está correto',
        'Verifique se a porta FTP está correta (padrão: 21)',
        'Confirme se o firewall não está bloqueando a conexão'
      ]
    },
    'ETIMEDOUT': {
      friendly: 'Tempo limite de conexão FTP excedido.',
      details: 'O servidor FTP não respondeu dentro do tempo esperado.',
      suggestions: [
        'Verifique a conectividade com o servidor',
        'Confirme se o servidor FTP está acessível',
        'Verifique se há problemas de rede ou firewall'
      ]
    },
    'ENOTFOUND': {
      friendly: 'Servidor FTP não encontrado.',
      details: 'O endereço do servidor FTP não pôde ser resolvido.',
      suggestions: [
        'Verifique se o endereço do servidor está correto',
        'Tente usar o endereço IP ao invés do domínio',
        'Verifique sua conexão com a internet'
      ]
    },
    '421 Service not available': {
      friendly: 'Serviço FTP temporariamente indisponível.',
      details: 'O servidor FTP está sobrecarregado ou em manutenção.',
      suggestions: [
        'Tente novamente em alguns minutos',
        'Verifique o status do servidor com o administrador',
        'Considere usar um horário com menos tráfego'
      ]
    }
  };

  for (const [pattern, info] of Object.entries(ftpErrorMappings)) {
    if (errorMessage.includes(pattern)) {
      return {
        friendly: info.friendly,
        details: info.details,
        suggestions: info.suggestions,
        technical: errorMessage
      };
    }
  }

  return {
    friendly: 'Erro na operação FTP.',
    details: 'Ocorreu um erro não identificado durante a operação FTP.',
    suggestions: [
      'Verifique todas as configurações de FTP',
      'Confirme se o servidor FTP está acessível',
      'Verifique as credenciais e permissões',
      'Consulte os logs para mais detalhes'
    ],
    technical: errorMessage
  };
}

/**
 * @param {Error} error
 * @param {string} context
 */
function logFriendlyError(error, context) {
  const errorInfo = translateDatabaseError(error);

  logger.error(`${context} - ${errorInfo.friendly}`);
  logger.info(`Detalhes: ${errorInfo.details}`);
  logger.info('Sugestões para resolver o problema:');
  errorInfo.suggestions.forEach((suggestion, index) => {
    logger.info(`  ${index + 1}. ${suggestion}`);
  });

  if (process.env.DEBUG === 'true') {
    logger.debug(`\nDetalhes técnicos: ${errorInfo.technical}`);
  }
}

/**
 * @param {Error} error
 * @param {string} context
 */
function logFriendlyFTPError(error, context) {
  const errorInfo = translateFTPError(error);

  logger.error(`${context} - ${errorInfo.friendly}`);
  logger.info(`Detalhes: ${errorInfo.details}`);
  logger.info('Sugestões para resolver o problema:');
  errorInfo.suggestions.forEach((suggestion, index) => {
    logger.info(`  ${index + 1}. ${suggestion}`);
  });

  if (process.env.DEBUG === 'true') {
    logger.debug(`\nDetalhes técnicos: ${errorInfo.technical}`);
  }
}

module.exports = {
  translateDatabaseError,
  logFriendlyError,
  translateFTPError,
  logFriendlyFTPError
}; 