import { Button } from "~/components/ui/button"

export default function Hero() {
  return (
    <section className="bg-gradient-to-r from-primary to-primary-dark text-white py-20">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">Streamline Your Workflow</h1>
        <p className="text-xl mb-8 max-w-2xl mx-auto">
          Boost productivity and simplify collaboration with our all-in-one project management solution.
        </p>
        <Button size="lg" variant="secondary">
          Start Your Free Trial
        </Button>
      </div>
    </section>
  )
}

