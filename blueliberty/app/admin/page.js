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
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    orgName: "",
    orgId: "",
    role: "client",
  });

  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" or "error"

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      email: "",
      firstName: "",
      lastName: "",
      orgName: "",
      orgId: "",
      role: "client",
    });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.firstName || !formData.lastName || !formData.orgName || !formData.orgId) {
      setMessage("All fields are required");
      setMessageType("error");
      return;
    }

    setIsCreating(true);
    setMessage("");

    try {
      const lambdaResponse = await fetch("/api/lambda/CreateUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });

      const text = await lambdaResponse.text();
      console.log("Lambda response text:", text);

      let result;
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        console.error("Failed to parse Lambda response as JSON:", parseError);
        setMessage("Invalid response from server");
        setMessageType("error");
        return;
      }

      if (!lambdaResponse.ok) {
        setMessage(result.error || "Failed to create user");
        setMessageType("error");
        return;
      }

      setMessage(`User created successfully! Temporary password: ${result.tempPassword}`);
      setMessageType("success");
      resetForm();
    } catch (error) {
      console.error("Error creating user:", error);
      setMessage("Network error occurred. Please try again.");
      setMessageType("error");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "12px",
        padding: "1.5rem",
        boxShadow: "0 2px 8px rgba(255, 255, 255, 0.08)",
        height: "fit-content",
        position: "sticky",
        top: "2rem",
      }}
    >
      <h2 style={{ marginBottom: "1.5rem", color: "var(--dark-carolina)" }}>Create New User</h2>

      <form onSubmit={handleCreateUser}>
        {/* Email */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Email *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            placeholder="user@example.com"
            style={{
              width: "100%",
              padding: "0.75rem",
              background: "#fff",
              color: "#333",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "0.9rem",
            }}
          />
        </div>

        {/* First & Last Name */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>First Name *</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              required
              placeholder="John"
              style={{
                width: "100%",
                padding: "0.75rem",
                background: "#fff",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "0.9rem",
                color: "#333",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Last Name *</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              required
              placeholder="Doe"
              style={{
                width: "100%",
                padding: "0.75rem",
                background: "#fff",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "0.9rem",
                color: "#333",
              }}
            />
          </div>
        </div>

        {/* Organization Name */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Organization Name *</label>
          <input
            type="text"
            name="orgName"
            value={formData.orgName}
            onChange={handleInputChange}
            required
            placeholder="Example Campaign"
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #ddd",
              borderRadius: "8px",
              background: "#fff",
              fontSize: "0.9rem",
              color: "#333",
            }}
          />
        </div>

        {/* Organization ID */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Organization ID *</label>
          <input
            type="text"
            name="orgId"
            value={formData.orgId}
            onChange={handleInputChange}
            required
            placeholder="example-campaign"
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "0.9rem",
              background: "#fff",
              color: "#888",
            }}
          />
        </div>

        {/* Role */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Role *</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            required
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "0.9rem",
              background: "#fff",
              color: "#888",
            }}
          >
            <option value="client">Client</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {message && (
          <div
            style={{
              padding: "0.75rem",
              marginBottom: "1rem",
              borderRadius: "8px",
              fontSize: "0.9rem",
              background: messageType === "success" ? "#d4edda" : "#f8d7da",
              color: messageType === "success" ? "#155724" : "#721c24",
              border: `1px solid ${messageType === "success" ? "#c3e6cb" : "#f5c6cb"}`,
              wordBreak: "break-word",
            }}
          >
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={isCreating}
          style={{
            width: "100%",
            padding: "0.75rem",
            background: isCreating ? "#ccc" : "var(--dark-carolina)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: isCreating ? "not-allowed" : "pointer",
            transition: "background-color 0.2s",
          }}
        >
          {isCreating ? "Creating User..." : "Create User"}
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
