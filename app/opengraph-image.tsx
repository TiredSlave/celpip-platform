import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "./lib/brand";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
            padding: "48px 64px",
            background: "white",
            borderRadius: 24,
            boxShadow: "0 25px 50px -12px rgba(30, 58, 95, 0.15)",
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 20,
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #e2e8f0",
            }}
          >
            <svg width="96" height="96" viewBox="0 0 512 512" fill="none">
              <path d="M256 108L96 178l160 70 160-70-160-70z" fill="#1E3A5F" />
              <path
                d="M176 204v72c0 28 36 52 80 52s80-24 80-52v-72l-80 35-80-35z"
                fill="#152A45"
              />
              <path d="M376 178v78" stroke="#D4AF37" strokeWidth="10" strokeLinecap="round" />
              <circle cx="376" cy="268" r="14" fill="#D4AF37" />
              <path
                fill="#C41E3A"
                d="M256 292c-6 18-22 34-40 40 8-10 12-22 12-34h-26v26c-10-8-18-18-24-30 2 14 0 28-8 40-8-16-12-34-10-52-12 10-20 24-22 40 4-18 14-34 28-44-14 2-28 8-38 18 10-20 26-34 46-40-18-4-36-2-52 6 16-14 36-22 58-22-4-16-2-32 6-46 8 14 10 30 6 46 22 0 42 8 58 22-16-8-34-10-52-6 20 6 36 20 46 40-10-10-24-16-38-18 14 10 24 26 28 44-2-16-10-30-22-40 2 18-2 36-10 52-8-12-18-22-28-40 0 12 4 24 12 34-18-6-34-22-40-40z"
              />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 56, fontWeight: 700, color: "#1E3A5F", letterSpacing: -1 }}>
              {SITE_NAME}
            </div>
            <div style={{ fontSize: 28, color: "#475569", maxWidth: 520 }}>{SITE_TAGLINE}</div>
          </div>
        </div>
        <div style={{ marginTop: 32, fontSize: 22, color: "#64748b" }}>celpiplib.com</div>
      </div>
    ),
    { ...size },
  );
}
