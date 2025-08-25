// monitor.js
const axios = require('axios');

// Конфігурація
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Функція для отримання даних з DTEK
async function getDTEKData() {
  try {
    const response = await axios({
      method: 'POST',
      url: 'https://www.dtek-krem.com.ua/ua/ajax',
      headers: {
        'accept': 'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'origin': 'https://www.dtek-krem.com.ua',
        'referer': 'https://www.dtek-krem.com.ua/ua/shutdowns',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'x-requested-with': 'XMLHttpRequest'
      },
      data: 'method=getHomeNum&data%5B0%5D%5Bname%5D=city&data%5B0%5D%5Bvalue%5D=%D0%9A%D1%80%D1%8E%D0%BA%D1%96%D0%B2%D1%89%D0%B8%D0%BD%D0%B0&data%5B1%5D%5Bname%5D=street&data%5B1%5D%5Bvalue%5D=%D0%9F%D1%80%D0%B8%D0%BE%D0%B7%D0%B5%D1%80%D0%BD%D0%B0&data%5B2%5D%5Bname%5D=house_num&data%5B2%5D%5Bvalue%5D=&data%5B3%5D%5Bname%5D=updateFact&data%5B3%5D%5Bvalue%5D=' + encodeURIComponent(new Date().toLocaleString('uk-UA'))
    });
    
    return response.data;
  } catch (error) {
    console.error('Помилка при отриманні даних з DTEK:', error.message);
    return null;
  }
}

// Функція для відправки повідомлення в Telegram
async function sendTelegramMessage(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('❌ Telegram токени не налаштовані');
    return;
  }
  
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    });
    console.log('✅ Повідомлення відправлено в Telegram');
  } catch (error) {
    console.error('❌ Помилка при відправці в Telegram:', error.message);
  }
}

// Перевірка чи є заповнені поля для будинку 18
function checkHouse18(data) {
  if (!data || !data.result || !data.data || !data.data['18']) {
    return false;
  }
  
  const house18 = data.data['18'];
  
  // Перевіряємо чи є заповнені поля (не пусті рядки)
  return house18.sub_type !== '' || 
         house18.start_date !== '' || 
         house18.end_date !== '' || 
         house18.type !== '';
}

// Основна функція
async function monitor() {
  console.log('🔍 Перевірка стану для будинку 18...');
  
  const data = await getDTEKData();
  if (!data) {
    await sendTelegramMessage('❌ Не вдалося отримати дані з DTEK');
    return;
  }
  
  console.log('📊 Дані отримано успішно');
  
  if (checkHouse18(data)) {
    const house18 = data.data['18'];
    const message = `⚡ <b>УВАГА! Інформація про відключення електроенергії (будинок 18)</b>\n\n` +
                   `🏠 <b>Тип:</b> ${house18.type || 'Не вказано'}\n` +
                   `📋 <b>Підтип:</b> ${house18.sub_type || 'Не вказано'}\n` +
                   `🕐 <b>Початок:</b> ${house18.start_date || 'Не вказано'}\n` +
                   `🕐 <b>Кінець:</b> ${house18.end_date || 'Не вказано'}\n` +
                   `ℹ️ <b>Причина:</b> ${house18.sub_type_reason ? house18.sub_type_reason.join(', ') : 'Не вказано'}\n` +
                   `⏰ <b>Оновлено:</b> ${data.updateTimestamp}`;
    
    await sendTelegramMessage(message);
    console.log('🚨 Виявлені відключення! Повідомлення відправлено');
  } else {
    console.log('✅ Відключень немає');
  }
}

// Запуск
monitor().catch(console.error);
