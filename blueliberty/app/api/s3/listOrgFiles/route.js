import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Read requested orgId from body, fall back to session default
    const body = await req.json().catch(() => ({}));
    const requestedOrgId = body.orgId || session.user?.orgId;

    // ✅ Security check — verify user actually belongs to this org
    const allowedOrgIds = (session.user?.orgIds || []).map((o) => o.id);
    // Also allow legacy single orgId in case orgIds isn't populated yet
    if (session.user?.orgId) allowedOrgIds.push(session.user.orgId);

    if (!requestedOrgId || !allowedOrgIds.includes(requestedOrgId)) {
      console.warn(`Blocked: user ${session.user.email} requested orgId ${requestedOrgId}, allowed: ${allowedOrgIds}`);
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("Fetching files for orgId:", requestedOrgId);

    const results = { inbound: [], outbound: [] };

    // ✅ Use requestedOrgId instead of session.user.orgId
    for (const folder of ["inbound", "outbound"]) {
      try {
        const params = {
          Bucket: process.env.AWS_S3_BUCKET,
          Prefix: `clients/${requestedOrgId}/${folder}/`,
        };

        const listFilesCmd = new ListObjectsV2Command(params);
        const res = await s3.send(listFilesCmd);

        if (res.Contents && res.Contents.length > 0) {
          const files = await Promise.all(
            res.Contents
              .filter((item) => item.Key.replace(params.Prefix, "").length > 0)
              .map(async (item) => {
                const getCmd = new GetObjectCommand({
                  Bucket: params.Bucket,
                  Key: item.Key,
                });
                const url = await getSignedUrl(s3, getCmd, { expiresIn: 3600 });
                return {
                  name: item.Key.replace(params.Prefix, ""),
                  url,
                  lastModified: item.LastModified,
                };
              })
          );

          results[folder] = files.sort(
            (a, b) => new Date(b.lastModified) - new Date(a.lastModified)
          );
        }
      } catch (err) {
        console.error(`S3 list failed for folder ${folder}:`, err);
        return Response.json(
          { error: `Failed to list ${folder} files`, details: err.message },
          { status: 500 }
        );
      }
    }

    return Response.json(results);
  } catch (err) {
    console.error("Unexpected error in listOrgFiles:", err);
    return Response.json({ error: "Unexpected server error", details: err.message }, { status: 500 });
  }
}