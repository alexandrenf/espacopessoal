import { Check } from "lucide-react";
import { Button } from "~/components/ui/button";

const plans = [
  {
    name: "Basic",
    price: "$9",
    features: [
      "Up to 5 team members",
      "Basic task management",
      "1GB storage",
      "Email support",
    ],
  },
  {
    name: "Pro",
    price: "$29",
    features: [
      "Up to 20 team members",
      "Advanced task management",
      "10GB storage",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    features: [
      "Unlimited team members",
      "Custom features",
      "Unlimited storage",
      "24/7 dedicated support",
    ],
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="bg-gray-50 py-20">
      <div className="container mx-auto px-4">
        <h2 className="mb-12 text-center text-3xl font-bold">
          Choose Your Plan
        </h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {plans.map((plan, index) => (
            <div
              key={index}
              className="flex flex-col rounded-lg bg-white p-8 shadow-md"
            >
              <h3 className="mb-4 text-2xl font-bold">{plan.name}</h3>
              <p className="mb-6 text-4xl font-bold">
                {plan.price}
                <span className="text-sm font-normal">/month</span>
              </p>
              <ul className="mb-8 flex-grow">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="mb-2 flex items-center">
                    <Check className="mr-2 h-5 w-5 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={index === 1 ? "default" : "outline"}
                className="w-full"
              >
                {index === 2 ? "Contact Sales" : "Get Started"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
