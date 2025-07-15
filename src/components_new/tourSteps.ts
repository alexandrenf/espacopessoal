import type { DriveStep } from "driver.js";

export const tourSteps: DriveStep[] = [
  // FASE 1: Boas-vindas e Visão Geral (Dashboard /notas)
  {
    element: "body",
    popover: {
      title: "🎉 Bem-vindo ao Espaço Pessoal!",
      description: `
        <div class="tour-intro">
          <p>Você está prestes a descobrir uma plataforma completa para criar, organizar e colaborar em documentos.</p>
          <div class="tour-highlights">
            <div class="highlight-item">📝 Editor colaborativo em tempo real</div>
            <div class="highlight-item">📁 Organização inteligente por cadernos</div>
            <div class="highlight-item">🔒 Controle total de privacidade</div>
            <div class="highlight-item">🚀 Recursos avançados de produtividade</div>
          </div>
          <div class="tour-tip">
            <strong>💡 Dica:</strong> Use as setas do teclado para navegar ou clique nos botões!
          </div>
          <p class="tour-duration">⏱️ Este tour leva cerca de 3-5 minutos</p>
        </div>
      `,
      side: "over",
      align: "center",
    },
  },

  {
    element: "[data-tour='notebooks-dashboard']",
    popover: {
      title: "📚 Dashboard de Cadernos",
      description: `
        <p>Este é o seu centro de comando! Aqui você pode ver todos os seus cadernos organizados por tipo de acesso:</p>
        <ul class="tour-list">
          <li><span class="badge-public">Público</span> - Qualquer pessoa pode ver e editar</li>
          <li><span class="badge-private">Privado</span> - Apenas você tem acesso</li>
          <li><span class="badge-protected">Protegido</span> - Acesso com senha</li>
        </ul>
        <p>Cada caderno mostra quantos documentos contém e quando foi atualizado pela última vez.</p>
      `,
      side: "left",
      align: "start",
    },
  },

  {
    element: "[data-tour='search-bar']",
    popover: {
      title: "🔍 Busca Inteligente",
      description: `
        <p>Encontre rapidamente qualquer caderno digitando o nome ou parte dele.</p>
        <div class="tour-tip">
          <strong>💡 Dica:</strong> A busca funciona em tempo real e é sensível a acentos!
        </div>
      `,
      side: "bottom",
      align: "center",
    },
  },

  // Only show create notebook step if user is authenticated and element exists
  {
    element: "[data-tour='create-notebook']",
    popover: {
      title: "➕ Criar Novo Caderno",
      description: `
        <p>Clique aqui para criar um novo caderno. Você pode:</p>
        <ul class="tour-list">
          <li>Escolher um nome e URL personalizados</li>
          <li>Definir o nível de privacidade</li>
          <li>Adicionar uma descrição</li>
          <li>Configurar proteção por senha</li>
        </ul>
        <div class="tour-tip">
          <strong>🎯 Próximo:</strong> Vamos explorar essas opções!
        </div>
      `,
      side: "left",
      align: "center",
    },
  },

  // FASE 2: Gestão de Documentos (Simulação da página de caderno)
  {
    element: "body",
    popover: {
      title: "📁 Dentro de um Caderno",
      description: `
        <div class="tour-section">
          <p>Agora imagine que você está dentro de um caderno. Aqui você encontrará:</p>
          <div class="tour-features">
            <div class="feature-item">
              <span class="feature-icon">📄</span>
              <span>Documentos organizados em hierarquia</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">📂</span>
              <span>Pastas para melhor organização</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🎯</span>
              <span>Arrastar e soltar para reorganizar</span>
            </div>
          </div>
        </div>
      `,
      side: "over",
      align: "center",
    },
  },

  // FASE 3: Editor Colaborativo (Simulação da página do editor)
  {
    element: "body",
    popover: {
      title: "✨ Editor Colaborativo",
      description: `
        <div class="tour-editor-intro">
          <p>O coração do Espaço Pessoal é nosso editor colaborativo!</p>
          <div class="editor-features">
            <div class="editor-feature">
              <strong>🤝 Colaboração em Tempo Real</strong>
              <p>Veja as edições de outros usuários instantaneamente</p>
            </div>
            <div class="editor-feature">
              <strong>🎨 Formatação Rica</strong>
              <p>Toolbar completa com todas as opções de formatação</p>
            </div>
            <div class="editor-feature">
              <strong>📊 Status de Conexão</strong>
              <p>Sempre saiba se está sincronizado</p>
            </div>
          </div>
        </div>
      `,
      side: "over",
      align: "center",
    },
  },

  // FASE 4: Recursos Avançados
  {
    element: "body",
    popover: {
      title: "🚀 Recursos Avançados",
      description: `
        <div class="tour-advanced">
          <p>O Espaço Pessoal oferece recursos únicos para aumentar sua produtividade:</p>
          <div class="advanced-grid">
            <div class="advanced-item">
              <span class="advanced-icon">📖</span>
              <strong>Dicionário Personalizado</strong>
              <p>Substitua automaticamente texto enquanto digita</p>
            </div>
            <div class="advanced-item">
              <span class="advanced-icon">✅</span>
              <strong>Verificação Ortográfica</strong>
              <p>Correção inteligente em português</p>
            </div>
            <div class="advanced-item">
              <span class="advanced-icon">📏</span>
              <strong>Régua Interativa</strong>
              <p>Ajuste margens visualmente</p>
            </div>
            <div class="advanced-item">
              <span class="advanced-icon">🔄</span>
              <strong>Exportação Múltipla</strong>
              <p>PDF, HTML, JSON e texto puro</p>
            </div>
          </div>
        </div>
      `,
      side: "over",
      align: "center",
    },
  },

  // FASE 5: Compartilhamento e Segurança
  {
    element: "body",
    popover: {
      title: "🔒 Segurança e Compartilhamento",
      description: `
        <div class="tour-security">
          <h4>Controle Total de Acesso</h4>
          <div class="security-features">
            <div class="security-item">
              <span class="security-icon">🌐</span>
              <div>
                <strong>Cadernos Públicos</strong>
                <p>Compartilhe com o mundo inteiro</p>
              </div>
            </div>
            <div class="security-item">
              <span class="security-icon">🔐</span>
              <div>
                <strong>Proteção por Senha</strong>
                <p>Acesso controlado com segurança</p>
              </div>
            </div>
            <div class="security-item">
              <span class="security-icon">👤</span>
              <div>
                <strong>Cadernos Privados</strong>
                <p>Apenas você tem acesso</p>
              </div>
            </div>
          </div>
          <div class="tour-tip">
            <strong>🛡️ Segurança:</strong> Todas as senhas são criptografadas e as sessões são seguras!
          </div>
        </div>
      `,
      side: "over",
      align: "center",
    },
  },

  // FASE 6: Templates e Produtividade
  {
    element: "body",
    popover: {
      title: "📋 Templates e Produtividade",
      description: `
        <div class="tour-templates">
          <p>Comece rapidamente com nossos templates profissionais:</p>
          <div class="templates-grid">
            <div class="template-item">📄 Documento em Branco</div>
            <div class="template-item">💼 Proposta de Projeto</div>
            <div class="template-item">💻 Proposta de Software</div>
            <div class="template-item">✉️ Carta Comercial</div>
            <div class="template-item">📝 Carta de Apresentação</div>
            <div class="template-item">👔 Currículo</div>
          </div>
          <div class="tour-tip">
            <strong>⚡ Dica:</strong> Todos os templates são totalmente personalizáveis!
          </div>
        </div>
      `,
      side: "over",
      align: "center",
    },
  },

  // FASE 7: Encerramento e Próximos Passos
  {
    element: "body",
    popover: {
      title: "🎯 Pronto para Começar!",
      description: `
        <div class="tour-conclusion">
          <h4>Parabéns! Você descobriu o Espaço Pessoal! 🎉</h4>
          
          <div class="next-steps">
            <h5>Próximos Passos:</h5>
            <div class="step-item">
              <span class="step-number">1</span>
              <span>Crie seu primeiro caderno</span>
            </div>
            <div class="step-item">
              <span class="step-number">2</span>
              <span>Adicione alguns documentos</span>
            </div>
            <div class="step-item">
              <span class="step-number">3</span>
              <span>Experimente a colaboração em tempo real</span>
            </div>
            <div class="step-item">
              <span class="step-number">4</span>
              <span>Explore os recursos avançados</span>
            </div>
          </div>

          <div class="tour-support">
            <p><strong>Precisa de ajuda?</strong></p>
            <p>Você pode refazer este tour a qualquer momento clicando no botão flutuante no canto da tela.</p>
          </div>

          <div class="tour-cta">
            <strong>🚀 Vamos começar a criar algo incrível!</strong>
          </div>
        </div>
      `,
      side: "over",
      align: "center",
    },
  },
];

export function getFilteredTourSteps(isAuthenticated: boolean): DriveStep[] {
  return tourSteps.filter(step => {
    // Always include body-level steps
    if (step.element === "body") return true;
    
    // Check if step requires authentication
    if (typeof step.element === "string") {
      // Steps that are only available to authenticated users
      const authRequiredElements = [
        "[data-tour='create-notebook']"
      ];
      
      if (authRequiredElements.includes(step.element)) {
        return isAuthenticated;
      }
    }
    
    return true;
  });
}
// Function to get tour steps filtered by authentication status
