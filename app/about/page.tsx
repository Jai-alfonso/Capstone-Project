import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Target, Eye, Heart, Scale, Phone, Mail } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

const achievements = [
  { year: "2015", title: "Law Degree", description: "Graduated with honors from University of the Philippines" },
  { year: "2016", title: "Bar Admission", description: "Passed the Philippine Bar Examination" },
  { year: "2018", title: "Private Practice", description: "Established Delgado Law Office" },
  { year: "2020", title: "Specialization", description: "Expanded to include tax and accounting services" },
  { year: "2023", title: "Digital Innovation", description: "Launched comprehensive client portal system" },
]

const coreValues = [
  {
    icon: Scale,
    title: "Integrity",
    description:
      "We uphold the highest ethical standards in all our professional dealings and maintain transparency with our clients.",
  },
  {
    icon: Target,
    title: "Excellence",
    description:
      "We strive for excellence in every case, providing thorough research and meticulous attention to detail.",
  },
  {
    icon: Users,
    title: "Client-Centered",
    description:
      "Our clients' needs and interests are at the heart of everything we do, ensuring personalized legal solutions.",
  },
  {
    icon: Heart,
    title: "Compassion",
    description:
      "We understand that legal matters can be stressful, and we provide compassionate support throughout the process.",
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-navy-900 to-gray-800 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl lg:text-5xl font-bold font-playfair mb-6">About Delgado Law Office</h1>
            <p className="text-xl text-gray-200">
              Dedicated to providing exceptional legal and accounting services with integrity, professionalism, and
              unwavering commitment to our clients' success.
            </p>
          </div>
        </div>
      </section>

      {/* Attorney Profile */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="bg-gradient-to-br from-navy-100 to-gray-100 rounded-2xl p-8 text-center">
                <div className="w-32 h-32 bg-navy-700 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">AD</span>
                </div>
                <h2 className="text-2xl font-bold font-playfair text-navy-900 mb-2">Atty. Alia Jan D. Delgado</h2>
                <p className="text-gray-600 mb-4">Founding Partner & Managing Attorney</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Badge variant="secondary">Civil Law</Badge>
                  <Badge variant="secondary">Criminal Law</Badge>
                  <Badge variant="secondary">Tax Law</Badge>
                  <Badge variant="secondary">Corporate Law</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold font-playfair text-navy-900 mb-4">Professional Background</h3>
                <p className="text-gray-600 mb-4">
                  Atty. Alia Jan D. Delgado is a dedicated legal professional with over 8 years of experience in various
                  areas of law. She graduated with honors from the University of the Philippines College of Law and
                  passed the Philippine Bar Examination in 2016.
                </p>
                <p className="text-gray-600 mb-4">
                  With a passion for justice and client advocacy, Atty. Delgado has successfully handled hundreds of
                  cases ranging from civil litigation to criminal defense, administrative proceedings, and corporate
                  matters.
                </p>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-navy-900 mb-3">Areas of Expertise</h4>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-red-accent" />
                    <span className="text-gray-600">Civil and Commercial Litigation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-red-accent" />
                    <span className="text-gray-600">Criminal Defense</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-red-accent" />
                    <span className="text-gray-600">Tax and Accounting Services</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-red-accent" />
                    <span className="text-gray-600">Corporate and Business Law</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <Card className="border-l-4 border-l-navy-700">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Target className="h-8 w-8 text-navy-700" />
                  <CardTitle className="text-2xl font-playfair text-navy-900">Our Mission</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  To provide exceptional legal and accounting services that protect our clients' interests, uphold
                  justice, and contribute to the betterment of our community. We are committed to delivering
                  personalized solutions with integrity, professionalism, and unwavering dedication.
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-accent">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Eye className="h-8 w-8 text-red-accent" />
                  <CardTitle className="text-2xl font-playfair text-navy-900">Our Vision</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  To be the most trusted and respected law firm in our community, known for our expertise, ethical
                  standards, and commitment to client success. We envision a practice that sets the standard for legal
                  excellence and client service.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold font-playfair text-navy-900 mb-4">Our Core Values</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              The principles that guide our practice and define our commitment to our clients
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {coreValues.map((value, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="mx-auto w-16 h-16 bg-navy-100 rounded-full flex items-center justify-center mb-4">
                    <value.icon className="h-8 w-8 text-navy-700" />
                  </div>
                  <CardTitle className="text-xl font-playfair text-navy-900">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold font-playfair text-navy-900 mb-4">Our Team</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Dedicated professionals committed to providing exceptional legal services
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="text-center">
              <CardHeader>
                <div className="w-24 h-24 bg-navy-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">AD</span>
                </div>
                <CardTitle className="text-xl font-playfair text-navy-900">Atty. Alia Jan D. Delgado</CardTitle>
                <CardDescription>Founding Partner & Managing Attorney</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Lead attorney with expertise in civil, criminal, and corporate law. Committed to providing
                  personalized legal solutions.
                </p>
                <div className="flex justify-center gap-4">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>(+63) 947 109 5792</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>aliajadelgado88@gmail.com</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-24 h-24 bg-gray-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">SM</span>
                </div>
                <CardTitle className="text-xl font-playfair text-navy-900">Shaznay Magnaye</CardTitle>
                <CardDescription>Legal Assistant</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Experienced legal assistant providing comprehensive support for case management, client
                  communications, and administrative operations.
                </p>
                <div className="flex justify-center">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>(+63) 908 898 9503</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
