"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

/** 🔹 Reusable Drag-and-Drop Zone */
function FileDropZone({ onFileSelect }) {
  const [dragging, setDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        border: "2px dashed var(--dark-carolina)",
        borderRadius: "12px",
        padding: "2rem",
        textAlign: "center",
        background: dragging ? "#f0f8ff" : "#fafafa",
        cursor: "pointer",
        marginTop: "0.5rem",
      }}
    >
      <p>{dragging ? "Release to upload" : "Drag & drop a file here"}</p>
      <p>or</p>
      <input type="file" onChange={(e) => onFileSelect(e.target.files[0])} />
    </div>
  );
}

/** 🔹 User Creation Widget */
function UserCreationWidget({ orgOptions = [] }) {
  const [mode, setMode] = useState("new"); // "new" or "addCampaign"
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    orgName: "",
    orgId: "",
    role: "client",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ email: "", firstName: "", lastName: "", orgName: "", orgId: "", role: "client" });
    setMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    // AFTER
    if (mode === "new" && (!formData.email || !formData.firstName || !formData.lastName || !formData.orgName || !formData.orgId)) {
      setMessage("All fields are required");
      setMessageType("error");
      return;
    }

    if (mode === "addCampaign" && (!formData.email || !formData.orgId || !formData.orgName)) {
      setMessage("Email, Organization ID, and Organization Name are required");
      setMessageType("error");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const payload = mode === "new"
        ? {
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            orgName: formData.orgName,
            orgIds: [formData.orgId],  // ✅ always send as array
            role: formData.role,
          }
        : {
            email: formData.email,
            orgIds: [formData.orgId],  // ✅ Lambda will ADD to existing set
            orgName: formData.orgName,
            // firstName/lastName/role not needed for existing users
          };

      const res = await fetch("/api/lambda/CreateUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const text = await res.text();
      let result;
      try { result = JSON.parse(text); }
      catch { result = { raw: text }; }

      if (!res.ok) {
        setMessage(result.error || "Request failed");
        setMessageType("error");
        return;
      }

      setMessage(
        mode === "new"
          ? `User created! Temporary password: ${result.tempPassword}`
          : `Campaign added to ${formData.email} successfully!`
      );
      setMessageType("success");
      resetForm();
    } catch (err) {
      console.error(err);
      setMessage("Network error. Please try again.");
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "0.75rem",
    background: "#fff",
    color: "#333",
    border: "1px solid #ddd",
    borderRadius: "8px",
    fontSize: "0.9rem",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "0.5rem",
    fontWeight: 600,
  };

  return (
    <div style={{
      background: "#fff",
      borderRadius: "12px",
      padding: "1.5rem",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      height: "fit-content",
      position: "sticky",
      top: "2rem",
    }}>
      <h2 style={{ marginBottom: "1rem", color: "var(--dark-carolina)" }}>
        User Management
      </h2>

      {/* ✅ Mode Toggle */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "0.5rem",
        marginBottom: "1.5rem",
      }}>
        {[
          { value: "new", label: "New User" },
          { value: "addCampaign", label: "Add Campaign" },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => { setMode(value); resetForm(); }}
            style={{
              padding: "0.6rem",
              borderRadius: "8px",
              border: "2px solid var(--dark-carolina)",
              background: mode === value ? "var(--dark-carolina)" : "#fff",
              color: mode === value ? "#fff" : "var(--dark-carolina)",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.9rem",
              transition: "all 0.2s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>

        {/* Email — always shown */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle}>Email *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="user@example.com"
            style={inputStyle}
          />
        </div>

        {/* New user only fields */}
        {mode === "new" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={labelStyle}>First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="John"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Doe"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>Role *</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                style={{ ...inputStyle, color: "#555" }}
              >
                <option value="client">Client</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </>
        )}

        {/* Add campaign mode hint */}
        {mode === "addCampaign" && (
          <div style={{
            background: "#f0f4ff",
            border: "1px solid #c7d4f0",
            borderRadius: "8px",
            padding: "0.75rem",
            marginBottom: "1rem",
            fontSize: "0.85rem",
            color: "#334",
          }}>
            Enter the email of an existing user and the new campaign to add them to.
          </div>
        )}

        {/* Org fields — always shown */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle}>Organization Name *</label>
          <input
            type="text"
            name="orgName"
            value={formData.orgName}
            onChange={handleInputChange}
            placeholder="Example Campaign"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={labelStyle}>Organization ID *</label>
          <input
            type="text"
            name="orgId"
            value={formData.orgId}
            onChange={handleInputChange}
            placeholder="example-campaign"
            style={inputStyle}
          />
        </div>

        {/* Message */}
        {message && (
          <div style={{
            padding: "0.75rem",
            marginBottom: "1rem",
            borderRadius: "8px",
            fontSize: "0.9rem",
            background: messageType === "success" ? "#d4edda" : "#f8d7da",
            color: messageType === "success" ? "#155724" : "#721c24",
            border: `1px solid ${messageType === "success" ? "#c3e6cb" : "#f5c6cb"}`,
            wordBreak: "break-word",
          }}>
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: "100%",
            padding: "0.75rem",
            background: isSubmitting ? "#ccc" : "var(--dark-carolina)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: isSubmitting ? "not-allowed" : "pointer",
            transition: "background-color 0.2s",
          }}
        >
          {isSubmitting
            ? "Please wait..."
            : mode === "new" ? "Create User" : "Add Campaign"}
        </button>
      </form>
    </div>
  );
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [allFiles, setAllFiles] = useState({});
  const [newFiles, setNewFiles] = useState([]);
  const [file, setFile] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;

    const fetchAll = async () => {
      try {
        const res = await fetch("/api/s3/listAll", { method: "POST" });
        if (!res.ok) return;
        const data = await res.json();
        setAllFiles(data);

        const now = new Date();
        const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const recent = [];

        Object.entries(data).forEach(([orgId, dirs]) => {
          ["inbound", "outbound"].forEach((dir) => {
            dirs[dir]?.forEach((f) => {
              if (new Date(f.lastModified) > cutoff) {
                recent.push({ orgId, orgName: dirs.orgName, dir, name: f.name });
              }
            });
          });
        });

        setNewFiles(recent);
      } catch (err) {
        console.error(err);
      }
    };

    fetchAll();
  }, [status]);

