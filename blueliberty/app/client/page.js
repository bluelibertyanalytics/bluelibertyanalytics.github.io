"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

function FileDropZone({ onFileSelect }) {
  const [dragging, setDragging] = useState(false);

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setDragging(false); };
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
      }}
    >
      <p style={{ marginBottom: "0.5rem" }}>
        {dragging ? "Release to upload" : "Drag & drop a file here"}
      </p>
      <p style={{ margin: "0.5rem 0" }}>or</p>
      <input type="file" onChange={(e) => onFileSelect(e.target.files[0])} />
    </div>
  );
}

async function downloadFile(url, name) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Download request failed");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error("Download failed:", err);
    alert("Download failed. Please try again.");
  }
}

async function handleUpload(file, activeOrgId, setOutboundFiles) {
  if (!file || !activeOrgId) return;

  try {
    let contentType = file.type;
    if (!contentType) {
      const ext = file.name.split(".").pop().toLowerCase();
      const shapefileExtensions = ["shp", "shx", "dbf", "prj", "cpg"];
      contentType = shapefileExtensions.includes(ext)
        ? "application/octet-stream"
        : "application/octet-stream";
    }

    const res = await fetch("/api/s3/upload", {
      method: "POST",
      body: JSON.stringify({
        fileName: file.name,
        fileType: contentType,
        targetOrgId: activeOrgId,
      }),
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) throw new Error("Failed to get upload URL");
    const { url } = await res.json();

    await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": contentType } });
    alert("File uploaded!");

    const listRes = await fetch("/api/s3/listOrgFiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: activeOrgId }),
    });
    if (listRes.ok) {
      const data = await listRes.json();
      setOutboundFiles(data.outbound || []);
    }
  } catch (err) {
    console.error("Upload failed:", err);
    alert("Upload failed. Please try again.");
  }
}

export default function ClientPage() {
  const { data: session, status } = useSession();
  const [file, setFile] = useState(null);
  const [inboundFiles, setInboundFiles] = useState([]);
  const [outboundFiles, setOutboundFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [downloadingFile, setDownloadingFile] = useState(null);

  const [activeOrgId, setActiveOrgId] = useState(null);
  const [activeOrgName, setActiveOrgName] = useState("");

  useEffect(() => {
    if (session?.user?.orgIds?.length > 0 && !activeOrgId) {
      setActiveOrgId(session.user.orgIds[0].id);
      setActiveOrgName(session.user.orgIds[0].name);
    }
  }, [session]);

  useEffect(() => {
    if (!activeOrgId) return;

    const fetchFiles = async () => {
      setLoadingFiles(true);
      setInboundFiles([]);
      setOutboundFiles([]);
      try {
        const res = await fetch("/api/s3/listOrgFiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgId: activeOrgId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Failed with ${res.status}`);
        setInboundFiles(data.inbound || []);
        setOutboundFiles(data.outbound || []);
      } catch (err) {
        console.error("Fetch files failed:", err);
      } finally {
        setLoadingFiles(false);
      }
    };

    fetchFiles();
  }, [activeOrgId]);

  const handleCampaignSwitch = (e) => {
    const selectedId = e.target.value;
    const selectedOrg = session.user.orgIds.find((o) => o.id === selectedId);
    setActiveOrgId(selectedId);
    setActiveOrgName(selectedOrg?.name || selectedId);
    setFile(null);
  };

  const handleDownload = async (e, f) => {
    e.stopPropagation();
    setDownloadingFile(f.name);
    await downloadFile(f.url, f.name);
    setDownloadingFile(null);
  };

  if (status === "loading") return <p>Loading...</p>;
  if (!session) return <p>Not signed in</p>;

  const orgIds = session.user?.orgIds || [];
  const isMultiOrg = orgIds.length > 1;

  const renderFileCards = (files) =>
    files.map((f) => {
      const dateStr = f.lastModified
        ? new Date(f.lastModified).toISOString().split("T")[0]
        : "";
      const isDownloading = downloadingFile === f.name;

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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontWeight: "600", color: "var(--dark-carolina)", wordBreak: "break-word" }}>
              {f.name}
            </div>
            <button
              onClick={(e) => handleDownload(e, f)}
              disabled={isDownloading}
              title={isDownloading ? "Downloading..." : "Download file"}
              style={{
                background: "none",
                border: "none",
                fontSize: "1.2rem",
                cursor: isDownloading ? "wait" : "pointer",
                opacity: isDownloading ? 0.5 : 1,
              }}
            >
              {isDownloading ? "⏳" : "⬇️"}
            </button>
          </div>
          {dateStr && (
            <div style={{ fontSize: "0.85rem", fontStyle: "italic", color: "#444", marginTop: "0.4rem" }}>
              Date uploaded: {dateStr}
            </div>
          )}
        </div>
      );
    });

  return (
    <div style={{ padding: "2rem", color: "var(--dark-carolina)" }}>

      {isMultiOrg && (
        <div style={{
          background: "#f0f4ff",
          border: "1px solid #c7d4f0",
          borderRadius: "12px",
          padding: "1rem 1.5rem",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
        }}>
          <label style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
            Viewing Campaign:
          </label>
          <select
            value={activeOrgId || ""}
            onChange={handleCampaignSwitch}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              border: "1px solid #c7d4f0",
              fontSize: "1rem",
              background: "#fff",
              color: "var(--dark-carolina)",
              fontWeight: 600,
              cursor: "pointer",
              flex: 1,
            }}
          >
            {orgIds.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <h1>{activeOrgName || session.user?.orgName || "Dashboard"}</h1>

      {/* Upload section */}
      <section style={{ marginTop: "2rem" }}>
        <h2>Upload Files</h2>
        <FileDropZone onFileSelect={(f) => setFile(f)} />
        <button
          onClick={() => handleUpload(file, activeOrgId, setOutboundFiles)}
          disabled={!file}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            background: "var(--dark-carolina)",
            color: "#fff",
            borderRadius: "6px",
            border: "none",
            cursor: file ? "pointer" : "not-allowed",
          }}
        >
          Upload
        </button>
      </section>

      {/* Inbound files */}
      <section style={{ marginTop: "2rem" }}>
        <h2>Files From Blue Liberty ({inboundFiles.length})</h2>
        {loadingFiles ? (
          <p>Loading files...</p>
        ) : inboundFiles.length === 0 ? (
          <p>No files available.</p>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "1.5rem",
            marginTop: "1rem",
          }}>
            {renderFileCards(inboundFiles)}
          </div>
        )}
      </section>

      {/* Outbound files */}
      <section style={{ marginTop: "2rem" }}>
        <h2>Files To Blue Liberty ({outboundFiles.length})</h2>
        {loadingFiles ? (
          <p>Loading files...</p>
        ) : outboundFiles.length === 0 ? (
          <p>No files available.</p>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "1.5rem",
            marginTop: "1rem",
          }}>
            {renderFileCards(outboundFiles)}
          </div>
        )}
      </section>
    </div>
  );
}