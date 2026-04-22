"use client";

import { useState } from "react";
import { Inbox, Send, FileText, Star, Trash2, Archive, Mail, Sparkles, ArrowLeft } from "lucide-react";

export interface Email {
  id: string;
  sender: string;
  senderEmail: string;
  subject: string;
  snippet: string;
  body: string;
  date: string;
  unread: boolean;
  avatar: string;
}

const MOCK_EMAILS: Email[] = [
  {
    id: "1",
    sender: "Munich Precision",
    senderEmail: "logistics@munich-precision.de",
    subject: "URGENT: Taiwan foundry delay - MCU-TC397-EVO",
    snippet: "Critical update regarding your recent order of TriCore Microcontrollers. Significant delays expected...",
    body: "Dear Supply Chain Manager,\n\nWe have just received a notification from our primary foundry in Taiwan. Due to a sudden utility disruption, the production line for the MCU-TC397-EVO TriCore Microcontrollers has been halted. \n\nThis will delay your shipment of 1,000 units by at least 21 days. As this component is critical for your ADAS ECU Assembly Line, we recommend immediate action to mitigate the $45,000 daily downtime penalty.\n\nPlease advise if you wish to explore secondary market sourcing or production rescheduling.\n\nBest regards,\nKarl Schmidt\nMunich Precision GmbH",
    date: "10:42 AM",
    unread: true,
    avatar: "M"
  },
  {
    id: "2",
    sender: "Panasonic Energy",
    senderEmail: "orders@panasonic-energy.jp",
    subject: "Shipment Confirmation: BATT-CELL-4680",
    snippet: "Your order for 4,000 Lithium-Ion cells has been dispatched and is currently in transit...",
    body: "Your order #88291 has been shipped via sea freight. Expected arrival at the Port of Long Beach is May 15th.",
    date: "Yesterday",
    unread: false,
    avatar: "P"
  },
  {
    id: "3",
    sender: "Brembo OEM",
    senderEmail: "sales@brembo.it",
    subject: "Updated Pricing Catalog - Q3 2026",
    snippet: "Please find attached the updated unit costs for our ceramic brake pad sets and rotor assemblies...",
    body: "Attached is our new price list. Note that volume discounts for the BRK-PAD-99 series have been improved.",
    date: "Apr 20",
    unread: false,
    avatar: "B"
  },
  {
    id: "4",
    sender: "Global Freight Authority",
    senderEmail: "alerts@customs-gfa.eu",
    subject: "HOLD NOTICE: Shipment AE-V8-SENS",
    snippet: "Your shipment of Acoustic Emission Sensors is currently held at customs pending further documentation...",
    body: "To Whom It May Concern,\n\nPlease be advised that shipment #99482 containing part AE-V8-SENS has been placed on an administrative hold at the port of entry.\n\nAdditional origin documentation is required before release. Expected delay: 7-10 business days.\n\nPlease submit the required forms as soon as possible to avoid storage fees.",
    date: "8:15 AM",
    unread: true,
    avatar: "G"
  },
  {
    id: "5",
    sender: "Panasonic Energy",
    senderEmail: "crisis-alert@panasonic-energy.jp",
    subject: "FORCE MAJEURE: BATT-CELL-4680 Production Halt",
    snippet: "We regret to inform you that a fire at our Nevada gigafactory has halted production of 4680 cells...",
    body: "Dear Partner,\n\nWe are declaring a Force Majeure event regarding the supply of BATT-CELL-4680 Lithium-Ion cells. A minor fire at our Nevada facility has temporarily suspended production on line 4.\n\nWe anticipate a supply gap of approximately 4-6 weeks while safety inspections and repairs are completed. We are actively trying to re-route supply from our Japan facilities, but shipping times will be extended.\n\nWe apologize for this severe disruption.",
    date: "Apr 18",
    unread: true,
    avatar: "P"
  }
];

interface InboxViewProps {
  onAnalyze: (email: Email) => void;
}

export default function InboxView({ onAnalyze }: InboxViewProps) {
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [activeTab, setActiveTab] = useState("inbox");

  return (
    <div className="inbox-layout">
      {/* Sidebar */}
      <aside className="inbox-sidebar">
        <div className={`sidebar-item ${activeTab === "inbox" ? "active" : ""}`} onClick={() => setActiveTab("inbox")}>
          <Inbox size={18} /> Inbox
        </div>
        <div className={`sidebar-item ${activeTab === "sent" ? "active" : ""}`} onClick={() => setActiveTab("sent")}>
          <Send size={18} /> Sent
        </div>
        <div className={`sidebar-item ${activeTab === "drafts" ? "active" : ""}`} onClick={() => setActiveTab("drafts")}>
          <FileText size={18} /> Drafts
        </div>
        <div className={`sidebar-item ${activeTab === "starred" ? "active" : ""}`} onClick={() => setActiveTab("starred")}>
          <Star size={18} /> Starred
        </div>
        <div className={`sidebar-item ${activeTab === "trash" ? "active" : ""}`} onClick={() => setActiveTab("trash")}>
          <Trash2 size={18} /> Trash
        </div>
      </aside>

      {/* Main View */}
      <main className="inbox-main">
        {selectedEmail ? (
          /* Email Detail View */
          <div className="email-detail">
            <header className="detail-header">
              <div className="detail-actions">
                <button className="action-btn" onClick={() => setSelectedEmail(null)}>
                  <ArrowLeft size={18} />
                </button>
                <button className="action-btn">
                  <Archive size={18} />
                </button>
                <button className="action-btn">
                  <Trash2 size={18} />
                </button>
                <button className="action-btn">
                  <Mail size={18} />
                </button>
              </div>
              <h2 className="detail-subject">{selectedEmail.subject}</h2>
              <div className="detail-meta">
                <div className="sender-info">
                  <div className="sender-avatar">{selectedEmail.avatar}</div>
                  <div className="sender-details">
                    <span className="sender-name">{selectedEmail.sender}</span>
                    <span className="sender-email">{`<${selectedEmail.senderEmail}>`}</span>
                  </div>
                </div>
                <div className="email-date">{selectedEmail.date}</div>
              </div>
            </header>

            <div className="detail-body">
              {selectedEmail.body.split('\n').map((line, i) => (
                <p key={i} style={{ marginBottom: line ? '1rem' : '0.5rem' }}>{line}</p>
              ))}
            </div>

            <footer className="detail-footer">
              <button 
                className="btn-ai-analyze"
                onClick={() => onAnalyze(selectedEmail)}
              >
                <Sparkles size={20} className="sparkle-icon" />
                Analyze with ChainLogic AI
              </button>
            </footer>
          </div>
        ) : (
          /* Email List View */
          <>
            <header className="inbox-header">
              <h2 className="inbox-title">Inbox</h2>
              <div className="inbox-actions">
                {/* Search or filters could go here */}
              </div>
            </header>
            <div className="email-list">
              {MOCK_EMAILS.map((email) => (
                <div 
                  key={email.id} 
                  className={`email-item ${email.unread ? "unread" : ""}`}
                  onClick={() => setSelectedEmail(email)}
                >
                  <div className="email-sender">{email.sender}</div>
                  <div className="email-subject-snippet">
                    <span className="email-subject">{email.subject}</span>
                    <span className="email-snippet">— {email.snippet}</span>
                  </div>
                  <div className="email-date">{email.date}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