const handleUpload = async () => {
  if (!file || !selectedOrg) {
    alert("Please select an org and a file");
    return;
  }

  try {
    // Determine Content-Type
    let contentType = file.type;
    const ext = file.name.split(".").pop().toLowerCase();
    const shapefileExtensions = ["shp", "shx", "dbf", "prj", "cpg"];

    if (shapefileExtensions.includes(ext)) {
      contentType = "application/octet-stream"; // binary-safe for shapefile parts
    } else if (!contentType) {
      contentType = "application/octet-stream"; // fallback for unknown types
    }

    const res = await fetch("/api/s3/upload", {
      method: "POST",
      body: JSON.stringify({
        fileName: file.name,
        fileType: contentType,
        targetOrgId: selectedOrg,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const { url } = await res.json();

    await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": contentType } });

    alert(`File uploaded to ${selectedOrg}/inbound ✅`);
    setFile(null);
    setSelectedOrg("");
  } catch (err) {
    console.error(err);
    alert("Upload failed");
  }
};


  if (status === "loading") return <p>Loading...</p>;
  if (!session) return null;

  return (
    <div
      style={{
        padding: "2rem",
        color: "var(--dark-carolina)",
        display: "grid",
        gridTemplateColumns: "1fr 400px",
        gap: "2rem",
        maxWidth: "1400px",
        margin: "0 auto",
      }}
    >
      {/* Left Column */}
      <div>
        <h1>Blue Liberty Admin Dashboard</h1>
        <p>User: {session.user?.email}</p>

        {newFiles.length > 0 && (
          <div
            style={{
              background: "#fffae6",
              border: "1px solid #ffe58f",
              padding: "1rem",
              marginBottom: "2rem",
              borderRadius: "12px",
            }}
          >
            <strong>🔔 {newFiles.length} new file(s)</strong>
            <ul>
              {newFiles.map((f, i) => (
                <li key={i}>
                  {f.orgName || f.orgId} → {f.dir}: <em>{f.name}</em>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* File Upload Section */}
        <div style={{ marginBottom: "2rem" }}>
          <h2>Upload File to Campaign</h2>
          <div className="styled-select">
            <select value={selectedOrg} onChange={(e) => setSelectedOrg(e.target.value)}>
              <option value="">Select campaign...</option>
              {Object.entries(allFiles).map(([orgId, dirs]) => (
                <option key={orgId} value={orgId}>
                  {dirs.orgName || orgId}
                </option>
              ))}
            </select>
          </div>

          <FileDropZone onFileSelect={(f) => setFile(f)} />

          <button
            onClick={handleUpload}
            disabled={!file || !selectedOrg}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              background: "var(--dark-carolina)",
              color: "#fff",
              border: "none",
              cursor: file && selectedOrg ? "pointer" : "not-allowed",
            }}
          >
            Upload
          </button>
        </div>

        {/* File Display */}
        {Object.entries(allFiles).map(([orgId, dirs]) => (
          <details
            key={orgId}
            style={{ marginBottom: "1rem", border: "1px solid #eee", borderRadius: "12px", padding: "0.5rem" }}
          >
            <summary style={{ fontWeight: 600, cursor: "pointer", padding: "0.5rem 0" }}>
              {dirs.orgName || orgId}
            </summary>

            {["inbound", "outbound"].map((dir) => (
              <div key={dir} style={{ marginTop: "1rem" }}>
                <h3>{dir === "inbound" ? "Sent" : "Inbox"}</h3>
                {dirs[dir]?.length === 0 ? (
                  <p>No {dir} files</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
                    {dirs[dir]
                      .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
                      .map((f) => {
                        const dateStr = f.lastModified ? new Date(f.lastModified).toISOString().split("T")[0] : "";
                        return (
                          <div
                            key={f.name}
                            style={{
                              background: "#fff",
                              borderRadius: "12px",
                              padding: "1rem",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                              display: "flex",
                              flexDirection: "column",
                              cursor: "pointer",
                              transition: "transform 0.1s ease-in-out",
                            }}
                            onClick={() => window.open(f.url, "_blank")}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontWeight: 600, wordBreak: "break-word" }}>{f.name}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const link = document.createElement("a");
                                  link.href = f.url;
                                  link.download = f.name;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                title="Download file"
                                style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer" }}
                              >
                                ⬇️
                              </button>
                            </div>
                            {dateStr && (
                              <span style={{ fontSize: "0.85rem", fontStyle: "italic", color: "#444", marginTop: "0.4rem" }}>
                                Date uploaded: {dateStr}
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            ))}
          </details>
        ))}
      </div>

      {/* Right Column - User Creation Widget */}
      <div>
        <UserCreationWidget orgOptions={Object.entries(allFiles).map(([id, dirs]) => ({ id, name: dirs.orgName || id }))} />
      </div>
    </div>
  );
}
