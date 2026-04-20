"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import ReCAPTCHA from "react-google-recaptcha";
import { useAuth } from "@/hooks/useAuth";
import MessagingService from "@/lib/message-service";

export default function ContactPage() {
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const { user, userProfile } = useAuth();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    subject: "",
    otherSubject: "",
    message: "",
  });
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [showRecaptchaError, setShowRecaptchaError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
    type?: "conversation" | "inquiry";
  } | null>(null);

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
    setShowRecaptchaError(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    
    if (!recaptchaToken) {
      setShowRecaptchaError(true);
      setSubmitResult({
        success: false,
        message: "Please complete the reCAPTCHA verification.",
      });
      return;
    }

    
    const finalSubject =
      formData.subject === "other" && formData.otherSubject
        ? formData.otherSubject
        : formData.subject;

    
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.message ||
      !finalSubject
    ) {
      setSubmitResult({
        success: false,
        message: "Please fill in all required fields.",
      });
      return;
    }

    try {
      setSubmitting(true);
      setSubmitResult(null);

      // 1. Prepare data including the recaptchaToken
      const inquiryData = {
        firstName: userProfile?.firstName || formData.firstName || "",
        lastName: userProfile?.lastName || formData.lastName || "",
        email: user?.email || formData.email || "",
        phone: formData.phone || "", 
        subject: finalSubject || "",
        message: formData.message || "",
        userId: user?.uid || undefined,
        captchaToken: recaptchaToken, // MUST include this for the backend
      };

      // 2. Save to Database (Existing Logic)
      const result = await MessagingService.saveInquiry(inquiryData);

      // 3. Trigger the Email API (New Logic to match your route.ts)
      const emailResponse = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "admindelgadolaw@delgadooffices.com", // Your admin email
          subject: `New Inquiry: ${finalSubject}`,
          message: formData.message,
          adminName: "Admin",
          clientName: `${inquiryData.firstName} ${inquiryData.lastName}`,
          inquiryId: result.replace("conversation:", ""),
          captchaToken: recaptchaToken, // Verification happens here
        }),
      });

      const emailData = await emailResponse.json();

      if (!emailResponse.ok) {
        throw new Error(emailData.error || "Failed to verify reCAPTCHA or send email.");
      }

      // 4. Success Handling
      if (result.startsWith("conversation:")) {
        setSubmitResult({
          success: true,
          message: "Thank you! Your message has been sent. You can continue in your Messages dashboard.",
          type: "conversation",
        });
      } else {
        setSubmitResult({
          success: true,
          message: "Thank you! We have received your message and will get back to you via email shortly.",
          type: "inquiry",
        });
      }

      // 5. Reset Form
      setFormData({
        firstName: userProfile?.firstName || "",
        lastName: userProfile?.lastName || "",
        email: user?.email || "",
        phone: "",
        subject: "",
        otherSubject: "",
        message: "",
      });
      setRecaptchaToken(null);
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
    } catch (error: any) {
      console.error("Error submitting inquiry:", error);
      setSubmitResult({
        success: false,
        message: error.message || "Failed to submit inquiry. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }





  
  useEffect(() => {
    if (userProfile && user) {
      setFormData((prev) => ({
        ...prev,
        firstName: userProfile.firstName || "",
        lastName: userProfile.lastName || "",
        email: user.email || "",
      }));
    }
  }, [user, userProfile]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold font-serif text-navy-900 mb-4">
              Contact Us
            </h1>
            <p className="text-lg text-gray-600">
              Get in touch with our legal team for assistance with your case
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-12 max-w-7xl mx-auto">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border p-8">
                <h2 className="text-2xl font-bold text-navy-900 mb-6">
                  Send Us a Message
                </h2>

                {submitResult && (
                  <div
                    className={`mb-6 p-4 rounded-lg ${
                      submitResult.success
                        ? "bg-green-50 text-green-800 border border-green-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {submitResult.success ? (
                        <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-medium">{submitResult.message}</p>
                        {submitResult.success &&
                          submitResult.type === "conversation" &&
                          user && (
                            <a
                              href="/dashboard/client/messages"
                              className="inline-block mt-2 text-sm text-green-700 hover:text-green-800 underline"
                            >
                              Go to Messages →
                            </a>
                          )}
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="firstName"
                        className="text-sm font-medium text-gray-700"
                      >
                        First Name *
                      </Label>
                      <Input
                        id="firstName"
                        placeholder="First Name"
                        value={formData.firstName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            firstName: e.target.value,
                          })
                        }
                        className="mt-1"
                        required
                        disabled={!!userProfile?.firstName}
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="lastName"
                        className="text-sm font-medium text-gray-700"
                      >
                        Last Name *
                      </Label>
                      <Input
                        id="lastName"
                        placeholder="Last Name"
                        value={formData.lastName}
                        onChange={(e) =>
                          setFormData({ ...formData, lastName: e.target.value })
                        }
                        className="mt-1"
                        required
                        disabled={!!userProfile?.lastName}
                      />
                    </div>
                  </div>

                  <div>
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-gray-700"
                    >
                      Email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="mt-1"
                      required
                      disabled={!!user?.email}
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="phone"
                      className="text-sm font-medium text-gray-700"
                    >
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      placeholder="+63XXX XXXX XXXX"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="subject"
                      className="text-sm font-medium text-gray-700"
                    >
                      Subject *
                    </Label>
                    <Select
                      value={formData.subject}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          subject: value,
                          otherSubject:
                            value === "other" ? formData.otherSubject : "",
                        })
                      }
                      required
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consultation">
                          Legal Consultation
                        </SelectItem>
                        <SelectItem value="civil">Civil Case</SelectItem>
                        <SelectItem value="criminal">Criminal Case</SelectItem>
                        <SelectItem value="administrative">
                          Administrative Case
                        </SelectItem>
                        <SelectItem value="tax">Tax & Accounting</SelectItem>
                        <SelectItem value="corporate">
                          Corporate Services
                        </SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.subject === "other" && (
                    <div>
                      <Label
                        htmlFor="otherSubject"
                        className="text-sm font-medium text-gray-700"
                      >
                        Please Specify *
                      </Label>
                      <Input
                        id="otherSubject"
                        placeholder="Please specify your subject"
                        value={formData.otherSubject}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            otherSubject: e.target.value,
                          })
                        }
                        className="mt-1"
                        required={formData.subject === "other"}
                      />
                    </div>
                  )}

                  <div>
                    <Label
                      htmlFor="message"
                      className="text-sm font-medium text-gray-700"
                    >
                      Your Message *
                    </Label>
                    <Textarea
                      id="message"
                      placeholder="Your Message"
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      rows={6}
                      className="mt-1"
                      required
                    />
                  </div>

                  <div>
                    <ReCAPTCHA
                      ref={recaptchaRef}
                      sitekey="6Lf8rsAsAAAAABkXvoGLJq2Y0n-1e4oz718FenaD"
                      onChange={handleRecaptchaChange}
                    />
                    {showRecaptchaError && (
                      <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>Please complete the reCAPTCHA verification</span>
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg py-3"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      "Send Message"
                    )}
                  </Button>

                  {user && (
                    <p className="text-sm text-gray-500 text-center">
                      You are logged in as {user.email}. Your inquiry will be
                      saved to your account.
                    </p>
                  )}
                </form>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow-sm border p-8">
                <h2 className="text-2xl font-bold text-navy-900 mb-8">
                  Delgado Law Office
                </h2>

                <div className="space-y-6 mb-8">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-red-600 mt-1 flex-shrink-0" />
                    <span className="text-gray-700">
                      4th flr. Lizel Bldg., 269 National Rd., Muntinlupa City
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-red-600 flex-shrink-0" />
                      <span className="text-gray-700">(+63) 947 109 5792</span>
                    </div>
                    <div className="flex items-center gap-3 ml-8">
                      <span className="text-gray-700">(+63) 908 898 9503</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-red-600 flex-shrink-0" />
                      <span className="text-gray-700">
                        admindelgadolaw@delgadooffices.com
                      </span>
                    </div>
                    <div className="flex items-center gap-3 ml-8">
                      <span className="text-gray-700">
                        aliajadelgado88@gmail.com
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-red-600 mt-1 flex-shrink-0" />
                    <div className="space-y-1">
                      <div className="text-gray-700">
                        <span className="font-medium">Office Hours</span>
                      </div>
                      <div className="text-gray-700">
                        Monday - Friday: 9:00 AM - 5:00 PM
                      </div>
                      <div className="text-gray-700">
                        Saturday - Sunday: Closed
                      </div>
                    </div>
                  </div>
                </div>

                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3864.286818283328!2d121.04342267486871!3d14.410622486053468!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397d04611cb9a37%3A0x3fed9dc6a6804c18!2sLizel%20Building!5e0!3m2!1sen!2sjp!4v1776670926439!5m2!1sen!2sjp"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Delgado Law Office Location"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
}
