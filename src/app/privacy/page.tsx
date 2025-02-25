import Link from "next/link";
import { Button } from "~/components/ui/button";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/">
            <Button variant="outline" className="mb-4">
              Voltar para a página inicial
            </Button>
          </Link>
          <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
          <p className="text-gray-500">Última atualização: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-sm">
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Introdução</h2>
            <p className="mb-4">
              Bem-vindo à Política de Privacidade do Espaço Pessoal. Esta política descreve como coletamos, usamos, processamos e compartilhamos suas informações quando você utiliza nosso serviço.
            </p>
            <p>
              Ao utilizar o Espaço Pessoal, você concorda com a coleta e uso de informações de acordo com esta política. Recomendamos que você leia este documento cuidadosamente para entender nossas práticas.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Informações que Coletamos</h2>
            <p className="mb-4">
              <strong>Informações de Conta:</strong> Quando você se registra, coletamos seu nome, endereço de e-mail e outras informações necessárias para criar e gerenciar sua conta.
            </p>
            <p className="mb-4">
              <strong>Conteúdo do Usuário:</strong> Coletamos e armazenamos as notas e outros conteúdos que você cria, carrega ou armazena em nosso serviço.
            </p>
            <p className="mb-4">
              <strong>Informações de Uso:</strong> Coletamos informações sobre como você interage com nosso serviço, incluindo acessos, cliques, e outras ações realizadas no aplicativo.
            </p>
            <p>
              <strong>Informações do Dispositivo:</strong> Podemos coletar informações sobre o dispositivo que você usa para acessar nosso serviço, incluindo modelo de hardware, sistema operacional, e identificadores únicos de dispositivo.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. Como Usamos Suas Informações</h2>
            <p className="mb-4">Utilizamos as informações coletadas para:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Fornecer, manter e melhorar nosso serviço</li>
              <li>Processar e completar transações</li>
              <li>Enviar informações técnicas, atualizações e mensagens de suporte</li>
              <li>Monitorar o uso do serviço para desenvolvimento de novos recursos</li>
              <li>Detectar, prevenir e resolver problemas técnicos e de segurança</li>
              <li>Cumprir obrigações legais</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. Compartilhamento de Informações</h2>
            <p className="mb-4">
              Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros, exceto nas seguintes circunstâncias:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Com seu consentimento</li>
              <li>Para cumprir obrigações legais</li>
              <li>Para proteger direitos, propriedade ou segurança</li>
              <li>Com prestadores de serviços que nos auxiliam na operação do serviço</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Segurança de Dados</h2>
            <p className="mb-4">
              A segurança de suas informações é importante para nós. Implementamos medidas técnicas e organizacionais apropriadas para proteger suas informações pessoais contra acesso não autorizado, alteração, divulgação ou destruição.
            </p>
            <p>
              No entanto, nenhum método de transmissão pela Internet ou método de armazenamento eletrônico é 100% seguro. Portanto, não podemos garantir sua segurança absoluta.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Seus Direitos</h2>
            <p className="mb-4">
              Dependendo da sua localização, você pode ter certos direitos relacionados às suas informações pessoais, incluindo:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Acessar as informações pessoais que temos sobre você</li>
              <li>Corrigir informações imprecisas ou incompletas</li>
              <li>Excluir suas informações pessoais</li>
              <li>Restringir ou opor-se ao processamento de suas informações</li>
              <li>Solicitar a portabilidade de suas informações</li>
              <li>Retirar seu consentimento a qualquer momento</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Alterações a Esta Política</h2>
            <p className="mb-4">
              Podemos atualizar nossa Política de Privacidade periodicamente. Notificaremos você sobre quaisquer alterações publicando a nova Política de Privacidade nesta página e, se as alterações forem significativas, enviaremos uma notificação por e-mail.
            </p>
            <p>
              Recomendamos que você revise esta Política de Privacidade periodicamente para quaisquer alterações.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">8. Contato</h2>
            <p>
              Se você tiver dúvidas sobre esta Política de Privacidade, entre em contato conosco pelo e-mail: contato@espacopessoal.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}