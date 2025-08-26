const axios = require("axios")
require("dotenv").config()

const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, CITY, STREET, HOUSE } =
  process.env

async function getInfo() {
  console.log("🌀 Getting  info...")

  const requestData = new URLSearchParams()
  requestData.append("method", "getHomeNum")
  requestData.append("data[0][name]", "city")
  requestData.append("data[0][value]", CITY)
  requestData.append("data[1][name]", "street")
  requestData.append("data[1][value]", STREET)
  requestData.append("data[2][name]", "house_num")
  requestData.append("data[2][value]", "")
  requestData.append("data[3][name]", "updateFact")
  requestData.append("data[3][value]", new Date().toLocaleString("uk-UA"))

  try {
    const { data } = await axios({
      method: "POST",
      url: "https://www.dtek-krem.com.ua/ua/ajax",
      headers: {
        accept: "application/json, text/javascript, */*; q=0.01",
        "accept-language": "uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        priority: "u=1, i",
        "sec-ch-ua":
          '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-csrf-token":
          "36SIR0ku9NZ7poUClNAu_MbrMJUA_16PUlwINu32RW6o4OYEOheXvxHk_VrFumeynohY3zDIO9tkCHxmiIwjXg==",
        "x-requested-with": "XMLHttpRequest",
        cookie:
          "Domain=dtek-krem.com.ua; _language=3eb69d58ec89e92ef3dafa6c5ddfe948ae4ccc42f3f8fc9cd1b9568ed22f10a3a%3A2%3A%7Bi%3A0%3Bs%3A9%3A%22_language%22%3Bi%3A1%3Bs%3A2%3A%22uk%22%3B%7D; visid_incap_2398465=KzLygby2TaOUJYO+p+teCQCvrGgAAAAAQUIPAAAAAACCwW7xqtasV0QyFL97OD7s; dtek-krem=5krtcje1tcs70bhci18cb3ppb5; incap_ses_788_2398465=80frASfjb3IfVX+H6onvCpXIrGgAAAAAX9+n/iyTPeGiHfgUeH5f3g==; _csrf-dtek-krem=8851710cc3d20d693bcd74fbca6077f9d9c31a453392d48338686084752f28f1a%3A2%3A%7Bi%3A0%3Bs%3A15%3A%22_csrf-dtek-krem%22%3Bi%3A1%3Bs%3A32%3A%22wDnCs9cijBxXQjINXchJ07eT6TtPezf0%22%3B%7D; incap_wrt_378=n8isaAAAAABVUMdHGgAI+gIQ4daOnI4BGMuTs8UGIAIoto+zxQYwA5fdOcsyaVrJhNrS44794qE=",
        Referer: "https://www.dtek-krem.com.ua/ua/shutdowns",
      },
      data: requestData,
    })

    console.log("✅ Getting info finished.")

    return data
  } catch (error) {
    throw Error(`❌ Getting info failed: ${error.message}.`)
  }
}

function checkOutage(info) {
  console.log("🌀 Checking power outage...")

  if (!info?.data) {
    throw Error("❌ Power outage info missed.")
  }

  const { sub_type, start_date, end_date, type } = data?.data?.[HOUSE] || {}
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
  } = info.data[HOUSE]
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
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
      }
    )

    console.log("🟢 Notification sent.", data)
  } catch (error) {
    console.log("🔴 Notification not sent.", data)
  }
}

async function run() {
  const info = await getInfo()
  const isOutage = checkOutage(info)
  if (isOutage) sendNotification(info)
}

run().catch((error) => console.error(error.message))
