export const config = { api: { bodyParser: false } }

function readRawBody(req: any): Promise<string> {
  return new Promise(resolve => {
    let data = ""
    req.setEncoding?.("utf8")
    req.on?.("data", (chunk: string) => {
      data += chunk
    })
    req.on?.("end", () => resolve(data))
    req.on?.("error", () => resolve(""))
    if (!req.on) resolve("")
  })
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.statusCode = 405
    res.setHeader("content-type", "text/plain; charset=utf-8")
    res.end("Method Not Allowed")
    return
  }

  const contentType = req.headers?.["content-type"] || ""
  const raw = await readRawBody(req)

  let parsed: unknown = raw
  if (String(contentType).includes("application/json") || String(contentType).includes("application/csp-report")) {
    try {
      parsed = raw ? JSON.parse(raw) : null
    } catch {
      parsed = raw
    }
  }

  console.log("[csp-report]", {
    at: new Date().toISOString(),
    contentType,
    userAgent: req.headers?.["user-agent"] || "",
    referer: req.headers?.referer || "",
    report: parsed,
  })

  res.statusCode = 204
  res.end()
}
