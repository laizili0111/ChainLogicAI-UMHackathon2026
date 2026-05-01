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
    sender: "Texas Instruments",
    senderEmail: "supply@ti.com",
    subject: "SHORTAGE WARNING: BATT-CELL-4680 Delay",
    snippet: "Due to raw material shortages, all future shipments of BATT-CELL-4680 will be delayed. We recommend...",
    body: "Dear Procurement Team,\n\nDue to unprecedented raw material shortages in our supply chain, we are forecasting a 2-month delay on all future shipments of the BATT-CELL-4680 (Lithium Battery) modules.\n\nTo ensure your production lines remain active through Q4, we strongly recommend you immediately submit a bulk order for 50,000 extra units to secure your allocation before global inventory is completely exhausted.\n\nPlease confirm if you want to proceed with this massive pre-order to avoid downtime.\n\nBest,\nTI Supply Team",
    date: "Yesterday",
    unread: true,
    avatar: "T"
  },
  {
    id: "3",
    sender: "Global Logistics",
    senderEmail: "alerts@globallogistics.com",
    subject: "PORT STRIKE: MCU-TC397-EVO Shipment Held",
    snippet: "A minor port strike is delaying the MCU-TC397-EVO shipment by 4 days. Please consider over-ordering...",
    body: "To Whom It May Concern,\n\nPlease be advised that shipment #88492 containing part MCU-TC397-EVO is currently delayed at the port due to a labor strike. Expected delay: 4 days.\n\nMany of our clients are doubling or tripling their orders (requesting 5,000+ units) to build buffer stock just in case the strike extends for months.\n\nLet us know if you want to drastically increase your order volume for MCU-TC397-EVO.\n\nRegards,\nGlobal Logistics",
    date: "Apr 20",
    unread: true,
    avatar: "G"
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
