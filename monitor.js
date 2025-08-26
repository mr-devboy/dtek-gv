require("dotenv").config()
const { chromium } = require("playwright")

const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, CITY, STREET, HOUSE } =
  process.env

async function getInfo() {
  console.log("🌀 Getting info...")

  const browser = await chromium.launch({ headless: true })
  const browserContext = await browser.newContext()
  const browserPage = await browserContext.newPage()

  try {
    await browserPage.goto("https://www.dtek-krem.com.ua/ua/shutdowns", {
      waitUntil: "networkidle",
    })

    const csrfTokenTag = await browserPage.waitForSelector(
      'meta[name="csrf-token"]',
      { state: "attached" }
    )
    const csrfToken = await csrfTokenTag.getAttribute("content")

    const info = await browserPage.evaluate(
      async ({ CITY, STREET, csrfToken }) => {
        const formData = new URLSearchParams()
        formData.append("method", "getHomeNum")
        formData.append("data[0][name]", "city")
        formData.append("data[0][value]", CITY)
        formData.append("data[1][name]", "street")
        formData.append("data[1][value]", STREET)
        formData.append("data[2][name]", "updateFact")
        formData.append("data[2][value]", new Date().toLocaleString("uk-UA"))

        const response = await fetch("/ua/ajax", {
          method: "POST",
          headers: {
            "x-requested-with": "XMLHttpRequest",
            "x-csrf-token": csrfToken,
          },
          body: formData,
        })
        return await response.json()
      },
      { CITY, STREET, csrfToken }
    )

    console.log("✅ Getting info finished.")
    return info
  } catch (error) {
    throw Error(`❌ Getting info failed: ${error.message}`)
  } finally {
    await browser.close()
  }
}

function checkOutage(info) {
  console.log("🌀 Checking power outage...")

  if (!info?.data) {
    throw Error("❌ Power outage info missed.")
  }

  const { sub_type, start_date, end_date, type } = info?.data?.[HOUSE] || {}
  const isOutageDetected =
    sub_type !== "" || start_date !== "" || end_date !== "" || type !== ""

  isOutageDetected
    ? console.log("🚨 Power outage detected!")
    : console.log("⚡️ No power outage!")

  return isOutageDetected
}

async function sendNotification(info) {
  if (!TELEGRAM_BOT_TOKEN)
    throw Error("❌ Missing telegram bot token or chat id.")
  if (!TELEGRAM_CHAT_ID) throw Error("❌ Missing telegram chat id.")

  const {
    type,
    sub_type,
    start_date,
    end_date,
    sub_type_reason,
    updateTimestamp,
  } = info?.data?.[HOUSE] || {}

  const text =
    `⚡ <b>УВАГА! Інформація про відключення електроенергії</b>\n\n` +
    `🏠 <b>Тип:</b> ${type || "Не вказано"}\n` +
    `📋 <b>Підтип:</b> ${sub_type || "Не вказано"}\n` +
    `🕐 <b>Початок:</b> ${start_date || "Не вказано"}\n` +
    `🕐 <b>Кінець:</b> ${end_date || "Не вказано"}\n` +
    `ℹ️ <b>Причина:</b> ${
      sub_type_reason ? sub_type_reason.join(", ") : "Не вказано"
    }\n` +
    `⏰ <b>Оновлено:</b> ${updateTimestamp}`

  console.log("🌀 Sending notification...")

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text,
          parse_mode: "HTML",
        }),
      }
    )

    const data = await res.json()
    console.log("🟢 Notification sent.", data)
  } catch (error) {
    console.log("🔴 Notification not sent.", error.message)
  }
}

async function run() {
  const info = await getInfo()
  const isOutage = checkOutage(info)
  if (isOutage) await sendNotification(info)
}

run().catch((error) => console.error(error.message))
