import Link from "next/link";
import { Button } from "~/components/ui/button";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/">
            <Button variant="outline" className="mb-4">
              Voltar para a página inicial
            </Button>
          </Link>
          <h1 className="text-3xl font-bold mb-2">Termos de Serviço</h1>
          <p className="text-gray-500">Última atualização: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-sm">
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Aceitação dos Termos</h2>
            <p className="mb-4">
              Bem-vindo ao Espaço Pessoal. Ao acessar ou usar nosso serviço, você concorda em ficar vinculado a estes Termos de Serviço. Se você não concordar com qualquer parte destes termos, não poderá acessar o serviço.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Descrição do Serviço</h2>
            <p className="mb-4">
              O Espaço Pessoal é uma plataforma que permite aos usuários criar, armazenar e gerenciar notas pessoais e conteúdos digitais. Nosso serviço pode incluir recursos adicionais que serão apresentados aos usuários conforme disponíveis.
            </p>
            <p>
              Reservamo-nos o direito de modificar, suspender ou descontinuar, temporária ou permanentemente, o serviço (ou qualquer parte dele) a qualquer momento, com ou sem aviso prévio.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. Contas de Usuário</h2>
            <p className="mb-4">
              Para utilizar certos recursos do nosso serviço, você precisará criar uma conta. Você é responsável por manter a confidencialidade de sua conta e senha, e por restringir o acesso ao seu computador ou dispositivo.
            </p>
            <p className="mb-4">
              Você concorda em aceitar a responsabilidade por todas as atividades que ocorrem em sua conta. Se você acredita que sua conta foi comprometida, entre em contato conosco imediatamente.
            </p>
            <p>
              Reservamo-nos o direito de recusar serviço, encerrar contas, remover ou editar conteúdo a nosso critério exclusivo.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. Conteúdo do Usuário</h2>
            <p className="mb-4">
              Nosso serviço permite que você publique, armazene e compartilhe conteúdo. Você mantém todos os direitos sobre seu conteúdo, mas concede a nós uma licença para usar, copiar, modificar, adaptar e exibir o conteúdo em conexão com o serviço.
            </p>
            <p className="mb-4">
              Você é o único responsável por todo o conteúdo que você publica, e garante que tem todos os direitos necessários para conceder a licença acima.
            </p>
            <p>
              Reservamo-nos o direito de remover qualquer conteúdo que viole estes termos ou que consideremos questionável.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Conduta do Usuário</h2>
            <p className="mb-4">
              Ao usar nosso serviço, você concorda em não:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Violar quaisquer leis ou regulamentos aplicáveis</li>
              <li>Infringir os direitos de propriedade intelectual ou outros direitos de terceiros</li>
              <li>Transmitir material que seja ilegal, abusivo, difamatório, obsceno ou invasivo da privacidade de outrem</li>
              <li>Transmitir qualquer material que contenha vírus, cavalos de Troia, worms ou outros códigos maliciosos</li>
              <li>Interferir ou interromper a integridade ou o desempenho do serviço</li>
              <li>Tentar obter acesso não autorizado ao serviço, contas de outros usuários ou sistemas de computador</li>
              <li>Coletar ou rastrear informações pessoais de outros usuários</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Propriedade Intelectual</h2>
            <p className="mb-4">
              O serviço e seu conteúdo original, recursos e funcionalidades são e permanecerão propriedade exclusiva do Espaço Pessoal e seus licenciadores. O serviço é protegido por direitos autorais, marcas registradas e outras leis.
            </p>
            <p>
              Nossos logotipos e nomes de produtos são marcas registradas da nossa empresa. Você não deve usá-los sem nossa aprovação prévia por escrito.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Links para Outros Sites</h2>
            <p className="mb-4">
              Nosso serviço pode conter links para sites ou serviços de terceiros que não são de propriedade ou controlados por nós.
            </p>
            <p className="mb-4">
              Não nos responsabilizamos pelo conteúdo ou práticas de terceiros, e recomendamos que você examine cuidadosamente as políticas de privacidade e termos de serviço de quaisquer sites ou serviços de terceiros que você visite.
            </p>
            <p>
              Nossa inclusão de um link não implica endosso, aprovação, recomendação ou afiliação com o site ou serviço.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">8. Limitação de Responsabilidade</h2>
            <p className="mb-4">
              O serviço é fornecido &quot;no estado em que se encontra&quot; e &quot;conforme disponível&quot;. Não garantimos que o serviço seja seguro, livre de erros ou esteja disponível ou operacional em todo o tempo.
            </p>
            <p className="mb-4">
              Em nenhuma circunstância o Espaço Pessoal ou seus fornecedores serão responsáveis por quaisquer danos (incluindo, sem limitação, danos por lucro cessante, perda de dados ou outras perdas intangíveis) decorrentes do uso ou incapacidade de usar o serviço.
            </p>
            <p>
              Nosso serviço pode conter erros técnicos, tipográficos ou outros imprecisões. Reservamo-nos o direito de corrigir quaisquer erros, imprecisões ou omissões sem aviso prévio.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">9. Alterações aos Termos</h2>
            <p className="mb-4">
              Podemos atualizar estes termos periodicamente. Notificaremos você sobre quaisquer alterações publicando a nova versão destes termos nesta página.
            </p>
            <p>
              Recomendamos que você revise estes termos periodicamente para quaisquer alterações. O uso contínuo de nosso serviço após a publicação de quaisquer alterações constitui sua aceitação destas alterações.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">10. Contato</h2>
            <p>
              Se você tiver dúvidas sobre estes termos, entre em contato conosco pelo e-mail: contato@espacopessoal.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
