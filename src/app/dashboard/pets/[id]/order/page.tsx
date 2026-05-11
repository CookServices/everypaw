"use client";

import { useState } from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function OrderPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [step, setStep] = useState<"address" | "confirm" | "success">("address");
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [address, setAddress] = useState({
    firstName: "",
    lastName: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postCode: "",
    country: "US",
  });

  const handleOrder = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gelato/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId: id, shippingAddress: address }),
      });
      const data = await res.json();
      if (data.orderId) {
        setOrderId(data.orderId);
        setStep("success");
      } else {
        alert("Order failed. Please try again.");
      }
    } catch {
      alert("Order failed. Please try again.");
    }
    setLoading(false);
  };

  const fields = [
    { key: "firstName", label: "First name", placeholder: "John" },
    { key: "lastName", label: "Last name", placeholder: "Doe" },
    { key: "addressLine1", label: "Address", placeholder: "123 Main St" },
    { key: "addressLine2", label: "Apartment, suite (optional)", placeholder: "Apt 4B" },
    { key: "city", label: "City", placeholder: "New York" },
    { key: "postCode", label: "Postal code", placeholder: "10001" },
  ];

  const inputStyle = {
    width: "100%", padding: ".75rem 1rem", borderRadius: 12,
    border: "1.5px solid rgba(61,43,31,.15)", background: "#F7F2EA",
    fontFamily: "inherit", fontSize: ".9rem", color: "#3D2B1F",
    outline: "none", boxSizing: "border-box" as const,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>
      <nav style={{ background: "rgba(247,242,234,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(61,43,31,.08)", padding: "1rem 2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link href={`/dashboard/pets/${id}`} style={{ fontSize: ".85rem", color: "#7A5C44", textDecoration: "none" }}>← Back</Link>
        <span style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F" }}>Order your book</span>
      </nav>

      <main style={{ maxWidth: 520, margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        {step === "success" ? (
          <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2.5rem", border: "1px solid rgba(61,43,31,.08)", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📬</div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.5rem", color: "#3D2B1F", marginBottom: ".75rem" }}>Your book is on its way!</h2>
            <p style={{ fontSize: ".9rem", color: "#7A5C44", fontWeight: 300, lineHeight: 1.6, marginBottom: ".5rem" }}>
              Order confirmed. Your hardcover book will be printed and shipped within 5-7 business days.
            </p>
            <p style={{ fontSize: ".8rem", color: "#7A5C44", fontWeight: 300, marginBottom: "2rem" }}>
              Order ID: <code style={{ background: "rgba(61,43,31,.06)", padding: "2px 6px", borderRadius: 4 }}>{orderId}</code>
            </p>
            <Link href="/dashboard" style={{ background: "#C8813A", color: "#FDFAF5", padding: ".75rem 2rem", borderRadius: 100, fontSize: ".875rem", fontWeight: 500, textDecoration: "none" }}>
              Back to dashboard →
            </Link>
          </div>
        ) : step === "confirm" ? (
          <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", border: "1px solid rgba(61,43,31,.08)" }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", color: "#3D2B1F", marginBottom: "1.5rem" }}>Confirm your order</h2>

            <div style={{ background: "#F7F2EA", borderRadius: 16, padding: "1.25rem", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: ".75rem", fontWeight: 500, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: ".75rem" }}>Shipping to</div>
              <p style={{ fontSize: ".9rem", color: "#3D2B1F", lineHeight: 1.7, margin: 0 }}>
                {address.firstName} {address.lastName}<br />
                {address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ""}<br />
                {address.city}, {address.postCode}<br />
                {address.country}
              </p>
            </div>

            <div style={{ background: "#F7F2EA", borderRadius: 16, padding: "1.25rem", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: ".75rem", fontWeight: 500, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: ".75rem" }}>Order summary</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".9rem", color: "#3D2B1F", marginBottom: ".5rem" }}>
                <span>Hardcover photo book (8x8")</span>
                <span style={{ fontWeight: 500 }}>$35.00</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".85rem", color: "#7A5C44" }}>
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: ".75rem" }}>
              <button onClick={() => setStep("address")} style={{ flex: 1, padding: ".75rem", borderRadius: 100, border: "1.5px solid rgba(61,43,31,.15)", background: "transparent", fontFamily: "inherit", fontSize: ".875rem", color: "#7A5C44", cursor: "pointer" }}>
                Edit address
              </button>
              <button onClick={handleOrder} disabled={loading} style={{ flex: 2, padding: ".75rem", borderRadius: 100, border: "none", background: "#C8813A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".875rem", fontWeight: 500, cursor: "pointer", opacity: loading ? .7 : 1 }}>
                {loading ? "Placing order…" : "Place order →"}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", border: "1px solid rgba(61,43,31,.08)" }}>
            <div style={{ background: "rgba(200,129,58,.08)", border: "1px solid rgba(200,129,58,.2)", borderRadius: 14, padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", gap: "1rem", alignItems: "center" }}>
              <span style={{ fontSize: "1.5rem" }}>📖</span>
              <div>
                <p style={{ fontSize: ".875rem", fontWeight: 500, color: "#3D2B1F", margin: "0 0 .2rem" }}>Hardcover photo book · 8x8"</p>
                <p style={{ fontSize: ".8rem", color: "#7A5C44", margin: 0, fontWeight: 300 }}>170gsm coated silk · Matt lamination · ~$35 + shipping</p>
              </div>
            </div>

            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", color: "#3D2B1F", marginBottom: "1.5rem" }}>Shipping address</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                {fields.slice(0, 2).map(field => (
                  <div key={field.key}>
                    <label style={{ fontSize: ".75rem", fontWeight: 500, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: ".4rem" }}>{field.label}</label>
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      value={address[field.key as keyof typeof address]}
                      onChange={e => setAddress({ ...address, [field.key]: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>

              {fields.slice(2).map(field => (
                <div key={field.key}>
                  <label style={{ fontSize: ".75rem", fontWeight: 500, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: ".4rem" }}>{field.label}</label>
                  <input
                    type="text"
                    placeholder={field.placeholder}
                    value={address[field.key as keyof typeof address]}
                    onChange={e => setAddress({ ...address, [field.key]: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              ))}

              <div>
                <label style={{ fontSize: ".75rem", fontWeight: 500, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: ".4rem" }}>Country</label>
                <select
                  value={address.country}
                  onChange={e => setAddress({ ...address, country: e.target.value })}
                  style={{ ...inputStyle }}
                >
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="FR">France</option>
                  <option value="DE">Germany</option>
                  <option value="CA">Canada</option>
                  <option value="AU">Australia</option>
                  <option value="NL">Netherlands</option>
                  <option value="ES">Spain</option>
                  <option value="IT">Italy</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => {
                if (!address.firstName || !address.lastName || !address.addressLine1 || !address.city || !address.postCode) {
                  alert("Please fill in all required fields.");
                  return;
                }
                setStep("confirm");
              }}
              style={{ marginTop: "1.5rem", width: "100%", padding: ".75rem", borderRadius: 100, border: "none", background: "#C8813A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: "pointer" }}
            >
              Continue →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
