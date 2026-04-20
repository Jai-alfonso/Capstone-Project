import {
  FileText,
  Scale,
  Shield,
  Building,
  Calculator,
  Gavel,
  User,
  Clipboard,
  BookOpen,
  ClipboardCheck,
  Receipt,
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { AccountRequiredModal } from "@/components/account-required-modal"
import { ServiceModal } from "@/components/service-modal"

const services = [
  {
    title: "Consultations & Documentation",
    description:
      "Our consultation and documentation services provide comprehensive legal assistance for all your documentation needs, from simple notarization to complex contract preparation.",
    details:
      "We offer legal consultations (online or in-person), out-of-court settlements and collections, document notarization and preparation, and preparation of contracts, affidavits, wills, and legal opinions.",
    icon: Gavel,
    iconPosition: "left",
    modalDescription:
      "Our consultation and documentation services provide comprehensive legal assistance for all your documentation needs, from simple notarization to complex contract preparation.",
    modalServices: [
      "Legal consultations (online or in-person)",
      "Out-of-court settlements and collections",
      "Document notarization and preparation",
      "Preparation of contracts, affidavits, wills, and legal opinions",
    ],
    modalNote: "Consultations typically last 60 minutes. Please bring any relevant documents to your appointment.",
  },
  {
    title: "Civil Cases",
    description:
      "Our experienced attorney provides comprehensive representation for all types of civil disputes and litigation matters.",
    details:
      "We handle property disputes, quieting of title, recovery of property, civil actions for monetary claims, expropriation, foreclosures, appellate cases, and other civil matters.",
    icon: Scale,
    iconPosition: "right",
    modalDescription:
      "Our experienced attorney provides comprehensive representation for all types of civil disputes and litigation matters.",
    modalServices: [
      "Property disputes, quieting of title, and recovery of property",
      "Civil actions for monetary claims, expropriation, and foreclosures",
      "Appellate cases and other civil matters",
      "Contract disputes and breach of contract cases",
    ],
    modalNote: "We provide personalized attention to each case with thorough preparation and strategic advocacy.",
  },
  {
    title: "Criminal Cases",
    description:
      "Our criminal defense team provides expert representation for various criminal matters across different court jurisdictions.",
    details:
      "We represent clients in cases within MTCC, RTC, Sandiganbayan, and Court of Tax Appeals, including drug-related cases and anti-money laundering cases.",
    icon: Shield,
    iconPosition: "left",
    modalDescription:
      "Our criminal defense team provides expert representation for various criminal matters across different court jurisdictions.",
    modalServices: [
      "Cases within MTCC, RTC, Sandiganbayan, and Court of Tax Appeals",
      "Drug-related cases and anti-money laundering cases",
      "Criminal defense strategy and case evaluation",
      "Bail hearings and pretrial negotiations",
    ],
    modalNote: "We work diligently to protect your rights throughout the criminal justice process.",
  },
  {
    title: "Administrative & Quasi-Judicial Cases",
    description:
      "We represent clients in various administrative and quasi-judicial proceedings before government agencies and regulatory bodies.",
    details:
      "Our services include representation for labor cases, HR disputes, and government agency issues (BIR, BOC, PEZA, SEC).",
    icon: Building,
    iconPosition: "right",
    modalDescription:
      "We represent clients in various administrative and quasi-judicial proceedings before government agencies and regulatory bodies.",
    modalServices: [
      "Labor cases, HR disputes, and employment issues",
      "Government agency matters (BIR, BOC, PEZA, SEC)",
      "Administrative hearings and appeals",
      "Regulatory compliance and enforcement actions",
    ],
    modalNote: "Our team has extensive experience navigating complex administrative procedures and regulations.",
  },
  {
    title: "Preparation of Pleadings & Motions",
    description: "Our legal team expertly drafts all types of legal documents required for your case or legal matter.",
    details:
      "We prepare legal motions, petitions, counter-affidavits, and all types of case-related documentation to strengthen your legal position.",
    icon: FileText,
    iconPosition: "left",
    modalDescription:
      "Our legal team expertly drafts all types of legal documents required for your case or legal matter.",
    modalServices: [
      "Legal motions and petitions",
      "Counter-affidavits and replies",
      "Case-related documentation and briefs",
      "Legal memoranda and position papers",
    ],
    modalNote: "We ensure all documents are meticulously prepared to strengthen your legal position.",
  },
  {
    title: "Legal Representation",
    description: "Our attorney provides skilled representation before various legal and administrative forums.",
    details:
      "We offer legal representation before courts, administrative, and quasi-judicial bodies for all your legal matters.",
    icon: User,
    iconPosition: "right",
    modalDescription: "Our attorney provides skilled representation before various legal and administrative forums.",
    modalServices: [
      "Court appearances and hearings",
      "Administrative and quasi-judicial proceedings",
      "Settlement negotiations and mediation",
      "Client advocacy and case management",
    ],
    modalNote: "We represent your interests with professionalism and dedication throughout the legal process.",
  },
  {
    title: "Retainer Services",
    description:
      "Our retainer services provide ongoing legal support for businesses and individuals requiring regular legal assistance.",
    details:
      "We provide general legal retainers for businesses, including documentation, notarization, and ongoing legal support tailored to your needs.",
    icon: Clipboard,
    iconPosition: "left",
    modalDescription:
      "Our retainer services provide ongoing legal support for businesses and individuals requiring regular legal assistance.",
    modalServices: [
      "General legal advice and consultation",
      "Document review and preparation",
      "Notarization services",
      "Regular legal updates and compliance monitoring",
    ],
    modalNote:
      "Retainer arrangements can be customized based on your specific needs and frequency of legal services required.",
  },
  {
    title: "Special Proceedings & Other Legal Cases",
    description:
      "Our law office handles various types of special legal proceedings and unique legal matters that require specialized knowledge and expertise.",
    details:
      "We assist with estate settlements, guardianship, adoption cases, election disputes, land registration, trademark/patent registration, and immigration cases.",
    icon: BookOpen,
    iconPosition: "right",
    modalDescription:
      "Our law office handles various types of special legal proceedings and unique legal matters that require specialized knowledge and expertise.",
    modalServices: [
      "Estate settlements and probate proceedings",
      "Guardianship and adoption cases",
      "Election disputes and land registration",
      "Trademark/patent registration and immigration cases",
    ],
    modalNote: "We guide you through complex legal processes with attention to detail and procedural requirements.",
  },
  {
    title: "Accounting Services",
    description:
      "Our accounting professional provides comprehensive financial services for both individuals and businesses.",
    details:
      "We offer tax return preparation, bookkeeping, payroll services, and financial statement preparation to help maintain accurate financial records.",
    icon: Calculator,
    iconPosition: "left",
    modalDescription:
      "Our accounting professional provides comprehensive financial services for both individuals and businesses.",
    modalServices: [
      "Tax return preparation for individuals and businesses",
      "Bookkeeping and financial record maintenance",
      "Payroll services and management",
      "Financial statement preparation and analysis",
    ],
    modalNote: "We help you maintain accurate financial records while ensuring compliance with accounting standards.",
  },
  {
    title: "Audit Services",
    description:
      "Our audit services provide thorough examination and verification of financial records and business operations.",
    details:
      "We conduct external and internal audits, forensic audits and investigations, due diligence for business transactions, and compliance audits and risk assessment.",
    icon: ClipboardCheck,
    iconPosition: "left",
    modalDescription:
      "Our audit services provide thorough examination and verification of financial records and business operations.",
    modalServices: [
      "External and internal audits",
      "Forensic audits and investigations",
      "Due diligence for business transactions",
      "Compliance audits and risk assessment",
    ],
    modalNote: "Our audit approach is designed to identify issues, ensure compliance, and improve financial processes.",
  },
  {
    title: "Accounting & Tax Consultancy",
    description:
      "Our tax consultancy services help individuals and businesses optimize their tax position while ensuring compliance.",
    details:
      "We provide strategic tax planning and optimization, corporate manual preparation, budgeting and financial forecasting, and tax compliance advisory and risk management.",
    icon: Receipt,
    iconPosition: "right",
    modalDescription:
      "Our tax consultancy services help individuals and businesses optimize their tax position while ensuring compliance.",
    modalServices: [
      "Strategic tax planning and optimization",
      "Corporate manual preparation",
      "Budgeting and financial forecasting",
      "Tax compliance advisory and risk management",
    ],
    modalNote:
      "We provide proactive tax strategies to help you minimize tax liabilities while maintaining full compliance with tax laws.",
  },
]

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h1 className="text-4xl lg:text-5xl font-serif font-bold text-gray-900 mb-4">Our Legal Services</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Comprehensive legal solutions tailored to your needs
            </p>
          </div>

          <div className="max-w-6xl mx-auto space-y-24">
            {services.map((service, index) => (
              <div
                key={index}
                className={`flex flex-col lg:flex-row items-center gap-8 lg:gap-16 group hover:bg-gray-50 transition-all duration-300 rounded-2xl p-12 -m-12 border border-gray-200 shadow-sm hover:shadow-md bg-white`}
              >
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 lg:w-24 lg:h-24 flex items-center justify-center">
                    <service.icon className="h-16 w-16 lg:h-20 lg:w-20 text-red-500 group-hover:scale-110 transition-all duration-300" />
                  </div>
                </div>

                <div className="flex-1 text-center lg:text-left space-y-4">
                  <h3 className="text-2xl lg:text-3xl font-bold font-serif text-gray-900 group-hover:text-gray-800 transition-colors duration-300">
                    {service.title}
                  </h3>
                  <p className="text-lg text-gray-600 font-medium group-hover:text-gray-700 transition-colors duration-300">
                    {service.description}
                  </p>
                  <p className="text-gray-700 leading-relaxed group-hover:text-gray-800 transition-colors duration-300">
                    {service.details}
                  </p>
                  <ServiceModal
                    title={service.title}
                    description={service.modalDescription}
                    services={service.modalServices}
                    note={service.modalNote}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-serif font-bold text-gray-900 mb-4">Need Legal Assistance?</h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Don't see the service you need? Contact us for a consultation. We handle a wide range of legal matters and
            can provide customized solutions.
          </p>
          <AccountRequiredModal />
        </div>
      </section>

      <Footer />
    </div>
  )
}
