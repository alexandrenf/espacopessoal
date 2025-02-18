import Image from "next/image"

const testimonials = [
  {
    quote: "StreamLine has revolutionized our team's workflow. It's intuitive and powerful!",
    author: "Jane Doe",
    role: "Product Manager, TechCorp",
    avatar: "/avatar1.jpg",
  },
  {
    quote: "We've seen a 30% increase in productivity since adopting StreamLine. Highly recommended!",
    author: "John Smith",
    role: "CEO, InnovateCo",
    avatar: "/avatar2.jpg",
  },
  {
    quote: "The automation features in StreamLine have saved us countless hours. It's a game-changer!",
    author: "Emily Brown",
    role: "Team Lead, AgileStudio",
    avatar: "/avatar3.jpg",
  },
]

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">What Our Customers Say</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-gray-50 p-6 rounded-lg shadow-md">
              <p className="text-gray-600 mb-4">"{testimonial.quote}"</p>
              <div className="flex items-center">
                <Image
                  src={testimonial.avatar || "/placeholder.svg"}
                  alt={testimonial.author}
                  width={48}
                  height={48}
                  className="rounded-full mr-4"
                />
                <div>
                  <p className="font-semibold">{testimonial.author}</p>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

