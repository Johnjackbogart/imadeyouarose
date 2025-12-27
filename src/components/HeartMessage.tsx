import { useState, useRef, FormEvent } from "react";
import emailjs from "@emailjs/browser";

// EmailJS Configuration - Replace these with your actual values
// 1. Go to https://www.emailjs.com/ and create a free account
// 2. Create an email service (connect your email)
// 3. Create an email template with variables: {{from_name}}, {{message}}, {{reply_to}}
// 4. Get your public key from Account > General
const EMAILJS_SERVICE_ID = "service_a1wvkin";
const EMAILJS_TEMPLATE_ID = "template_jm3pbrx";
const EMAILJS_PUBLIC_KEY = "Bu9CEaBTAggpzsyw6";

type HeartMessageProps = {
  isVisible?: boolean;
};

export default function HeartMessage({ isVisible = true }: HeartMessageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heartSent, setHeartSent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formRef.current) return;

    setIsSending(true);
    setError(null);

    try {
      await emailjs.sendForm(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        formRef.current,
        EMAILJS_PUBLIC_KEY,
      );
      setSent(true);
      formRef.current.reset();
    } catch (err) {
      console.error("EmailJS error:", err);
      setError("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSent(false);
    setError(null);
  };

  const getDeviceMetadata = () => {
    const nav = navigator;
    const screen = window.screen;
    const metadata = [
      `User Agent: ${nav.userAgent}`,
      `Platform: ${nav.platform}`,
      `Language: ${nav.language}`,
      `Languages: ${nav.languages?.join(", ") || "N/A"}`,
      `Screen: ${screen.width}x${screen.height}`,
      `Viewport: ${window.innerWidth}x${window.innerHeight}`,
      `Color Depth: ${screen.colorDepth}`,
      `Pixel Ratio: ${window.devicePixelRatio}`,
      `Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
      `Timezone Offset: ${new Date().getTimezoneOffset()} min`,
      `Online: ${nav.onLine}`,
      `Cookies Enabled: ${nav.cookieEnabled}`,
      `Do Not Track: ${nav.doNotTrack || "N/A"}`,
      `Max Touch Points: ${nav.maxTouchPoints}`,
      `Hardware Concurrency: ${nav.hardwareConcurrency || "N/A"}`,
      `Device Memory: ${(nav as Navigator & { deviceMemory?: number }).deviceMemory || "N/A"} GB`,
      `Connection: ${(nav as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType || "N/A"}`,
      `Referrer: ${document.referrer || "Direct"}`,
      `URL: ${window.location.href}`,
      `Time: ${new Date().toISOString()}`,
    ];
    return metadata.join("\n");
  };

  const sendHeart = async () => {
    if (heartSent) return; // Prevent multiple sends

    const metadata = getDeviceMetadata();

    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          from_name: "Anonymous",
          message: `<3\n\n--- Device Info ---\n${metadata}`,
          reply_to: "",
        },
        EMAILJS_PUBLIC_KEY
      );
      setHeartSent(true);
    } catch (err) {
      console.error("EmailJS error:", err);
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Floating heart button - bottom right */}
      <button
        className={`heart-button${heartSent ? " heart-sent-btn" : ""}`}
        onClick={sendHeart}
        aria-label="Send a heart"
        disabled={heartSent}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </button>

      {/* Floating mail button - bottom left */}
      <button
        className="mail-button"
        onClick={() => setIsOpen(true)}
        aria-label="Send a message"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
        </svg>
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div className="heart-modal-overlay" onClick={handleClose}>
          <div className="heart-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="heart-modal-close"
              onClick={handleClose}
              aria-label="Close"
            >
              &times;
            </button>

            {sent ? (
              <div className="heart-sent">
                <div className="heart-sent-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    width="48"
                    height="48"
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </div>
                <h3>Message sent!</h3>
                <p>Thank you for your message</p>
              </div>
            ) : (
              <>
                <h2 className="heart-modal-title">Send me a message</h2>
                <form
                  ref={formRef}
                  onSubmit={handleSubmit}
                  className="heart-form"
                >
                  <div className="heart-form-group">
                    <label htmlFor="from_name">Your name (optional)</label>
                    <input
                      type="text"
                      id="from_name"
                      name="from_name"
                      placeholder="Anonymous"
                      autoComplete="name"
                    />
                  </div>
                  <div className="heart-form-group">
                    <label htmlFor="reply_to">Your email (optional)</label>
                    <input
                      type="email"
                      id="reply_to"
                      name="reply_to"
                      placeholder="If you want a reply"
                      autoComplete="email"
                    />
                  </div>
                  <div className="heart-form-group">
                    <label htmlFor="message">Message</label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      placeholder="Your message..."
                      rows={4}
                    />
                  </div>
                  {error && <p className="heart-error">{error}</p>}
                  <button
                    type="submit"
                    className="heart-submit"
                    disabled={isSending}
                  >
                    {isSending ? "Sending..." : "Send"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        .heart-button {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: black;
          transition: transform 0.2s;
          z-index: 1000;
        }

        .heart-button:hover:not(:disabled) {
          transform: scale(1.1);
        }

        .heart-button.heart-sent-btn {
          background: #ff6b6b;
          color: white;
          cursor: default;
        }

        .mail-button {
          position: fixed;
          bottom: 24px;
          left: 24px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: black;
          transition: transform 0.2s;
          z-index: 1000;
        }

        .mail-button:hover {
          transform: scale(1.1);
        }

        .heart-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1001;
          backdrop-filter: blur(4px);
          padding: 20px;
        }

        .heart-modal {
          background: linear-gradient(135deg, #fff8f8, #ffffff);
          border-radius: 16px;
          padding: 32px;
          max-width: 400px;
          width: 100%;
          position: relative;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
          animation: modalIn 0.3s ease-out;
        }

        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .heart-modal-close {
          position: absolute;
          top: 12px;
          right: 16px;
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: #999;
          line-height: 1;
          padding: 4px 8px;
          transition: color 0.2s;
        }

        .heart-modal-close:hover {
          color: #333;
        }

        .heart-modal-title {
          margin: 0 0 24px 0;
          font-family: Georgia, serif;
          font-size: 20px;
          color: #333;
          text-align: center;
        }

        .heart-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .heart-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .heart-form-group label {
          font-size: 13px;
          color: #666;
          font-family: Georgia, serif;
        }

        .heart-form-group input,
        .heart-form-group textarea {
          padding: 12px 14px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 15px;
          font-family: Georgia, serif;
          transition: border-color 0.2s, box-shadow 0.2s;
          background: white;
        }

        .heart-form-group input:focus,
        .heart-form-group textarea:focus {
          outline: none;
          border-color: #ff6b6b;
          box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.15);
        }

        .heart-form-group textarea {
          resize: vertical;
          min-height: 100px;
        }

        .heart-error {
          color: #d32f2f;
          font-size: 14px;
          margin: 0;
          text-align: center;
        }

        .heart-submit {
          background: linear-gradient(135deg, #ff6b6b, #ee5a5a);
          color: white;
          border: none;
          padding: 14px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-family: Georgia, serif;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          margin-top: 8px;
        }

        .heart-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
        }

        .heart-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .heart-sent {
          text-align: center;
          padding: 20px 0;
        }

        .heart-sent-icon {
          color: #ff6b6b;
          margin-bottom: 16px;
          animation: sentBounce 0.6s ease-out;
        }

        @keyframes sentBounce {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        .heart-sent h3 {
          margin: 0 0 8px 0;
          font-family: Georgia, serif;
          font-size: 20px;
          color: #333;
        }

        .heart-sent p {
          margin: 0;
          color: #666;
          font-family: Georgia, serif;
        }

        @media (max-width: 480px) {
          .heart-button {
            bottom: 16px;
            right: 16px;
            width: 48px;
            height: 48px;
          }

          .heart-button svg {
            width: 22px;
            height: 22px;
          }

          .mail-button {
            bottom: 16px;
            left: 16px;
            width: 48px;
            height: 48px;
          }

          .mail-button svg {
            width: 20px;
            height: 20px;
          }

          .heart-modal {
            padding: 24px;
            margin: 12px;
          }
        }
      `}</style>
    </>
  );
}
