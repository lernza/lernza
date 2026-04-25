function readRawBody(req) {
  return new Promise(resolve => {
    let data = ""
    req.setEncoding("utf8")
    req.on("data", chunk => {
      data += chunk
    })
    req.on("end", () => resolve(data))
    req.on("error", () => resolve(""))
  })
}

async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405
    res.setHeader("content-type", "text/plain; charset=utf-8")
    res.end("Method Not Allowed")
    return
  }

  const contentType = req.headers["content-type"] || ""
  const raw = await readRawBody(req)

  let parsed = raw
  if (
    String(contentType).includes("application/json") ||
    String(contentType).includes("application/csp-report")
  ) {
    try {
      parsed = raw ? JSON.parse(raw) : null
    } catch {
      parsed = raw
    }
  }

  console.log("[csp-report]", {
    at: new Date().toISOString(),
    contentType,
    userAgent: req.headers["user-agent"] || "",
    referer: req.headers.referer || "",
    report: parsed,
  })

  res.statusCode = 204
  res.end()
}

module.exports = handler
module.exports.config = { api: { bodyParser: false } }
