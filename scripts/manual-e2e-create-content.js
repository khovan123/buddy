const { chromium } = require("playwright")

const BASE_URL = process.env.BASE_URL || "http://localhost:3024"
const EMAIL = process.env.E2E_EMAIL || "minh0@unibuddy.dev"
const PASSWORD = process.env.E2E_PASSWORD || "Minh@1234567"

async function snapshot(page, name) {
  await page.screenshot({ path: `/tmp/buddy-${name}.png`, fullPage: true })
}

async function visibleText(page) {
  return page
    .locator("body")
    .innerText({ timeout: 5000 })
    .catch(() => "")
}

async function dumpControls(page) {
  return page.evaluate(() => {
    const controls = [...document.querySelectorAll("input, textarea, button, [role=button], [role=combobox], select")]
    return controls.slice(0, 140).map((el) => ({
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute("type"),
      name: el.getAttribute("name"),
      id: el.id,
      role: el.getAttribute("role"),
      placeholder: el.getAttribute("placeholder"),
      aria: el.getAttribute("aria-label"),
      text: (el.innerText || el.getAttribute("value") || "").trim().slice(0, 80),
      disabled: el.hasAttribute("disabled"),
    }))
  })
}

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(1500)

  if (!page.url().includes("/login")) {
    return { alreadyAuthenticated: true }
  }

  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first()
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first()

  await emailInput.fill(EMAIL)
  await passwordInput.fill(PASSWORD)

  const submit = page.locator('form button[type="submit"]').first()
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 }).catch(() => null),
    submit.click(),
  ])

  await page.waitForTimeout(2000)
  return { url: page.url(), text: (await visibleText(page)).slice(0, 1000) }
}

async function inspectCreatePage(page, path, name) {
  const responses = []
  const failures = []

  page.on("response", (response) => {
    const url = response.url()
    if (url.includes("/v1/") || url.includes("/api/")) {
      responses.push({ status: response.status(), url })
    }
  })
  page.on("requestfailed", (request) => {
    const url = request.url()
    if (url.includes("/v1/") || url.includes("/api/")) {
      failures.push({ url, error: request.failure()?.errorText })
    }
  })

  await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(3500)
  await snapshot(page, name)

  return {
    path,
    url: page.url(),
    title: await page.title(),
    body: (await visibleText(page)).slice(0, 3000),
    controls: await dumpControls(page),
    responses,
    failures,
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } })
  const page = await context.newPage()

  const consoleMessages = []
  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      consoleMessages.push({ type: msg.type(), text: msg.text() })
    }
  })

  const result = {
    baseUrl: BASE_URL,
    login: await login(page),
    pages: [],
    consoleMessages,
  }

  for (const [path, name] of [
    ["/home/resources/create", "resource-create"],
    ["/home/tutorials/create", "tutorial-create"],
    ["/home/collections/create", "collection-create"],
  ]) {
    result.pages.push(await inspectCreatePage(page, path, name))
  }

  await browser.close()
  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
