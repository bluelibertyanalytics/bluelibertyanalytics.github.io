import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

import { HttpRequest } from "@aws-sdk/protocol-http";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { Sha256 } from "@aws-crypto/sha256-js";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    console.log("Session object:", session);

    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role?.trim().toLowerCase() !== "admin") {
      console.log("Forbidden: role check failed");
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }
    console.log("Admin check passed ✅");

    const body = await request.json();
    console.log("Received body:", JSON.stringify(body)); // ← add this
    console.log("Request body:", body);

    // ✅ Validate that orgIds is present and is a non-empty array
    // AFTER
    const { email, orgIds } = body;
    if (!email || !Array.isArray(orgIds) || orgIds.length === 0) {
      return NextResponse.json(
        { error: "email and at least one orgId are required" },
        { status: 400 }
      );
    }

    // Build signed request
    const url = new URL(process.env.LAMBDA_FUNCTION_URL);
    const httpRequest = new HttpRequest({
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port,
      method: "POST",
      path: url.pathname,
      headers: {
        "Content-Type": "application/json",
        "Host": url.hostname,
      },
      body: JSON.stringify(body),
    });

    const signer = new SignatureV4({
      credentials: defaultProvider(),
      region: process.env.AWS_REGION,
      service: "lambda",
      sha256: Sha256,
    });

    const signedRequest = await signer.sign(httpRequest);
    console.log("Signed headers:", signedRequest.headers);

    const lambdaResponse = await fetch(url.toString(), {
      method: "POST",
      headers: signedRequest.headers,
      body: httpRequest.body,
    });

    const text = await lambdaResponse.text();
    console.log("Lambda response text:", text);

    let result;
    try {
      result = JSON.parse(text);
    } catch (err) {
      console.error("Failed to parse Lambda response JSON:", err);
      result = { raw: text };
    }

    return NextResponse.json(result, { status: lambdaResponse.ok ? 200 : lambdaResponse.status });

  } catch (error) {
    console.error("Error in CreateUser API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}